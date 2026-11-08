// 32x32 advisor portraits, built from simple pixel shapes with an automatic ink outline.
import type { AdvisorId } from '../sim/types';
import { C, PixelBuffer, ctx2d, type RGB } from './pixels';

const SKIN = C.clay;
const SHADE = C.rust;

function face(f: PixelBuffer, rx = 7, ry = 8, cy = 14): void {
  f.ellipse(16, cy, rx, ry, SKIN);
  // ears
  f.set(16 - rx - 1, cy, SKIN);
  f.set(16 - rx - 1, cy + 1, SKIN);
  f.set(16 + rx, cy, SKIN);
  f.set(16 + rx, cy + 1, SKIN);
  // soft shading on the right cheek
  for (let y = cy - 2; y <= cy + 4; y++) if (f.alpha(16 + rx - 1, y) > 0) f.set(16 + rx - 1, y, C.sandDark);
  // neck
  f.rect(13, cy + ry - 1, 6, 4, SKIN);
  f.rect(17, cy + ry - 1, 2, 4, C.sandDark);
}

function body(f: PixelBuffer, col: RGB, accent?: RGB): void {
  f.ellipse(16, 31.5, 13, 7.5, col);
  if (accent) {
    f.set(15, 25, accent);
    f.set(16, 25, accent);
    f.set(16, 26, accent);
  }
}

function eyes(f: PixelBuffer, y: number, opts: { squint?: boolean; brow?: RGB; browTilt?: number; young?: boolean } = {}): void {
  const brow = opts.brow ?? C.woodDark;
  if (opts.squint) {
    f.rect(12, y, 3, 1, C.ink);
    f.rect(18, y, 3, 1, C.ink);
  } else {
    f.set(12, y, C.cotton);
    f.set(13, y, C.ink);
    f.set(19, y, C.ink);
    f.set(20, y, C.cotton);
    if (opts.young) {
      f.set(13, y - 1, C.ink);
      f.set(19, y - 1, C.ink);
    }
  }
  const tilt = opts.browTilt ?? 0;
  f.rect(11, y - 2, 4, 1, brow);
  f.rect(18, y - 2, 4, 1, brow);
  if (tilt > 0) {
    // stern: inner ends lower
    f.set(14, y - 1, brow);
    f.set(18, y - 1, brow);
  }
}

function nose(f: PixelBuffer, y: number): void {
  f.set(16, y, SHADE);
  f.set(16, y + 1, SHADE);
  f.set(15, y + 1, C.sandDark);
}

function mouth(f: PixelBuffer, y: number, kind: 'smile' | 'flat' | 'grin' = 'flat'): void {
  if (kind === 'grin') {
    f.rect(13, y, 7, 1, C.ink);
    f.rect(14, y + 1, 5, 1, C.cotton);
    f.rect(14, y + 2, 5, 1, C.ink);
    f.set(13, y + 1, C.ink);
    f.set(19, y + 1, C.ink);
  } else if (kind === 'smile') {
    f.rect(14, y, 4, 1, C.roof);
    f.set(13, y - 1, C.roof);
    f.set(18, y - 1, C.roof);
  } else {
    f.rect(14, y, 4, 1, SHADE);
  }
}

function ermek(f: PixelBuffer): void {
  body(f, C.deep);
  // striped sailor shirt at the collar
  for (let x = 12; x <= 20; x++) {
    f.set(x, 25, C.cotton);
    f.set(x, 26, C.deep);
    f.set(x, 27, C.cotton);
  }
  f.rect(7, 26, 4, 6, C.sea);
  f.rect(22, 26, 4, 6, C.sea);
  face(f);
  // white beard and moustache
  f.ellipse(16, 20, 6.5, 5, C.cotton);
  f.rect(12, 17, 9, 1, C.salt);
  f.rect(11, 18, 11, 1, C.cotton);
  for (let x = 12; x <= 20; x += 2) f.set(x, 23, C.salt);
  eyes(f, 13, { squint: true, brow: C.salt });
  nose(f, 14);
  // wrinkles
  f.rect(13, 9, 2, 1, SHADE);
  f.rect(17, 10, 3, 1, SHADE);
  f.set(10, 14, SHADE);
  f.set(22, 14, SHADE);
  // black doppi skullcap with white embroidery
  f.rect(10, 5, 13, 4, C.ink);
  f.rect(11, 4, 11, 1, C.ink);
  f.set(12, 6, C.salt);
  f.set(15, 7, C.salt);
  f.set(16, 6, C.salt);
  f.set(19, 7, C.salt);
  f.set(20, 6, C.salt);
}

