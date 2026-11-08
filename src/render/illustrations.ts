// Procedural pixel illustrations: the seven ending scenes (160x90) and the animated
// title-screen backdrop.
import { hash2, valueNoise } from '../sim/rng';
import { C, PixelBuffer, ctx2d, makeCanvas, type RGB } from './pixels';
import { BOAT, stamp } from './sprites';

export type EndingScene = 'sea' | 'delta' | 'cotton' | 'graveyard' | 'exodus' | 'famine' | 'removed';

const SW = 160;
const SH = 90;

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
function bayer(x: number, y: number): number {
  return (BAYER[(y & 3) * 4 + (x & 3)]! + 0.5) / 16;
}

/** Vertical dithered gradient through a list of palette colours. */
function gradient(b: PixelBuffer, x0: number, y0: number, x1: number, y1: number, cols: RGB[]): void {
  const span = Math.max(1, y1 - y0);
  for (let y = y0; y < y1; y++) {
    const f = ((y - y0) / span) * (cols.length - 1);
    const i = Math.min(cols.length - 2, Math.floor(f));
    const frac = f - i;
    for (let x = x0; x < x1; x++) b.set(x, y, frac > bayer(x, y) ? cols[i + 1]! : cols[i]!);
  }
}

function hills(b: PixelBuffer, base: number, amp: number, scale: number, col: RGB, seed: number, x0 = 0, x1 = SW): void {
  for (let x = x0; x < x1; x++) {
    const h = Math.round(base - valueNoise(x, 0, scale, seed) * amp);
    for (let y = h; y < base + 1; y++) b.set(x, y, col);
  }
}

function cracked(b: PixelBuffer, y0: number, y1: number, base: RGB, crack: RGB, salt: RGB | null, seed: number, cell = 9): void {
  for (let y = y0; y < y1; y++) {
    const persp = 0.5 + ((y - y0) / Math.max(1, y1 - y0)) * 1.2;
    for (let x = 0; x < SW; x++) {
      const px = x / persp;
      const py = (y - y0) * 1.8 / persp;
      const cx = Math.floor(px / cell);
      const cy = Math.floor(py / cell);
      let d1 = 1e9;
      let d2 = 1e9;
      for (let j = -1; j <= 1; j++) {
        for (let i = -1; i <= 1; i++) {
          const qx = (cx + i) * cell + hash2(cx + i, cy + j, seed) * cell;
          const qy = (cy + j) * cell + hash2(cx + i, cy + j, seed + 1) * cell;
          const d = Math.hypot(qx - px, qy - py);
          if (d < d1) {
            d2 = d1;
            d1 = d;
          } else if (d < d2) d2 = d;
        }
      }
      let col = base;
      if (d2 - d1 < 0.65 + persp * 0.25) col = crack;
      else if (salt && hash2(x, y, seed + 7) < 0.12) col = salt;
      b.set(x, y, col);
    }
  }
}

function person(b: PixelBuffer, x: number, y: number, bodyCol: RGB, headCol: RGB, frame: number, bundle = false): void {
  // 5 x 9 walking figure, feet at y
  b.set(x + 2, y - 8, headCol);
  b.set(x + 1, y - 7, C.clay);
  b.set(x + 2, y - 7, C.clay);
  b.rect(x + 1, y - 6, 3, 3, bodyCol);
  b.set(x, y - 5, bodyCol);
  b.set(x + 4, y - 5, bodyCol);
  b.rect(x + 1, y - 3, 3, 1, bodyCol);
  if (frame === 0) {
    b.set(x + 1, y - 2, C.ink);
    b.set(x + 3, y - 2, C.ink);
    b.set(x, y - 1, C.ink);
    b.set(x + 4, y - 1, C.ink);
  } else {
    b.set(x + 2, y - 2, C.ink);
    b.set(x + 2, y - 1, C.ink);
    b.set(x + 1, y - 1, C.ink);
  }
  if (bundle) {
    b.rect(x + 3, y - 9, 3, 3, C.sandDark);
    b.set(x + 4, y - 8, C.wood);
  }
}

function gullV(b: PixelBuffer, x: number, y: number, col: RGB): void {
  b.set(x, y, col);
  b.set(x + 1, y + 1, col);
  b.set(x + 2, y, col);
  b.set(x + 3, y + 1, col);
  b.set(x + 4, y, col);
}

