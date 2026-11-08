// The living layer: gulls, tiny villagers, salt dust, snow, chimney smoke and build puffs.
// Everything here is cosmetic and uses Math.random only for particles (never the sim RNG).
import { buildingTiles, isField, isWater, n4 } from '../sim/grid';
import { hash2 } from '../sim/rng';
import type { GameState } from '../sim/types';
import { PAL, TILE } from './palette';
import { C, rgba } from './pixels';
import { GULL, namedSprite } from './sprites';
import { M_SEA, M_SEABED } from './terrain';

interface Gull {
  cx: number;
  cy: number;
  r: number;
  w: number;
  phase: number;
}

interface Walker {
  pts: [number, number][];
  len: number;
  speed: number;
  phase: number;
  body: string;
  hair: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  col: string;
  size: number;
}

interface Puff {
  x: number;
  y: number;
  t0: number;
}

const BODY = [PAL.roof, PAL.sea, PAL.gold, PAL.grass, PAL.cotton, PAL.rust, PAL.shallow];
const HAIR = [PAL.ink, PAL.woodDark, PAL.ink, PAL.salt];
const DUST_COL = [rgba(C.salt, 0.85), rgba(C.seabed, 0.8), rgba(C.sandDark, 0.7), rgba(C.salt, 0.6)];

export class Life {
  gulls: Gull[] = [];
  walkers: Walker[] = [];
  dust: Particle[] = [];
  snow: { x: number; y: number; v: number; ph: number }[] = [];
  puffs: Puff[] = [];
  smoke: { x: number; y: number; ph: number }[] = [];
  private seabedPx: Int32Array = new Int32Array(0);
  private mask: Uint8Array = new Uint8Array(0);
  private W = 0;
  private H = 0;
  private spawnAcc = 0;

  rebuild(s: GameState, mask: Uint8Array, W: number, H: number, chimneys: ReadonlySet<number> = new Set()): void {
    this.mask = mask;
    this.W = W;
    this.H = H;
    const seed = s.seed;
    // seabed pixels for dust spawning (sub-sampled)
    const sb: number[] = [];
    for (let p = 0; p < mask.length; p += 3) if (mask[p] === M_SEABED) sb.push(p);
    this.seabedPx = Int32Array.from(sb);

    // gulls circle over open water near the shore
    const water: number[] = [];
    for (let i = 0; i < s.tiles.length; i++) if (isWater(s, i)) water.push(i);
    this.gulls = [];
    const count = Math.min(6, Math.max(2, Math.round(water.length / 40)));
    for (let k = 0; k < count && water.length; k++) {
      const i = water[Math.floor(hash2(k, 7, seed) * water.length)]!;
      this.gulls.push({
        cx: (i % s.w) * TILE + 8,
        cy: Math.floor(i / s.w) * TILE + 8,
        r: 10 + hash2(k, 8, seed) * 22,
        w: (0.35 + hash2(k, 9, seed) * 0.5) * (hash2(k, 10, seed) < 0.5 ? -1 : 1),
        phase: hash2(k, 11, seed) * Math.PI * 2,
      });
    }

    // villagers walk from houses to work
    const houses = buildingTiles(s, 'house');
    const work: number[] = [];
    for (let i = 0; i < s.tiles.length; i++) {
      const b = s.tiles[i]!.b;
      if (b && (isField(b.id) || b.id === 'dock' || b.id === 'workshop' || b.id === 'clinic' || b.id === 'saxaul')) work.push(i);
    }
    this.walkers = [];
    const nW = Math.min(16, Math.round(s.res.pop / 8));
    for (let k = 0; k < nW && houses.length; k++) {
      const h = houses[Math.floor(hash2(k, 21, seed) * houses.length)]!;
      const hx = (h % s.w) * TILE + 8;
      const hy = Math.floor(h / s.w) * TILE + 14;
      const near = work.filter((w) => Math.abs((w % s.w) - (h % s.w)) + Math.abs(Math.floor(w / s.w) - Math.floor(h / s.w)) <= 10);
      const pool = near.length ? near : houses;
      const tgt = pool[Math.floor(hash2(k, 22, seed) * pool.length)]!;
      // stand next to the target, on its land side if possible
      let stand = tgt;
      for (const nb of n4(s, tgt)) {
        if (!isWater(s, nb) && !s.tiles[nb]!.b) {
          stand = nb;
          break;
        }
      }
      const tx = (stand % s.w) * TILE + 8;
      const ty = Math.floor(stand / s.w) * TILE + 12;
      const pts: [number, number][] = [
        [hx, hy],
        [tx, hy],
        [tx, ty],
      ];
      const len = Math.abs(tx - hx) + Math.abs(ty - hy);
      if (len < 4) continue;
      this.walkers.push({
        pts,
        len,
        speed: 5 + hash2(k, 23, seed) * 6,
        phase: hash2(k, 24, seed),
        body: BODY[Math.floor(hash2(k, 25, seed) * BODY.length)]!,
        hair: HAIR[Math.floor(hash2(k, 26, seed) * HAIR.length)]!,
      });
    }

    // chimney smoke from a few houses
    this.smoke = houses
      .filter((h) => chimneys.has(h) && hash2(h, 31, seed) < 0.55)
      .map((h) => ({ x: (h % s.w) * TILE + 12, y: Math.floor(h / s.w) * TILE + 2, ph: hash2(h, 32, seed) }));

    if (!this.snow.length) {
      for (let k = 0; k < 60; k++) this.snow.push({ x: Math.random() * W, y: Math.random() * H, v: 4 + Math.random() * 6, ph: Math.random() * 6 });
    }
  }

