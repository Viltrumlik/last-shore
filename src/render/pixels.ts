// Low-level pixel helpers shared by the map renderer, portraits and illustrations:
// palette colours as RGB, a tiny ImageData-backed pixel buffer and sprites built from
// hand-authored character matrices.
import { PAL, type PalKey } from './palette';

export type RGB = readonly [number, number, number];

function hexToRgb(hex: string): RGB {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

/** Palette colours as RGB triples. */
export const C: Record<PalKey, RGB> = Object.fromEntries(
  (Object.keys(PAL) as PalKey[]).map((k) => [k, hexToRgb(PAL[k])]),
) as Record<PalKey, RGB>;

export function rgba(c: RGB, a = 1): string {
  return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
}

export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

export function ctx2d(c: HTMLCanvasElement): CanvasRenderingContext2D {
  const g = c.getContext('2d');
  if (!g) throw new Error('2D canvas not supported');
  g.imageSmoothingEnabled = false;
  return g;
}

/** A width x height RGBA buffer written pixel by pixel, then blitted with putImageData. */
export class PixelBuffer {
  readonly data: Uint8ClampedArray<ArrayBuffer>;
  constructor(
    readonly w: number,
    readonly h: number,
  ) {
    this.data = new Uint8ClampedArray(new ArrayBuffer(w * h * 4));
  }

  set(x: number, y: number, c: RGB, a = 255): void {
    x = Math.floor(x);
    y = Math.floor(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const o = (y * this.w + x) * 4;
    if (a >= 255) {
      this.data[o] = c[0];
      this.data[o + 1] = c[1];
      this.data[o + 2] = c[2];
      this.data[o + 3] = 255;
    } else {
      const k = a / 255;
      this.data[o] = this.data[o]! * (1 - k) + c[0] * k;
      this.data[o + 1] = this.data[o + 1]! * (1 - k) + c[1] * k;
      this.data[o + 2] = this.data[o + 2]! * (1 - k) + c[2] * k;
      this.data[o + 3] = Math.max(this.data[o + 3]!, a);
    }
  }

  rect(x: number, y: number, w: number, h: number, c: RGB, a = 255): void {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.set(xx, yy, c, a);
  }

  /** Filled ellipse centred on (cx, cy). */
  ellipse(cx: number, cy: number, rx: number, ry: number, c: RGB, a = 255): void {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.set(x, y, c, a);
      }
    }
  }

  line(x0: number, y0: number, x1: number, y1: number, c: RGB, a = 255): void {
    let x = Math.round(x0);
    let y = Math.round(y0);
    const tx = Math.round(x1);
    const ty = Math.round(y1);
    const dx = Math.abs(tx - x);
    const dy = -Math.abs(ty - y);
    const sx = x < tx ? 1 : -1;
    const sy = y < ty ? 1 : -1;
    let err = dx + dy;
    for (let guard = 0; guard < 4000; guard++) {
      this.set(x, y, c, a);
      if (x === tx && y === ty) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y += sy;
      }
    }
  }

  alpha(x: number, y: number): number {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
    return this.data[(y * this.w + x) * 4 + 3]!;
  }

  /** Draw a 1px outline in colour c around every opaque pixel (on transparent neighbours). */
  outline(c: RGB): void {
    const mark: number[] = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.alpha(x, y) > 0) continue;
        if (this.alpha(x - 1, y) > 128 || this.alpha(x + 1, y) > 128 || this.alpha(x, y - 1) > 128 || this.alpha(x, y + 1) > 128) {
          mark.push(x, y);
        }
      }
    }
    for (let k = 0; k < mark.length; k += 2) this.set(mark[k]!, mark[k + 1]!, c);
  }

  toImageData(): ImageData {
    return new ImageData(this.data, this.w, this.h);
  }

  toCanvas(): HTMLCanvasElement {
    const c = makeCanvas(this.w, this.h);
    ctx2d(c).putImageData(this.toImageData(), 0, 0);
    return c;
  }
}

/** Character -> palette key used by all sprite matrices ('.' and ' ' are transparent). */
export const CHARMAP: Record<string, PalKey> = {
  k: 'ink',
  n: 'night',
  D: 'deep',
  S: 'sea',
  h: 'shallow',
  f: 'foam',
  s: 'salt',
  b: 'seabed',
  c: 'crack',
  a: 'sand',
  A: 'sandDark',
  o: 'soil',
  O: 'soilDark',
  g: 'grass',
  l: 'leaf',
  r: 'reed',
  w: 'cotton',
  d: 'wood',
  e: 'woodDark',
  R: 'roof',
  y: 'clay',
  u: 'rust',
  G: 'gold',
  x: 'danger',
};

export interface Sprite {
  w: number;
  h: number;
  canvas: HTMLCanvasElement;
}

const spriteCache = new Map<string, Sprite>();

/** Rasterise a character matrix into a cached canvas. Rows shorter than the widest are padded. */
export function sprite(name: string, rows: readonly string[], flip = false): Sprite {
  const key = flip ? `${name}#f` : name;
  const hit = spriteCache.get(key);
  if (hit) return hit;
  const w = Math.max(...rows.map((r) => r.length));
  const h = rows.length;
  const buf = new PixelBuffer(w, h);
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x]!;
      const k = CHARMAP[ch];
      if (!k) continue;
      buf.set(flip ? w - 1 - x : x, y, C[k]);
    }
  });
  const sp = { w, h, canvas: buf.toCanvas() };
  spriteCache.set(key, sp);
  return sp;
}

/** Deterministic small hash for per-tile choices. */
export function tileHash(i: number, salt: number): number {
  let h = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(salt, 0xc2b2ae35);
  h ^= h >>> 13;
  h = Math.imul(h, 0x27d4eb2f);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
