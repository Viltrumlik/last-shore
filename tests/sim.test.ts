import { describe, expect, it } from 'vitest';
import { quotaFor } from '../src/content/events';
import { balancedEco, runGame } from '../src/sim/ai/strategies';
import {
  BAL,
  afterChoice,
  applyTool,
  avgSoilSalinity,
  bayWaterTiles,
  canUse,
  chooseEvent,
  deserialize,
  endSeason,
  eventDef,
  finalEnding,
  isSeabed,
  isWater,
  loadGame,
  n8,
  newGame,
  saveGame,
  serialize,
  setWater,
  tileKind,
  type GameState,
} from '../src/sim';
import { makeBuilding } from '../src/sim/mapgen';
import { updatePeople } from '../src/sim/population';
import { landSalinity, spreadDust } from '../src/sim/salinity';
import { completeDike, seaDrop, updateSea } from '../src/sim/sea';
import type { KV } from '../src/sim/save';

function fresh(seed = 7, d: GameState['difficulty'] = 'normal'): GameState {
  const s = newGame(seed, d);
  chooseEvent(s, 0); // close the intro card
  return s;
}

/** Resolve the pending event with its first affordable choice. */
function skipEvent(s: GameState): void {
  if (!s.pending) return;
  const e = eventDef(s.pending.id);
  let idx = e.choices.findIndex((c) => !c.cost || (typeof c.cost === 'object' && !c.cost.money && !c.cost.food));
  if (idx < 0) idx = 0;
  if (!chooseEvent(s, idx)) chooseEvent(s, e.choices.length - 1);
  afterChoice(s);
}

function waterCount(s: GameState): number {
  let n = 0;
  for (let i = 0; i < s.tiles.length; i++) if (isWater(s, i)) n++;
  return n;
}

function firstTile(s: GameState, pred: (i: number) => boolean): number {
  const i = s.tiles.findIndex((_, k) => pred(k));
  if (i < 0) throw new Error('no tile found');
  return i;
}

describe('map generation', () => {
  it('has the sea in the north-east, a river from the west, a bay and a dike line', () => {
    const s = fresh();
    expect(s.tiles.length).toBe(32 * 20);
    expect(tileKind(s, 31)).toBe('deep'); // NE corner
    expect(s.tiles[s.river[0]!]!.terrain).toBe('river');
    expect(s.river[0]! % s.w).toBe(0);
    expect(s.bayTiles.length).toBeGreaterThanOrEqual(15);
    expect(s.dikeLine.length).toBeGreaterThanOrEqual(4);
    // town: 8 houses, 3 docks, 2 wheat fields
    const count = (id: string) => s.tiles.filter((t) => t.b?.id === id).length;
    expect(count('house')).toBe(8);
    expect(count('dock')).toBe(3);
    expect(count('wheat')).toBe(2);
  });
});

describe('sea and seabed', () => {
  it('sea recession exposes tiles as salty seabed', () => {
    const s = fresh();
    const before = waterCount(s);
    for (let k = 0; k < 15; k++) updateSea(s, 0, 0);
    expect(s.seaLevel).toBeLessThan(-1);
    const after = waterCount(s);
    expect(after).toBeLessThan(before);
    const exposed = firstTile(s, (i) => isSeabed(s, i));
    expect(tileKind(s, exposed)).toBe('seabed');
    expect(s.tiles[exposed]!.sal).toBeGreaterThanOrEqual(55);
  });

  it('the sea level drops every season', () => {
    const s = fresh();
    const lv = s.seaLevel;
    endSeason(s);
    expect(s.seaLevel).toBeLessThan(lv);
  });

  it('a dock becomes a wreck when the sea leaves it', () => {
    const s = fresh();
    const dock = firstTile(s, (i) => s.tiles[i]!.b?.id === 'dock');
    s.seaLevel = -4;
    const r = updateSea(s, 0, 0);
    expect(s.tiles[dock]!.b?.id).toBe('wreck');
    expect(r.newWrecks).toBeGreaterThanOrEqual(1);
  });
});

