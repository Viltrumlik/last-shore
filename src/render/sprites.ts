// Hand-authored pixel sprites (character matrices, see CHARMAP in pixels.ts) and a few
// procedurally generated ones (fields, canals, the dike). All 16x16 unless noted.
import { C, CHARMAP, PixelBuffer, sprite, type Sprite } from './pixels';
import { hash2 } from '../sim/rng';

// ------------------------------------------------------------------ matrices

export const HOUSE_A = [
  '................',
  '.......kk.......',
  '.....kkRRkk.kk..',
  '...kkRRRRRRkek..',
  '.kkRRRRRRRRRkk..',
  'kRRRRuRRRRuRRRRk',
  'kRRRRRRRRRRRRRRk',
  'kuuuuuuuuuuuuuuk',
  '.kyyyyyyyyyyyyk.',
  '.kyyyyyyyyyyyyk.',
  '.kykkkyyykkkkyk.',
  '.kykGkyyykeekyk.',
  '.kykkkyyykeekyk.',
  '.kyyyyyyykeGkyk.',
  '.kkkkkkkkkkkkkk.',
  '................',
];

export const HOUSE_B = [
  '................',
  '................',
  '................',
  '.kkkkkkkkkkkkkk.',
  '.kAAAAAAAAAAAAk.',
  '.kaaaaaaaaaaaak.',
  '.kaAaaaaaaaaAak.',
  '.kAAAAAAAAAAAAk.',
  '.kkkkkkkkkkkkkk.',
  '.kyeyyyeyyyeyyk.',
  '.kyyyyyyyyyyyyk.',
  '.kykkkyyyykkkyk.',
  '.kykfkyyyykekyk.',
  '.kykkkyyyykekyk.',
  '.kyyyyyyyykekyk.',
  '.kkkkkkkkkkkkkk.',
];

/** Brown-roofed variant of HOUSE_A. */
export const HOUSE_C = HOUSE_A.map((r) => r.replace(/R/g, 'd').replace(/u/g, 'e').replace(/G/g, 'f'));

export const DOCK = [
  '................',
  '................',
  '.kk..........kk.',
  '.kekkkkkkkkkkek.',
  '.kddddddddddddk.',
  '.kddddddddkkkdk.',
  '.keeeeeeeekGkek.',
  '.kddddddddkkkdk.',
  '.kddddddddddddk.',
  '.keeeeeeeeeeeek.',
  '.kddddddddddddk.',
  '.kdddAAAddddddk.',
  '.kekkkAkkkkkkek.',
  '.ke..........ek.',
  '.kk..........kk.',
  '................',
];

export const WRECK = [
  '................',
  '..........k.....',
  '.........kek....',
  '.........kek....',
  '........kek.....',
  '...k.k.kek.k....',
  '..kek.kek.kek...',
  '..kekkkekkkekk..',
  '.kddddddddddddk.',
  'kuuueuuuuueuuuuk',
  'kuueuuuuuuuuueuk',
  '.kuuuuueuuuuuuk.',
  '..kkuuuuuuuukk..',
  '....kkkkkkkk....',
  '.c.....c....c...',
  '................',
]

/** 12x8 fishing boat. */
export const BOAT = [
  '......k.....',
  '......k.....',
  '...kkkkk....',
  '...kwfwk....',
  'kkkkkkkkkkkk',
  'kRRRRRRRRRRk',
  '.kwwwwwwwwk.',
  '..kkkkkkkk..',
];

export const CLINIC = [
  '................',
  '.kkkkkkkkkkkkkk.',
  '.kssssssssssssk.',
  '.kkkkkkkkkkkkkk.',
  '.kwwwwwwwwwwwwk.',
  '.kwwwwwxxwwwwwk.',
  '.kwwwxxxxxxwwwk.',
  '.kwwwxxxxxxwwwk.',
  '.kwwwwwxxwwwwwk.',
  '.kwwwwwwwwwwwwk.',
  '.kwkkkwwwwkkkwk.',
  '.kwkhkwwwwkekwk.',
  '.kwkkkwwwwkekwk.',
  '.kwwwwwwwwkekwk.',
  '.kkkkkkkkkkkkkk.',
  '................',
];

export const WORKSHOP = [
  '................',
  '................',
  '...kkkkkkkkkkk..',
  '..keeeeeeeeeeek.',
  '.keeeeeeeeeeeeek',
  'kkkkkkkkkkkkkkkk',
  '.kdeddddeddddek.',
  '.kdeddddeddddek.',
  'Gkdedkkkkkddddk.',
  'rkdedkeeekdeddk.',
  'rGdedkeeekdeddk.',
  'rrdedkeeekdeddk.',
  'rrkkkkkkkkkkkkk.',
  'AA..............',
  '................',
  '................',
];

export const SAXAUL = [
  '................',
  '....l..ll.......',
  '...lgl.lgl..l...',
  '..lgl..lglllgl..',
  '...le...e..lgl..',
  '....e..e....e...',
  '..l.ee.e...ee...',
  '.lgl..ee..ee.l..',
  '..le...eeee.lgl.',
  '....e...ee..le..',
  '.....ee.e..ee...',
  '.......eee......',
  '........e.......',
  '.......kek......',
  '......AAAAA.....',
  '................',
];

