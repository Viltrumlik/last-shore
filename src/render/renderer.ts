// Canvas 2D map renderer: cached static layer (terrain + buildings) blitted with integer
// zoom, plus an animated layer (water, reeds, boats, villagers, gulls, dust, weather) and
// UI overlays (hover, selection, tutorial highlights, placement preview).
import { connectedCanals, dockActive, exposedSeabed, isWater, n4, waterDepth } from '../sim/grid';
import { canUse } from '../sim/rules';
import type { GameState, ToolId } from '../sim/types';
import { Life } from './life';
import { PAL, TILE } from './palette';
import { C, ctx2d, makeCanvas, rgba, tileHash, type Sprite } from './pixels';
import {
  ANCHOR,
  BOAT,
  CLINIC,
  DOCK,
  FISHBONE,
  HULL,
  SAXAUL,
  SAXAUL_YOUNG,
  WORKSHOP,
  WRECK,
  canalSprite,
  dikeSprite,
  fieldSprite,
  houseSprite,
  namedSprite,
} from './sprites';
import { buildTerrain, makeSeedCache, terrainSignature, type SeedCache, type TerrainResult } from './terrain';

export interface RenderOptions {
  reducedMotion?: boolean;
}

const MARGIN = 24;
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

interface BoatSpot {
  x: number;
  y: number;
  flip: boolean;
  phase: number;
}