  addPuff(x: number, y: number, now: number): void {
    this.puffs.push({ x, y, t0: now });
  }

  /** Advance particles. `dustRate` = new dust grains per second. */
  update(dt: number, dustRate: number, storm: boolean, winter: boolean): void {
    // dust
    this.spawnAcc += dustRate * dt;
    const cap = storm ? 900 : 380;
    while (this.spawnAcc >= 1 && this.seabedPx.length) {
      this.spawnAcc -= 1;
      if (this.dust.length >= cap) continue;
      const p = this.seabedPx[Math.floor(Math.random() * this.seabedPx.length)]!;
      const max = 2 + Math.random() * 3;
      this.dust.push({
        x: p % this.W,
        y: Math.floor(p / this.W),
        vx: -(storm ? 40 + Math.random() * 40 : 12 + Math.random() * 18),
        vy: (Math.random() - 0.5) * 6,
        life: max,
        max,
        col: DUST_COL[Math.floor(Math.random() * DUST_COL.length)]!,
        size: storm && Math.random() < 0.3 ? 2 : 1,
      });
    }
    if (this.spawnAcc > 50) this.spawnAcc = 0;
    let w = 0;
    for (const d of this.dust) {
      d.x += d.vx * dt;
      d.y += d.vy * dt + Math.sin((d.life + d.x) * 2) * 0.15;
      d.life -= dt;
      if (d.life > 0 && d.x > -4) this.dust[w++] = d;
    }
    this.dust.length = w;
    if (winter) {
      for (const f of this.snow) {
        f.y += f.v * dt;
        f.x += Math.sin(f.y * 0.1 + f.ph) * 0.2 - 2 * dt;
        if (f.y > this.H) {
          f.y = -2;
          f.x = Math.random() * this.W;
        }
        if (f.x < 0) f.x += this.W;
      }
    }
  }

