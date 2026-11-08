// Grid helpers and derived tile queries.
import type { BuildingId, GameState, TileKind } from './types';

export const DEEP_DEPTH = 1.5;

export function idx(s: { w: number }, x: number, y: number): number {
  return y * s.w + x;
}

export function tx(s: { w: number }, i: number): number {
  return i % s.w;
}

export function ty(s: { w: number }, i: number): number {
  return Math.floor(i / s.w);
}

export function inBounds(s: { w: number; h: number }, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < s.w && y < s.h;
}

const D4 = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

const D8 = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
] as const;

export function n4(s: { w: number; h: number }, i: number): number[] {
  const x = i % s.w;
  const y = Math.floor(i / s.w);
  const out: number[] = [];
  for (const [dx, dy] of D4) {
    const nx = x + dx;
    const ny = y + dy;
    if (inBounds(s, nx, ny)) out.push(ny * s.w + nx);
  }
  return out;
}

export function n8(s: { w: number; h: number }, i: number): number[] {
  const x = i % s.w;
  const y = Math.floor(i / s.w);
  const out: number[] = [];
  for (const [dx, dy] of D8) {
    const nx = x + dx;
    const ny = y + dy;
    if (inBounds(s, nx, ny)) out.push(ny * s.w + nx);
  }
  return out;
}

export function within(s: { w: number; h: number }, i: number, r: number): number[] {
  const x = i % s.w;
  const y = Math.floor(i / s.w);
  const out: number[] = [];
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx === 0 && dy === 0) continue;
      if (Math.abs(dx) + Math.abs(dy) > r + 1) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (inBounds(s, nx, ny)) out.push(ny * s.w + nx);
    }
  }
  return out;
}

/** Water surface level that applies to tile i (the bay keeps its own level once the dike is complete). */
export function levelAt(s: GameState, i: number): number {
  const t = s.tiles[i]!;
  if (t.bay && s.dike.complete) return s.bayLevel;
  return s.seaLevel;
}

export function waterDepth(s: GameState, i: number): number {
  const t = s.tiles[i]!;
  if (t.terrain !== 'sea') return 0;
  if (t.b && t.b.id === 'dike') return 0;
  return levelAt(s, i) - t.elev;
}

/** Sea or bay water (not the river). */
export function isWater(s: GameState, i: number): boolean {
  return waterDepth(s, i) > 0;
}

export function isSeabed(s: GameState, i: number): boolean {
  const t = s.tiles[i]!;
  return t.terrain === 'sea' && !(t.b && t.b.id === 'dike') && !isWater(s, i);
}

/** Original dry land (sand or soil). */
export function isLand(s: GameState, i: number): boolean {
  const t = s.tiles[i]!;
  return t.terrain === 'sand' || t.terrain === 'soil';
}

export function tileKind(s: GameState, i: number): TileKind {
  const t = s.tiles[i]!;
  if (t.terrain !== 'sea') return t.terrain;
  const d = waterDepth(s, i);
  if (d > DEEP_DEPTH) return 'deep';
  if (d > 0) return 'shallow';
  return 'seabed';
}

export function countBuildings(s: GameState, id: BuildingId): number {
  let n = 0;
  for (const t of s.tiles) if (t.b && t.b.id === id) n++;
  return n;
}

export function buildingTiles(s: GameState, id: BuildingId): number[] {
  const out: number[] = [];
  for (let i = 0; i < s.tiles.length; i++) {
    const b = s.tiles[i]!.b;
    if (b && b.id === id) out.push(i);
  }
  return out;
}

/** A dock works while any 4-neighbour is sea or bay water. */
export function dockActive(s: GameState, i: number): boolean {
  for (const n of n4(s, i)) if (isWater(s, n)) return true;
  return false;
}

/** True if the dock's water is the restored bay (fresher, healthier fish). */
export function dockOnBay(s: GameState, i: number): boolean {
  if (!s.dike.complete) return false;
  for (const n of n4(s, i)) if (s.tiles[n]!.bay && isWater(s, n)) return true;
  return false;
}

/** Reed bed standing in water needs no water allocation. */
export function reedsInWater(s: GameState, i: number): boolean {
  return isWater(s, i);
}

/** Canals connected to the river (BFS through canal tiles). */
export function connectedCanals(s: GameState): Uint8Array {
  const wet = new Uint8Array(s.tiles.length);
  const queue: number[] = [];
  for (let i = 0; i < s.tiles.length; i++) {
    const t = s.tiles[i]!;
    if (t.b && t.b.id === 'canal') {
      for (const n of n4(s, i)) {
        if (s.tiles[n]!.terrain === 'river') {
          wet[i] = 1;
          queue.push(i);
          break;
        }
      }
    }
  }
  while (queue.length) {
    const i = queue.pop()!;
    for (const n of n4(s, i)) {
      const b = s.tiles[n]!.b;
      if (!wet[n] && b && b.id === 'canal') {
        wet[n] = 1;
        queue.push(n);
      }
    }
  }
  return wet;
}

/** Tiles that receive irrigation water: touching the river or a connected canal. */
export function irrigationMask(s: GameState): Uint8Array {
  const canals = connectedCanals(s);
  const mask = new Uint8Array(s.tiles.length);
  for (let i = 0; i < s.tiles.length; i++) {
    for (const n of n4(s, i)) {
      if (s.tiles[n]!.terrain === 'river' || canals[n]) {
        mask[i] = 1;
        break;
      }
    }
  }
  return mask;
}

export function isField(id: BuildingId | undefined): boolean {
  return id === 'wheat' || id === 'melon' || id === 'cotton';
}

/** Average salinity of the original dry land (sand + soil); exposed seabed is not counted. */
export function avgSoilSalinity(s: GameState): number {
  let sum = 0;
  let n = 0;
  for (let i = 0; i < s.tiles.length; i++) {
    if (isLand(s, i)) {
      sum += s.tiles[i]!.sal;
      n++;
    }
  }
  return n ? sum / n : 0;
}

/** Number of water tiles behind the completed Great Dike. */
export function bayWaterTiles(s: GameState): number {
  if (!s.dike.complete) return 0;
  let n = 0;
  for (const i of s.bayTiles) if (isWater(s, i)) n++;
  return n;
}

/** Reed beds that are alive. */
export function activeReeds(s: GameState): number {
  return countBuildings(s, 'reeds');
}

export function exposedSeabed(s: GameState): number {
  let n = 0;
  for (let i = 0; i < s.tiles.length; i++) if (isSeabed(s, i)) n++;
  return n;
}

export function housingCapacity(s: GameState, perHouse: number): number {
  return countBuildings(s, 'house') * perHouse;
}

export function year(season: number): number {
  return Math.floor(season / 4) + 1;
}

export function seasonOfYear(season: number): number {
  return season % 4;
}