function dilnoza(f: PixelBuffer): void {
  body(f, C.sea);
  f.rect(13, 25, 7, 2, C.cotton);
  f.rect(7, 28, 19, 1, C.gold);
  // braid falling over the shoulder
  f.ellipse(16, 13, 8, 8.5, C.woodDark);
  for (let y = 16; y <= 27; y++) f.set(23 + (y % 2), y, C.woodDark);
  f.set(23, 28, C.roof);
  face(f, 6.5, 7.5, 14);
  eyes(f, 14, { young: true });
  // round glasses
  for (const cx of [12, 19]) {
    f.rect(cx - 1, 12, 4, 1, C.ink);
    f.rect(cx - 1, 16, 4, 1, C.ink);
    f.set(cx - 2, 13, C.ink);
    f.set(cx - 2, 14, C.ink);
    f.set(cx - 2, 15, C.ink);
    f.set(cx + 3, 13, C.ink);
    f.set(cx + 3, 14, C.ink);
    f.set(cx + 3, 15, C.ink);
    f.set(cx, 13, C.foam);
  }
  f.rect(15, 13, 2, 1, C.ink);
  nose(f, 16);
  mouth(f, 19, 'smile');
  // yellow hard hat
  f.ellipse(16, 8, 8.5, 5, C.gold);
  f.rect(6, 9, 21, 2, C.gold);
  f.rect(6, 10, 21, 1, C.sandDark);
  f.rect(15, 3, 2, 6, C.sand);
}

function tolib(f: PixelBuffer): void {
  body(f, C.night);
  // white shirt V and red tie
  f.rect(13, 24, 7, 2, C.cotton);
  f.rect(14, 26, 5, 1, C.cotton);
  f.rect(16, 25, 1, 7, C.danger);
  f.set(15, 25, C.danger);
  f.set(17, 25, C.danger);
  f.set(9, 28, C.gold);
  f.set(10, 28, C.gold);
  f.set(9, 29, C.danger);
  face(f, 7.5, 8, 14);
  eyes(f, 14, { brow: C.ink, browTilt: 1 });
  nose(f, 15);
  // heavy moustache
  f.rect(12, 18, 9, 2, C.ink);
  f.set(11, 19, C.ink);
  f.set(21, 19, C.ink);
  mouth(f, 21, 'flat');
  // jowls
  f.set(10, 18, SHADE);
  f.set(22, 18, SHADE);
  // flat cap with a visor
  f.ellipse(16, 7, 9, 4, C.woodDark);
  f.rect(7, 8, 18, 2, C.woodDark);
  f.rect(5, 10, 14, 1, C.ink);
  f.set(16, 4, C.ink);
}

function saida(f: PixelBuffer): void {
  body(f, C.cotton);
  // lapels
  f.set(12, 25, C.salt);
  f.set(13, 26, C.salt);
  f.set(20, 25, C.salt);
  f.set(19, 26, C.salt);
  // headscarf framing the face
  f.ellipse(16, 13, 9.5, 10, C.grass);
  f.rect(8, 18, 17, 6, C.grass);
  for (const [x, y] of [
    [9, 8],
    [22, 9],
    [11, 20],
    [21, 21],
    [16, 4],
    [8, 14],
    [24, 15],
  ] as const)
    f.set(x, y, C.gold);
  f.ellipse(16, 15, 6, 6.5, SKIN);
  f.rect(13, 21, 6, 2, SKIN);
  eyes(f, 14, {});
  nose(f, 16);
  mouth(f, 19, 'smile');
  // stethoscope
  for (let k = 0; k <= 4; k++) {
    f.set(11 + k, 24 + k, C.night);
    f.set(21 - k, 24 + k, C.night);
  }
  f.rect(15, 28, 3, 1, C.night);
  f.set(18, 29, C.salt);
  f.set(19, 29, C.night);
}

