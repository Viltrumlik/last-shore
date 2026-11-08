// End-of-season resolution: water -> production -> consumption -> salinity & dust ->
// sea level -> health/hope -> population -> construction -> event / ending.
import { BAL, COSTS, DIKE_SEASONS, TOTAL_SEASONS, diff } from './config';
import { checkFailure, finalEnding } from './endings';
import { pickEvent } from './events';
import {
  buildingTiles,
  countBuildings,
  dockActive,
  dockOnBay,
  irrigationMask,
  isField,
  isWater,
  within,
  seasonOfYear,
} from './grid';
import { updatePeople } from './population';
import { dikeReserve, modMult, workers } from './rules';
import { dustStrength, landSalinity, spreadDust } from './salinity';
import { completeDike, seaHealth, upstreamDiversion, updateSea } from './sea';
import { snapshot } from './snapshot';
import type { GameState, SeasonReport, WaterReport } from './types';

export function riverFlow(s: GameState, season = s.season): number {
  return BAL.flow[seasonOfYear(season)]! * (1 - upstreamDiversion(s, season)) * modMult(s, 'water');
}

function fieldDemand(id: string, so: number): number {
  if (id === 'wheat') return so < 3 ? BAL.wheatWater : 0;
  if (id === 'melon') return so < 2 ? BAL.melonWater : 0;
  if (id === 'cotton') return so < 3 ? BAL.cottonWater : 0;
  return 0;
}

/** Expected growing seasons before each harvest (for partial-season planting). */
function harvestSpan(id: string, so: number): number {
  if (id === 'wheat') return so === 1 ? 2 : 1;
  if (id === 'melon') return 2;
  return 3;
}

function isHarvest(id: string, so: number): boolean {
  if (id === 'wheat') return so === 1 || so === 2;
  if (id === 'melon') return so === 1;
  if (id === 'cotton') return so === 2;
  return false;
}

function salFactor(id: string, sal: number, s: GameState): number {
  if (id === 'wheat') return clamp01(1 - Math.max(0, sal - 35) / 75, 0.1);
  if (id === 'melon') return clamp01(1 - (Math.max(0, sal - 25) / 55) * modMult(s, 'melonSalt'), 0.05);
  return clamp01(1 - Math.max(0, sal - 60) / 70, 0.2);
}

function clamp01(v: number, lo = 0): number {
  return Math.max(lo, Math.min(1, v));
}

/** Water accounting for the coming resolution (also used by the UI for a live preview). */
export function computeWater(s: GameState): WaterReport & { irrigated: Uint8Array; reedDry: Set<number> } {
  const so = seasonOfYear(s.season);
  const flow = riverFlow(s);
  const fieldsW = (flow * s.water.fields) / 100;
  const reedsW = (flow * s.water.reeds) / 100;
  const townW = (flow * s.water.town) / 100;
  const irrigated = irrigationMask(s);

  let fieldsDemand = 0;
  for (let i = 0; i < s.tiles.length; i++) {
    const b = s.tiles[i]!.b;
    if (b && isField(b.id) && irrigated[i]) fieldsDemand += fieldDemand(b.id, so);
  }
  const leach = s.leachWater;
  const leachUsed = Math.min(leach, fieldsW);
  const fieldsAvail = Math.max(0, fieldsW - leach);
  const fieldsSat = fieldsDemand > 0 ? Math.min(1, fieldsAvail / fieldsDemand) : 1;
  const fieldsUsed = leachUsed + Math.min(fieldsAvail, fieldsDemand);

  const reedDry = new Set<number>();
  let reedsDemand = 0;
  for (const i of buildingTiles(s, 'reeds')) {
    if (!isWater(s, i)) {
      reedDry.add(i);
      reedsDemand += so === 3 ? BAL.reedWaterWinter : BAL.reedWater;
    }
  }
  const reedsSat = reedsDemand > 0 ? Math.min(1, reedsW / reedsDemand) : 1;
  const reedsUsed = Math.min(reedsW, reedsDemand);
  const bayFlow = reedsW - reedsUsed;

  const townDemand = s.res.pop * BAL.townWaterPer + countBuildings(s, 'clinic') * BAL.clinicWater;
  const townSat = townDemand > 0 ? Math.min(1, (townW * modMult(s, 'townWater')) / townDemand) : 1;
  const townUsed = Math.min(townW, townDemand);

  const toBay = s.dike.complete ? bayFlow : 0;
  const toSea = fieldsW - fieldsUsed + (townW - townUsed) + (s.dike.complete ? 0 : bayFlow);
  return {
    flow,
    fieldsDemand,
    fieldsSat,
    reedsDemand,
    reedsSat,
    townDemand,
    townSat,
    toSea,
    toBay,
    irrigated,
    reedDry,
  };
}

