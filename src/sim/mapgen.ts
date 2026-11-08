// Procedural map generation: a fishing town on the south-west shore of the Kok Sea.
// Layout (fixed structure, seeded details):
//   - the sea fills the north-east; its floor slopes gently near the shore and deepens offshore;
//   - a sandy cape runs along the northern edge and closes the northern bay; the Great Dike line
//     runs north-south from the cape tip to the shore and separates the bay from the open sea;
//   - a river enters from the west/south-west and reaches the sea south-east of the town;
//   - the town of Oqtosh sits in the middle-west with an old harbour of three piers.
import { MAP_H, MAP_W } from './config';
import { idx, inBounds, n4 } from './grid';
import { hash2, valueNoise } from './rng';
import type { Building, BuildingId, Tile } from './types';

export interface GeneratedMap {
  w: number;
  h: number;
  tiles: Tile[];
  dikeLine: number[];
  bayTiles: number[];
  river: number[];
  townCenter: number;
}

export const DIKE_X = 14;
const CAPE_ROWS = 2; // rows 0..1 west of the dike are the sandy cape

export function makeBuilding(id: BuildingId, initial = false): Building {
  const b: Building = { id, age: 0, acc: 0, n: 0, dry: 0 };
  if (initial) b.initial = true;
  return b;
}

/** Signed distance (in tiles) from the original coastline; > 0 is sea. */
function coastDistance(x: number, y: number, seed: number): number {
  const base = ((x - 6) * 17 - (y - 2) * 20) / 26.2;
  const wobble = (valueNoise(x, y, 4, seed + 11) - 0.5) * 1.0;
  return base + wobble;
}

function seaDepth(d: number): number {
  return 0.32 * d + 0.045 * d * d;
}

