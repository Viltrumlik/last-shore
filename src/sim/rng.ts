// Deterministic RNG (mulberry32). The state lives inside GameState so that a
// saved game continues with exactly the same random sequence.

export interface RngHolder {
  rng: number;
}

export function mulberry(state: number): [number, number] {
  let t = (state + 0x6d2b79f5) >>> 0;
  const next = t;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return [value, next];
}

/** Uniform float in [0, 1), advancing the holder's RNG state. */
export function rand(h: RngHolder): number {
  const [v, next] = mulberry(h.rng);
  h.rng = next;
  return v;
}

export function randInt(h: RngHolder, min: number, max: number): number {
  return min + Math.floor(rand(h) * (max - min + 1));
}

export function chance(h: RngHolder, p: number): boolean {
  return rand(h) < p;
}

/** Round a non-negative real number up or down at random so the expectation is preserved. */
export function roundStoch(h: RngHolder, x: number): number {
  if (x <= 0) return 0;
  const f = Math.floor(x);
  return f + (rand(h) < x - f ? 1 : 0);
}

export function pickWeighted<T>(h: RngHolder, items: readonly T[], weight: (t: T) => number): T | null {
  let total = 0;
  for (const it of items) total += Math.max(0, weight(it));
  if (total <= 0) return null;
  let r = rand(h) * total;
  for (const it of items) {
    r -= Math.max(0, weight(it));
    if (r < 0) return it;
  }
  return items[items.length - 1] ?? null;
}

/** Stateless hash noise in [0, 1) used by map generation and the renderer. */
export function hash2(x: number, y: number, seed: number): number {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 2147483647)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return h / 4294967296;
}

/** Smooth value noise in [0, 1). */
export function valueNoise(x: number, y: number, scale: number, seed: number): number {
  const fx = x / scale;
  const fy = y / scale;
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const tx = fx - x0;
  const ty = fy - y0;
  const sx = tx * tx * (3 - 2 * tx);
  const sy = ty * ty * (3 - 2 * ty);
  const a = hash2(x0, y0, seed);
  const b = hash2(x0 + 1, y0, seed);
  const c = hash2(x0, y0 + 1, seed);
  const d = hash2(x0 + 1, y0 + 1, seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}
