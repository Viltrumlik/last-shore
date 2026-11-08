// Event cards: every story beat from the GDD plus a pool of conditional random events.
// Text lives in the i18n dictionaries under ev.<id>.title / .body / .<choiceId> (and optional
// outcome keys ev.<id>.<choiceId>.win / .lose).
import { BAL, diff } from '../sim/config';
import { addMod, harsh } from '../sim/effects';
import type { EventDef } from '../sim/events';
import {
  activeReeds,
  avgSoilSalinity,
  buildingTiles,
  countBuildings,
  dockActive,
  exposedSeabed,
  isLand,
  n4,
  n8,
  waterDepth,
  year,
} from '../sim/grid';
import { makeBuilding } from '../sim/mapgen';
import { houseDust, houseSalinity } from '../sim/population';
import { placementCheck } from '../sim/rules';
import { chance, rand, roundStoch } from '../sim/rng';
import type { GameState, Outcome } from '../sim/types';

// ------------------------------------------------------------------ helpers

export function quotaFor(s: GameState): number {
  const d = diff(s.difficulty);
  return Math.round(d.quotaBase + d.quotaGrowth * (year(s.season) - 1)) + s.quota.carry;
}

function sellRestOfCotton(s: GameState): number {
  const money = Math.round(s.res.cotton * BAL.cottonMarket);
  s.res.money += money;
  s.stats.earned += money;
  s.res.cotton = 0;
  return money;
}

function quotaShort(s: GameState): number {
  return Math.max(0, s.quota.demand - s.res.cotton);
}

function deliverQuota(s: GameState) {
  const q = s.quota.demand;
  const short = quotaShort(s);
  s.res.cotton += short; // bought from the neighbours (paid as the choice cost)
  s.res.cotton -= q;
  const pay = q * BAL.cottonState;
  s.res.money += pay;
  s.stats.earned += pay;
  const extra = sellRestOfCotton(s);
  s.quota.met++;
  s.quota.carry = 0;
  s.stats.quotasMet++;
  return { key: 'ev.quota.deliver.done', params: { pay, extra } };
}

function failQuota(s: GameState): void {
  s.quota.failures++;
  s.quota.carry = 0;
}

function pickTile(s: GameState, tiles: number[]): number | null {
  if (!tiles.length) return null;
  return tiles[Math.floor(rand(s) * tiles.length)]!;
}

/** Relocate the old harbour: each initial dock or wreck moves to the best working shore tile nearby. */
function moveFleet(s: GameState): number {
  const old: number[] = [];
  for (let i = 0; i < s.tiles.length; i++) {
    const b = s.tiles[i]!.b;
    if (b && b.initial && (b.id === 'dock' || b.id === 'wreck')) old.push(i);
  }
  let moved = 0;
  for (const o of old) {
    s.tiles[o]!.b = null;
    const ox = o % s.w;
    const oy = Math.floor(o / s.w);
    let best = -1;
    let bestScore = Infinity;
    for (let i = 0; i < s.tiles.length; i++) {
      if (!placementCheck(s, 'dock', i).ok) continue;
      if (s.tiles[i]!.bay || s.tiles[i]!.dikeLine) continue;
      let maxDepth = 0;
      for (const nb of n4(s, i)) maxDepth = Math.max(maxDepth, waterDepth(s, nb));
      const dist = Math.abs((i % s.w) - ox) + Math.abs(Math.floor(i / s.w) - oy);
      const score = dist - Math.min(maxDepth, 2.5) * 2;
      if (score < bestScore) {
        bestScore = score;
        best = i;
      }
    }
    if (best >= 0) {
      s.tiles[best]!.b = makeBuilding('dock');
      moved++;
    }
  }
  return moved;
}