function timur(f: PixelBuffer): void {
  body(f, C.gold);
  f.rect(12, 26, 9, 1, C.roof);
  f.rect(10, 29, 13, 1, C.roof);
  face(f, 6.5, 7.5, 15);
  // messy hair with spikes and a fringe
  f.ellipse(16, 9, 8, 5, C.woodDark);
  for (const [x, y] of [
    [10, 4],
    [13, 3],
    [17, 3],
    [20, 4],
    [23, 6],
    [8, 7],
  ] as const) {
    f.set(x, y, C.woodDark);
    f.set(x, y + 1, C.woodDark);
  }
  f.rect(10, 11, 4, 1, C.woodDark);
  f.rect(17, 11, 5, 1, C.woodDark);
  f.set(9, 12, C.woodDark);
  eyes(f, 15, { young: true });
  nose(f, 17);
  mouth(f, 19, 'grin');
  // freckles
  f.set(11, 17, SHADE);
  f.set(12, 18, SHADE);
  f.set(20, 17, SHADE);
  f.set(21, 18, SHADE);
}

function elder(f: PixelBuffer): void {
  // striped chapan robe
  f.ellipse(16, 31.5, 13, 7.5, C.roof);
  for (let x = 3; x < 30; x++) {
    const band = Math.floor(x / 2) % 3;
    for (let y = 24; y < 32; y++) {
      if (f.alpha(x, y) === 0) continue;
      f.set(x, y, band === 0 ? C.roof : band === 1 ? C.gold : C.sea);
    }
  }
  f.rect(13, 24, 7, 3, C.cotton);
  face(f, 7, 8, 14);
  // grey hair at the sides and a short grey beard
  f.rect(8, 9, 3, 7, C.salt);
  f.rect(22, 9, 3, 7, C.salt);
  f.ellipse(16, 8, 7, 3, C.salt);
  f.ellipse(16, 21, 4.5, 2.5, C.salt);
  eyes(f, 13, { brow: C.salt });
  nose(f, 15);
  mouth(f, 18, 'smile');
  f.rect(13, 10, 3, 1, SHADE);
}

const DRAW: Record<AdvisorId, (f: PixelBuffer) => void> = {
  ermek,
  dilnoza,
  tolib,
  saida,
  timur,
  elder,
};

const BG: Record<AdvisorId, RGB> = {
  ermek: C.sea,
  dilnoza: C.shallow,
  tolib: C.rust,
  saida: C.grass,
  timur: C.roof,
  elder: C.sandDark,
};

/** Build the 32x32 portrait as a pixel buffer. */
export function portraitBuffer(who: AdvisorId): PixelBuffer {
  const fig = new PixelBuffer(32, 32);
  DRAW[who](fig);
  fig.outline(C.ink);
  const out = new PixelBuffer(32, 32);
  // background: dark frame with a soft coloured disc
  out.rect(0, 0, 32, 32, C.night);
  out.ellipse(16, 15, 15, 15, BG[who]);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) if ((x + y) % 4 === 0 && out.alpha(x, y) > 0 && Math.hypot(x - 16, y - 15) > 12) out.set(x, y, C.night, 90);
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const o = (y * 32 + x) * 4;
      if (fig.data[o + 3]! > 0) out.set(x, y, [fig.data[o]!, fig.data[o + 1]!, fig.data[o + 2]!]);
    }
  }
  // frame
  out.rect(0, 0, 32, 1, C.ink);
  out.rect(0, 31, 32, 1, C.ink);
  out.rect(0, 0, 1, 32, C.ink);
  out.rect(31, 0, 1, 32, C.ink);
  out.rect(1, 1, 30, 1, C.gold, 120);
  return out;
}

export function drawPortrait(canvas: HTMLCanvasElement, who: AdvisorId, scale = 3): void {
  const s = Math.max(1, Math.round(scale));
  canvas.width = 32 * s;
  canvas.height = 32 * s;
  canvas.style.imageRendering = 'pixelated';
  const g = ctx2d(canvas);
  const src = portraitBuffer(who).toCanvas();
  g.imageSmoothingEnabled = false;
  g.clearRect(0, 0, canvas.width, canvas.height);
  g.drawImage(src, 0, 0, 32 * s, 32 * s);
}