export const SAXAUL_YOUNG = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '......l.l.......',
  '.....lgllgl.....',
  '......lel.l.....',
  '.......e.lg.....',
  '.......ee.......',
  '.......e........',
  '......AAA.......',
  '................',
];

export const HULL = [
  '................',
  '.......kk.......',
  '......kuek......',
  '...kkkkukkkkk...',
  '..kuuuueuuuuuk..',
  '.kuueuuuuuuuuuk.',
  '.kuuuuuuuueuuk..',
  '..kkuuuuuuukk...',
  '....kkkkkkk.....',
];

export const ANCHOR = [
  '...kuk...',
  '...kuk...',
  '.kkkukkk.',
  '...kuk...',
  '...kuk...',
  'k..kuk..k',
  'ku.kuk.uk',
  '.kuuuuuk.',
  '..kkkkk..',
];

export const FISHBONE = ['..s.s.s....', '.ssssssssks', '..s.s.s....'];

export const GULL = [
  ['w...w', '.wsw.', '.....'],
  ['.....', 'wwsww', '.....'],
];

// ------------------------------------------------------------------ helpers

/** Stamp a character matrix into a pixel buffer. */
export function stamp(buf: PixelBuffer, rows: readonly string[], x: number, y: number, flip = false, alpha = 255): void {
  const w = Math.max(...rows.map((r) => r.length));
  rows.forEach((row, yy) => {
    for (let xx = 0; xx < row.length; xx++) {
      const k = CHARMAP[row[xx]!];
      if (!k) continue;
      buf.set(x + (flip ? w - 1 - xx : xx), y + yy, C[k], alpha);
    }
  });
}

const procCache = new Map<string, Sprite>();
function cachedProc(name: string, make: (b: PixelBuffer) => void, w = 16, h = 16): Sprite {
  const hit = procCache.get(name);
  if (hit) return hit;
  const b = new PixelBuffer(w, h);
  make(b);
  const sp = { w, h, canvas: b.toCanvas() };
  procCache.set(name, sp);
  return sp;
}

/** Field sprites: wheat / melon / cotton for each season (0 spring .. 3 winter), 2 variants. */
export function fieldSprite(kind: 'wheat' | 'melon' | 'cotton', season: number, variant: number): Sprite {
  const name = `field-${kind}-${season}-${variant}`;
  return cachedProc(
    name,
    (b) => {
      // ploughed plot with a darker border
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          const edge = x === 0 || y === 0 || x === 15 || y === 15;
          const h = hash2(x + variant * 31, y, 77);
          if (edge) b.set(x, y, h < 0.75 ? C.soilDark : C.soil);
          else b.set(x, y, h < 0.12 ? C.soilDark : C.soil);
        }
      }
      if (kind === 'wheat') {
        for (let row = 2; row <= 12; row += 3) {
          for (let x = 1; x < 15; x++) b.set(x, row + 2, C.soilDark);
          for (let x = 2 + (row % 2); x < 14; x += 2) {
            const jitter = hash2(x, row, variant + 5) < 0.3 ? 1 : 0;
            if (season === 0) {
              b.set(x, row + 1, C.grass);
              b.set(x + 1, row + 1, C.leaf);
              b.set(x, row, jitter ? C.reed : C.grass);
            } else if (season === 3) {
              b.set(x, row + 1, C.sandDark);
              if (hash2(x, row, variant) < 0.5) b.set(x, row, C.sand);
            } else {
              b.set(x, row + 1, season === 1 ? C.sandDark : C.wood);
              b.set(x, row, C.gold);
              b.set(x, row - 1 + jitter, season === 2 ? C.gold : C.sand);
            }
          }
        }
      } else if (kind === 'melon') {
        for (let row = 3; row <= 12; row += 4) {
          for (let x = 1; x < 15; x++) {
            const vy = row + (Math.sin((x + variant * 3) * 0.9) > 0.3 ? 1 : 0);
            if (season === 3) {
              if (hash2(x, row, 3) < 0.25) b.set(x, vy, C.soilDark);
            } else if (season === 0) {
              if (x % 3 === variant % 3) {
                b.set(x, vy, C.grass);
                b.set(x, vy - 1, C.leaf);
              }
            } else {
              b.set(x, vy, C.leaf);
              if (x % 2 === 0) b.set(x, vy - 1, C.grass);
            }
          }
          if (season === 1 || season === 2) {
            for (let m = 0; m < 2; m++) {
              const mx = 3 + m * 7 + ((row + variant) % 3);
              const ripe = season === 1;
              b.set(mx, row + 1, ripe ? C.gold : C.grass);
              b.set(mx + 1, row + 1, ripe ? C.grass : C.leaf);
              b.set(mx, row + 2, ripe ? C.grass : C.leaf);
              b.set(mx + 1, row + 2, ripe ? C.gold : C.grass);
              b.set(mx + 2, row + 2, C.leaf);
            }
          }
        }
      } else {
        for (let row = 2; row <= 12; row += 3) {
          for (let x = 2 + (row % 2); x < 14; x += 3) {
            if (season === 3) {
              b.set(x, row + 1, C.woodDark);
              b.set(x, row, C.woodDark);
            } else if (season === 0) {
              b.set(x, row + 1, C.grass);
            } else {
              b.set(x, row + 1, C.leaf);
              b.set(x - 1, row + 1, C.leaf);
              b.set(x, row, C.leaf);
              if (season === 2) {
                b.set(x, row - 1, C.cotton);
                b.set(x - 1, row, C.cotton);
                b.set(x + 1, row, hash2(x, row, variant) < 0.6 ? C.cotton : C.salt);
              } else if (hash2(x, row, variant + 9) < 0.5) {
                b.set(x, row - 1, C.salt);
              }
            }
          }
        }
      }
    },
  );
}

