// Player actions during the planning phase: placement rules, building, demolishing,
// leaching, the Great Dike, sliders and the food market.
import { BAL, COSTS, DEMOLISH_LABOUR, diff } from './config';
import { DEEP_DEPTH, connectedCanals, isLand, isSeabed, isWater, n4, waterDepth, year } from './grid';
import { makeBuilding } from './mapgen';
import type { BuildingId, GameState, ToolId } from './types';

export interface Check {
  ok: boolean;
  /** i18n key explaining why not */
  reason?: string;
}

const OK: Check = { ok: true };
const no = (reason: string): Check => ({ ok: false, reason });

export function modMult(s: GameState, kind: string): number {
  let m = 1;
  for (const md of s.modifiers) if (md.kind === kind) m *= md.value;
  return m;
}

export function workers(s: GameState): number {
  return Math.floor(s.res.pop * BAL.workerShare);
}

export function labourCap(s: GameState): number {
  const builders = (workers(s) * s.focus.building) / 100;
  return Math.floor(builders * BAL.labourPerBuilder * modMult(s, 'labour') + 1e-9);
}

export function dikeReserve(s: GameState): number {
  return s.dike.started && !s.dike.complete ? COSTS.dike.labour : 0;
}

export function labourFree(s: GameState): number {
  return labourCap(s) - dikeReserve(s) - s.labourUsed;
}

export function costOf(s: GameState, tool: ToolId): { money: number; labour: number } {
  if (tool === 'demolish') return { money: 0, labour: DEMOLISH_LABOUR };
  const c = COSTS[tool];
  if (tool === 'leach') return { money: Math.round(c.money * modMult(s, 'leachCost')), labour: c.labour };
  if (tool === 'dike') return { money: Math.max(0, c.money - s.dike.discount), labour: c.labour };
  return { money: c.money, labour: c.labour };
}

function touchesRiverOrCanal(s: GameState, i: number, canals: Uint8Array): boolean {
  for (const n of n4(s, i)) {
    if (s.tiles[n]!.terrain === 'river' || canals[n]) return true;
  }
  return false;
}

function touchesSeaWater(s: GameState, i: number): boolean {
  for (const n of n4(s, i)) if (isWater(s, n)) return true;
  return false;
}

/** Placement rule only (ignores money and labour). */
export function placementCheck(s: GameState, tool: ToolId, i: number, canals?: Uint8Array): Check {
  if (i < 0 || i >= s.tiles.length) return no('why.outside');
  const t = s.tiles[i]!;
  if (tool === 'demolish') {
    if (!t.b) return no('why.nothing');
    if (t.b.id === 'dike') return no('why.dikeForever');
    return OK;
  }
  if (tool === 'leach') {
    if (t.terrain !== 'soil') return no('why.leachSoil');
    if (t.b && !['wheat', 'melon', 'cotton'].includes(t.b.id)) return no('why.leachSoil');
    if (t.sal < 8) return no('why.notSalty');
    return OK;
  }
  if (tool === 'dike') {
    if (!s.dike.unlocked) return no('why.dikeLocked');
    if (s.dike.started) return no('why.dikeStarted');
    if (!t.dikeLine) return no('why.dikeLine');
    return OK;
  }
  if (t.b) return no('why.occupied');
  if (t.terrain === 'river') return no('why.river');
  const c = canals ?? connectedCanals(s);
  switch (tool as BuildingId) {
    case 'house':
    case 'clinic':
    case 'workshop':
      if (!isLand(s, i)) return no('why.needLand');
      return OK;
    case 'dock': {
      if (t.terrain === 'sea' && waterDepth(s, i) > DEEP_DEPTH) return no('why.tooDeep');
      if (!touchesSeaWater(s, i)) return no('why.needSea');
      return OK;
    }
    case 'wheat':
    case 'melon':
    case 'cotton':
      if (t.terrain !== 'soil') return no('why.needSoil');
      if (!touchesRiverOrCanal(s, i, c)) return no('why.needIrrigation');
      return OK;
    case 'canal':
      if (t.terrain === 'sea' && isWater(s, i)) return no('why.inWater');
      if (!touchesRiverOrCanal(s, i, c)) return no('why.canalLink');
      return OK;
    case 'saxaul':
      if (!(t.terrain === 'sand' || isSeabed(s, i))) return no('why.needSandSeabed');
      return OK;
    case 'reeds': {
      if (t.terrain !== 'sea') return no('why.needSeabedShallow');
      if (waterDepth(s, i) > DEEP_DEPTH) return no('why.tooDeep');
      return OK;
    }
    default:
      return no('why.unknown');
  }
}

