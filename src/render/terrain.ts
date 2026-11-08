// Static terrain layer: every map pixel is coloured from the palette with seeded noise,
// jittered tile borders (so the grid never shows), depth-shaded water, cracked salty
// seabed, rippled sand and grassy soil. Also returns the sites the animated layer uses.
// Everything that depends only on the seed is precomputed once in a SeedCache, so a
// rebuild after a season costs only a few milliseconds.
import { DEEP_DEPTH, isWater, tileKind, waterDepth } from '../sim/grid';
import { hash2 } from '../sim/rng';
import type { GameState } from '../sim/types';
import { TILE } from './palette';
import { C, PixelBuffer, type RGB } from './pixels';

export interface SeedCache {
  seed: number;
  W: number;
  H: number;
  /** tile index each pixel samples its terrain from (jittered borders) */
  sample: Int32Array;
  hA: Float32Array;
  hB: Float32Array;
  crack: Uint8Array;
  ripple: Uint8Array;
  wave: Uint8Array;
  lush: Float32Array;
  /** 0 none, 1 grass, 2 leaf: grass-tuft shape */
  tuft: Uint8Array;
  /** random value of the tuft's cell, compared with the tile's grass probability */
  tuftH: Float32Array;
}

/** Smooth value noise over the whole map from a precomputed lattice. */
function noiseField(W: number, H: number, sx: number, sy: number, seed: number): Float32Array {
  const gw = Math.ceil(W / sx) + 2;
  const gh = Math.ceil(H / sy) + 2;
  const lat = new Float32Array(gw * gh);
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) lat[j * gw + i] = hash2(i, j, seed);
  const out = new Float32Array(W * H);
  for (let y = 0; y < H; y++) {
    const fy = y / sy;
    const y0 = Math.floor(fy);
    let ty = fy - y0;
    ty = ty * ty * (3 - 2 * ty);
    for (let x = 0; x < W; x++) {
      const fx = x / sx;
      const x0 = Math.floor(fx);
      let tx = fx - x0;
      tx = tx * tx * (3 - 2 * tx);
      const a = lat[y0 * gw + x0]!;
      const b = lat[y0 * gw + x0 + 1]!;
      const c = lat[(y0 + 1) * gw + x0]!;
      const d = lat[(y0 + 1) * gw + x0 + 1]!;
      out[y * W + x] = a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
    }
  }
  return out;
}

