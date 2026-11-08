// Headless balance report: runs every scripted strategy on every difficulty for N seeds
// and prints how often each ending is reached.  Usage: npm run balance [-- seeds]
import { ENDING_IDS } from '../src/content/endings';
import { STRATEGIES, runGame } from '../src/sim/ai/strategies';
import type { Difficulty, EndingId } from '../src/sim/types';

const seeds = Number(process.argv[2] ?? 20);
const diffs: Difficulty[] = ['normal', 'hard', 'brutal'];
const verbose = process.argv.includes('-v');

const header = ['strategy', 'difficulty', ...ENDING_IDS, 'E1+E2', 'avg pop', 'avg season'];
const rows: string[][] = [];
const t0 = Date.now();

for (const strat of STRATEGIES) {
  for (const d of diffs) {
    const count: Record<EndingId, number> = { E1: 0, E2: 0, E3: 0, E4: 0, E5: 0, E6: 0, E7: 0 };
    let popSum = 0;
    let seasonSum = 0;
    for (let seed = 1; seed <= seeds; seed++) {
      const r = runGame(seed, d, strat);
      count[r.ending]++;
      popSum += r.state.res.pop;
      seasonSum += r.seasons;
      if (verbose) {
        const st = r.state;
        console.log(
          `${strat.name} ${d} seed ${seed}: ${r.ending} s${r.seasons} pop ${st.res.pop} hp ${Math.round(st.res.health)} hope ${Math.round(st.res.hope)} sea ${st.seaLevel.toFixed(2)} sal ${st.history.at(-1)?.salinity} reeds ${st.history.at(-1)?.reedBeds} bay ${st.history.at(-1)?.bayWater} dike ${st.dike.progress} money ${Math.round(st.res.money)} fails ${st.quota.failures}`,
        );
      }
    }
    const good = count.E1 + count.E2;
    rows.push([
      strat.name,
      d,
      ...ENDING_IDS.map((e) => String(count[e])),
      `${Math.round((good / seeds) * 100)}%`,
      (popSum / seeds).toFixed(0),
      (seasonSum / seeds).toFixed(1),
    ]);
  }
}

const widths = header.map((h, c) => Math.max(h.length, ...rows.map((r) => r[c]!.length)));
const line = (cells: string[]) => '| ' + cells.map((x, c) => x.padEnd(widths[c]!)).join(' | ') + ' |';
console.log(`\nLast Shore balance report - ${seeds} seeds per cell (seeds 1..${seeds})\n`);
console.log(line(header));
console.log('|' + widths.map((w) => '-'.repeat(w + 2)).join('|') + '|');
for (const r of rows) console.log(line(r));
console.log(`\nE1 Small Sea Returns, E2 Green Delta, E3 Cotton Town, E4 Ship Graveyard, E5 Exodus, E6 Famine, E7 Removed from Office`);
console.log(`(${((Date.now() - t0) / 1000).toFixed(1)} s)`);
