import { activeReeds, avgSoilSalinity, bayWaterTiles } from './grid';
import type { GameState, Snapshot } from './types';

export function snapshot(s: GameState): Snapshot {
  return {
    pop: s.res.pop,
    food: Math.round(s.res.food),
    money: Math.round(s.res.money),
    health: Math.round(s.res.health),
    hope: Math.round(s.res.hope),
    seaLevel: Math.round(s.seaLevel * 100) / 100,
    salinity: Math.round(avgSoilSalinity(s) * 10) / 10,
    reedBeds: activeReeds(s),
    bayWater: bayWaterTiles(s),
  };
}