function reedsClump(b: PixelBuffer, x: number, base: number, n: number, seed: number, dry = false): void {
  for (let k = 0; k < n; k++) {
    const sx = x + Math.floor(hash2(k, 1, seed) * n * 1.6);
    const h = 6 + Math.floor(hash2(k, 2, seed) * 9);
    for (let j = 0; j < h; j++) b.set(sx + (j > h * 0.7 ? 1 : 0), base - j, j < h * 0.3 ? C.leaf : dry ? C.sandDark : C.reed);
    if (k % 2 === 0) {
      b.set(sx + 1, base - h, C.woodDark);
      b.set(sx + 1, base - h - 1, C.woodDark);
    }
  }
}

const SHIP_BIG = [
  '..............k.....................',
  '.............kek....................',
  '.............kek.......kk...........',
  '.........kkkkkekkkk....ke...........',
  '.........kuuuuuuuuk....ke...........',
  '.........kuukkukkuk...kkekk.........',
  '.kkkkkkkkkuuuuuuuuukkkkuukkkkkkkk...',
  '.kuuuuuuuuuuuueuuuuuuuuuuuuuuuuuk...',
  '..kuuuueuuuuuuuuuuuuuueuuuuuuuuuuk..',
  '..kuuuuuuuuuuuuuuuuuuuuuuuuueuuuk...',
  '...kuuuuuuuuxuuuuuuuuuuuuuuuuuuk....',
  '....kkuuuuuuuuuuuuuuuuuuuuuuukk.....',
  '......kkkkkkkkkkkkkkkkkkkkkkk.......',
];

const SHIP_SMALL = [
  '.......k.........',
  '......kek........',
  '....kkkekkk......',
  '.kkkkuuuuukkkkk..',
  '.kuuuuuueuuuuuk..',
  '..kuuuuuuuuuuk...',
  '...kkkkkkkkkk....',
];

const CART = [
  '....AAAAAA......',
  '...AdAdAAAk.....',
  '..kddddddddk....',
  '..keeeeeeeeekkkk',
  '...k.k..k.k.....',
  '..kek...kek.....',
  '..kkk...kkk.....',
];

const PELICAN = [
  '..ww........',
  '.wwwk.......',
  '..wwGGGGG...',
  '..ww.GGG....',
  '.wwwwww.....',
  'wwwwwwwss...',
  '.swwwwss....',
  '...k.k......',
];

const CAR = [
  '.....kkkkkkk......',
  '....knffffffk.....',
  '..kkknnnnnnnkkk...',
  '.knnnnnnnnnnnnnk..',
  '.kxnnnnnnnnnnnxk..',
  '.kkkkkkkkkkkkkkk..',
  '..kk.........kk...',
];

const TREE_DEAD = [
  '.e.......e....',
  '..e..e..e.....',
  '...e.e.e...e..',
  '....eee...e...',
  '.....ee..e....',
  '......eee.....',
  '......ee......',
  '......ee......',
  '......ee......',
  '.....eeee.....',
];

// ------------------------------------------------------------------ scenes

function sceneSea(b: PixelBuffer, seed: number): void {
  gradient(b, 0, 0, SW, 52, [C.night, C.roof, C.clay, C.gold]);
  b.ellipse(104, 50, 13, 13, C.gold);
  b.ellipse(104, 50, 9, 9, C.cotton);
  hills(b, 51, 7, 14, C.leaf, seed, 0, 70);
  hills(b, 51, 4, 9, C.woodDark, seed + 1, 0, 40);
  // town silhouette on the far shore
  for (let k = 0; k < 6; k++) {
    const x = 8 + k * 9;
    b.rect(x, 44 - (k % 3), 6, 7, C.ink);
    b.set(x + 2, 46, C.gold);
  }
  gradient(b, 0, 52, SW, SH, [C.sea, C.sea, C.deep]);
  // sun glitter path and waves
  for (let y = 53; y < SH; y++) {
    for (let x = 0; x < SW; x++) {
      const h = hash2(x, y, seed + 5);
      const nearSun = Math.abs(x - 104) < 6 + (y - 52) * 0.6;
      if (nearSun && h < 0.35 && (y + Math.floor(x / 3)) % 3 === 0) b.set(x, y, h < 0.15 ? C.cotton : C.gold);
      else if (h < 0.02) b.set(x, y, C.foam);
    }
  }
  // the Great Dike on the right
  for (let x = 118; x < SW; x++) {
    const y = Math.round(52 + (x - 118) * 0.32);
    b.rect(x, y - 3, 1, 5, x % 5 === 0 ? C.crack : C.seabed);
    b.set(x, y - 4, C.sandDark);
  }
  stamp(b, BOAT, 40, 62);
  stamp(b, BOAT, 70, 72, true);
  stamp(b, BOAT, 128, 77);
  gullV(b, 60, 20, C.ink);
  gullV(b, 72, 14, C.ink);
  gullV(b, 120, 26, C.ink);
  reedsClump(b, 0, SH - 1, 9, seed + 9);
  reedsClump(b, 146, SH - 1, 6, seed + 10);
}

