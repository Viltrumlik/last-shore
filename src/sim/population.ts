// Health, hope and population.
import { BAL, diff } from './config';
import { activeReeds, bayWaterTiles, buildingTiles, countBuildings, isLand, n8 } from './grid';
import { roundStoch } from './rng';
import type { GameState } from './types';

export interface PeopleInput {
  /** food production this season */
  produced: number;
  /** food that could not be eaten (shortage) */
  unmet: number;
  townSat: number;
  /** clinics whose upkeep was paid */
  clinicsPaid: number;
  newWrecks: number;
  dikeWorked: boolean;
}

export interface PeopleResult {
  births: number;
  deaths: number;
  left: number;
  healthDelta: number;
  hopeDelta: number;
}

export function houseDust(s: GameState): number {
  const houses = buildingTiles(s, 'house');
  if (!houses.length) return 0;
  let sum = 0;
  for (const i of houses) sum += s.tiles[i]!.dust;
  return sum / houses.length;
}

/** Average salinity around homes (house tiles and the land next to them). */
export function houseSalinity(s: GameState): number {
  const houses = buildingTiles(s, 'house');
  if (!houses.length) return 0;
  let sum = 0;
  let n = 0;
  for (const i of houses) {
    sum += s.tiles[i]!.sal * 2;
    n += 2;
    for (const nb of n8(s, i)) {
      if (isLand(s, nb)) {
        sum += s.tiles[nb]!.sal;
        n++;
      }
    }
  }
  return n ? sum / n : 0;
}

export function capacity(s: GameState): number {
  return countBuildings(s, 'house') * BAL.houseCapacity;
}

export function clinicBonus(s: GameState, clinicsPaid: number): number {
  const c = Math.min(clinicsPaid, BAL.clinicMaxCount);
  if (c <= 0) return 0;
  const coverage = Math.min(1, (c * 80) / Math.max(1, s.res.pop));
  return BAL.clinicHealth * c * coverage;
}

export function updatePeople(s: GameState, inp: PeopleInput): PeopleResult {
  const d = diff(s.difficulty);
  const r = s.res;
  const hungry = inp.unmet > 0;

  // ---- health ----
  let dh = -d.healthDrift;
  dh += clinicBonus(s, inp.clinicsPaid);
  dh += inp.townSat >= 0.999 ? 1.0 : -(1 - inp.townSat) * 10;
  dh -= houseDust(s) * 0.9;
  dh -= Math.max(0, houseSalinity(s) - 30) * 0.06;
  if (hungry) dh -= 8;
  else if (r.food >= r.pop) dh += 0.3;
  if (r.health < 45) dh += 1;
  for (const m of s.modifiers) if (m.kind === 'health') dh += m.value;
  r.health = clamp(r.health + dh, 0, 100);

  // ---- hope ----
  let dp = -d.hopeDrift - 0.25 * Math.max(0, -s.seaLevel - 1.5);
  const wellFed = inp.produced >= r.pop || r.food >= r.pop * 0.75;
  if (hungry) dp -= 10;
  else if (wellFed) dp += 0.8;
  else if (r.food < r.pop * 0.5) dp -= 2;
  if (!hungry && r.money >= 250) dp += 0.5;
  dp += (r.health - 60) * 0.04;
  dp += Math.min(2, 0.2 * activeReeds(s)) + Math.min(1, 0.1 * countBuildings(s, 'saxaul'));
  if (s.dike.started && !s.dike.complete && inp.dikeWorked) dp += 1.5;
  if (s.dike.complete) dp += 1 + Math.min(4, 0.4 * bayWaterTiles(s));
  if (countBuildings(s, 'clinic') > 0) dp += 0.5;
  if (r.pop > capacity(s)) dp -= 3;
  dp -= 4 * inp.newWrecks;
  for (const m of s.modifiers) if (m.kind === 'hope') dp += m.value;
  r.hope = clamp(r.hope + dp, 0, 100);

  // ---- population ----
  const cap = capacity(s);
  let births = 0;
  if (r.hope >= BAL.hopeBirthMin && !hungry && (inp.produced >= r.pop * 0.9 || r.food >= r.pop) && r.pop < cap) {
    const b = r.pop * BAL.birthRate * (0.4 + r.health / 100) * (r.hope >= 70 ? 1.25 : 1);
    births = Math.min(roundStoch(s, b), cap - r.pop);
    if (r.hope >= 65 && r.food >= r.pop && r.pop + births < cap) births += Math.min(cap - r.pop - births, roundStoch(s, 1.5));
  }
  let deaths = roundStoch(s, r.pop * BAL.baseDeath * (1 + Math.max(0, 50 - r.health) / 25) + inp.unmet * 0.15);
  let left = 0;
  if (r.hope < BAL.hopeLeave) {
    left += roundStoch(s, r.pop * BAL.emigrationRate * ((BAL.hopeLeave - r.hope) / 10) * (r.health < 40 ? 1.5 : 1));
  }
  if (r.pop > cap) left += roundStoch(s, (r.pop - cap) * 0.25);
  deaths = Math.min(deaths, r.pop);
  left = Math.min(left, r.pop - deaths);
  r.pop = Math.max(0, r.pop + births - deaths - left);

  s.stats.born += births;
  s.stats.died += deaths;
  s.stats.left += left;
  s.stats.peakPop = Math.max(s.stats.peakPop, r.pop);
  return { births, deaths, left, healthDelta: dh, hopeDelta: dp };
}

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