export class Renderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly g: CanvasRenderingContext2D;
  private readonly reduced: boolean;
  private s: GameState | null = null;
  private version = 0;
  private tool: ToolId | null = null;
  private hover: number | null = null;
  private selected: number | null = null;
  private highlights: number[] | null = null;

  private zoom = 2;
  private userZoomed = false;
  private scale = 2;
  private camX = 0;
  private camY = 0;
  private camSet = false;

  private seed: SeedCache | null = null;
  private terrain: TerrainResult | null = null;
  private terrainSig = '';
  private terrainLayer: HTMLCanvasElement | null = null;
  private staticLayer: HTMLCanvasElement | null = null;
  private dirty = true;
  private needsDraw = true;
  private readonly life = new Life();
  private reeds: number[] = [];
  private boats: BoatSpot[] = [];
  private chimney = new Set<number>();
  private seabedCount = 0;
  private lifeVersion = -1;
  private pattern: CanvasPattern | null = null;
  private previewKey = '';
  private previewOk = false;

  private raf = 0;
  private running = false;
  private last = 0;
  private t = 0;
  private stormUntil = 0;
  private shakeUntil = 0;
  private ro: ResizeObserver | null = null;

  constructor(canvas: HTMLCanvasElement, opts: RenderOptions = {}) {
    this.canvas = canvas;
    this.g = ctx2d(canvas);
    let reduced = opts.reducedMotion;
    if (reduced === undefined) {
      try {
        reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
      } catch {
        reduced = false;
      }
    }
    this.reduced = !!reduced;
    canvas.style.touchAction = 'none';
    canvas.style.imageRendering = 'pixelated';
    if (typeof ResizeObserver === 'function') {
      this.ro = new ResizeObserver(() => this.resize());
      this.ro.observe(canvas);
    }
    this.resize();
  }

  // ------------------------------------------------------------------ public API

  setState(s: GameState): void {
    const seedChanged = !this.s || this.s.seed !== s.seed;
    this.s = s;
    this.version++;
    this.dirty = true;
    this.needsDraw = true;
    if (seedChanged) {
      this.camSet = false;
      this.resize();
    }
  }

  setTool(tool: ToolId | null): void {
    if (this.tool === tool) return;
    this.tool = tool;
    this.needsDraw = true;
  }

  setHover(i: number | null): void {
    if (this.hover === i) return;
    this.hover = i;
    this.needsDraw = true;
  }

  setSelected(i: number | null): void {
    this.selected = i;
    this.needsDraw = true;
  }

  setHighlights(tiles: number[] | null): void {
    this.highlights = tiles && tiles.length ? tiles.slice() : null;
    this.needsDraw = true;
  }

  get zoomLevel(): number {
    return this.zoom;
  }

  resize(): void {
    const cssW = this.canvas.clientWidth;
    const cssH = this.canvas.clientHeight;
    if (cssW <= 0 || cssH <= 0) return;
    const dpr = typeof devicePixelRatio === 'number' && devicePixelRatio > 0 ? devicePixelRatio : 1;
    const devW = Math.round(cssW * dpr);
    const devH = Math.round(cssH * dpr);
    if (this.canvas.width !== devW) this.canvas.width = devW;
    if (this.canvas.height !== devH) this.canvas.height = devH;
    this.g.imageSmoothingEnabled = false;
    const { W, H } = this.mapSize();
    if (!this.userZoomed) {
      const fit = Math.floor(Math.min(cssW / W, cssH / H));
      this.zoom = clamp(Math.max(fit, cssW < 700 ? 2 : 1), MIN_ZOOM, MAX_ZOOM);
    }
    this.scale = Math.max(1, Math.round(this.zoom * dpr));
    if (!this.camSet && this.s) {
      this.camX = (W - devW / this.scale) / 2;
      this.camY = (H - devH / this.scale) / 2;
      this.camSet = true;
    }
    this.clampCamera();
    this.needsDraw = true;
    if (this.reduced || !this.running) this.draw(performance.now());
  }

  screenToTile(clientX: number, clientY: number): number | null {
    if (!this.s) return null;
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    const devX = (clientX - rect.left) * (this.canvas.width / rect.width);
    const devY = (clientY - rect.top) * (this.canvas.height / rect.height);
    const mx = (devX + Math.round(this.camX * this.scale)) / this.scale;
    const my = (devY + Math.round(this.camY * this.scale)) / this.scale;
    const tx = Math.floor(mx / TILE);
    const ty = Math.floor(my / TILE);
    if (tx < 0 || ty < 0 || tx >= this.s.w || ty >= this.s.h) return null;
    return ty * this.s.w + tx;
  }

  panBy(dxCss: number, dyCss: number): void {
    const rect = this.canvas.getBoundingClientRect();
    const ratio = rect.width > 0 ? this.canvas.width / rect.width : 1;
    this.camX -= (dxCss * ratio) / this.scale;
    this.camY -= (dyCss * ratio) / this.scale;
    this.clampCamera();
    this.needsDraw = true;
  }

  zoomAt(delta: 1 | -1, clientX: number, clientY: number): void {
    const next = clamp(this.zoom + delta, MIN_ZOOM, MAX_ZOOM);
    if (next === this.zoom) return;
    const rect = this.canvas.getBoundingClientRect();
    const ratio = rect.width > 0 ? this.canvas.width / rect.width : 1;
    const devX = rect.width > 0 ? (clientX - rect.left) * ratio : this.canvas.width / 2;
    const devY = rect.height > 0 ? (clientY - rect.top) * ratio : this.canvas.height / 2;
    const mx = devX / this.scale + this.camX;
    const my = devY / this.scale + this.camY;
    const dpr = typeof devicePixelRatio === 'number' && devicePixelRatio > 0 ? devicePixelRatio : 1;
    this.zoom = next;
    this.userZoomed = true;
    this.scale = Math.max(1, Math.round(this.zoom * dpr));
    this.camX = mx - devX / this.scale;
    this.camY = my - devY / this.scale;
    this.clampCamera();
    this.needsDraw = true;
  }

  centerOn(i: number): void {
    if (!this.s) return;
    const x = (i % this.s.w) * TILE + TILE / 2;
    const y = Math.floor(i / this.s.w) * TILE + TILE / 2;
    this.camX = x - this.canvas.width / this.scale / 2;
    this.camY = y - this.canvas.height / this.scale / 2;
    this.clampCamera();
    this.needsDraw = true;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const loop = (now: number) => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(loop);
      if (typeof document !== 'undefined' && document.hidden) {
        this.last = now;
        return;
      }
      const elapsed = now - this.last;
      if (this.reduced) {
        if (this.needsDraw || this.dirty) this.draw(now);
        this.last = now;
        return;
      }
      if (elapsed < 30 && !this.needsDraw) return;
      const dt = Math.min(0.1, elapsed / 1000);
      this.last = now;
      this.t += dt;
      this.updateLife(dt, now);
      this.draw(now);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  flash(kind: 'storm' | 'build' | 'wreck'): void {
    const now = performance.now();
    if (kind === 'storm') this.stormUntil = now + 3000;
    else if (kind === 'wreck') {
      if (!this.reduced) this.shakeUntil = now + 350;
    } else if (this.s) {
      const i = this.selected ?? this.hover;
      if (i !== null && !this.reduced) this.life.addPuff((i % this.s.w) * TILE + 8, Math.floor(i / this.s.w) * TILE + 9, now);
    }
    this.needsDraw = true;
  }

  // ------------------------------------------------------------------ internals

  private mapSize(): { W: number; H: number } {
    return { W: (this.s?.w ?? 32) * TILE, H: (this.s?.h ?? 20) * TILE };
  }

  private clampCamera(): void {
    const { W, H } = this.mapSize();
    const viewW = this.canvas.width / this.scale;
    const viewH = this.canvas.height / this.scale;
    if (viewW >= W + MARGIN * 2) this.camX = (W - viewW) / 2;
    else this.camX = clamp(this.camX, -MARGIN, W - viewW + MARGIN);
    if (viewH >= H + MARGIN * 2) this.camY = (H - viewH) / 2;
    else this.camY = clamp(this.camY, -MARGIN, H - viewH + MARGIN);
  }

  private season(): number {
    return this.s ? ((this.s.season % 4) + 4) % 4 : 0;
  }

  private stormActive(now: number): boolean {
    return now < this.stormUntil || !!this.s?.lastReport?.storm;
  }

  private updateLife(dt: number, now: number): void {
    if (!this.s) return;
    const so = this.season();
    const storm = this.stormActive(now);
    const heavy = now < this.stormUntil;
    let rate = this.seabedCount * (so === 0 ? 0.9 : 0.12);
    if (storm) rate = this.seabedCount * (heavy ? 5 : 2.2) + (heavy ? 60 : 10);
    this.life.update(dt, rate, storm, so === 3);
  }

  private rebuildStatic(): void {
    const s = this.s;
    if (!s) return;
    if (!this.seed || this.seed.seed !== s.seed || this.seed.W !== s.w * TILE || this.seed.H !== s.h * TILE) {
      this.seed = makeSeedCache(s.seed, s.w, s.h);
    }
    const W = s.w * TILE;
    const H = s.h * TILE;
    // the terrain image only changes with water level, salinity and moisture
    const sig = terrainSignature(s);
    let terrainChanged = false;
    if (!this.terrain || !this.terrainLayer || sig !== this.terrainSig) {
      this.terrain = buildTerrain(s, this.seed);
      this.terrainSig = sig;
      if (!this.terrainLayer || this.terrainLayer.width !== W || this.terrainLayer.height !== H) this.terrainLayer = makeCanvas(W, H);
      ctx2d(this.terrainLayer).putImageData(this.terrain.buf.toImageData(), 0, 0);
      terrainChanged = true;
    }
    const terrain = this.terrain;
    if (!this.staticLayer || this.staticLayer.width !== W || this.staticLayer.height !== H) this.staticLayer = makeCanvas(W, H);
    const g = ctx2d(this.staticLayer);
    g.clearRect(0, 0, W, H);
    g.drawImage(this.terrainLayer, 0, 0);

    const so = this.season();
    const canals = connectedCanals(s);
    this.reeds = [];
    this.boats = [];
    this.chimney.clear();
    this.seabedCount = exposedSeabed(s);
    const shadow = (x: number, y: number, w = 12) => {
      g.fillStyle = 'rgba(27,26,36,0.28)';
      g.fillRect(x + 2, y + 14, w, 2);
    };
    const put = (sp: Sprite, x: number, y: number) => g.drawImage(sp.canvas, x, y);

    // seabed props (only visible when the floor is dry and empty)
    for (let i = 0; i < s.tiles.length; i++) {
      const t = s.tiles[i]!;
      if (!t.prop || t.b || t.terrain !== 'sea' || isWater(s, i)) continue;
      const x = (i % s.w) * TILE;
      const y = Math.floor(i / s.w) * TILE;
      const flip = tileHash(i, 5) < 0.5;
      if (t.prop === 1) put(namedSprite('hull', HULL, flip), x, y + 5);
      else if (t.prop === 2) {
        if (tileHash(i, 6) < 0.5) put(namedSprite('anchor', ANCHOR, flip), x + 4, y + 4);
        else put(namedSprite('fishbone', FISHBONE, flip), x + 3, y + 7);
      } else {
        g.fillStyle = PAL.foam;
        for (let k = 0; k < 4; k++) g.fillRect(x + 2 + Math.floor(tileHash(i, 10 + k) * 12), y + 2 + Math.floor(tileHash(i, 20 + k) * 12), 1, 1);
        g.fillStyle = PAL.salt;
        g.fillRect(x + 7, y + 9, 2, 1);
      }
    }

    // buildings, row by row so overhangs overlap correctly
    for (let i = 0; i < s.tiles.length; i++) {
      const t = s.tiles[i]!;
      const b = t.b;
      if (!b) continue;
      const x = (i % s.w) * TILE;
      const y = Math.floor(i / s.w) * TILE;
      const flip = tileHash(i, 2) < 0.5;
      switch (b.id) {
        case 'house': {
          const v = Math.floor(tileHash(i, 1) * 3);
          shadow(x, y, 13);
          put(houseSprite(v), x, y);
          if (v !== 1) this.chimney.add(i);
          break;
        }
        case 'dock': {
          put(namedSprite('dock', DOCK), x, y);
          if (dockActive(s, i)) {
            let best = -1;
            let bestD = -1;
            for (const nb of n4(s, i)) {
              const d = waterDepth(s, nb);
              if (d > bestD && isWater(s, nb) && !s.tiles[nb]!.b) {
                bestD = d;
                best = nb;
              }
            }
            if (best >= 0) {
              const bx = (best % s.w) * TILE;
              const by = Math.floor(best / s.w) * TILE;
              this.boats.push({ x: bx + 2, y: by + 5, flip: best % s.w < i % s.w, phase: tileHash(i, 3) * 6 });
            }
          }
          break;
        }
        case 'wreck':
          put(namedSprite('wreck', WRECK, flip), x, y);
          break;
        case 'wheat':
        case 'melon':
        case 'cotton':
          put(fieldSprite(b.id, so, Math.floor(tileHash(i, 4) * 2)), x, y);
          break;
        case 'canal': {
          const conn = n4Dirs(s, i).map((nb) => nb >= 0 && (s.tiles[nb]!.terrain === 'river' || s.tiles[nb]!.b?.id === 'canal')) as [
            boolean,
            boolean,
            boolean,
            boolean,
          ];
          put(canalSprite(conn, canals[i] === 1, t.terrain !== 'soil'), x, y);
          break;
        }
        case 'saxaul':
          put(namedSprite(b.age >= 2 ? 'saxaul' : 'saxaul-young', b.age >= 2 ? SAXAUL : SAXAUL_YOUNG, flip), x, y);
          break;
        case 'reeds':
          this.reeds.push(i);
          break;
        case 'clinic':
          shadow(x, y, 13);
          put(namedSprite('clinic', CLINIC), x, y);
          break;
        case 'workshop':
          shadow(x, y, 13);
          put(namedSprite('workshop', WORKSHOP), x, y);
          break;
        case 'dike': {
          const k = s.dikeLine.indexOf(i);
          const L = Math.max(1, s.dikeLine.length);
          const built = s.dike.complete ? 1 : clamp((s.dike.progress / 4) * L - Math.max(0, k), 0, 1);
          put(dikeSprite(built, i), x, y);
          break;
        }
      }
      // salt crust on salty farmland
      if ((b.id === 'wheat' || b.id === 'melon' || b.id === 'cotton') && t.sal > 55) {
        g.fillStyle = PAL.salt;
        const n = Math.round(((t.sal - 55) / 45) * 26);
        for (let k = 0; k < n; k++) g.fillRect(x + 1 + Math.floor(tileHash(i, 40 + k) * 14), y + 1 + Math.floor(tileHash(i, 80 + k) * 14), 1, 1);
      }
    }
    if (terrainChanged || this.lifeVersion !== s.season * 1000 + s.res.pop) {
      this.life.rebuild(s, terrain.mask, W, H, this.chimney);
      this.lifeVersion = s.season * 1000 + s.res.pop;
    }
    this.dirty = false;
  }

  private ensurePattern(): CanvasPattern | null {
    if (this.pattern) return this.pattern;
    const c = makeCanvas(8, 8);
    const g = ctx2d(c);
    g.fillStyle = PAL.night;
    g.fillRect(0, 0, 8, 8);
    g.fillStyle = PAL.ink;
    g.fillRect(1, 1, 1, 1);
    g.fillRect(5, 5, 1, 1);
    g.fillStyle = rgba(C.deep, 0.5);
    g.fillRect(5, 1, 1, 1);
    this.pattern = this.g.createPattern(c, 'repeat');
    return this.pattern;
  }

  private draw(now: number): void {
    const g = this.g;
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    if (cw <= 0 || ch <= 0) return;
    if (this.dirty && this.s) this.rebuildStatic();
    this.needsDraw = false;
    const sc = this.scale;
    let shakeX = 0;
    let shakeY = 0;
    if (now < this.shakeUntil) {
      shakeX = Math.round((Math.random() - 0.5) * 3) * sc;
      shakeY = Math.round((Math.random() - 0.5) * 3) * sc;
    }
    const tx = -Math.round(this.camX * sc) + shakeX;
    const ty = -Math.round(this.camY * sc) + shakeY;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.imageSmoothingEnabled = false;
    g.fillStyle = PAL.night;
    g.fillRect(0, 0, cw, ch);
    g.setTransform(sc, 0, 0, sc, tx, ty);
    const pat = this.ensurePattern();
    if (pat) {
      g.fillStyle = pat;
      g.fillRect(Math.floor(this.camX) - 8, Math.floor(this.camY) - 8, cw / sc + 16, ch / sc + 16);
    }
    const s = this.s;
    if (!s || !this.staticLayer) return;
    const W = s.w * TILE;
    const H = s.h * TILE;
    // frame + drop shadow
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.fillRect(3, 3, W, H);
    g.fillStyle = PAL.ink;
    g.fillRect(-1, -1, W + 2, H + 2);
    g.drawImage(this.staticLayer, 0, 0);

    const t = this.reduced ? 0 : this.t;
    const so = this.season();
    g.save();
    g.beginPath();
    g.rect(0, 0, W, H);
    g.clip();
    this.drawWater(g, t);
    this.drawReeds(g, t);
    this.drawBoats(g, t);
    if (!this.reduced) {
      this.life.drawSmoke(g, t, so);
      this.life.drawWalkers(g, t);
      this.life.drawGulls(g, t);
      this.life.drawDust(g);
      if (so === 3) this.life.drawSnow(g);
      this.life.drawPuffs(g, now);
    } else {
      this.life.drawWalkers(g, 0);
    }
    // season grading + storm haze
    const tint = so === 0 ? rgba(C.grass, 0.05) : so === 1 ? rgba(C.gold, 0.07) : so === 2 ? rgba(C.rust, 0.08) : rgba(C.foam, 0.13);
    g.fillStyle = tint;
    g.fillRect(0, 0, W, H);
    if (this.stormActive(now)) {
      const heavy = now < this.stormUntil;
      g.fillStyle = rgba(C.sandDark, (heavy ? 0.22 : 0.1) + (this.reduced ? 0 : Math.sin(t * 3) * 0.04));
      g.fillRect(0, 0, W, H);
    }
    g.restore();
    this.drawOverlays(g, t);
  }

  private drawWater(g: CanvasRenderingContext2D, t: number): void {
    const tr = this.terrain;
    const s = this.s;
    if (!tr || !s || !this.seed) return;
    // wave glints
    for (const sp of tr.sparkles) {
      const v = Math.sin(t * 1.3 + sp.phase);
      if (v < 0.5) continue;
      g.fillStyle = sp.deep ? PAL.sea : PAL.foam;
      g.globalAlpha = sp.deep ? 0.9 : 0.75;
      g.fillRect(sp.x + Math.round(Math.sin(t * 0.7 + sp.phase) * 2), sp.y, sp.len, 1);
    }
    g.globalAlpha = 1;
    // shore foam breathing
    const W = this.seed.W;
    const hA = this.seed.hA;
    for (let k = 0; k < tr.shore.length; k++) {
      const p = tr.shore[k]!;
      const h = hA[p]!;
      const v = Math.sin(t * 2.2 + h * 12);
      if (v > 0.55) g.fillStyle = PAL.foam;
      else if (v < -0.75) g.fillStyle = PAL.shallow;
      else continue;
      g.fillRect(p % W, Math.floor(p / W), 1, 1);
    }
    // river flow
    g.fillStyle = PAL.foam;
    for (const f of tr.flows) {
      const u = (t * 0.45 + f.phase) % 1;
      const along = u * 16 - 8;
      const side = (f.phase * 10 - 5) | 0;
      const x = f.x + 8 + f.dx * along + (f.dy !== 0 ? side : 0);
      const y = f.y + 8 + f.dy * along + (f.dx !== 0 ? side : 0);
      g.globalAlpha = 0.5 + 0.5 * Math.sin(u * Math.PI);
      g.fillRect(Math.round(x), Math.round(y), f.dx !== 0 ? 2 : 1, f.dy !== 0 ? 2 : 1);
    }
    g.globalAlpha = 1;
  }

  private drawReeds(g: CanvasRenderingContext2D, t: number): void {
    const s = this.s;
    if (!s) return;
    for (const i of this.reeds) {
      const b = s.tiles[i]?.b;
      if (!b) continue;
      const x0 = (i % s.w) * TILE;
      const y0 = Math.floor(i / s.w) * TILE;
      const dry = b.dry > 0;
      const inWater = isWater(s, i);
      if (!inWater) {
        g.fillStyle = PAL.crack;
        g.fillRect(x0 + 2, y0 + 14, 12, 1);
        g.fillStyle = PAL.soilDark;
        g.fillRect(x0 + 3, y0 + 15, 10, 1);
      } else {
        g.fillStyle = rgba(C.foam, 0.6);
        g.fillRect(x0 + 1, y0 + 14, 14, 1);
      }
      for (let k = 0; k < 7; k++) {
        const sx = x0 + 1 + k * 2 + (tileHash(i, 50 + k) < 0.5 ? 0 : 1);
        const hgt = 7 + Math.floor(tileHash(i, 60 + k) * 6);
        const ph = tileHash(i, 70 + k) * 6;
        for (let j = 0; j < hgt; j++) {
          const sway = j > hgt * 0.45 ? Math.round(Math.sin(t * 1.6 + ph + k * 0.6) * ((j / hgt) * 1.6)) : 0;
          g.fillStyle = j < hgt * 0.35 ? PAL.leaf : dry ? (j % 3 === 0 ? PAL.gold : PAL.sandDark) : j % 4 === 0 ? PAL.grass : PAL.reed;
          g.fillRect(sx + sway, y0 + 14 - j, 1, 1);
        }
        if (k % 2 === 0) {
          const sway = Math.round(Math.sin(t * 1.6 + ph + k * 0.6) * 1.6);
          g.fillStyle = PAL.woodDark;
          g.fillRect(sx + sway, y0 + 14 - hgt - 1, 1, 2);
        }
      }
    }
  }

  private drawBoats(g: CanvasRenderingContext2D, t: number): void {
    for (const b of this.boats) {
      const bob = Math.round(Math.sin(t * 2 + b.phase));
      g.fillStyle = rgba(C.deep, 0.45);
      g.fillRect(b.x + 1, b.y + 8, 10, 1);
      g.drawImage(namedSprite('boat', BOAT, b.flip).canvas, b.x, b.y + bob);
    }
  }

  private outline(g: CanvasRenderingContext2D, i: number, colour: string, inset = 0): void {
    const s = this.s!;
    const x = (i % s.w) * TILE + inset;
    const y = Math.floor(i / s.w) * TILE + inset;
    const w = TILE - inset * 2;
    g.fillStyle = colour;
    g.fillRect(x, y, w, 1);
    g.fillRect(x, y + w - 1, w, 1);
    g.fillRect(x, y, 1, w);
    g.fillRect(x + w - 1, y, 1, w);
  }

  private ghost(tool: ToolId): Sprite | null {
    return toolSprite(tool, this.season());
  }

  private drawOverlays(g: CanvasRenderingContext2D, t: number): void {
    const s = this.s;
    if (!s) return;
    const pulse = this.reduced ? 1 : 0.55 + 0.45 * Math.sin(t * 4.5);

    // dike line marker
    if (s.dike.unlocked && !s.dike.started) {
      const active = this.tool === 'dike';
      g.fillStyle = rgba(C.gold, active ? 0.35 + 0.4 * pulse : 0.55);
      for (const i of s.dikeLine) {
        const x = (i % s.w) * TILE + 7;
        const y = Math.floor(i / s.w) * TILE;
        const off = this.reduced ? 0 : Math.floor(t * 6) % 4;
        for (let k = -off; k < TILE; k += 4) if (k >= 0) g.fillRect(x, y + k, 2, 2);
      }
      if (active) for (const i of s.dikeLine) this.outline(g, i, rgba(C.gold, pulse));
    }

    // tutorial / UI highlights
    if (this.highlights) {
      for (const i of this.highlights) {
        if (i < 0 || i >= s.tiles.length) continue;
        this.outline(g, i, rgba(C.gold, pulse));
        this.outline(g, i, rgba(C.gold, pulse * 0.5), 1);
      }
    }

    // placement preview
    if (this.tool && this.hover !== null) {
      const key = `${this.version}|${this.tool}|${this.hover}`;
      if (key !== this.previewKey) {
        this.previewKey = key;
        this.previewOk = canUse(s, this.tool, this.hover).ok;
      }
      const ok = this.previewOk;
      const sp = this.ghost(this.tool);
      const x = (this.hover % s.w) * TILE;
      const y = Math.floor(this.hover / s.w) * TILE;
      if (sp && this.tool !== 'demolish') {
        g.globalAlpha = ok ? 0.65 : 0.4;
        g.drawImage(sp.canvas, x, y);
        g.globalAlpha = 1;
      }
      if (this.tool === 'demolish' && sp) g.drawImage(sp.canvas, x, y);
      const col = ok ? PAL.grass : PAL.danger;
      this.outline(g, this.hover, col);
      this.outline(g, this.hover, ok ? rgba(C.grass, 0.5) : rgba(C.danger, 0.5), 1);
    } else if (this.hover !== null) {
      this.outline(g, this.hover, rgba(C.cotton, 0.9));
    }

    // selection: gold outline + corner brackets just outside the tile
    if (this.selected !== null && this.selected >= 0 && this.selected < s.tiles.length) {
      const i = this.selected;
      this.outline(g, i, PAL.gold);
      const x = (i % s.w) * TILE;
      const y = Math.floor(i / s.w) * TILE;
      g.fillStyle = PAL.gold;
      const L = 4;
      for (const [cx, cy, dx, dy] of [
        [x - 2, y - 2, 1, 1],
        [x + TILE + 1, y - 2, -1, 1],
        [x - 2, y + TILE + 1, 1, -1],
        [x + TILE + 1, y + TILE + 1, -1, -1],
      ] as const) {
        g.fillRect(dx > 0 ? cx : cx - L + 1, cy, L, 1);
        g.fillRect(cx, dy > 0 ? cy : cy - L + 1, 1, L);
      }
    }
  }
}