function sceneDelta(b: PixelBuffer, seed: number): void {
  gradient(b, 0, 0, SW, 40, [C.shallow, C.foam, C.foam]);
  b.ellipse(126, 14, 6, 6, C.cotton);
  // marsh texture
  for (let y = 40; y < SH; y++) {
    for (let x = 0; x < SW; x++) {
      const n = valueNoise(x, y * 2, 6, seed);
      b.set(x, y, n < 0.35 ? C.leaf : n < 0.7 ? C.grass : C.reed);
    }
  }
  // meandering channels
  for (let c = 0; c < 3; c++) {
    for (let y = 40; y < SH; y++) {
      const w = 1 + Math.floor(((y - 40) / 50) * 5);
      const cx = Math.round(30 + c * 50 + Math.sin(y * 0.12 + c * 2) * 10 + (y - 40) * (c - 1) * 0.5);
      for (let x = cx - w; x <= cx + w; x++) b.set(x, y, Math.abs(x - cx) === w ? C.shallow : C.sea);
    }
  }
  b.rect(0, 39, SW, 2, C.shallow);
  for (let k = 0; k < 9; k++) reedsClump(b, 4 + k * 18, SH - 1 - (k % 3), 5, seed + k);
  stamp(b, PELICAN, 52, 54);
  stamp(b, PELICAN, 98, 60, true);
  stamp(b, PELICAN, 120, 50);
  gullV(b, 40, 18, C.night);
  gullV(b, 54, 24, C.night);
}

function sceneCotton(b: PixelBuffer, seed: number): void {
  gradient(b, 0, 0, SW, 40, [C.seabed, C.salt, C.salt]);
  b.ellipse(36, 16, 7, 7, C.cotton);
  // salt-white ground
  for (let y = 40; y < SH; y++) for (let x = 0; x < SW; x++) b.set(x, y, hash2(x, y, seed) < 0.3 ? C.seabed : C.salt);
  // rows of cotton converging to the horizon
  const vx = 96;
  for (let r = -10; r <= 10; r++) {
    for (let y = 41; y < SH; y++) {
      const f = (y - 40) / 50;
      const x = Math.round(vx + r * 14 * f);
      if (x < 0 || x >= SW) continue;
      const step = Math.max(1, Math.round(4 - f * 3));
      if (y % step !== 0) continue;
      b.set(x, y, C.leaf);
      if (f > 0.3) {
        b.set(x - 1, y, C.leaf);
        b.set(x, y - 1, C.cotton);
        if (f > 0.6) {
          b.set(x + 1, y - 1, C.cotton);
          b.set(x - 1, y - 2, C.cotton);
        }
      }
    }
  }
  // water tower and pylons in the haze
  b.rect(140, 22, 2, 18, C.crack);
  b.rect(136, 18, 10, 5, C.crack);
  for (const px of [20, 52]) {
    b.rect(px, 26, 1, 14, C.crack);
    b.rect(px - 3, 27, 7, 1, C.crack);
  }
  // haze
  for (let y = 30; y < 60; y++) for (let x = 0; x < SW; x++) if (bayer(x, y) < 0.18 * (1 - Math.abs(y - 45) / 15)) b.set(x, y, C.salt);
}