export function generateMap(seed: number): GeneratedMap {
  const w = MAP_W;
  const h = MAP_H;
  const tiles: Tile[] = [];
  const dist: number[] = [];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let d = coastDistance(x, y, seed);
      // the cape: a sandy spit along the northern edge, west of the dike line
      const capeEdge = DIKE_X;
      if (y < CAPE_ROWS && x <= capeEdge) d = Math.min(d, -0.6 - (1 - y) * 0.3);
      // keep the dike column clean: sea from the cape down to the shore
      if (x === DIKE_X && y >= CAPE_ROWS) d = Math.max(d, coastDistance(x, y, seed) > 0.15 ? 0.3 : d);
      dist.push(d);
      const n = valueNoise(x, y, 3, seed + 3);
      if (d > 0) {
        tiles.push({
          terrain: 'sea',
          elev: Math.min(-0.08, -(seaDepth(d) + (n - 0.5) * 0.12)),
          sal: 0,
          moist: 100,
          b: null,
          bay: false,
          dikeLine: false,
          prop: 0,
          dust: 0,
        });
      } else {
        tiles.push({
          terrain: 'soil',
          elev: 0.3 + 0.22 * -d + n * 0.35,
          sal: 0,
          moist: 30,
          b: null,
          bay: false,
          dikeLine: false,
          prop: 0,
          dust: 0,
        });
      }
    }
  }

  // ---- the Great Dike line: column DIKE_X from below the cape down to the shore ----
  const dikeLine: number[] = [];
  for (let y = CAPE_ROWS; y < h; y++) {
    const i = idx({ w }, DIKE_X, y);
    if (tiles[i]!.terrain !== 'sea') break;
    dikeLine.push(i);
  }
  for (const i of dikeLine) tiles[i]!.dikeLine = true;

  // ---- the bay: sea tiles west of the dike line (flood fill) ----
  const bayTiles: number[] = [];
  const seen = new Uint8Array(w * h);
  const stack: number[] = [];
  for (let y = CAPE_ROWS; y < h; y++) {
    for (let x = 0; x < DIKE_X; x++) {
      const i = idx({ w }, x, y);
      if (tiles[i]!.terrain === 'sea' && !seen[i]) {
        // only seed from tiles touching the dike column region
        seen[i] = 1;
        stack.push(i);
      }
    }
  }
  while (stack.length) {
    const i = stack.pop()!;
    const x = i % w;
    if (x >= DIKE_X) continue;
    bayTiles.push(i);
    for (const nb of n4({ w, h }, i)) {
      if (!seen[nb] && tiles[nb]!.terrain === 'sea' && nb % w < DIKE_X) {
        seen[nb] = 1;
        stack.push(nb);
      }
    }
  }
  // Any bay tile that touches open sea other than through the dike column would leak:
  // turn such tiles into shallow shore land so the basin is closed.
  const baySet = new Set(bayTiles);
  const dikeSet = new Set(dikeLine);
  for (const i of [...bayTiles]) {
    for (const nb of n4({ w, h }, i)) {
      const t = tiles[nb]!;
      if (t.terrain === 'sea' && !baySet.has(nb) && !dikeSet.has(nb)) {
        // leak: raise this bay tile into land
        tiles[i]!.terrain = 'soil';
        tiles[i]!.elev = 0.25;
        baySet.delete(i);
        break;
      }
    }
  }
  const bay = bayTiles.filter((i) => baySet.has(i));
  // shape the bay floor into a gentle bowl, deepest near its middle-east
  for (const i of bay) {
    const t = tiles[i]!;
    t.bay = true;
    const x = i % w;
    const y = Math.floor(i / w);
    const bowl = Math.max(0, 1 - Math.hypot((x - 11.5) / 3.5, (y - 3.5) / 2.6));
    t.elev = Math.max(-2.6, t.elev - bowl * 0.45);
  }

  // ---- the river: from the west edge towards the sea south-east of the town ----
  const river: number[] = [];
  let rx = 0;
  let ry = 15 + Math.floor(hash2(1, 2, seed) * 3); // 15..17
  let guard = 0;
  const isSea = (x: number, y: number) => inBounds({ w, h }, x, y) && tiles[idx({ w }, x, y)]!.terrain === 'sea';
  while (guard++ < 200) {
    const i = idx({ w }, rx, ry);
    tiles[i]!.terrain = 'river';
    tiles[i]!.elev = 0.15;
    river.push(i);
    if (isSea(rx + 1, ry) || isSea(rx, ry - 1) || isSea(rx, ry + 1)) break;
    const r = hash2(rx * 7 + 3, ry * 13 + guard, seed + 77);
    let nx = rx;
    let ny = ry;
    if (r < 0.62 || rx < 2) nx = rx + 1;
    else if (r < 0.86 && ry > 12) ny = ry - 1;
    else if (ry < 18) ny = ry + 1;
    else nx = rx + 1;
    if (!inBounds({ w, h }, nx, ny)) {
      nx = rx + 1;
      ny = ry;
    }
    if (tiles[idx({ w }, nx, ny)]!.terrain === 'river') nx = rx + 1;
    if (nx >= w) break;
    rx = nx;
    ry = ny;
  }
  const riverSet = new Set(river);

  // ---- soil vs sand ----
  const townCx = 7;
  const townCy = 10;
  const riverDist = (x: number, y: number) => {
    let best = 99;
    for (const r of river) {
      const d = Math.abs((r % w) - x) + Math.abs(Math.floor(r / w) - y);
      if (d < best) best = d;
    }
    return best;
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = idx({ w }, x, y);
      const t = tiles[i]!;
      if (t.terrain !== 'soil') continue;
      const d = dist[i]!;
      const rd = riverDist(x, y);
      const td = Math.hypot(x - townCx, (y - townCy) * 1.2);
      const n = valueNoise(x, y, 3, seed + 19);
      let sand = false;
      if (y < CAPE_ROWS) sand = true; // the cape
      else if (d > -1.7) sand = true; // beach strip
      else if (rd <= 2 || td <= 4.2) sand = false;
      else if (rd <= 4 && n < 0.6) sand = false;
      else sand = n > 0.32 || y > 17;
      if (sand) t.terrain = 'sand';
    }
  }

  // ---- salinity, moisture, props ----
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = idx({ w }, x, y);
      const t = tiles[i]!;
      const n = hash2(x, y, seed + 5);
      if (t.terrain === 'soil') {
        t.sal = 8 + n * 12;
        t.moist = 35;
      } else if (t.terrain === 'sand') {
        t.sal = 20 + n * 12;
        t.moist = 10;
      } else if (t.terrain === 'river') {
        t.sal = 3;
        t.moist = 100;
      } else {
        t.sal = 0;
        t.moist = 100;
        const depth = -t.elev;
        const p = hash2(x * 3, y * 5, seed + 9);
        if (!t.dikeLine && depth > 1.2 && p < 0.05) t.prop = 1;
        else if (!t.dikeLine && depth > 0.6 && p > 0.93) t.prop = 3;
        else if (!t.dikeLine && depth > 2.5 && p > 0.88 && p <= 0.93) t.prop = 2;
      }
      if (t.terrain !== 'river') {
        for (const nb of n4({ w, h }, i)) if (riverSet.has(nb)) t.moist = Math.max(t.moist, 70);
      }
    }
  }

  // ---- the town ----
  const townCenter = idx({ w }, townCx, townCy);
  placeTown(tiles, w, h, seed, river);

  return { w, h, tiles, dikeLine, bayTiles: bay, river, townCenter };
}