describe('salinity and dust', () => {
  it('cotton raises salinity on its tile and neighbours, and speeds the sea retreat', () => {
    const s = fresh();
    const i = firstTile(s, (k) => s.tiles[k]!.terrain === 'soil' && !s.tiles[k]!.b);
    const neighbour = n8(s, i).find((n) => s.tiles[n]!.terrain === 'soil')!;
    const sal0 = s.tiles[i]!.sal;
    const nb0 = s.tiles[neighbour]!.sal;
    const drop0 = seaDrop(s, 50);
    s.tiles[i]!.b = makeBuilding('cotton');
    landSalinity(s, 0, () => 1, () => true);
    expect(s.tiles[i]!.sal).toBeGreaterThan(sal0 + 4);
    expect(s.tiles[neighbour]!.sal).toBeGreaterThan(nb0);
    expect(seaDrop(s, 50)).toBeGreaterThan(drop0);
  });

  it('saxaul blocks salt dust downwind', () => {
    const setup = (withSaxaul: boolean) => {
      const s = fresh();
      const y = 10;
      for (let x = 0; x < s.w; x++) {
        const t = s.tiles[y * s.w + x]!;
        t.b = null;
        if (x >= 20) {
          t.terrain = 'sea';
          t.elev = -1;
          t.sal = 80;
        } else {
          t.terrain = 'sand';
          t.elev = 1;
          t.sal = 20;
        }
      }
      s.seaLevel = -2; // the eastern part of the row is dry seabed
      if (withSaxaul) s.tiles[y * s.w + 16]!.b = { ...makeBuilding('saxaul'), age: 4 };
      spreadDust(s, 1);
      const row = Array.from({ length: 16 }, (_, x) => s.tiles[y * s.w + x]!.dust);
      return row;
    };
    const open = setup(false);
    const shielded = setup(true);
    // the 3 tiles right behind the belt receive nothing
    expect(shielded[15]).toBe(0);
    expect(shielded[14]).toBe(0);
    expect(shielded[13]).toBe(0);
    expect(open[15]!).toBeGreaterThan(0);
    const sum = (a: number[]) => a.reduce((x, v) => x + v, 0);
    expect(sum(shielded)).toBeLessThan(sum(open) * 0.5);
  });

  it('reeds lower salinity of their tile and neighbours', () => {
    const s = fresh();
    s.seaLevel = -3;
    updateSea(s, 0, 0);
    const i = firstTile(s, (k) => isSeabed(s, k) && n8(s, k).every((n) => s.tiles[n]!.terrain === 'sea'));
    s.tiles[i]!.b = makeBuilding('reeds');
    s.tiles[i]!.sal = 70;
    const nb = n8(s, i)[0]!;
    const nbSal = s.tiles[nb]!.sal;
    landSalinity(s, 0, () => 0, () => true);
    expect(s.tiles[i]!.sal).toBeLessThan(70);
    if (!isWater(s, nb)) expect(s.tiles[nb]!.sal).toBeLessThan(nbSal + BAL.seabedCreep);
  });
});

describe('people', () => {
  it('famine counter: two seasons with empty stores end the game', () => {
    const s = fresh();
    for (const t of s.tiles) if (t.b && (t.b.id === 'dock' || t.b.id === 'wheat')) t.b = null;
    s.res.food = 0;
    s.res.money = 0;
    endSeason(s);
    expect(s.famineStreak).toBe(1);
    expect(s.ending).toBeNull();
    skipEvent(s);
    s.res.food = 0;
    endSeason(s);
    expect(s.famineStreak).toBeGreaterThanOrEqual(2);
    expect(s.ending).toBe('E6');
  });

  it('people emigrate when hope is below 40, not when it is high', () => {
    const low = fresh();
    low.res.hope = 15;
    const r1 = updatePeople(low, { produced: 100, unmet: 0, townSat: 1, clinicsPaid: 0, newWrecks: 0, dikeWorked: false });
    expect(r1.left).toBeGreaterThan(0);
    const high = fresh();
    high.res.hope = 80;
    const r2 = updatePeople(high, { produced: 100, unmet: 0, townSat: 1, clinicsPaid: 0, newWrecks: 0, dikeWorked: false });
    expect(r2.left).toBe(0);
  });
});

