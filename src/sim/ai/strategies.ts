// Scripted strategies used by the strategy tests and `npm run balance`.
// They play through the same public API as a human (canUse/applyTool/sliders/events).
import { quotaFor } from '../../content/events';
import { BAL, diff } from '../config';
import { choiceAvailable, chooseEvent, eventDef, resolveDelta, type EventDef } from '../events';
import {
  bayWaterTiles,
  buildingTiles,
  countBuildings,
  dockActive,
  dockOnBay,
  isField,
  isSeabed,
  isWater,
  n4,
  seasonOfYear,
  waterDepth,
  year,
} from '../grid';
import { capacity, houseSalinity } from '../population';
import { applyTool, buyFood, canUse, costOf, foodPrice, labourFree, setFocus, setWater, workers } from '../rules';
import { seaHealth } from '../sea';
import { afterChoice, computeWater, endSeason, nursery, riverFlow } from '../season';
import { newGame } from '../state';
import type { Difficulty, EndingId, GameState, ToolId } from '../types';

export interface Strategy {
  name: string;
  plan(s: GameState): void;
  choose(s: GameState): number;
}

export interface RunResult {
  ending: EndingId;
  seasons: number;
  state: GameState;
}

const TOWN_X = 7;
const TOWN_Y = 10;

export function firstAvailable(s: GameState): number {
  const e = eventDef(s.pending!.id);
  const i = e.choices.findIndex((c) => choiceAvailable(s, c));
  return i < 0 ? 0 : i;
}

/** Play a whole game headlessly. */
export function runGame(seed: number, difficulty: Difficulty, strategy: Strategy): RunResult {
  const s = newGame(seed, difficulty);
  let guard = 0;
  while (!s.ending && guard++ < 200) {
    if (s.pending) {
      let idx = strategy.choose(s);
      const e = eventDef(s.pending.id);
      if (!e.choices[idx] || !choiceAvailable(s, e.choices[idx]!)) idx = firstAvailable(s);
      chooseEvent(s, idx);
      afterChoice(s);
      continue;
    }
    strategy.plan(s);
    endSeason(s);
  }
  return { ending: s.ending ?? 'E4', seasons: s.season, state: s };
}

function dist(s: GameState, i: number, x: number, y: number): number {
  return Math.hypot((i % s.w) - x, Math.floor(i / s.w) - y);
}

/** Best tile for a tool by score (higher is better); null if none can be used. */
function bestTile(s: GameState, tool: ToolId, score: (i: number) => number): number | null {
  let best: number | null = null;
  let bestScore = -Infinity;
  for (let i = 0; i < s.tiles.length; i++) {
    if (!canUse(s, tool, i).ok) continue;
    const sc = score(i);
    if (sc > bestScore) {
      bestScore = sc;
      best = i;
    }
  }
  return best;
}

function tryBuild(s: GameState, tool: ToolId, score: (i: number) => number, reserve = 0): boolean {
  if (s.res.money - costOf(s, tool).money < reserve) return false;
  const i = bestTile(s, tool, score);
  if (i === null) return false;
  return applyTool(s, tool, i);
}

function maxNeighbourDepth(s: GameState, i: number): number {
  let m = 0;
  for (const n of n4(s, i)) m = Math.max(m, waterDepth(s, n));
  return m;
}

function activeDocks(s: GameState): number[] {
  return buildingTiles(s, 'dock').filter((i) => dockActive(s, i));
}

function fieldCount(s: GameState): number {
  let n = 0;
  for (const t of s.tiles) if (t.b && isField(t.b.id)) n++;
  return n;
}

/** Rough expected food per season from what is built now. */
function expectedFood(s: GameState): number {
  const d = diff(s.difficulty);
  let fish = 0;
  const sh = seaHealth(s);
  for (const i of activeDocks(s)) {
    if (maxNeighbourDepth(s, i) < 0.15) continue;
    fish += BAL.fishBase * d.fish * 0.91 * (dockOnBay(s, i) ? BAL.bayHealth : sh) * (1 + nursery(s, i));
  }
  let grain = 0;
  const wsat = s.lastReport ? Math.max(0.3, s.lastReport.water.fieldsSat) : 1;
  for (const i of buildingTiles(s, 'wheat')) grain += 14.5 * wsat * Math.max(0.1, 1 - Math.max(0, s.tiles[i]!.sal - 35) / 75);
  grain += countBuildings(s, 'melon') * 4.5;
  return fish + grain;
}