function placeTown(tiles: Tile[], w: number, h: number, seed: number, river: number[]): void {
  const at = (x: number, y: number) => tiles[idx({ w }, x, y)]!;
  const riverSet = new Set(river);

  // 8 houses in a loose cluster around the town centre
  const candidates: { i: number; score: number }[] = [];
  for (let y = 7; y <= 13; y++) {
    for (let x = 3; x <= 11; x++) {
      const t = at(x, y);
      if (t.terrain !== 'soil' && t.terrain !== 'sand') continue;
      const i = idx({ w }, x, y);
      let nearRiver = false;
      for (const nb of n4({ w, h }, i)) if (riverSet.has(nb)) nearRiver = true;
      if (nearRiver) continue;
      // leave a cross of streets free
      if (x === 7 || y === 10) continue;
      const score = Math.hypot(x - 7, y - 10) + hash2(x, y, seed + 31) * 1.6;
      candidates.push({ i, score });
    }
  }
  candidates.sort((a, b) => a.score - b.score);
  let houses = 0;
  for (const c of candidates) {
    if (houses >= 8) break;
    const t = tiles[c.i]!;
    t.terrain = 'soil';
    t.b = makeBuilding('house', true);
    t.sal = Math.min(t.sal, 14);
    houses++;
  }

  // 2 wheat fields on soil next to the river, close to the town
  const fieldCands: { i: number; score: number }[] = [];
  for (let i = 0; i < tiles.length; i++) {
    const t = tiles[i]!;
    if (t.b || t.terrain === 'sea' || t.terrain === 'river') continue;
    let nearRiver = false;
    for (const nb of n4({ w, h }, i)) if (riverSet.has(nb)) nearRiver = true;
    if (!nearRiver) continue;
    const x = i % w;
    const y = Math.floor(i / w);
    if (x < 3 || x > 12) continue;
    fieldCands.push({ i, score: Math.hypot(x - 7, y - 11) + hash2(x, y, seed + 41) });
  }
  fieldCands.sort((a, b) => a.score - b.score);
  let fields = 0;
  for (const c of fieldCands) {
    if (fields >= 2) break;
    const t = tiles[c.i]!;
    t.terrain = 'soil';
    t.sal = Math.min(t.sal, 12);
    t.b = makeBuilding('wheat', true);
    fields++;
  }

  // 3 old harbour piers on shallow water east of the town; they strand within a few years
  const dockCands: { i: number; score: number }[] = [];
  for (let y = 7; y <= 14; y++) {
    for (let x = 10; x < w; x++) {
      const i = idx({ w }, x, y);
      const t = tiles[i]!;
      if (t.terrain !== 'sea' || t.bay || t.dikeLine) continue;
      const depth = -t.elev;
      if (depth > 0.75) continue;
      let maxN = 0;
      let touchesShore = false;
      for (const nb of n4({ w, h }, i)) {
        const tn = tiles[nb]!;
        if (tn.terrain === 'sea') maxN = Math.max(maxN, -tn.elev);
        else touchesShore = true;
      }
      if (maxN < 0.55 || maxN > 1.15) continue;
      const score = Math.abs(maxN - 0.85) * 4 + Math.abs(y - 10) * 0.6 + (touchesShore ? 0 : 0.8) + hash2(x, y, seed + 51) * 0.5;
      dockCands.push({ i, score });
    }
  }
  dockCands.sort((a, b) => a.score - b.score);
  const chosen: number[] = [];
  for (const c of dockCands) {
    if (chosen.length >= 3) break;
    const cx = c.i % w;
    const cy = Math.floor(c.i / w);
    if (chosen.some((o) => Math.abs((o % w) - cx) + Math.abs(Math.floor(o / w) - cy) < 2)) continue;
    chosen.push(c.i);
  }
  for (const i of chosen) tiles[i]!.b = makeBuilding('dock', true);
}
