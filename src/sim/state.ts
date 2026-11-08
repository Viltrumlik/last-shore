// Creating a new game.
import { generateMap } from './mapgen';
import type { Difficulty, GameState } from './types';
import { snapshot } from './snapshot';

export function newGame(seed: number, difficulty: Difficulty = 'hard'): GameState {
  const map = generateMap(seed);
  const s: GameState = {
    v: 1,
    seed,
    rng: (seed ^ 0x9e3779b9) >>> 0,
    difficulty,
    season: 0,
    w: map.w,
    h: map.h,
    tiles: map.tiles,
    dikeLine: map.dikeLine,
    bayTiles: map.bayTiles,
    river: map.river,
    seaLevel: 0,
    bayLevel: 0,
    seaSalt: 20,
    res: { pop: 60, food: 120, money: 200, health: 70, hope: 60, reedMat: 0, cotton: 0 },
    water: { fields: 40, reeds: 30, town: 30 },
    focus: { fishing: 35, farming: 35, building: 30 },
    labourUsed: 0,
    leachWater: 0,
    marketBuys: 0,
    dike: { unlocked: false, started: false, progress: 0, complete: false, stalled: 0, discount: 0 },
    quota: { failures: 0, met: 0, demand: 0, carry: 0 },
    famineStreak: 0,
    upstreamExtra: 0,
    flags: {},
    modifiers: [],
    pending: { id: 'intro', params: {} },
    lastOutcome: null,
    lastReport: null,
    history: [],
    stats: {
      fish: 0,
      grain: 0,
      cotton: 0,
      earned: 0,
      born: 0,
      died: 0,
      left: 0,
      built: 0,
      wrecks: 0,
      peakPop: 60,
      quotasMet: 0,
      eventsSeen: 0,
    },
    eventLog: {},
    ending: null,
    finished: false,
  };
  s.history.push({ season: 0, ...snapshot(s) });
  return s;
}