function expectedCotton(s: GameState): number {
  let c = 0;
  for (const i of buildingTiles(s, 'cotton')) {
    const t = s.tiles[i]!;
    const sal = Math.max(0.2, 1 - Math.max(0, t.sal + 12 - 60) / 70);
    // a field planted after spring yields less this year
    const growth = seasonOfYear(s.season) === 0 || t.b!.age >= 1 ? 1 : 0.66;
    c += BAL.cottonYield * sal * growth * 0.9;
  }
  return c;
}

// ------------------------------------------------------------------ do nothing

/** Never builds, never touches the sliders, takes the first affordable option on every card. */
export const doNothing: Strategy = {
  name: 'do-nothing',
  plan() {},
  choose: firstAvailable,
};

// ------------------------------------------------------------------ cotton only

/** Grows as much cotton as the river allows, buys grain with the money, follows the water with docks. */
export const cottonOnly: Strategy = {
  name: 'cotton-only',
  plan(s) {
    setWater(s, 72, 4, 24);
    const W = Math.max(1, workers(s));
    const docks = activeDocks(s).length;
    const farm = Math.min(75, Math.ceil(((fieldCount(s) + 1) * BAL.fieldCrew * 100) / W));
    const fish = Math.max(0, Math.min(100 - farm - 15, Math.ceil((docks * BAL.dockCrew * 100) / W)));
    setFocus(s, fish, farm, 100 - farm - fish);
    while (s.res.food < s.res.pop * 2 && s.res.money > foodPrice(s) + 60 && buyFood(s)) {
      /* buy grain with cotton money */
    }
    // keep two working docks
    const lasting = activeDocks(s).filter((i) => maxNeighbourDepth(s, i) > 0.4).length;
    if (lasting < 2) tryBuild(s, 'dock', (i) => Math.min(maxNeighbourDepth(s, i), 1.5) * 3 - dist(s, i, TOWN_X + 6, TOWN_Y) * 0.3, 60);
    // a cotton town grows only as far as imported grain can feed it
    if (s.res.pop >= capacity(s) - 4 && s.res.pop < 92 && s.res.money > 120) tryBuild(s, 'house', (i) => -dist(s, i, TOWN_X, TOWN_Y), 80);
    if (countBuildings(s, 'clinic') === 0 && s.res.money > 300) tryBuild(s, 'clinic', (i) => -dist(s, i, TOWN_X, TOWN_Y), 150);
    // as many cotton fields as the spring river can water
    const springFlow = BAL.flow[0] * (1 - diff(s.difficulty).upstream0) * 0.72;
    const maxCotton = Math.floor(springFlow / BAL.cottonWater) + 2;
    for (let k = 0; k < 3 && countBuildings(s, 'cotton') < maxCotton; k++) {
      if (!tryBuild(s, 'cotton', (i) => -dist(s, i, TOWN_X, TOWN_Y + 3), 60)) {
        if (!tryBuild(s, 'canal', (i) => soilAround(s, i) * 2 - dist(s, i, TOWN_X, TOWN_Y + 3) * 0.4, 80)) break;
      }
    }
  },
  choose: firstAvailable,
};

// ------------------------------------------------------------------ balanced eco

/** Shore tiles of the original coast line (sand with sea to the east), town rows first. */
function beltCandidates(s: GameState): number[] {
  const out: number[] = [];
  for (let y = 2; y < s.h - 1; y++) {
    for (let x = s.w - 2; x >= 0; x--) {
      const i = y * s.w + x;
      const t = s.tiles[i]!;
      if ((t.terrain === 'sand' || t.terrain === 'soil') && s.tiles[i + 1]!.terrain === 'sea') {
        if (t.terrain === 'sand') out.push(i);
        break;
      }
    }
  }
  return out.sort((a, b) => Math.abs(Math.floor(a / s.w) - TOWN_Y) - Math.abs(Math.floor(b / s.w) - TOWN_Y));
}

function soilAround(s: GameState, i: number): number {
  let n = 0;
  for (const nb of n4(s, i)) if (s.tiles[nb]!.terrain === 'soil' && !s.tiles[nb]!.b) n++;
  return n;
}

