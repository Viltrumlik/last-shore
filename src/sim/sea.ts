// Sea level, the bay behind the Great Dike, newly exposed seabed and stranded docks.
import { BAL, diff } from './config';
import { countBuildings, dockActive, isWater, year } from './grid';
import type { GameState } from './types';

/** Fraction of the river taken upstream for the district's cotton. */
export function upstreamDiversion(s: GameState, season = s.season): number {
  const d = diff(s.difficulty);
  return Math.min(0.6, d.upstream0 + d.upstreamGrowth * (year(season) - 1) + s.upstreamExtra);
}

export function seaDrop(s: GameState, toSea: number): number {
  const d = diff(s.difficulty);
  const cotton = countBuildings(s, 'cotton');
  const drop = d.baseDrop + upstreamDiversion(s) * d.upstreamDropK + cotton * BAL.cottonDrop - toSea * BAL.inflowK;
  return Math.max(BAL.minDrop, drop);
}

export function seaHealth(s: GameState): number {
  return Math.max(0.25, Math.min(1, 1.15 - s.seaSalt / 100));
}

export function bayFloor(s: GameState): number {
  let m = 0;
  for (const i of s.bayTiles) m = Math.min(m, s.tiles[i]!.elev);
  return m;
}

export interface SeaResult {
  drop: number;
  exposed: number;
  restored: number;
  newWrecks: number;
}

/** Lower the sea, update the bay, convert stranded docks to wrecks. */
export function updateSea(s: GameState, toSea: number, toBay: number): SeaResult {
  const wasWater = new Uint8Array(s.tiles.length);
  for (let i = 0; i < s.tiles.length; i++) wasWater[i] = isWater(s, i) ? 1 : 0;

  const drop = seaDrop(s, toSea);
  s.seaLevel -= drop;
  s.seaSalt = Math.min(100, 20 + BAL.seaSaltPerMetre * Math.max(0, -s.seaLevel));

  if (s.dike.complete) {
    let flooded = 0;
    for (const i of s.bayTiles) if (isWater(s, i)) flooded++;
    const evap = flooded * BAL.bayEvapPerTile[s.season % 4]!;
    const net = toBay - evap;
    s.bayLevel += net / (Math.max(3, flooded) * BAL.bayVolumePerTile);
    s.bayLevel = Math.min(0, Math.max(bayFloor(s) - 0.02, s.bayLevel));
  }

  let exposed = 0;
  let restored = 0;
  for (let i = 0; i < s.tiles.length; i++) {
    const t = s.tiles[i]!;
    if (t.terrain !== 'sea') continue;
    const now = isWater(s, i);
    if (wasWater[i] && !now) {
      exposed++;
      t.sal = Math.max(t.sal, Math.min(100, 55 + s.seaSalt * 0.35));
      t.moist = 40;
    } else if (!wasWater[i] && now) {
      restored++;
      t.moist = 100;
    }
  }

  let newWrecks = 0;
  for (let i = 0; i < s.tiles.length; i++) {
    const b = s.tiles[i]!.b;
    if (b && b.id === 'dock' && !dockActive(s, i)) {
      s.tiles[i]!.b = { id: 'wreck', age: 0, acc: 0, n: 0, dry: 0, ...(b.initial ? { initial: true } : {}) };
      newWrecks++;
    }
  }
  s.stats.wrecks += newWrecks;
  return { drop, exposed, restored, newWrecks };
}

/** Called when the Great Dike is finished: the bay keeps its own level from now on. */
export function completeDike(s: GameState): void {
  s.dike.complete = true;
  s.dike.started = true;
  s.dike.progress = 4;
  s.bayLevel = Math.min(0, Math.max(s.seaLevel, bayFloor(s) - 0.02));
}
