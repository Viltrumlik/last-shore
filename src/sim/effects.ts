// Small helpers used by event effects.
import { diff } from './config';
import { clamp } from './population';
import type { GameState, Modifier } from './types';

export type DeltaKey = 'money' | 'food' | 'hope' | 'health' | 'pop' | 'reedMat' | 'cotton';
export type Delta = Partial<Record<DeltaKey, number>>;

export function addMod(s: GameState, kind: Modifier['kind'], value: number, seasons: number): void {
  s.modifiers.push({ kind, value, seasons });
}

export function harsh(s: GameState): number {
  return diff(s.difficulty).harsh;
}

export function applyDelta(s: GameState, d: Delta): void {
  const r = s.res;
  if (d.money) r.money = Math.max(0, r.money + d.money);
  if (d.food) r.food = Math.max(0, r.food + d.food);
  if (d.hope) r.hope = clamp(r.hope + d.hope, 0, 100);
  if (d.health) r.health = clamp(r.health + d.health, 0, 100);
  if (d.reedMat) r.reedMat = Math.max(0, r.reedMat + d.reedMat);
  if (d.cotton) r.cotton = Math.max(0, r.cotton + d.cotton);
  if (d.pop) {
    const before = r.pop;
    r.pop = Math.max(0, Math.round(r.pop + d.pop));
    if (r.pop < before) s.stats.left += before - r.pop;
  }
}

export function canAfford(s: GameState, cost: Delta): boolean {
  const r = s.res;
  if (cost.money && r.money < cost.money) return false;
  if (cost.food && r.food < cost.food) return false;
  if (cost.reedMat && r.reedMat < cost.reedMat) return false;
  if (cost.cotton && r.cotton < cost.cotton) return false;
  return true;
}

export function payCost(s: GameState, cost: Delta): void {
  const neg: Delta = {};
  for (const k of Object.keys(cost) as DeltaKey[]) neg[k] = -(cost[k] ?? 0);
  applyDelta(s, neg);
}