function ecoPlan(s: GameState, opts: EcoOpts = { saxaul: true, reeds: true, cotton: 0, bay: 25 }): void {
  const yr = year(s.season);
  const so = seasonOfYear(s.season);
  const W = Math.max(1, workers(s));

  // ---- work focus: staff docks and fields, the rest builds ----
  const docksA = activeDocks(s).length;
  let fishP = Math.ceil((docksA * BAL.dockCrew * 100) / W);
  let farmP = Math.ceil((fieldCount(s) * BAL.fieldCrew * 100) / W);
  const minBuild = s.dike.started && !s.dike.complete ? 26 : 20;
  if (fishP + farmP > 100 - minBuild) {
    const k = (100 - minBuild) / (fishP + farmP);
    fishP = Math.floor(fishP * k);
    farmP = Math.floor(farmP * k);
  }
  setFocus(s, fishP, farmP, 100 - fishP - farmP);

  // ---- water ----
  const flow = Math.max(1, riverFlow(s));
  const w0 = computeWater(s);
  const townP = Math.min(40, Math.ceil(((w0.townDemand * 1.05) / flow) * 100));
  const reedNeed = Math.ceil((w0.reedsDemand / flow) * 100);
  let fieldsP = Math.ceil((w0.fieldsDemand / flow) * 100) + 2;
  const foodOk = expectedFood(s) >= s.res.pop * 1.05 && s.res.food >= s.res.pop * 0.8;
  if (s.dike.complete && foodOk) {
    // the bay needs its share: fields get what is left after a bay quota
    fieldsP = Math.min(fieldsP, 100 - townP - reedNeed - (so === 3 ? 0 : opts.bay));
  }
  fieldsP = Math.max(0, Math.min(100 - townP - reedNeed, fieldsP));
  setWater(s, fieldsP, 100 - fieldsP - townP, townP);

  // ---- food security: buy grain before the stores run dry ----
  const short = expectedFood(s) < s.res.pop;
  while (s.res.food < s.res.pop * (short ? 1.1 : 0.8) && s.res.money >= foodPrice(s) + 20 && buyFood(s)) {
    /* buy */
  }

  // ---- money reserves ----
  const quotaGap = Math.max(0, quotaFor(s) - s.res.cotton - (so <= 2 ? expectedCotton(s) : 0));
  let reserve = so === 1 || so === 2 ? Math.min(150, quotaGap * BAL.cottonBuy) : 0;
  const hungry = expectedFood(s) < s.res.pop * 0.95;
  if (s.dike.started && !s.dike.complete && !hungry) reserve += costOf(s, 'dike').money;
  if (s.dike.unlocked && !s.dike.started && !hungry) reserve += 70;

  // ---- the Great Dike (only when the town can feed itself) ----
  if (s.dike.unlocked && !s.dike.started && !hungry && s.res.money >= costOf(s, 'dike').money + 50) {
    applyTool(s, 'dike', s.dikeLine[0]!);
  }

  // ---- cotton for the quota (plant in winter/spring) ----
  const maxCotton = Math.ceil(quotaFor(s) / 11) + opts.cotton;
  if ((so === 3 || so === 0) && countBuildings(s, 'cotton') < maxCotton && expectedCotton(s) < quotaFor(s) * 1.15 + 3 + opts.cotton * 12) {
    tryBuild(s, 'cotton', (i) => -dist(s, i, TOWN_X - 5, TOWN_Y + 6) * 0.5 - s.tiles[i]!.sal * 0.05, reserve);
  }

  // ---- docks: keep fishing where the water is ----
  const lasting = activeDocks(s).filter((i) => maxNeighbourDepth(s, i) > 0.45).length;
  const targetDocks = yr <= 2 ? 3 : 4 + (hungry ? 1 : 0);
  if (lasting < targetDocks) {
    tryBuild(
      s,
      'dock',
      (i) => {
        const t = s.tiles[i]!;
        const bay = s.dike.complete && t.bay ? 4 : 0;
        return Math.min(maxNeighbourDepth(s, i), 1.6) * 3 - dist(s, i, TOWN_X + 6, TOWN_Y) * 0.3 + bay - (t.dikeLine ? 20 : 0);
      },
      reserve,
    );
  }

  // ---- food: wheat fields + canals ----
  const needFood = s.res.pop * 1.12 + 6;
  for (let k = 0; k < 3 && expectedFood(s) < needFood; k++) {
    if (!tryBuild(s, 'wheat', (i) => -s.tiles[i]!.sal * 0.1 - dist(s, i, TOWN_X, TOWN_Y + 3) * 0.3, reserve)) {
      if (!tryBuild(s, 'canal', (i) => soilAround(s, i) * 2 - dist(s, i, TOWN_X, TOWN_Y + 3) * 0.4, reserve + 20)) break;
    }
  }

  // ---- clinic ----
  const clinics = countBuildings(s, 'clinic');
  if (clinics === 0 && yr >= 2) tryBuild(s, 'clinic', (i) => -dist(s, i, TOWN_X, TOWN_Y), reserve);

  // ---- saxaul belt along the old shore, town rows first, before the great storm ----
  const belt = opts.saxaul ? beltCandidates(s) : [];
  let perSeason = yr >= 2 ? 3 : 1;
  for (const i of belt) {
    if (perSeason <= 0) break;
    if (s.tiles[i]!.b) continue;
    if (s.res.money - costOf(s, 'saxaul').money < reserve) break;
    if (canUse(s, 'saxaul', i).ok && applyTool(s, 'saxaul', i)) perSeason--;
  }

  // ---- houses ----
  const dry = s.lastReport ? s.lastReport.water.fieldsSat < 0.75 : false;
  const push = opts.bay >= 50 && yr >= 6 && s.res.pop < 128;
  if (s.res.pop >= capacity(s) - 3 && s.res.hope >= 45 && (push ? s.res.food > s.res.pop : !dry && expectedFood(s) > s.res.pop * 1.05)) {
    tryBuild(s, 'house', (i) => -dist(s, i, TOWN_X, TOWN_Y) - (s.tiles[i]!.terrain === 'soil' ? 0.6 : 0), reserve);
  }

  // ---- reeds: nursery near docks / in the bay ----
  const reedTarget = !opts.reeds ? 0 : yr <= 1 ? 1 : yr <= 3 ? 5 : 13;
  for (let k = 0; k < 2 && countBuildings(s, 'reeds') < reedTarget; k++) {
    const docks = buildingTiles(s, 'dock');
    const ok = tryBuild(
      s,
      'reeds',
      (i) => {
        const t = s.tiles[i]!;
        const inWater = isWater(s, i) ? 2 : 0;
        const nearDock = docks.some((d) => dist(s, d, i % s.w, Math.floor(i / s.w)) <= 3) ? 2 : 0;
        const bay = s.dike.complete && t.bay ? 3 : 0;
        return inWater + nearDock + bay - (t.dikeLine ? 20 : 0) - dist(s, i, TOWN_X + 7, TOWN_Y) * 0.15;
      },
      reserve,
    );
    if (!ok) break;
  }

  // ---- workshop ----
  if (countBuildings(s, 'workshop') === 0 && yr >= 3 && s.res.reedMat >= 8) {
    tryBuild(s, 'workshop', (i) => -dist(s, i, TOWN_X, TOWN_Y), reserve + 40);
  }

  // ---- second clinic for a big town ----
  if (clinics === 1 && s.res.pop >= 100) tryBuild(s, 'clinic', (i) => -dist(s, i, TOWN_X, TOWN_Y), reserve + 60);

  // ---- leaching salty fields and the soil around homes ----
  if (so <= 1) {
    for (const i of buildingTiles(s, 'cotton').concat(buildingTiles(s, 'wheat'), buildingTiles(s, 'melon'))) {
      const lim = s.tiles[i]!.b!.id === 'cotton' ? 75 : 50;
      if (s.tiles[i]!.sal > lim && s.res.money > 90 + reserve && labourFree(s) >= 2) applyTool(s, 'leach', i);
    }
    if (houseSalinity(s) > 38) {
      for (const i of buildingTiles(s, 'house')) {
        for (const n of n4(s, i)) {
          const t = s.tiles[n]!;
          if (t.terrain === 'soil' && !t.b && t.sal > 42 && s.res.money > 120 + reserve && labourFree(s) >= 2) applyTool(s, 'leach', n);
        }
      }
    }
  }

  // ---- spare money: more saxaul on new seabed facing the town ----
  if (opts.saxaul && yr >= 4 && s.res.money > 180 + reserve) {
    tryBuild(
      s,
      'saxaul',
      (i) => (isSeabed(s, i) ? 1 : 0) - Math.abs(Math.floor(i / s.w) - TOWN_Y) * 0.3 - dist(s, i, TOWN_X + 6, TOWN_Y) * 0.2,
      reserve,
    );
  }
  void bayWaterTiles;
}