/** Full check including money and labour. */
export function canUse(s: GameState, tool: ToolId, i: number, canals?: Uint8Array): Check {
  if (s.ending || s.pending) return no('why.notNow');
  const p = placementCheck(s, tool, i, canals);
  if (!p.ok) return p;
  const c = costOf(s, tool);
  if (tool === 'dike') {
    if (s.res.money < c.money) return no('why.money');
    if (labourCap(s) - s.labourUsed < c.labour) return no('why.labour');
    return OK;
  }
  if (s.res.money < c.money) return no('why.money');
  if (labourFree(s) < c.labour) return no('why.labour');
  return OK;
}

/** Apply a tool to a tile. Returns true on success. */
export function applyTool(s: GameState, tool: ToolId, i: number): boolean {
  const chk = canUse(s, tool, i);
  if (!chk.ok) return false;
  const c = costOf(s, tool);
  const t = s.tiles[i]!;
  if (tool === 'demolish') {
    s.labourUsed += c.labour;
    t.b = null;
    return true;
  }
  if (tool === 'leach') {
    s.res.money -= c.money;
    s.labourUsed += c.labour;
    s.leachWater += BAL.leachWater;
    t.sal = Math.max(0, t.sal - BAL.leachAmount);
    t.moist = Math.min(100, t.moist + 40);
    return true;
  }
  if (tool === 'dike') {
    return startDike(s);
  }
  s.res.money -= c.money;
  s.labourUsed += c.labour;
  t.b = makeBuilding(tool as BuildingId);
  s.stats.built++;
  return true;
}

/** Begin the Great Dike: occupies the whole line; each season of work costs 100 money and 5 labour. */
export function startDike(s: GameState): boolean {
  if (!s.dike.unlocked || s.dike.started) return false;
  for (const i of s.dikeLine) {
    s.tiles[i]!.b = makeBuilding('dike');
  }
  s.dike.started = true;
  s.stats.built++;
  return true;
}

/** Price of the next 20-food caravan; every purchase in the same season costs 25 % more. */
export function foodPrice(s: GameState): number {
  const base = diff(s.difficulty).foodPrice + BAL.marketPriceGrowth * (year(s.season) - 1);
  return Math.round(base * (1 + BAL.marketMarkup * s.marketBuys));
}

export function canBuyFood(s: GameState): Check {
  if (s.ending || s.pending) return no('why.notNow');
  if (s.marketBuys >= BAL.marketMaxPerSeason) return no('why.marketEmpty');
  if (s.res.money < foodPrice(s)) return no('why.money');
  return OK;
}

export function buyFood(s: GameState): boolean {
  if (!canBuyFood(s).ok) return false;
  s.res.money -= foodPrice(s);
  s.res.food += BAL.marketFood;
  s.marketBuys++;
  return true;
}

/** Set three percentages that must sum to 100; values are normalised. */
function norm3(a: number, b: number, c: number): [number, number, number] {
  a = Math.max(0, Math.round(a));
  b = Math.max(0, Math.round(b));
  c = Math.max(0, Math.round(c));
  const sum = a + b + c;
  if (sum <= 0) return [34, 33, 33];
  const na = Math.round((a / sum) * 100);
  const nb = Math.round((b / sum) * 100);
  return [na, nb, 100 - na - nb];
}

export function setWater(s: GameState, fields: number, reeds: number, town: number): void {
  const [a, b, c] = norm3(fields, reeds, town);
  s.water = { fields: a, reeds: b, town: c };
}

export function setFocus(s: GameState, fishing: number, farming: number, building: number): void {
  const [a, b, c] = norm3(fishing, farming, building);
  s.focus = { fishing: a, farming: b, building: c };
}

/**
 * Adjust one slider of a three-way split and rebalance the other two proportionally
 * (used by the UI so the total always stays at 100).
 */
export function rebalance<K extends string>(vals: Record<K, number>, key: K, value: number): Record<K, number> {
  const keys = Object.keys(vals) as K[];
  const others = keys.filter((k) => k !== key);
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const rest = 100 - v;
  const otherSum = others.reduce((a, k) => a + vals[k], 0);
  const out = { ...vals };
  out[key] = v;
  if (otherSum <= 0) {
    const each = Math.floor(rest / others.length);
    others.forEach((k, n) => (out[k] = n === 0 ? rest - each * (others.length - 1) : each));
  } else {
    let acc = 0;
    others.forEach((k, n) => {
      if (n === others.length - 1) out[k] = rest - acc;
      else {
        const share = Math.round((vals[k] / otherSum) * rest);
        out[k] = share;
        acc += share;
      }
    });
  }
  return out;
}
