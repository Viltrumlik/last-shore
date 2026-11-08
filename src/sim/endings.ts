// Ending conditions (GDD section 2).
import { activeReeds, avgSoilSalinity, bayWaterTiles } from './grid';
import type { EndingId, GameState } from './types';

export const END_RULES = {
  e1BayTiles: 8,
  e1Pop: 120,
  e1Health: 60,
  e2Reeds: 10,
  e2Pop: 80,
  e2Salinity: 45,
  e3Pop: 80,
  e3Salinity: 60,
  e4MinPop: 20,
  exodusPop: 20,
  famineSeasons: 2,
  removedAfter: 3,
};

/** Failure endings checked at any time. */
export function checkFailure(s: GameState): EndingId | null {
  if (s.res.pop < END_RULES.exodusPop || s.res.hope <= 0) return 'E5';
  if (s.famineStreak >= END_RULES.famineSeasons) return 'E6';
  if (s.quota.failures >= END_RULES.removedAfter) return 'E7';
  return null;
}

/** Endings after the final winter (Year 10). */
export function finalEnding(s: GameState): EndingId {
  const fail = checkFailure(s);
  if (fail) return fail;
  const pop = s.res.pop;
  const sal = avgSoilSalinity(s);
  if (s.dike.complete && bayWaterTiles(s) >= END_RULES.e1BayTiles && pop >= END_RULES.e1Pop && s.res.health >= END_RULES.e1Health) {
    return 'E1';
  }
  if (activeReeds(s) >= END_RULES.e2Reeds && pop >= END_RULES.e2Pop && sal < END_RULES.e2Salinity) return 'E2';
  if (pop >= END_RULES.e3Pop && sal >= END_RULES.e3Salinity) return 'E3';
  return 'E4';
}

/** Progress towards each good ending, for the UI goals panel. */
export function goalProgress(s: GameState) {
  return {
    dike: s.dike.complete,
    bay: bayWaterTiles(s),
    pop: s.res.pop,
    health: s.res.health,
    reeds: activeReeds(s),
    salinity: avgSoilSalinity(s),
  };
}