describe('the Great Dike', () => {
  it('cannot be started before Year 6, then takes 4 paid seasons', () => {
    const s = fresh();
    expect(canUse(s, 'dike', s.dikeLine[0]!).ok).toBe(false);
    s.dike.unlocked = true;
    s.res.money = 2000;
    s.focus = { fishing: 30, farming: 30, building: 40 };
    expect(applyTool(s, 'dike', s.dikeLine[0]!)).toBe(true);
    for (const i of s.dikeLine) expect(s.tiles[i]!.b?.id).toBe('dike');
    let guard = 0;
    while (!s.dike.complete && guard++ < 10) {
      s.res.money = Math.max(s.res.money, 500);
      endSeason(s);
      skipEvent(s);
    }
    expect(s.dike.complete).toBe(true);
    expect(s.dike.progress).toBe(4);
    expect(guard).toBeLessThanOrEqual(4);
  });

  it('holds water: the bay keeps its own level and refills from the reeds & bay allocation', () => {
    const s = fresh();
    s.seaLevel = -3.2;
    updateSea(s, 0, 0);
    expect(bayWaterTiles(s)).toBe(0);
    completeDike(s);
    const lvl0 = s.bayLevel;
    // feed the bay generously for several seasons while the open sea keeps falling
    for (let k = 0; k < 10; k++) updateSea(s, 0, 60);
    expect(s.bayLevel).toBeGreaterThan(lvl0);
    expect(s.bayLevel).toBeGreaterThan(s.seaLevel);
    expect(bayWaterTiles(s)).toBeGreaterThanOrEqual(8);
    // without inflow it slowly evaporates
    const full = s.bayLevel;
    for (let k = 0; k < 4; k++) updateSea(s, 0, 0);
    expect(s.bayLevel).toBeLessThan(full);
  });

  it('water sliders route the leftover to the bay once the dike is complete', async () => {
    const s = fresh();
    completeDike(s);
    setWater(s, 10, 70, 20);
    const { computeWater } = await import('../src/sim');
    const w = computeWater(s);
    expect(w.toBay).toBeGreaterThan(0);
  });
});

describe('the cotton quota', () => {
  function quotaState(): GameState {
    const s = fresh();
    s.season = 2;
    s.quota.demand = quotaFor(s);
    s.pending = { id: 'quota', params: {} };
    s.season = 3;
    return s;
  }

  it('delivering pays the state price and sells the rest at the bazaar', () => {
    const s = quotaState();
    s.res.cotton = s.quota.demand + 5;
    const money = s.res.money;
    const idx = eventDef('quota').choices.findIndex((c) => c.id === 'deliver');
    chooseEvent(s, idx);
    expect(s.quota.failures).toBe(0);
    expect(s.quota.met).toBe(1);
    expect(s.res.cotton).toBe(0);
    expect(s.res.money).toBe(money + s.quota.demand * BAL.cottonState + 5 * BAL.cottonMarket);
  });

  it('a shortfall can be bought from the neighbours', () => {
    const s = quotaState();
    s.res.cotton = 0;
    s.res.money = 1000;
    const idx = eventDef('quota').choices.findIndex((c) => c.id === 'deliver');
    chooseEvent(s, idx);
    expect(s.quota.failures).toBe(0);
    expect(s.res.money).toBe(1000 - s.quota.demand * BAL.cottonBuy + s.quota.demand * BAL.cottonState);
  });

  it('refusing three times removes the elder from office', () => {
    const s = fresh();
    const refuse = eventDef('quota').choices.findIndex((c) => c.id === 'refuse');
    for (let k = 0; k < 3; k++) {
      s.quota.demand = 10;
      s.pending = { id: 'quota', params: {} };
      chooseEvent(s, refuse);
      afterChoice(s);
    }
    expect(s.quota.failures).toBe(3);
    expect(s.ending).toBe('E7');
  });
});