function ecoChoose(s: GameState): number {
  const id = s.pending!.id;
  const e = eventDef(id);
  const pick = (cid: string) => {
    const i = e.choices.findIndex((c) => c.id === cid);
    return i >= 0 && choiceAvailable(s, e.choices[i]!) ? i : -1;
  };
  const prefer = (...ids: string[]) => {
    for (const cid of ids) {
      const i = pick(cid);
      if (i >= 0) return i;
    }
    return bestByValue(s, e);
  };
  const m = s.res.money;
  switch (id) {
    case 'quota':
    case 'quota_first':
      return prefer('deliver', 'bargain');
    case 'harbour':
      return m >= 170 ? prefer('move', 'museum') : prefer('museum');
    case 'storm_warning':
      return m >= 120 ? prefer('masks', 'wells') : prefer('wells', 'nothing');
    case 'storm_after':
      return m >= 150 ? prefer('clean', 'wash') : prefer('wash');
    case 'epidemic':
      return prefer('clinic', 'water');
    case 'dike_plan':
      return prefer('approve', 'later');
    case 'aid':
      return s.res.hope >= 50 ? prefer('accept') : prefer('refuse');
    case 'volunteers':
      return prefer('host', 'decline');
    case 'camels':
      return prefer('refuse');
    case 'canal_breach':
      return m >= 60 ? prefer('repair') : prefer('abandon');
    case 'cotton_boom':
      return prefer('decline');
    case 'inspection':
      return m >= 110 ? prefer('feast', 'plain') : prefer('plain');
    case 'youth_leave':
      return m >= 90 ? prefer('persuade', 'bless') : prefer('bless');
    case 'resettle':
      return prefer('refuse');
    case 'salvage':
      return m < 60 ? prefer('salvage') : prefer('keep');
    case 'wedding':
      return prefer('modest', 'postpone');
    case 'navruz':
      return s.res.food >= s.res.pop ? prefer('celebrate', 'quiet') : prefer('quiet');
    case 'school':
      return m >= 110 ? prefer('fund', 'refuse') : prefer('refuse');
    default:
      return bestByValue(s, e);
  }
}