function sceneGraveyard(b: PixelBuffer, seed: number): void {
  gradient(b, 0, 0, SW, 50, [C.clay, C.gold, C.seabed]);
  b.ellipse(30, 30, 6, 6, C.cotton);
  cracked(b, 50, SH, C.seabed, C.crack, C.salt, seed);
  stamp(b, SHIP_SMALL, 112, 44);
  stamp(b, SHIP_SMALL, 24, 46, true);
  stamp(b, SHIP_BIG, 50, 58);
  // shadows under the hulls
  for (let x = 54; x < 84; x++) b.set(x, 71, C.crack);
  gullV(b, 96, 14, C.woodDark);
  // an anchor in the foreground
  b.rect(140, 74, 1, 9, C.rust);
  b.rect(137, 76, 7, 1, C.rust);
  b.rect(136, 82, 9, 1, C.rust);
  b.set(136, 81, C.rust);
  b.set(144, 81, C.rust);
}

function sceneExodus(b: PixelBuffer, seed: number): void {
  gradient(b, 0, 0, SW, 46, [C.deep, C.roof, C.clay]);
  b.ellipse(132, 44, 8, 8, C.gold);
  gradient(b, 0, 46, SW, SH, [C.sandDark, C.sand]);
  // the road towards the horizon
  for (let y = 46; y < SH; y++) {
    const f = (y - 46) / 44;
    const cx = Math.round(130 - f * 70);
    const w = Math.round(2 + f * 22);
    for (let x = cx - w; x <= cx + w; x++) b.set(x, y, hash2(x, y, seed) < 0.15 ? C.crack : C.seabed);
  }
  // abandoned houses on the left
  for (let k = 0; k < 4; k++) {
    const x = 6 + k * 15;
    const y = 52 + (k % 2) * 4;
    b.rect(x, y, 12, 9, C.clay);
    b.rect(x - 1, y - 2, 14, 2, C.roof);
    b.rect(x + 3, y + 3, 2, 3, C.ink);
    b.rect(x + 8, y + 4, 2, 5, C.woodDark);
  }
  stamp(b, CART, 96, 64);
  person(b, 112, 71, C.sea, C.ink, 0, true);
  person(b, 88, 76, C.roof, C.woodDark, 1, true);
  person(b, 78, 82, C.grass, C.salt, 0);
  person(b, 70, 85, C.gold, C.ink, 1, true);
  person(b, 120, 66, C.night, C.ink, 1);
  // dust behind the cart
  for (let k = 0; k < 40; k++) b.set(84 + Math.floor(hash2(k, 1, seed) * 14), 66 + Math.floor(hash2(k, 2, seed) * 6), C.seabed, 160);
}

function sceneFamine(b: PixelBuffer, seed: number): void {
  gradient(b, 0, 0, SW, 48, [C.seabed, C.salt]);
  b.ellipse(118, 18, 9, 9, C.salt);
  b.ellipse(118, 18, 6, 6, C.cotton);
  cracked(b, 48, SH, C.soil, C.soilDark, C.sandDark, seed, 8);
  // the empty granary
  b.rect(24, 30, 40, 26, C.clay);
  for (let y = 24; y < 31; y++) b.rect(24 + (30 - y) * 1, y, 40 - (30 - y) * 2, 1, C.woodDark);
  b.rect(38, 40, 12, 16, C.ink);
  b.rect(36, 38, 16, 2, C.wood);
  b.rect(26, 34, 4, 3, C.ink);
  b.rect(58, 34, 4, 3, C.ink);
  // empty sacks
  b.rect(54, 52, 6, 4, C.sand);
  b.set(56, 51, C.sandDark);
  b.rect(66, 54, 5, 2, C.sand);
  stamp(b, TREE_DEAD, 120, 38);
  // crow
  b.rect(126, 37, 3, 2, C.ink);
  b.set(129, 37, C.gold);
  b.set(125, 36, C.ink);
  // bare furrows
  for (let x = 80; x < SW; x += 6) for (let y = 60; y < SH; y += 3) b.set(x + Math.floor((y - 60) / 6), y, C.soilDark);
}