describe('endings', () => {
  function endState(): GameState {
    const s = fresh();
    s.season = 40;
    s.res.pop = 50;
    s.res.hope = 60;
    s.res.health = 50;
    return s;
  }
  function setLandSal(s: GameState, v: number) {
    for (const t of s.tiles) if (t.terrain === 'soil' || t.terrain === 'sand') t.sal = v;
  }
  function placeReeds(s: GameState, n: number) {
    s.seaLevel = -3;
    updateSea(s, 0, 0);
    let placed = 0;
    for (let i = 0; i < s.tiles.length && placed < n; i++) {
      if (s.tiles[i]!.terrain === 'sea' && !s.tiles[i]!.b && !s.tiles[i]!.dikeLine) {
        s.tiles[i]!.b = makeBuilding('reeds');
        placed++;
      }
    }
  }

  it('E1 The Small Sea Returns', () => {
    const s = endState();
    s.seaLevel = -3;
    updateSea(s, 0, 0);
    completeDike(s);
    s.bayLevel = -0.3;
    s.res.pop = 130;
    s.res.health = 70;
    expect(bayWaterTiles(s)).toBeGreaterThanOrEqual(8);
    expect(finalEnding(s)).toBe('E1');
  });

  it('E2 Green Delta', () => {
    const s = endState();
    placeReeds(s, 10);
    s.res.pop = 90;
    setLandSal(s, 30);
    expect(finalEnding(s)).toBe('E2');
  });

  it('E3 Cotton Town', () => {
    const s = endState();
    s.res.pop = 95;
    setLandSal(s, 70);
    expect(avgSoilSalinity(s)).toBeGreaterThanOrEqual(60);
    expect(finalEnding(s)).toBe('E3');
  });

  it('E4 Ship Graveyard', () => {
    const s = endState();
    s.res.pop = 55;
    expect(finalEnding(s)).toBe('E4');
  });

  it('E5 Exodus (population or hope)', () => {
    const a = endState();
    a.res.pop = 12;
    expect(finalEnding(a)).toBe('E5');
    const b = fresh();
    b.res.hope = 0;
    endSeason(b);
    expect(b.ending).toBe('E5');
  });

  it('E6 Famine', () => {
    const s = endState();
    s.famineStreak = 2;
    expect(finalEnding(s)).toBe('E6');
  });

  it('E7 Removed from Office', () => {
    const s = endState();
    s.quota.failures = 3;
    expect(finalEnding(s)).toBe('E7');
  });

  it('the game ends after Winter of Year 10', () => {
    const s = fresh();
    let guard = 0;
    while (!s.ending && guard++ < 200) {
      if (s.pending) skipEvent(s);
      else {
        s.res.food = Math.max(s.res.food, 500);
        s.res.hope = Math.max(s.res.hope, 60);
        s.quota.failures = 0;
        endSeason(s);
      }
    }
    expect(s.finished).toBe(true);
    expect(s.season).toBe(40);
    expect(['E1', 'E2', 'E3', 'E4']).toContain(s.ending);
  });
});

describe('save / load and determinism', () => {
  it('round-trips through JSON and through a storage backend', () => {
    const s = fresh(42, 'hard');
    endSeason(s);
    skipEvent(s);
    const json = serialize(s);
    const back = deserialize(json)!;
    expect(back).toEqual(s);
    const mem = new Map<string, string>();
    const kv: KV = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, v), removeItem: (k) => void mem.delete(k) };
    expect(saveGame(s, kv)).toBe(true);
    expect(loadGame(kv)).toEqual(s);
    // a loaded game continues exactly like the original
    endSeason(s);
    endSeason(back);
    expect(serialize(back)).toBe(serialize(s));
  });

  it('rejects garbage and survives a throwing storage', () => {
    expect(deserialize('{nope')).toBeNull();
    expect(deserialize('{"v":2}')).toBeNull();
    const bad: KV = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    };
    expect(saveGame(fresh(), bad)).toBe(false);
    expect(loadGame(bad)).toBeNull();
  });

  it('is deterministic: same seed and choices give the same game', () => {
    const a = runGame(123, 'normal', balancedEco);
    const b = runGame(123, 'normal', balancedEco);
    expect(serialize(a.state)).toBe(serialize(b.state));
    const c = runGame(124, 'normal', balancedEco);
    expect(serialize(c.state)).not.toBe(serialize(a.state));
  });
});
