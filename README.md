# Last Shore — So'nggi qirg'oq — Последний берег

**Last Shore** is a 2D pixel-art, turn-based survival city-builder about Oqtosh, a fishing town on the shore of an inland
sea that is drying up. Every season the water steps back a little further. Upstream, the rivers are being turned into
cotton fields; in town, the docks run aground, salt dust blows in from the dead seabed and the district official wants
his cotton every autumn. You are the newly chosen elder, with ten years (40 seasons) to decide what kind of town survives:
a rich, poisoned cotton town, a green delta of reeds and saxaul, or — if you gamble on the Great Dike — a small sea
brought back to life. It runs in any modern browser, on desktop and on a phone, in Uzbek, Russian and English.

- Turn-based seasons: plan on the map, set the water split and the work focus, end the season, read the report, answer an event card.
- A deterministic ecological simulation: a falling sea level, seabed that turns into salt dust, wind that blows it into town, salinity, river water allocation, fish health, food, health, hope and migration.
- 12 kinds of buildings and actions: houses, fishing docks that strand when the sea leaves, wheat, melons, cotton, canals, saxaul belts, reed beds, leaching, a clinic, a workshop and the 4-season Great Dike.
- 37 event cards (9 story beats, 28 conditional random events) voiced by five advisors with pixel portraits drawn in code.
- 7 endings, each with a procedural illustration, an epilogue and end-of-game statistics.
- Normal / Hard (default) / Brutal. Hard is meant to be genuinely hard but fair.
- All art is drawn procedurally in code (pixel matrices and seeded noise): no image files and no network requests at runtime.
- A tutorial voiced by Ermek-ota and Dilnoza, keyboard shortcuts, optional WebAudio sound effects, and autosave to `localStorage` (the game still runs if storage is blocked).
- Responsive: on narrow screens the side panels collapse into a bottom sheet with tabs.

## Story teaser

> The Kok Sea leaves Oqtosh a little more each season, tipping boats onto their sides and putting salt on the wind.
> As the town's new elder you have ten years to decide what to save: the cotton that keeps the district happy,
> the fields that feed your people, or the water itself. Plant reeds and saxaul, dig canals, gamble on the Great Dike —
> or watch the town follow the sea away.

Your advisors: **Ermek-ota**, an old fisherman; **Dilnoza**, a young hydro-engineer back from the capital;
**Rais Tolib**, the district official with the red stamp; **Doctor Saida**, who runs the clinic; and **Timur**, who speaks for the young.

## How to play

1. **Plan** — pick a building in the left panel (or the bottom strip on a phone) and click a tile. The inspector shows why a tile is not allowed. Share the river between *Fields*, *Reeds & bay* and *Town*, and your workers between *Fishing*, *Farming* and *Building* (builders produce the labour every construction needs).
2. **End the season** — water, harvests, food, salt dust, the sea, health, hope and population are resolved.
3. **Read the report** — ▲▼ show what changed and why.
4. **Answer the event card** — costs and known effects are shown on each choice; `?` marks a gamble.

Things to know: docks strand as the sea retreats, so build new ones further out; plant a line of saxaul on the old shore
before the Great Salt Storm of Year 4; fields need the river or a connected canal; water nobody uses reaches the sea and
slows its retreat; three failed cotton quotas get you removed. The *Goals* tab tracks the conditions of the two good
endings and the dangers that end the game early.

### Controls

| Action | Mouse / keyboard | Touch |
|---|---|---|
| Choose a tool | click the palette, or `1`–`9`, `C` clinic, `W` workshop, `G` Great Dike, `X` demolish | tap the bottom strip |
| Build / inspect | click a tile | tap a tile |
| Move the map | drag (any mouse button) or arrow keys | drag with one finger |
| Zoom | mouse wheel or `+` / `-` | pinch |
| Cancel tool / close window | `Esc` | tap the tool again |
| End season | `Enter` or the button | the button |
| Help | `?` | the `?` button |

## Requirements

- Node.js 20 or newer (developed with Node 24) and npm.
- Any modern browser (Chrome, Firefox, Safari, Edge; desktop or mobile).

## Install and run

```bash
cd last-shore
npm install
npm run dev
```

Then open <http://127.0.0.1:5180/>. The dev server uses port 5180 (strict) on 127.0.0.1.

Production build and local preview:

```bash
npm run build      # type-checks and bundles into dist/
npm run preview    # serves dist/ on http://127.0.0.1:5181/
```

`dist/` is a static site with relative paths, so it can be hosted from any folder.

## Tests and balance

```bash
npm run typecheck  # TypeScript strict, no emit
npm test           # Vitest: simulation, i18n, strategy and DOM smoke tests
npm run balance    # plays 20 seeds x 5 strategies x 3 difficulties and prints the table below
npm run balance -- 50 -v   # more seeds, one line per game
```

The test suite contains:

- **Simulation unit tests** (`tests/sim.test.ts`): map layout; sea recession exposing salty seabed; docks turning into wrecks; cotton raising salinity and the sea's retreat; saxaul blocking dust downwind; reeds lowering salinity; the famine counter; emigration below 40 hope; Great Dike construction and water retention in the bay; quota delivery, buying a shortfall and removal after three refusals; every one of the 7 endings from a prepared state; the game ending after Winter of Year 10; save/load round-trip (also through a throwing storage); determinism.
- **i18n tests** (`tests/i18n.test.ts`): identical keys in uz/ru/en, matching `{placeholders}`, no empty strings, ASCII apostrophes in Uzbek, text for every event, choice, building and ending, and every static key used in the source exists.
- **Strategy tests** (`tests/strategies.test.ts`): full 40-season headless games — do-nothing ends in Exodus or Famine; cotton-only ends in Cotton Town, removal or a loss; the balanced eco strategy wins (E1/E2) in at least 60 % of 20 seeds on Normal and at least 15 points less often on Hard.
- **DOM smoke test** (`tests/ui-smoke.test.ts`, happy-dom with a stub canvas): plays a whole game through the real UI in each language, checking that no raw keys or unfilled placeholders appear, and that the game starts when `localStorage` throws.