/** Place a building automatically on the free land tile closest to the town centre. */
function autoPlace(s: GameState, id: 'clinic'): boolean {
  let best = -1;
  let bestD = Infinity;
  const cx = 7;
  const cy = 10;
  for (let i = 0; i < s.tiles.length; i++) {
    if (!placementCheck(s, id, i).ok) continue;
    const d = Math.hypot((i % s.w) - cx, Math.floor(i / s.w) - cy);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  if (best < 0) return false;
  s.tiles[best]!.b = makeBuilding(id);
  s.stats.built++;
  return true;
}

function epidemic(s: GameState, severity: number): { key: string; params: Record<string, number> } {
  const clinic = countBuildings(s, 'clinic') > 0 ? 0.5 : 1;
  const sev = severity * clinic * harsh(s);
  const dead = roundStoch(s, s.res.pop * 0.07 * sev);
  s.res.pop = Math.max(0, s.res.pop - dead);
  s.stats.died += dead;
  s.res.health = Math.max(0, s.res.health - 16 * sev);
  s.res.hope = Math.max(0, s.res.hope - 5 * sev);
  return { key: dead > 0 ? 'ev.epidemic.hit' : 'ev.epidemic.spared', params: { dead } };
}

function quotaParams(s: GameState) {
  const q = s.quota.demand;
  const short = quotaShort(s);
  return { q, have: s.res.cotton, short, buy: short * BAL.cottonBuy, pay: q * BAL.cottonState, fails: s.quota.failures };
}

function quotaChoices(): EventDef['choices'] {
  return [
    {
      id: 'deliver',
      cost: (s) => ({ money: quotaShort(s) * BAL.cottonBuy }),
      apply: (s) => deliverQuota(s),
    },
    {
      id: 'bargain',
      risky: true,
      apply: (s): Outcome => {
        const extra = sellRestOfCotton(s);
        if (chance(s, diff(s.difficulty).bargainChance)) {
          s.res.hope = Math.min(100, s.res.hope + 2);
          s.quota.carry = Math.round(s.quota.demand * 0.25);
          return { key: 'ev.quota.bargain.win', params: { extra, fails: s.quota.failures } };
        }
        if (s.quota.carry <= 0) {
          // first time: Tolib lets it go, but half of this year's plan is added to the next one
          const add = Math.round(s.quota.demand * 0.5);
          s.quota.carry = add;
          s.res.hope = Math.max(0, s.res.hope - 4);
          return { key: 'ev.quota.bargain.warn', params: { extra, add } };
        }
        failQuota(s);
        s.res.hope = Math.max(0, s.res.hope - 3);
        return { key: 'ev.quota.bargain.lose', params: { extra, fails: s.quota.failures } };
      },
    },
    {
      id: 'refuse',
      fx: { hope: 3 },
      apply: (s) => {
        const extra = sellRestOfCotton(s);
        failQuota(s);
        s.upstreamExtra += 0.02;
        return { key: 'ev.quota.refuse.done', params: { extra, fails: s.quota.failures } };
      },
    },
  ];
}

// ------------------------------------------------------------------ events

export const EVENTS: EventDef[] = [
  // ======================= story beats =======================
  {
    id: 'intro',
    advisor: 'ermek',
    kind: 'story',
    choices: [{ id: 'go' }],
  },
  {
    id: 'quota_first',
    advisor: 'tolib',
    kind: 'story',
    onDraw: (s) => {
      s.quota.demand = quotaFor(s);
    },
    params: quotaParams,
    choices: quotaChoices(),
  },
  {
    id: 'quota',
    advisor: 'tolib',
    kind: 'story',
    onDraw: (s) => {
      s.quota.demand = quotaFor(s);
    },
    params: quotaParams,
    choices: quotaChoices(),
  },
  {
    id: 'harbour',
    advisor: 'ermek',
    kind: 'story',
    params: (s) => ({ wrecks: countBuildings(s, 'wreck'), cost: 90 }),
    choices: [
      {
        id: 'museum',
        fx: { hope: -2 },
        apply: (s) => {
          s.flags.museum = 1;
        },
      },
      {
        id: 'move',
        cost: { money: 90 },
        fx: { hope: 4 },
        apply: (s) => {
          const moved = moveFleet(s);
          return { key: 'ev.harbour.move.done', params: { moved } };
        },
      },
      {
        id: 'scrap',
        fx: { money: 45, hope: -5 },
        apply: (s) => {
          for (const t of s.tiles) if (t.b && t.b.id === 'wreck' && t.b.initial) t.b = null;
        },
      },
    ],
  },
  {
    id: 'storm_warning',
    advisor: 'dilnoza',
    kind: 'story',
    choices: [
      {
        id: 'masks',
        cost: { money: 40 },
        apply: (s) => addMod(s, 'health', 6, 1),
      },
      {
        id: 'wells',
        cost: { money: 25 },
        apply: (s) => addMod(s, 'townWater', 1.4, 2),
      },
      { id: 'nothing', fx: { hope: 1 } },
    ],
  },
  {
    id: 'storm_after',
    advisor: 'saida',
    kind: 'story',
    params: (s) => ({ dust: Math.round(s.lastReport?.dustOnTown ?? 0), sal: Math.round(avgSoilSalinity(s)) }),
    choices: [
      {
        id: 'clean',
        cost: { money: 50 },
        fx: { hope: 3 },
        apply: (s) => {
          for (const i of buildingTiles(s, 'house')) {
            s.tiles[i]!.sal = Math.max(0, s.tiles[i]!.sal - 12);
            for (const n of n8(s, i)) if (isLand(s, n)) s.tiles[n]!.sal = Math.max(0, s.tiles[n]!.sal - 6);
          }
        },
      },
      {
        id: 'wash',
        apply: (s) => {
          addMod(s, 'water', 0.8, 1);
          for (const i of buildingTiles(s, 'house')) s.tiles[i]!.sal = Math.max(0, s.tiles[i]!.sal - 8);
        },
      },
      { id: 'endure', fx: (s) => ({ hope: -4 * harsh(s) }) },
    ],
  },
  {
    id: 'epidemic',
    advisor: 'saida',
    kind: 'story',
    params: (s) => ({ clinics: countBuildings(s, 'clinic') }),
    choices: [
      {
        id: 'clinic',
        cost: (s) => ({ money: countBuildings(s, 'clinic') > 0 ? 40 : 100 }),
        apply: (s) => {
          if (countBuildings(s, 'clinic') === 0) autoPlace(s, 'clinic');
          return epidemic(s, 0);
        },
      },
      {
        id: 'water',
        apply: (s) => {
          addMod(s, 'townWater', 1.5, 2);
          addMod(s, 'water', 0.85, 2);
          return epidemic(s, 0.45);
        },
      },
      { id: 'ignore', risky: true, apply: (s) => epidemic(s, 1) },
    ],
  },
  {
    id: 'dike_plan',
    advisor: 'dilnoza',
    kind: 'story',
    onDraw: (s) => {
      s.dike.unlocked = true;
    },
    params: (s) => ({ tiles: s.dikeLine.length }),
    choices: [
      {
        id: 'approve',
        cost: { money: 30 },
        fx: { hope: 4 },
        apply: (s) => {
          s.dike.discount = 15;
        },
      },
      { id: 'later', fx: { hope: -2 } },
    ],
  },
  {
    id: 'aid',
    advisor: 'tolib',
    kind: 'story',
    choices: [
      { id: 'accept', fx: (s) => ({ money: 250, hope: -10 * harsh(s) }) },
      { id: 'refuse', fx: { hope: 8 } },
    ],
  },

  // ======================= random events =======================
  {
    id: 'locusts',
    advisor: 'ermek',
    kind: 'random',
    when: (s) => s.season % 4 === 1 && countBuildings(s, 'wheat') + countBuildings(s, 'melon') >= 3,
    choices: [
      { id: 'spray', cost: { money: 35 }, fx: { health: -3 } },
      { id: 'smoke', apply: (s) => addMod(s, 'wheat', 0.7, 1) },
      { id: 'pray', apply: (s) => addMod(s, 'wheat', 0.4, 1) },
    ],
  },
  {
    id: 'caravan',
    advisor: 'timur',
    kind: 'random',
    weight: 1.2,
    choices: [
      { id: 'buy', cost: { money: 45 }, fx: { food: 40 } },
      { id: 'sell', cost: { reedMat: 10 }, fx: { money: 40 } },
      { id: 'pass' },
    ],
  },
  {
    id: 'wedding',
    advisor: 'timur',
    kind: 'random',
    when: (s) => s.res.hope < 85 && s.res.food >= s.res.pop,
    choices: [
      { id: 'feast', cost: { food: 25 }, fx: { hope: 7 } },
      { id: 'modest', cost: { food: 8 }, fx: { hope: 3 } },
      { id: 'postpone', fx: { hope: -1 } },
    ],
  },
  {
    id: 'fish_dieoff',
    advisor: 'ermek',
    kind: 'random',
    when: (s) => s.seaSalt > 38 && buildingTiles(s, 'dock').some((i) => dockActive(s, i)),
    choices: [
      { id: 'far', cost: { money: 25 } },
      { id: 'accept', apply: (s) => addMod(s, 'fish', 0.6, 1) },
    ],
  },
  {
    id: 'sandstorm',
    advisor: 'saida',
    kind: 'random',
    when: (s) => s.season % 4 !== 2 && exposedSeabed(s) >= 25,
    choices: [
      { id: 'shutters', cost: { money: 20 } },
      { id: 'endure', fx: (s) => ({ health: -4 * harsh(s), hope: -2 }) },
    ],
  },
  {
    id: 'school',
    advisor: 'timur',
    kind: 'random',
    once: true,
    when: (s) => year(s.season) >= 2,
    choices: [
      { id: 'fund', cost: { money: 40 }, fx: { hope: 6 } },
      { id: 'refuse', fx: { hope: -3 } },
    ],
  },
  {
    id: 'youth_leave',
    advisor: 'timur',
    kind: 'random',
    when: (s) => s.res.hope < 55 && s.res.pop >= 40,
    choices: [
      { id: 'bless', fx: (s) => ({ pop: -Math.round(5 * harsh(s)), money: 30, hope: 2 }) },
      { id: 'persuade', cost: { money: 30 }, fx: { hope: 2 } },
      { id: 'forbid', fx: { hope: -6 } },
    ],
  },
  {
    id: 'salty_well',
    advisor: 'saida',
    kind: 'random',
    once: true,
    when: (s) => houseSalinity(s) > 32,
    choices: [
      { id: 'dig', cost: { money: 40 }, apply: (s) => addMod(s, 'townWater', 1.3, 12) },
      { id: 'boil', fx: { hope: -1, health: -2 } },
      { id: 'ignore', fx: (s) => ({ health: -6 * harsh(s) }) },
    ],
  },
  {
    id: 'cotton_boom',
    advisor: 'tolib',
    kind: 'random',
    when: (s) => countBuildings(s, 'cotton') >= 1,
    choices: [
      {
        id: 'accept',
        fx: { money: 60, hope: -1 },
        apply: (s) => {
          s.quota.carry += 8;
        },
      },
      { id: 'decline' },
    ],
  },
  {
    id: 'salvage',
    advisor: 'ermek',
    kind: 'random',
    when: (s) => countBuildings(s, 'wreck') >= 1,
    params: (s) => ({ n: Math.min(4, countBuildings(s, 'wreck')) }),
    choices: [
      {
        id: 'salvage',
        fx: (s) => ({ money: 15 * Math.min(4, countBuildings(s, 'wreck')), hope: -2 }),
        apply: (s) => {
          let left = 4;
          for (const t of s.tiles) {
            if (left > 0 && t.b && t.b.id === 'wreck') {
              t.b = null;
              left--;
            }
          }
        },
      },
      { id: 'keep', fx: { hope: 1 } },
    ],
  },
  {
    id: 'spring_flood',
    advisor: 'dilnoza',
    kind: 'random',
    once: true,
    when: (s) => s.season % 4 === 3 && year(s.season) <= 6,
    choices: [
      {
        id: 'channel',
        cost: { money: 30 },
        apply: (s) => {
          addMod(s, 'water', 1.4, 1);
          riverWash(s, 6);
        },
      },
      {
        id: 'let',
        fx: { food: -15 },
        apply: (s) => {
          addMod(s, 'water', 1.4, 1);
          riverWash(s, 10);
        },
      },
    ],
  },
  {
    id: 'cold_winter',
    advisor: 'saida',
    kind: 'random',
    when: (s) => s.season % 4 === 3,
    choices: [
      { id: 'firewood', cost: { money: 25 } },
      { id: 'endure', fx: (s) => ({ health: -5 * harsh(s), food: -10 }) },
    ],
  },
  {
    id: 'pelicans',
    advisor: 'dilnoza',
    kind: 'random',
    once: true,
    when: (s) => activeReeds(s) >= 4,
    choices: [
      { id: 'protect', cost: { money: 10 }, fx: { hope: 6 } },
      { id: 'ignore', fx: { hope: 2 } },
    ],
  },
  {
    id: 'scientist',
    advisor: 'dilnoza',
    kind: 'random',
    once: true,
    when: (s) => year(s.season) >= 2,
    choices: [
      { id: 'host', cost: { food: 10 }, apply: (s) => addMod(s, 'leachCost', 0.6, -1) },
      { id: 'samples', fx: { money: 35 } },
    ],
  },
  {
    id: 'inspection',
    advisor: 'tolib',
    kind: 'random',
    when: (s) => year(s.season) >= 2,
    choices: [
      {
        id: 'feast',
        cost: { money: 30, food: 10 },
        apply: (s) => {
          s.quota.carry = Math.max(-6, s.quota.carry - 5);
        },
      },
      {
        id: 'plain',
        apply: (s) => {
          s.quota.carry += 4;
        },
      },
    ],
  },
  {
    id: 'seeds',
    advisor: 'dilnoza',
    kind: 'random',
    once: true,
    when: (s) => year(s.season) >= 2 && countBuildings(s, 'wheat') + countBuildings(s, 'melon') >= 2,
    choices: [
      {
        id: 'buy',
        cost: { money: 45 },
        apply: (s) => {
          addMod(s, 'melonSalt', 0.6, -1);
          addMod(s, 'wheat', 1.1, -1);
        },
      },
      { id: 'no' },
    ],
  },
  {
    id: 'fish_market',
    advisor: 'ermek',
    kind: 'random',
    when: (s) => s.res.food >= s.res.pop * 1.6,
    choices: [
      { id: 'sell', cost: { food: 30 }, fx: { money: 45 } },
      { id: 'keep' },
    ],
  },
  {
    id: 'clinic_overload',
    advisor: 'saida',
    kind: 'random',
    when: (s) => s.res.health < 50,
    choices: [
      { id: 'rations', cost: { food: 25 }, fx: { health: 6 } },
      { id: 'medicine', cost: { money: 50 }, fx: { health: 9 } },
      { id: 'nothing', fx: { hope: -2 } },
    ],
  },
  {
    id: 'canal_breach',
    advisor: 'dilnoza',
    kind: 'random',
    when: (s) => countBuildings(s, 'canal') >= 3,
    choices: [
      { id: 'repair', cost: { money: 20 } },
      {
        id: 'abandon',
        apply: (s) => {
          const i = pickTile(s, buildingTiles(s, 'canal'));
          if (i !== null) s.tiles[i]!.b = null;
        },
      },
    ],
  },
  {
    id: 'camels',
    advisor: 'timur',
    kind: 'random',
    when: (s) => countBuildings(s, 'saxaul') >= 3,
    choices: [
      {
        id: 'allow',
        fx: { money: 30 },
        apply: (s) => {
          const i = pickTile(s, buildingTiles(s, 'saxaul'));
          if (i !== null) s.tiles[i]!.b = null;
        },
      },
      { id: 'refuse', fx: { hope: -1 } },
    ],
  },
  {
    id: 'navruz',
    advisor: 'timur',
    kind: 'random',
    cooldown: 8,
    when: (s) => s.season % 4 === 3,
    choices: [
      { id: 'celebrate', cost: { food: 15, money: 10 }, fx: { hope: 8 } },
      { id: 'quiet', fx: { hope: 2 } },
    ],
  },
  {
    id: 'resettle',
    advisor: 'tolib',
    kind: 'random',
    when: (s) => s.res.hope < 45 && s.res.pop >= 30,
    choices: [
      { id: 'accept', fx: (s) => ({ pop: -Math.round(8 * harsh(s)), money: 60, hope: 1 }) },
      { id: 'refuse', fx: { hope: 4 } },
    ],
  },
  {
    id: 'rain',
    advisor: 'dilnoza',
    kind: 'random',
    weight: 0.6,
    when: (s) => year(s.season) >= 2,
    choices: [
      { id: 'store', cost: { money: 20 }, apply: (s) => addMod(s, 'water', 1.35, 2) },
      { id: 'enjoy', fx: { hope: 2 }, apply: (s) => addMod(s, 'water', 1.2, 1) },
    ],
  },
  {
    id: 'volunteers',
    advisor: 'dilnoza',
    kind: 'random',
    weight: 2,
    when: (s) => s.dike.started && !s.dike.complete && s.dike.progress < 3,
    choices: [
      {
        id: 'host',
        cost: { food: 20 },
        apply: (s) => {
          s.flags.volunteers = (s.flags.volunteers ?? 0) + 1;
        },
      },
      { id: 'decline' },
    ],
  },
  {
    id: 'weavers',
    advisor: 'timur',
    kind: 'random',
    when: (s) => s.res.reedMat >= 8,
    choices: [
      { id: 'teach', cost: { money: 15 }, fx: { hope: 4 } },
      { id: 'sell', cost: { reedMat: 8 }, fx: { money: 28 } },
    ],
  },
  {
    id: 'dust_cough',
    advisor: 'saida',
    kind: 'random',
    when: (s) => houseDust(s) > 0.8 || exposedSeabed(s) >= 45,
    choices: [
      { id: 'masks', cost: { money: 30 }, fx: { health: 4 } },
      { id: 'send', fx: { hope: -2, health: 2 } },
      { id: 'ignore', fx: (s) => ({ health: -5 * harsh(s) }) },
    ],
  },
  {
    id: 'tourists',
    advisor: 'ermek',
    kind: 'random',
    when: (s) => (s.flags.museum ?? 0) > 0 && countBuildings(s, 'wreck') >= 2,
    choices: [
      { id: 'guide', fx: { money: 40, hope: 2 } },
      { id: 'no', fx: { hope: -1 } },
    ],
  },
  {
    id: 'prices',
    advisor: 'tolib',
    kind: 'random',
    when: (s) => s.res.money >= 100,
    choices: [
      { id: 'stock', cost: { money: 60 }, fx: { food: 45 } },
      { id: 'wait' },
    ],
  },
];

function riverWash(s: GameState, amount: number): void {
  const river = new Set(s.river);
  for (let i = 0; i < s.tiles.length; i++) {
    if (!isLand(s, i)) continue;
    if (n4(s, i).some((n) => river.has(n))) s.tiles[i]!.sal = Math.max(0, s.tiles[i]!.sal - amount);
  }
}