/** Neighbour indices in N, E, S, W order (-1 outside the map). */
function n4Dirs(s: GameState, i: number): [number, number, number, number] {
  const x = i % s.w;
  const y = Math.floor(i / s.w);
  return [y > 0 ? i - s.w : -1, x < s.w - 1 ? i + 1 : -1, y < s.h - 1 ? i + s.w : -1, x > 0 ? i - 1 : -1];
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

const REEDS_ICON = [
  '................',
  '...e....e...e...',
  '...e..e.e...e...',
  '...r..e.r..er...',
  '..rr..r.r..r....',
  '...r..r.rr.r..e.',
  '...r.rr..r.r..e.',
  '..lr..r..r.rr.r.',
  '...r..r..r..r.r.',
  '..ll..r.ll..r.r.',
  '...l.ll..l..l.r.',
  '...l..l..l..l.l.',
  '..ll..l..l.ll.l.',
  '...l..l..l..l.l.',
  '.ffffffffffffff.',
  '................',
];

const LEACH_ICON = [
  '................',
  '.......k........',
  '......kfk.......',
  '......kfk.......',
  '.....kfhfk......',
  '.....kfhhk......',
  '....kfhhhSk.....',
  '....kfhhhSk.....',
  '...kfhhhhSSk....',
  '...kfhhhhSSk....',
  '...kfhhhSSSk....',
  '....kfhSSSk.....',
  '.....kkkkk......',
  '................',
  '..ssssssssssss..',
  '................',
];

const DEMOLISH_ICON = [
  'xx............xx',
  'xxx..........xxx',
  '.xxx........xxx.',
  '..xxx......xxx..',
  '...xxx....xxx...',
  '....xxx..xxx....',
  '.....xxxxxx.....',
  '......xxxx......',
  '......xxxx......',
  '.....xxxxxx.....',
  '....xxx..xxx....',
  '...xxx....xxx...',
  '..xxx......xxx..',
  '.xxx........xxx.',
  'xxx..........xxx',
  'xx............xx',
];

/** Sprite used for the placement ghost and the build palette icons. */
export function toolSprite(tool: ToolId, so = 1): Sprite | null {
  switch (tool) {
    case 'house':
      return houseSprite(0);
    case 'dock':
      return namedSprite('dock', DOCK);
    case 'wheat':
    case 'melon':
    case 'cotton':
      return fieldSprite(tool, so, 0);
    case 'canal':
      return canalSprite([true, false, true, false], true, false);
    case 'saxaul':
      return namedSprite('saxaul-young', SAXAUL_YOUNG);
    case 'clinic':
      return namedSprite('clinic', CLINIC);
    case 'workshop':
      return namedSprite('workshop', WORKSHOP);
    case 'dike':
      return dikeSprite(1, 0);
    case 'reeds':
      return namedSprite('reeds-icon', REEDS_ICON);
    case 'leach':
      return namedSprite('leach-icon', LEACH_ICON);
    case 'demolish':
      return namedSprite('demolish-icon', DEMOLISH_ICON);
    default:
      return null;
  }
}