export function makeSeedCache(seed: number, w: number, h: number): SeedCache {
  const W = w * TILE;
  const H = h * TILE;
  const n = W * H;
  const sample = new Int32Array(n);
  const hA = new Float32Array(n);
  const hB = new Float32Array(n);
  const crack = new Uint8Array(n);
  const ripple = new Uint8Array(n);
  const wave = new Uint8Array(n);
  const tuft = new Uint8Array(n);
  const tuftH = new Float32Array(n);
  const nx = noiseField(W, H, 6, 6, seed + 201);
  const ny = noiseField(W, H, 6, 6, seed + 202);
  const rip = noiseField(W, H, 9, 9, seed + 207);
  const wv = noiseField(W, H, 5, 5 / 3, seed + 210);
  const lush = noiseField(W, H, 7, 7, seed + 305);

  // Voronoi cracks: jittered points per cell, computed once
  const cell = 7;
  const gw = Math.ceil(W / cell) + 3;
  const gh = Math.ceil(H / cell) + 3;
  const ptx = new Float32Array(gw * gh);
  const pty = new Float32Array(gw * gh);
  for (let j = 0; j < gh; j++) {
    for (let i = 0; i < gw; i++) {
      ptx[j * gw + i] = (i - 1) * cell + hash2(i, j, seed + 205) * cell;
      pty[j * gw + i] = (j - 1) * cell + hash2(i, j, seed + 206) * cell;
    }
  }

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const p = y * W + x;
      const a = hash2(x, y, seed + 203);
      const b = hash2(x, y, seed + 204);
      hA[p] = a;
      hB[p] = b;
      const ox = Math.round((nx[p]! - 0.5) * 7 + (a - 0.5) * 1.2);
      const oy = Math.round((ny[p]! - 0.5) * 7 + (b - 0.5) * 1.2);
      const sxp = Math.min(w - 1, Math.max(0, Math.floor((x + ox) / TILE)));
      const syp = Math.min(h - 1, Math.max(0, Math.floor((y + oy) / TILE)));
      sample[p] = syp * w + sxp;

      const cx = Math.floor(x / cell) + 1;
      const cy = Math.floor(y / cell) + 1;
      let d1 = 1e9;
      let d2 = 1e9;
      for (let j = -1; j <= 1; j++) {
        for (let i = -1; i <= 1; i++) {
          const k = (cy + j) * gw + cx + i;
          const dx = ptx[k]! - x;
          const dy = pty[k]! - y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < d1) {
            d2 = d1;
            d1 = d;
          } else if (d < d2) d2 = d;
        }
      }
      crack[p] = d2 - d1 < 0.9 ? 1 : 0;
      ripple[p] = Math.sin((x + ox * 2) * 0.28 + y * 0.85 + rip[p]! * 5) > 0.86 ? 1 : 0;
      wave[p] = wv[p]! > 0.68 ? 1 : 0;

      // grass tufts: one candidate per 5x5 cell
      const tcx = Math.floor(x / 5);
      const tcy = Math.floor(y / 5);
      const tx = tcx * 5 + 1 + Math.floor(hash2(tcx, tcy, seed + 302) * 3);
      const ty = tcy * 5 + 1 + Math.floor(hash2(tcx, tcy, seed + 303) * 3);
      tuftH[p] = hash2(tcx, tcy, seed + 301);
      if ((x === tx && (y === ty || y === ty + 1))) tuft[p] = 1;
      else if ((x === tx - 1 || x === tx + 1) && y === ty + 1) tuft[p] = 2;
    }
  }
  return { seed, W, H, sample, hA, hB, crack, ripple, wave, lush, tuft, tuftH };
}

export const M_LAND = 0;
export const M_SEA = 1;
export const M_RIVER = 2;
export const M_SEABED = 3;

export interface Sparkle {
  x: number;
  y: number;
  phase: number;
  len: number;
  deep: boolean;
}

export interface Flow {
  x: number;
  y: number;
  dx: number;
  dy: number;
  phase: number;
}

export interface TerrainResult {
  buf: PixelBuffer;
  mask: Uint8Array;
  /** pixel indices of sea-water pixels touching the shore */
  shore: Int32Array;
  sparkles: Sparkle[];
  flows: Flow[];
}

/** Changes whenever the terrain image would change (water level, salinity, moisture). */
export function terrainSignature(s: GameState): string {
  let h = 2166136261;
  for (let i = 0; i < s.tiles.length; i++) {
    const t = s.tiles[i]!;
    const k = (Math.round(t.sal) * 131 + (t.moist >> 3) * 7 + (isWater(s, i) ? 1 : 0)) | 0;
    h = Math.imul(h ^ k, 16777619);
    h = Math.imul(h ^ Math.round(waterDepth(s, i) * 20), 16777619);
  }
  return `${s.seed}|${s.dike.complete ? 1 : 0}|${h >>> 0}`;
}

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
function bayer(x: number, y: number): number {
  return (BAYER[(y & 3) * 4 + (x & 3)]! + 0.5) / 16;
}

/** Depth-banded water with ordered dithering between bands. */
function waterColour(dd: number, x: number, y: number, fresh: boolean): RGB {
  if (fresh) dd -= 0.6;
  const b = bayer(x, y);
  if (dd < 0.45) return C.shallow;
  if (dd < 0.85) return b < (dd - 0.45) / 0.4 ? C.sea : C.shallow;
  if (dd < 2.2) return C.sea;
  if (dd < 3.0) return b < (dd - 2.2) / 0.8 ? C.deep : C.sea;
  if (dd < 6.5) return C.deep;
  return b < Math.min(0.35, (dd - 6.5) / 6) ? C.night : C.deep;
}