### Balance results

`npm run balance` (20 seeds per row, seeds 1–20):

| strategy      | difficulty | E1 | E2 | E3 | E4 | E5 | E6 | E7 | E1+E2 | avg pop | avg season |
|---------------|------------|----|----|----|----|----|----|----|-------|---------|------------|
| do-nothing    | normal     | 0  | 0  | 0  | 0  | 0  | 20 | 0  | 0%    | 50      | 15.3       |
| do-nothing    | hard       | 0  | 0  | 0  | 0  | 3  | 17 | 0  | 0%    | 43      | 13.8       |
| do-nothing    | brutal     | 0  | 0  | 0  | 0  | 4  | 16 | 0  | 0%    | 37      | 12.8       |
| cotton-only   | normal     | 0  | 0  | 0  | 0  | 0  | 20 | 0  | 0%    | 75      | 24.3       |
| cotton-only   | hard       | 0  | 0  | 0  | 0  | 4  | 16 | 0  | 0%    | 50      | 20.4       |
| cotton-only   | brutal     | 0  | 0  | 0  | 0  | 14 | 6  | 0  | 0%    | 35      | 19.1       |
| cotton-farmer | normal     | 0  | 0  | 6  | 1  | 0  | 13 | 0  | 0%    | 92      | 35.8       |
| cotton-farmer | hard       | 0  | 0  | 0  | 1  | 17 | 2  | 0  | 0%    | 33      | 32.3       |
| cotton-farmer | brutal     | 0  | 0  | 0  | 0  | 20 | 0  | 0  | 0%    | 33      | 22.1       |
| balanced-eco  | normal     | 0  | 18 | 0  | 2  | 0  | 0  | 0  | 90%   | 120     | 40.0       |
| balanced-eco  | hard       | 0  | 6  | 0  | 8  | 0  | 6  | 0  | 30%   | 90      | 39.4       |
| balanced-eco  | brutal     | 0  | 0  | 0  | 0  | 11 | 9  | 0  | 0%    | 34      | 32.5       |
| dike-builder  | normal     | 3  | 14 | 0  | 0  | 0  | 3  | 0  | 85%   | 124     | 39.7       |
| dike-builder  | hard       | 0  | 5  | 0  | 6  | 0  | 9  | 0  | 25%   | 88      | 38.0       |
| dike-builder  | brutal     | 0  | 0  | 0  | 1  | 11 | 8  | 0  | 0%    | 34      | 32.7       |

E1 Small Sea Returns · E2 Green Delta · E3 Cotton Town · E4 Ship Graveyard · E5 Exodus · E6 Famine · E7 Removed from Office

The strategies (`src/sim/ai/strategies.ts`): *do-nothing* never builds and takes the first affordable option on every
card; *cotton-only* grows as much cotton as the river allows and imports grain; *cotton-farmer* farms normally but
skips saxaul and reeds and grows extra cotton; *balanced-eco* keeps docks following the water, plants a saxaul belt
on the old shore, reed beds, a clinic and a workshop, meets the quota with a few cotton fields and builds the dike;
*dike-builder* is the same plan but gives half the river to the bay once the dike is closed and pushes population growth.
The scripted players are not optimal; they exist to keep the balance honest. Brutal is meant for experienced players —
none of the scripts survives it.

## Project structure

```
last-shore/
├── index.html              page shell
├── src/
│   ├── main.ts             entry: fonts, styles, App
│   ├── style.css           pixel UI, responsive layout / bottom sheet
│   ├── sim/                pure deterministic simulation (no DOM)
│   │   ├── types.ts        JSON-serialisable GameState
│   │   ├── config.ts       all balance numbers and difficulty settings
│   │   ├── rng.ts          seeded RNG (state kept in GameState) and noise
│   │   ├── mapgen.ts       procedural map: sea, bay, dike line, river, town
│   │   ├── grid.ts         tile queries (water, seabed, irrigation, salinity…)
│   │   ├── rules.ts        placement rules, building, leaching, the dike, sliders, market
│   │   ├── season.ts       end-of-season resolution (water → … → population)
│   │   ├── salinity.ts     salinity and wind-blown salt dust
│   │   ├── sea.ts          sea level, bay behind the dike, wrecks
│   │   ├── population.ts   health, hope, births, deaths, emigration
│   │   ├── events.ts       event engine (story beats + random pool)
│   │   ├── endings.ts      the 7 endings
│   │   ├── save.ts         save/load (try/catch around storage)
│   │   └── ai/strategies.ts scripted players for tests and balance
│   ├── content/            buildings (palette), 37 event cards, endings
│   ├── i18n/               t(key, params); ui.{uz,ru,en}.ts and story.{uz,ru,en}.ts
│   ├── render/             Canvas 2D renderer: terrain, sprites, life (gulls, villagers,
│   │                       boats, dust), camera & input, portraits, ending/title art
│   └── ui/                 HUD, build palette, inspector, sliders, cards, title, tutorial, audio
├── tests/                  Vitest suites (sim, i18n, strategies, DOM smoke)
├── scripts/balance.ts      balance table
└── docs/GDD.md             game design document
```

Design document: [docs/GDD.md](docs/GDD.md) (section 9 lists the exact formulas used by the code).

## License

Copyright (c) 2026 Viltrumlik. All rights reserved. See [LICENSE](LICENSE).