/** Canal autotile. `conn` = [N, E, S, W] connections; `wet` = connected to the river. */
export function canalSprite(conn: [boolean, boolean, boolean, boolean], wet: boolean, sandy: boolean): Sprite {
  const name = `canal-${conn.map((c) => (c ? 1 : 0)).join('')}-${wet ? 1 : 0}-${sandy ? 1 : 0}`;
  return cachedProc(
    name,
    (b) => {
      const bank = sandy ? C.sandDark : C.soilDark;
      const water = wet ? C.shallow : C.sandDark;
      const mid = wet ? C.sea : C.crack;
      const open = (x0: number, y0: number, x1: number, y1: number) => {
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) b.set(x, y, bank);
      };
      const fill = (x0: number, y0: number, x1: number, y1: number) => {
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) b.set(x, y, water);
      };
      // banks first, then water inside
      open(4, 4, 11, 11);
      if (conn[0]) open(4, 0, 11, 4);
      if (conn[1]) open(11, 4, 15, 11);
      if (conn[2]) open(4, 11, 11, 15);
      if (conn[3]) open(0, 4, 4, 11);
      fill(5, 5, 10, 10);
      if (conn[0]) fill(5, 0, 10, 5);
      if (conn[1]) fill(10, 5, 15, 10);
      if (conn[2]) fill(5, 10, 10, 15);
      if (conn[3]) fill(0, 5, 5, 10);
      // a darker centre line
      for (let k = 6; k <= 9; k++) {
        b.set(k, 7, mid);
        if (conn[0]) b.set(7, k - 6, mid);
        if (conn[2]) b.set(8, k + 6, mid);
        if (conn[1]) b.set(k + 6, 8, mid);
        if (conn[3]) b.set(k - 6, 7, mid);
      }
      // reeds tufts on the bank for charm
      b.set(4, 3, C.grass);
      b.set(12, 12, C.grass);
    },
  );
}

/**
 * The Great Dike: `built` 0..1 for this tile (0 = only stakes, 1 = finished stone embankment).
 */
export function dikeSprite(built: number, variant: number): Sprite {
  const step = Math.round(built * 4);
  const name = `dike-${step}-${variant % 3}`;
  return cachedProc(
    name,
    (b) => {
      const top = 16 - Math.round((step / 4) * 16);
      // stone courses (brick pattern)
      for (let y = top; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          const course = Math.floor(y / 3);
          const off = course % 2 ? 2 : 0;
          const mortar = y % 3 === 2 || (x + off) % 5 === 4;
          const tone = hash2(Math.floor((x + off) / 5), course, variant + 13);
          b.set(x, y, mortar ? C.crack : tone < 0.33 ? C.salt : tone < 0.75 ? C.seabed : C.sandDark);
        }
      }
      if (step >= 4) {
        // path on top + edge shadow
        for (let x = 0; x < 16; x++) {
          b.set(x, 0, C.sandDark);
          b.set(x, 1, hash2(x, 1, variant) < 0.3 ? C.sandDark : C.sand);
          b.set(x, 2, C.sand);
          b.set(x, 15, C.ink);
        }
        b.set(3 + (variant % 7), 1, C.grass);
      } else {
        // scaffolding stakes and a plank
        for (const sx of [2, 13]) {
          for (let y = 1; y < 16; y++) b.set(sx, y, y % 4 === 0 ? C.woodDark : C.wood);
        }
        for (let x = 1; x < 15; x++) b.set(x, Math.max(2, top - 2), C.woodDark);
        for (let k = 0; k < 9; k++) b.set(3 + k, 3 + k, C.wood);
        if (step === 0) {
          b.set(6, 12, C.seabed);
          b.set(7, 12, C.salt);
          b.set(7, 11, C.seabed);
        }
      }
    },
  );
}

export function houseSprite(variant: number): Sprite {
  const v = variant % 3;
  const rows = v === 0 ? HOUSE_A : v === 1 ? HOUSE_B : HOUSE_C;
  return sprite(`house-${v}`, rows);
}

export function namedSprite(name: string, rows: readonly string[], flip = false): Sprite {
  return sprite(name, rows, flip);
}