/** Workers per job after honouring the labour already spent this season. */
export function workforce(s: GameState): { fishers: number; farmers: number; builders: number } {
  const W = workers(s);
  const needed = (s.labourUsed + dikeReserve(s)) / (BAL.labourPerBuilder * modMult(s, 'labour'));
  const builders = Math.min(W, Math.max((W * s.focus.building) / 100, needed));
  const rest = W - builders;
  const fsum = s.focus.fishing + s.focus.farming;
  const fishers = fsum > 0 ? (rest * s.focus.fishing) / fsum : rest / 2;
  return { fishers, farmers: rest - fishers, builders };
}

export function nursery(s: GameState, dock: number): number {
  let n = 0;
  for (const j of within(s, dock, BAL.nurseryRadius)) {
    const b = s.tiles[j]!.b;
    if (b && b.id === 'reeds') n++;
  }
  return Math.min(BAL.nurseryMax, n * BAL.nurseryPerReed);
}

/** Resolve the current season. Returns the report; sets s.pending (event) or s.ending. */
export function endSeason(s: GameState): SeasonReport | null {
  if (s.ending || s.pending || s.finished) return null;
  const D = diff(s.difficulty);
  const season = s.season;
  const so = seasonOfYear(season);
  const before = snapshot(s);
  const r = s.res;
  const notes: SeasonReport['notes'] = [];
  const storm = season === 12;

  // ---- 0. workforce ----
  const wf = workforce(s);

  // ---- 1. water ----
  const water = computeWater(s);
  const irrigated = water.irrigated;
  const fieldSatAt = (i: number) => (irrigated[i] ? water.fieldsSat : 0);

  // ---- 2. production ----
  // fish
  const docks = buildingTiles(s, 'dock').filter((i) => dockActive(s, i));
  const staffFish = docks.length ? Math.min(1, wf.fishers / (docks.length * BAL.dockCrew)) : 0;
  const sh = seaHealth(s);
  let fish = 0;
  for (const i of docks) {
    const health = dockOnBay(s, i) ? BAL.bayHealth : sh;
    fish += BAL.fishBase * D.fish * BAL.fishSeason[so]! * health * staffFish * (1 + nursery(s, i)) * modMult(s, 'fish');
  }
  // fields
  const fields = s.tiles.map((t, i) => (t.b && isField(t.b.id) ? i : -1)).filter((i) => i >= 0);
  const staffFarm = fields.length ? Math.min(1, wf.farmers / (fields.length * BAL.fieldCrew)) : 0;
  let grain = 0;
  let melonFood = 0;
  let melonMoney = 0;
  let cottonHarvest = 0;
  for (const i of fields) {
    const t = s.tiles[i]!;
    const b = t.b!;
    const dem = fieldDemand(b.id, so);
    if (dem > 0) {
      b.acc += fieldSatAt(i);
      b.n += 1;
      t.moist = Math.round(30 + 70 * fieldSatAt(i));
    } else {
      t.moist = Math.max(20, t.moist - 15);
    }
    if (isHarvest(b.id, so)) {
      const growth = Math.min(1, b.acc / harvestSpan(b.id, so));
      const y = growth * salFactor(b.id, t.sal, s) * staffFarm;
      if (b.id === 'wheat') grain += BAL.wheatYield[so]! * y * modMult(s, 'wheat');
      else if (b.id === 'melon') {
        melonFood += BAL.melonFood * y;
        melonMoney += BAL.melonMoney * y;
      } else cottonHarvest += BAL.cottonYield * y;
      b.acc = 0;
      b.n = 0;
    }
  }
  // reeds
  const reedOk = (i: number) => !water.reedDry.has(i) || water.reedsSat >= 0.5;
  for (const i of buildingTiles(s, 'reeds')) {
    const b = s.tiles[i]!.b!;
    if (reedOk(i)) {
      b.dry = 0;
      if (so !== 3) r.reedMat += BAL.reedMatPer;
    } else {
      b.dry++;
      if (b.dry >= 3) {
        s.tiles[i]!.b = null;
        notes.push({ key: 'note.reedsDied', params: {} });
      }
    }
  }
  // money
  let income = r.pop * D.tax + melonMoney;
  const workshops = countBuildings(s, 'workshop');
  if (workshops > 0) {
    const use = Math.min(r.reedMat, BAL.workshopUse * workshops);
    r.reedMat -= use;
    income += use * BAL.workshopPrice;
    if ((s.flags.museum ?? 0) > 0) {
      income += BAL.museumPerWreck * Math.min(BAL.museumMaxWrecks, countBuildings(s, 'wreck'));
    }
  }
  const clinics = countBuildings(s, 'clinic');
  const upkeep = clinics * BAL.clinicUpkeep + workshops * BAL.workshopUpkeep;
  r.money += income;
  let expenses = upkeep;
  let clinicsPaid = clinics;
  if (r.money < upkeep) {
    clinicsPaid = 0;
    expenses = r.money;
    notes.push({ key: 'note.upkeepUnpaid', params: {} });
  }
  r.money -= expenses;
  r.cotton += Math.round(cottonHarvest);
  s.stats.earned += income;
  s.stats.fish += fish;
  s.stats.grain += grain + melonFood;
  s.stats.cotton += cottonHarvest;

  // ---- 3. consumption ----
  const produced = fish + grain + melonFood;
  r.food += produced - r.pop;
  let unmet = 0;
  if (r.food < 0) {
    unmet = -r.food;
    r.food = 0;
    notes.push({ key: 'note.hunger', params: { n: Math.round(unmet) } });
  }
  if (r.food > r.pop * 1.5) r.food -= (r.food - r.pop * 1.5) * BAL.spoilShare;
  s.famineStreak = r.food <= 0.5 ? s.famineStreak + 1 : 0;

  // ---- 4. salinity & dust ----
  landSalinity(s, season, fieldSatAt, reedOk);
  spreadDust(s, dustStrength(s, season, storm));
  let dustOnTown = 0;
  for (const i of buildingTiles(s, 'house')) dustOnTown += s.tiles[i]!.dust;
  if (storm) notes.push({ key: 'note.storm', params: {} });

  // ---- 5. sea level ----
  const sea = updateSea(s, water.toSea, water.toBay);
  if (sea.newWrecks > 0) notes.push({ key: 'note.wrecks', params: { n: sea.newWrecks } });
  if (sea.restored > 0 && s.dike.complete) notes.push({ key: 'note.restored', params: { n: sea.restored } });

  // ---- 6/7. health, hope, population ----
  // ---- 8. construction (the dike's work this season counts for hope) ----
  let dikeWorked = false;
  if (s.dike.started && !s.dike.complete) {
    const cost = Math.max(0, COSTS.dike.money - s.dike.discount);
    if (r.money >= cost) {
      r.money -= cost;
      s.dike.progress++;
      dikeWorked = true;
    } else {
      s.dike.stalled++;
      notes.push({ key: 'note.dikeStalled', params: { cost } });
    }
    if ((s.flags.volunteers ?? 0) > 0 && s.dike.progress < DIKE_SEASONS) {
      s.dike.progress++;
      s.flags.volunteers = (s.flags.volunteers ?? 1) - 1;
      dikeWorked = true;
    }
    if (s.dike.progress >= DIKE_SEASONS) {
      completeDike(s);
      notes.push({ key: 'note.dikeDone', params: {} });
    }
  }
  const people = updatePeople(s, { produced, unmet, townSat: water.townSat, clinicsPaid, newWrecks: sea.newWrecks, dikeWorked });

  for (const t of s.tiles) if (t.b) t.b.age++;
  for (const m of s.modifiers) if (m.seasons > 0) m.seasons--;
  s.modifiers = s.modifiers.filter((m) => m.seasons !== 0);

  const after = snapshot(s);
  const report: SeasonReport = {
    season,
    before,
    after,
    fish: Math.round(fish),
    grain: Math.round(grain + melonFood),
    melon: Math.round(melonFood),
    cottonHarvest: Math.round(cottonHarvest),
    income: Math.round(income),
    expenses: Math.round(expenses),
    births: people.births,
    deaths: people.deaths,
    left: people.left,
    newWrecks: sea.newWrecks,
    restoredTiles: sea.restored,
    dustOnTown: Math.round(dustOnTown * 10) / 10,
    water: {
      flow: water.flow,
      fieldsDemand: water.fieldsDemand,
      fieldsSat: water.fieldsSat,
      reedsDemand: water.reedsDemand,
      reedsSat: water.reedsSat,
      townDemand: water.townDemand,
      townSat: water.townSat,
      toSea: water.toSea,
      toBay: water.toBay,
    },
    notes,
    storm,
  };
  s.lastReport = report;
  s.history.push({ season: season + 1, ...after });

  // per-season counters
  s.labourUsed = 0;
  s.leachWater = 0;
  s.marketBuys = 0;
  s.lastOutcome = null;

  const fail = checkFailure(s);
  if (fail) {
    s.ending = fail;
    s.finished = true;
    return report;
  }
  if (season >= TOTAL_SEASONS - 1) {
    s.ending = finalEnding(s);
    s.finished = true;
    s.season = season + 1;
    return report;
  }
  s.pending = pickEvent(s, season);
  s.season = season + 1;
  return report;
}

/** After an event choice: failure endings can trigger immediately (e.g. the 3rd refused quota). */
export function afterChoice(s: GameState): void {
  if (s.ending) return;
  const fail = checkFailure(s);
  if (fail) {
    s.ending = fail;
    s.finished = true;
  }
}