function sceneRemoved(b: PixelBuffer, seed: number): void {
  // office wall
  for (let y = 0; y < 62; y++) for (let x = 0; x < SW; x++) b.set(x, y, (x + Math.floor(y / 2)) % 12 === 0 ? C.sandDark : C.clay);
  b.rect(0, 52, SW, 10, C.wood);
  b.rect(0, 52, SW, 1, C.woodDark);
  // window with the official car leaving
  b.rect(88, 8, 58, 36, C.woodDark);
  gradient(b, 90, 10, 144, 32, [C.shallow, C.foam]);
  b.rect(90, 32, 54, 10, C.sand);
  for (let x = 90; x < 144; x++) b.set(x, 36, C.sandDark);
  stamp(b, CAR, 104, 29);
  for (let k = 0; k < 24; k++) b.set(122 + Math.floor(hash2(k, 3, seed) * 14), 32 + Math.floor(hash2(k, 4, seed) * 5), C.seabed);
  b.rect(116, 10, 2, 32, C.woodDark);
  b.rect(90, 26, 54, 1, C.woodDark);
  // framed portrait (a blank silhouette)
  b.rect(20, 8, 26, 30, C.gold);
  b.rect(22, 10, 22, 26, C.night);
  b.ellipse(33, 21, 5, 6, C.deep);
  b.ellipse(33, 34, 9, 5, C.deep);
  // desk
  b.rect(0, 62, SW, 28, C.woodDark);
  b.rect(8, 58, 144, 6, C.wood);
  b.rect(8, 63, 144, 1, C.ink);
  // papers, stamp, tea
  b.rect(30, 54, 22, 5, C.cotton);
  b.rect(34, 53, 18, 1, C.salt);
  b.rect(70, 50, 4, 6, C.danger);
  b.rect(68, 55, 8, 3, C.woodDark);
  b.rect(80, 56, 8, 2, C.danger);
  b.rect(100, 52, 5, 6, C.foam);
  b.rect(101, 54, 3, 4, C.gold);
  // empty chair back behind the desk
  b.rect(58, 36, 20, 22, C.roof);
  b.rect(58, 36, 20, 2, C.rust);
  b.rect(60, 40, 16, 1, C.rust);
}

const SCENES: Record<EndingScene, (b: PixelBuffer, seed: number) => void> = {
  sea: sceneSea,
  delta: sceneDelta,
  cotton: sceneCotton,
  graveyard: sceneGraveyard,
  exodus: sceneExodus,
  famine: sceneFamine,
  removed: sceneRemoved,
};

/** Build an ending illustration at 160x90 source pixels. */
export function endingBuffer(scene: EndingScene, seed: number): PixelBuffer {
  const b = new PixelBuffer(SW, SH);
  SCENES[scene](b, seed);
  // frame
  b.rect(0, 0, SW, 1, C.ink);
  b.rect(0, SH - 1, SW, 1, C.ink);
  b.rect(0, 0, 1, SH, C.ink);
  b.rect(SW - 1, 0, 1, SH, C.ink);
  return b;
}

/**
 * Draw an ending scene. The canvas is resized to an integer multiple of 160x90 that fits
 * its CSS width (style it with width:100%; height:auto; image-rendering:pixelated).
 */
export function drawEnding(canvas: HTMLCanvasElement, scene: EndingScene, seed: number): void {
  const dpr = typeof devicePixelRatio === 'number' && devicePixelRatio > 0 ? devicePixelRatio : 1;
  const cssW = canvas.clientWidth || 320;
  const s = Math.max(2, Math.floor((cssW * dpr) / SW));
  canvas.width = SW * s;
  canvas.height = SH * s;
  canvas.style.imageRendering = 'pixelated';
  const g = ctx2d(canvas);
  g.imageSmoothingEnabled = false;
  g.drawImage(endingBuffer(scene, seed).toCanvas(), 0, 0, SW * s, SH * s);
}

// ------------------------------------------------------------------ title backdrop

let titleCache: { w: number; h: number; base: PixelBuffer; frame: HTMLCanvasElement } | null = null;