function bestByValue(s: GameState, e: EventDef): number {
  let best = 0;
  let bestV = -Infinity;
  e.choices.forEach((c, i) => {
    if (!choiceAvailable(s, c)) return;
    const cost = resolveDelta(s, c.cost);
    const fx = resolveDelta(s, c.fx);
    const moneyW = s.res.money > 200 ? 0.05 : 0.12;
    let v =
      (fx.hope ?? 0) * 2.5 +
      (fx.health ?? 0) * 2 +
      (fx.money ?? 0) * moneyW +
      (fx.food ?? 0) * 0.12 +
      (fx.pop ?? 0) * 2.5 -
      (cost.money ?? 0) * moneyW -
      (cost.food ?? 0) * 0.12 -
      (cost.reedMat ?? 0) * 0.3;
    if (c.risky) v -= 3;
    if (['dig', 'host', 'buy', 'protect', 'repair', 'firewood', 'far', 'channel', 'stock', 'spray', 'masks', 'shutters'].includes(c.id)) v += 4;
    if (['pray', 'abandon'].includes(c.id)) v -= 2;
    if (v > bestV) {
      bestV = v;
      best = i;
    }
  });
  return best;
}

export interface EcoOpts {
  saxaul: boolean;
  reeds: boolean;
  /** extra cotton fields beyond the quota */
  cotton: number;
  /** share of the river reserved for the bay once the dike is closed */
  bay: number;
}

export const balancedEco: Strategy = { name: 'balanced-eco', plan: (s) => ecoPlan(s), choose: ecoChoose };

/** Same plan without any saxaul: shows what unchecked salt dust does. */
export const ecoNoSaxaul: Strategy = { name: 'eco-no-saxaul', plan: (s) => ecoPlan(s, { saxaul: false, reeds: true, cotton: 0, bay: 25 }), choose: ecoChoose };

/** Farms like the eco plan but spends nothing on saxaul or reeds and grows extra cotton for money. */
export const cottonFarmer: Strategy = { name: 'cotton-farmer', plan: (s) => ecoPlan(s, { saxaul: false, reeds: false, cotton: 3, bay: 25 }), choose: ecoChoose };

/** Same plan, but commits half of the river to refilling the bay once the dike is closed. */
export const dikeBuilder: Strategy = { name: 'dike-builder', plan: (s) => ecoPlan(s, { saxaul: true, reeds: true, cotton: 0, bay: 50 }), choose: ecoChoose };

export const STRATEGIES: Strategy[] = [doNothing, cottonOnly, cottonFarmer, balancedEco, dikeBuilder];
