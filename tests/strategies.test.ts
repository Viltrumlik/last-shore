// Headless full 40-season runs with scripted strategies (GDD section 7 balance targets).
import { describe, expect, it } from 'vitest';
import { balancedEco, cottonOnly, doNothing, runGame } from '../src/sim/ai/strategies';
import type { Difficulty, EndingId } from '../src/sim/types';

function endings(strategy: typeof doNothing, d: Difficulty, seeds: number): EndingId[] {
  const out: EndingId[] = [];
  for (let seed = 1; seed <= seeds; seed++) out.push(runGame(seed, d, strategy).ending);
  return out;
}

const rate = (list: EndingId[], ok: EndingId[]) => list.filter((e) => ok.includes(e)).length / list.length;

describe('strategies', () => {
  it('doing nothing ends in Exodus or Famine', () => {
    for (const d of ['normal', 'hard'] as Difficulty[]) {
      for (const e of endings(doNothing, d, 20)) expect(['E5', 'E6']).toContain(e);
    }
  });

  it('cotton only ends in Cotton Town, removal or a loss', () => {
    for (const d of ['normal', 'hard'] as Difficulty[]) {
      for (const e of endings(cottonOnly, d, 20)) expect(['E3', 'E5', 'E6', 'E7']).toContain(e);
    }
  });

  it('a balanced eco strategy usually wins on Normal and noticeably less often on Hard', () => {
    const normal = rate(endings(balancedEco, 'normal', 20), ['E1', 'E2']);
    const hard = rate(endings(balancedEco, 'hard', 20), ['E1', 'E2']);
    const brutal = rate(endings(balancedEco, 'brutal', 20), ['E1', 'E2']);
    expect(normal).toBeGreaterThanOrEqual(0.6);
    expect(hard).toBeLessThanOrEqual(normal - 0.15);
    expect(brutal).toBeLessThanOrEqual(hard);
  });
});