function titleBase(w: number, h: number): PixelBuffer {
  const b = new PixelBuffer(w, h);
  const horizon = Math.round(h * 0.62);
  gradient(b, 0, 0, w, horizon, [C.night, C.deep, C.roof, C.clay, C.gold]);
  // stars
  for (let k = 0; k < w / 3; k++) {
    const x = Math.floor(hash2(k, 1, 99) * w);
    const y = Math.floor(hash2(k, 2, 99) * horizon * 0.45);
    b.set(x, y, k % 5 === 0 ? C.gold : C.foam);
  }
  const sunX = Math.round(w * 0.68);
  b.ellipse(sunX, horizon, 16, 16, C.gold);
  b.ellipse(sunX, horizon, 11, 11, C.cotton);
  gradient(b, 0, horizon, w, h, [C.sea, C.deep, C.night]);
  // the town on a low cliff (left)
  const cliffW = Math.round(w * 0.36);
  for (let x = 0; x < cliffW; x++) {
    const top = Math.round(horizon - 4 + (x / cliffW) ** 2 * 10 - valueNoise(x, 0, 6, 7) * 3);
    for (let y = top; y < h; y++) b.set(x, y, y < top + 2 ? C.woodDark : hash2(x, y, 5) < 0.06 ? C.night : C.ink);
  }
  for (let k = 0; k < 7; k++) {
    const x = 4 + k * Math.max(7, Math.floor(cliffW / 8));
    if (x > cliffW - 8) break;
    const hh = 6 + (k % 3) * 2;
    const base = horizon - 4;
    b.rect(x, base - hh, 7, hh, C.ink);
    for (let r = 0; r < 4; r++) b.rect(x - 1 + r, base - hh - 1 - r, 9 - r * 2, 1, C.ink);
    if (k % 2 === 0) b.set(x + 2, base - hh + 3, C.gold);
    if (k % 3 === 1) b.set(x + 4, base - 3, C.gold);
  }
  return b;
}

/** Animated title backdrop; call every frame with time in seconds. */
export function drawTitleArt(canvas: HTMLCanvasElement, t: number): void {
  const dpr = typeof devicePixelRatio === 'number' && devicePixelRatio > 0 ? devicePixelRatio : 1;
  const cssW = canvas.clientWidth || 640;
  const cssH = canvas.clientHeight || 360;
  const devW = Math.round(cssW * dpr);
  const devH = Math.round(cssH * dpr);
  if (canvas.width !== devW) canvas.width = devW;
  if (canvas.height !== devH) canvas.height = devH;
  const scale = Math.max(2, Math.round(devH / 160));
  const w = Math.ceil(devW / scale);
  const h = Math.ceil(devH / scale);
  if (!titleCache || titleCache.w !== w || titleCache.h !== h) {
    titleCache = { w, h, base: titleBase(w, h), frame: makeCanvas(w, h) };
  }
  const { base, frame } = titleCache;
  const b = new PixelBuffer(w, h);
  b.data.set(base.data);
  const horizon = Math.round(h * 0.62);
  const sunX = Math.round(w * 0.68);
  // shimmering sea
  for (let y = horizon + 1; y < h; y++) {
    const depth = (y - horizon) / (h - horizon);
    for (let x = 0; x < w; x += 1) {
      if (b.data[(y * w + x) * 4]! === C.ink[0] && b.data[(y * w + x) * 4 + 1]! === C.ink[1]) continue;
      const wave = Math.sin(x * 0.18 + y * 0.9 - t * 1.6 + Math.sin(y * 0.3) * 2);
      const nearSun = Math.abs(x - sunX) < 8 + depth * 40;
      if (wave > 0.93) b.set(x, y, nearSun ? C.gold : C.shallow);
      else if (nearSun && wave > 0.6 && (x + y) % 2 === 0) b.set(x, y, C.clay);
    }
  }
  // a boat bobbing in the glitter
  const bx = Math.round(sunX - 30 + Math.sin(t * 0.15) * 10);
  const by = horizon + 6 + Math.round(Math.sin(t * 1.8));
  stamp(b, BOAT, bx, by);
  // gulls drifting across
  for (let k = 0; k < 4; k++) {
    const speed = 6 + k * 2;
    const x = Math.round(((t * speed + k * 97) % (w + 40)) - 20);
    const y = Math.round(horizon * (0.25 + k * 0.12) + Math.sin(t * 0.9 + k) * 4);
    const flap = Math.sin(t * 6 + k * 2) > 0;
    if (flap) {
      b.set(x, y, C.ink);
      b.set(x + 1, y + 1, C.ink);
      b.set(x + 2, y, C.ink);
      b.set(x + 3, y + 1, C.ink);
      b.set(x + 4, y, C.ink);
    } else b.rect(x, y + 1, 5, 1, C.ink);
  }
  const fg = ctx2d(frame);
  fg.putImageData(b.toImageData(), 0, 0);
  const g = ctx2d(canvas);
  g.imageSmoothingEnabled = false;
  g.drawImage(frame, 0, 0, w * scale, h * scale);
}