  drawWalkers(g: CanvasRenderingContext2D, t: number): void {
    for (const v of this.walkers) {
      // ping-pong along the path with a pause at each end
      const total = v.len * 2 + 8;
      const u = (t * v.speed + v.phase * total) % total;
      let d = u < v.len + 4 ? Math.min(v.len, u) : Math.max(0, v.len - (u - v.len - 4));
      let x = v.pts[0]![0];
      let y = v.pts[0]![1];
      for (let k = 1; k < v.pts.length && d > 0; k++) {
        const [ax, ay] = v.pts[k - 1]!;
        const [bx, by] = v.pts[k]!;
        const seg = Math.abs(bx - ax) + Math.abs(by - ay);
        const step = Math.min(seg, d);
        if (seg > 0) {
          x = ax + ((bx - ax) * step) / seg;
          y = ay + ((by - ay) * step) / seg;
        }
        d -= step;
      }
      const px = Math.round(x) - 1;
      const py = Math.round(y) - 4;
      const m = this.mask[Math.max(0, Math.min(this.mask.length - 1, (py + 3) * this.W + px + 1))];
      if (m === M_SEA) continue;
      const moving = u % (v.len + 4) < v.len;
      const frame = moving ? Math.floor(t * 6 + v.phase * 10) % 2 : 0;
      g.fillStyle = 'rgba(27,26,36,0.25)';
      g.fillRect(px, py + 4, 3, 1);
      g.fillStyle = v.hair;
      g.fillRect(px + 1, py - 1, 1, 1);
      g.fillStyle = PAL.clay;
      g.fillRect(px + 1, py, 1, 1);
      g.fillStyle = v.body;
      g.fillRect(px, py + 1, 3, 1);
      g.fillRect(px + 1, py + 2, 1, 1);
      g.fillStyle = PAL.ink;
      if (frame === 0) {
        g.fillRect(px, py + 3, 1, 1);
        g.fillRect(px + 2, py + 3, 1, 1);
      } else g.fillRect(px + 1, py + 3, 1, 1);
    }
  }

  drawSmoke(g: CanvasRenderingContext2D, t: number, season: number): void {
    const n = season === 3 ? 3 : season === 2 ? 2 : 1;
    for (const s of this.smoke) {
      for (let k = 0; k < n; k++) {
        const u = (t * 0.35 + s.ph + k / n) % 1;
        const a = 0.55 * (1 - u);
        g.fillStyle = rgba(C.salt, a);
        const x = Math.round(s.x + Math.sin(u * 6 + s.ph * 9) * 1.5 - u * 3);
        const y = Math.round(s.y - u * 10);
        g.fillRect(x, y, u > 0.4 ? 2 : 1, 1);
      }
    }
  }

  drawGulls(g: CanvasRenderingContext2D, t: number): void {
    for (const gl of this.gulls) {
      const a = t * gl.w + gl.phase;
      const x = Math.round(gl.cx + Math.cos(a) * gl.r);
      const y = Math.round(gl.cy + Math.sin(a) * gl.r * 0.55 - 6);
      const frame = Math.sin(t * 7 + gl.phase * 3) > 0 ? 0 : 1;
      const sp = namedSprite(`gull${frame}`, GULL[frame]!);
      g.fillStyle = 'rgba(27,26,36,0.18)';
      g.fillRect(x + 1, y + 10, 3, 1);
      g.drawImage(sp.canvas, x, y);
    }
  }

  drawDust(g: CanvasRenderingContext2D): void {
    for (const d of this.dust) {
      g.globalAlpha = Math.min(1, d.life / d.max + 0.15);
      g.fillStyle = d.col;
      g.fillRect(Math.round(d.x), Math.round(d.y), d.size, 1);
    }
    g.globalAlpha = 1;
  }

  drawSnow(g: CanvasRenderingContext2D): void {
    g.fillStyle = rgba(C.cotton, 0.85);
    for (const f of this.snow) g.fillRect(Math.round(f.x), Math.round(f.y), 1, 1);
  }

  drawPuffs(g: CanvasRenderingContext2D, now: number): void {
    const keep: Puff[] = [];
    for (const p of this.puffs) {
      const u = (now - p.t0) / 600;
      if (u >= 1) continue;
      keep.push(p);
      g.fillStyle = rgba(C.salt, 0.9 * (1 - u));
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2;
        const r = 3 + u * 9;
        g.fillRect(Math.round(p.x + Math.cos(a) * r), Math.round(p.y + Math.sin(a) * r * 0.7), u < 0.5 ? 2 : 1, 1);
      }
    }
    this.puffs = keep;
  }
}