const K_DEEP = 0;
const K_SHALLOW = 1;
const K_SEABED = 2;
const K_SAND = 3;
const K_SOIL = 4;
const K_RIVER = 5;
const KIND_CODE: Record<string, number> = { deep: K_DEEP, shallow: K_SHALLOW, seabed: K_SEABED, sand: K_SAND, soil: K_SOIL, river: K_RIVER };

export function buildTerrain(s: GameState, sc: SeedCache): TerrainResult {
  const { W, H } = sc;
  const buf = new PixelBuffer(W, H);
  const data = buf.data;
  const mask = new Uint8Array(W * H);
  const n = s.tiles.length;
  const tw = s.w;
  const th = s.h;
  const kind = new Uint8Array(n);
  const depth = new Float32Array(n);
  const fresh = new Uint8Array(n);
  const sal = new Float32Array(n);
  const grassP = new Float32Array(n);
  const lushK = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const k = KIND_CODE[tileKind(s, i)]!;
    kind[i] = k;
    const t = s.tiles[i]!;
    if (k === K_DEEP || k === K_SHALLOW) depth[i] = waterDepth(s, i);
    else if (k === K_RIVER) depth[i] = 0.4;
    else if (k === K_SEABED) depth[i] = -0.2;
    else depth[i] = -0.6;
    fresh[i] = t.bay && s.dike.complete ? 1 : 0;
    sal[i] = t.sal;
    grassP[i] = Math.max(0.05, 0.5 * (0.4 + t.moist / 100) * (1 - t.sal / 75));
    lushK[i] = (0.5 + t.moist / 100) * (1 - t.sal / 80);
  }

  const put = (p: number, c: RGB) => {
    const o = p * 4;
    data[o] = c[0];
    data[o + 1] = c[1];
    data[o + 2] = c[2];
    data[o + 3] = 255;
  };

  for (let y = 0; y < H; y++) {
    const fy = (y + 0.5) / TILE - 0.5;
    const y0 = Math.max(0, Math.min(th - 1, Math.floor(fy)));
    const y1 = Math.min(th - 1, y0 + 1);
    const ay = Math.max(0, Math.min(1, fy - y0));
    for (let x = 0; x < W; x++) {
      const p = y * W + x;
      const ti = sc.sample[p]!;
      const k = kind[ti]!;
      const hA = sc.hA[p]!;
      const hB = sc.hB[p]!;
      let col: RGB;
      if (k === K_DEEP || k === K_SHALLOW) {
        mask[p] = M_SEA;
        const fx = (x + 0.5) / TILE - 0.5;
        const x0 = Math.max(0, Math.min(tw - 1, Math.floor(fx)));
        const x1 = Math.min(tw - 1, x0 + 1);
        const ax = Math.max(0, Math.min(1, fx - x0));
        const dd = Math.max(
          0.05,
          (depth[y0 * tw + x0]! * (1 - ax) + depth[y0 * tw + x1]! * ax) * (1 - ay) + (depth[y1 * tw + x0]! * (1 - ax) + depth[y1 * tw + x1]! * ax) * ay,
        );
        col = waterColour(dd, x, y, fresh[ti] === 1);
        if (y % 4 === Math.floor(x / 23) % 4 && sc.wave[p]) {
          col = col === C.deep ? C.sea : col === C.sea ? C.shallow : col === C.night ? C.deep : C.foam;
        }
      } else if (k === K_RIVER) {
        mask[p] = M_RIVER;
        col = hA < 0.28 ? C.shallow : C.sea;
      } else if (k === K_SEABED) {
        mask[p] = M_SEABED;
        col = C.seabed;
        if (sc.crack[p]) col = C.crack;
        else if (hB < (sal[ti]! - 40) / 110) col = C.salt;
        else if (hA > 0.994) col = C.foam;
        else if (hA < 0.05) col = C.sandDark;
      } else if (k === K_SAND) {
        col = C.sand;
        if (sc.ripple[p] || hA < 0.04) col = C.sandDark;
        else if (hA > 0.994) col = C.crack;
        if (sal[ti]! > 45 && hB > 1 - (sal[ti]! - 45) / 100) col = C.salt;
      } else {
        col = hA < 0.2 ? C.soilDark : C.soil;
        const lush = sc.lush[p]! * lushK[ti]!;
        if (lush > 0.55 && hB < (lush - 0.55) * 1.6) col = hA < 0.5 ? C.grass : C.leaf;
        const tf = sc.tuft[p]!;
        if (tf && sc.tuftH[p]! < grassP[ti]!) col = tf === 1 ? C.grass : C.leaf;
        if (sal[ti]! > 45 && hB > 1 - (sal[ti]! - 45) / 90) col = C.salt;
      }
      put(p, col);
    }
  }

  // sea mask dilated by 2 px (for wet mud next to the water)
  const nearSea = new Uint8Array(W * H);
  const tmp = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let v = 0;
      for (let d = -2; d <= 2 && !v; d++) {
        const xx = x + d;
        if (xx >= 0 && xx < W && mask[y * W + xx] === M_SEA) v = 1;
      }
      tmp[y * W + x] = v;
    }
  }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let v = 0;
      for (let d = -2; d <= 2 && !v; d++) {
        const yy = y + d;
        if (yy >= 0 && yy < H && tmp[yy * W + x]) v = 1;
      }
      nearSea[y * W + x] = v;
    }
  }

  // shore foam, river banks and wet mud
  const shore: number[] = [];
  const at = (x: number, y: number, m: number) => (x < 0 || y < 0 || x >= W || y >= H ? m : mask[y * W + x]!);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const p = y * W + x;
      const m = mask[p]!;
      if (m === M_SEA) {
        if (at(x + 1, y, m) !== M_SEA || at(x - 1, y, m) !== M_SEA || at(x, y + 1, m) !== M_SEA || at(x, y - 1, m) !== M_SEA) {
          shore.push(p);
          put(p, sc.hA[p]! < 0.7 ? C.foam : C.shallow);
        }
      } else if (m === M_LAND) {
        if (at(x + 1, y, m) === M_RIVER || at(x - 1, y, m) === M_RIVER || at(x, y + 1, m) === M_RIVER || at(x, y - 1, m) === M_RIVER) {
          if (sc.hA[p]! < 0.7) put(p, C.soilDark);
        }
      } else if (m === M_SEABED) {
        if (nearSea[p] && !sc.crack[p]) put(p, sc.hB[p]! < 0.5 ? C.crack : C.sandDark);
      } else if (m === M_RIVER) {
        if (at(x + 1, y, m) === M_LAND || at(x - 1, y, m) === M_LAND || at(x, y + 1, m) === M_LAND || at(x, y - 1, m) === M_LAND) put(p, C.shallow);
      }
    }
  }

  // animation sites
  const sparkles: Sparkle[] = [];
  for (let i = 0; i < n; i++) {
    if (kind[i] !== K_DEEP && kind[i] !== K_SHALLOW) continue;
    const tx = (i % tw) * TILE;
    const ty = Math.floor(i / tw) * TILE;
    for (let k = 0; k < 2; k++) {
      sparkles.push({
        x: tx + 2 + Math.floor(hash2(i, k, sc.seed + 401) * 10),
        y: ty + 2 + Math.floor(hash2(i, k, sc.seed + 402) * 12),
        phase: hash2(i, k, sc.seed + 403) * Math.PI * 2,
        len: 2 + Math.floor(hash2(i, k, sc.seed + 404) * 3),
        deep: depth[i]! > DEEP_DEPTH,
      });
    }
  }
  const flows: Flow[] = [];
  for (let r = 0; r < s.river.length; r++) {
    const i = s.river[r]!;
    const next = s.river[r + 1];
    const x = (i % tw) * TILE;
    const y = Math.floor(i / tw) * TILE;
    let dx = 1;
    let dy = 0;
    if (next !== undefined) {
      dx = (next % tw) - (i % tw);
      dy = Math.floor(next / tw) - Math.floor(i / tw);
    }
    for (let k = 0; k < 3; k++) flows.push({ x, y, dx, dy, phase: hash2(i, k, sc.seed + 411) });
  }
  return { buf, mask, shore: Int32Array.from(shore), sparkles, flows };
}
