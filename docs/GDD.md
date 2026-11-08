# So'nggi qirg'oq / Последний берег / Last Shore — Game Design Document

## 1. Pitch
A **2D pixel-art, turn-based survival city-builder** about a fishing town on the shore of an inland sea that is drying up.
Every season the water retreats a little further. Grow cotton for money and the sea dies faster; plant reeds,
saxaul and build dikes and you might keep a piece of it alive. Survive 10 years (40 seasons).

| | |
|---|---|
| Genre | Turn-based strategy / survival city-builder with ecological simulation and event cards |
| Platform | Web browser, desktop and mobile; NOT 3D — 2D canvas pixel art + DOM UI |
| Tech | Vite + TypeScript (no UI framework), Canvas 2D, all art procedurally drawn in code (no image assets), Vitest |
| Audience | 13+, strategy and city-builder fans, players interested in ecology; one run ≈ 30–45 min |
| Languages | Uzbek (Latin), Russian, English (switch on the title screen and in settings) |
| Difficulty | Normal / Hard (default) / Brutal |

## 2. Story
**Setting:** the fictional town of **Oqtosh** on the **Kok Sea**, an inland sea fed by two rivers. Upstream, the rivers
are being diverted to cotton fields. The era is deliberately vague (late 20th century feel); names are fictional.

**You** are the newly chosen elder (oqsoqol) of Oqtosh, in charge from Spring of Year 1 to Winter of Year 10.

**Characters** (appear on event cards as advisors, each with a pixel portrait drawn in code):
- **Ermek-ota** — old fisherman; loves the fleet; wants docks kept and boats moved after the water.
- **Dilnoza** — young hydro-engineer back from the capital; pushes canals, reed beds and finally the **Great Dike**.
- **Rais Tolib** — district official; every autumn demands a **cotton quota**; brings money or punishment.
- **Doctor Saida** — runs the clinic; warns about salt dust and bad water.
- **Timur** — a teenager speaking for the youth; if hope falls, the young leave first.

**Story beats (fixed seasons + conditions):**
- Y1 Spring: arrival, tutorial with Ermek and Dilnoza (place a house, a dock, a field, end the season).
- Y1 Autumn: first cotton quota from Rais Tolib (comply / bargain / refuse).
- Y3 Summer: the docks of the old harbour are stranded; Ermek asks to move the fleet (expensive) or turn wrecks into a museum later.
- Y4 Spring: **the Great Salt Storm** — huge dust storm; saxaul belts decide how bad it gets.
- Y5: Doctor Saida's epidemic warning (clinic or emergency water).
- Y6 Spring: Dilnoza unveils the **Great Dike** plan to hold the northern bay (unlocks the Dike building).
- Y8: foreign aid mission offers money in exchange for "studying" the town (accept → money, −hope; refuse → +hope).
- Y10 Winter: final reckoning → ending.

**Endings (7)**
| # | Ending | Condition (checked after Y10 Winter, or immediately for failures) |
|---|---|---|
| E1 | **The Small Sea Returns** (best) | Great Dike complete, ≥ 8 restored water tiles behind it, population ≥ 120, health ≥ 60 |
| E2 | **Green Delta** | no dike needed: reed beds ≥ 10, population ≥ 80, average soil salinity < 45 |
| E3 | **Cotton Town** | population ≥ 80 but average soil salinity ≥ 60 (rich, poisoned) |
| E4 | **Ship Graveyard** | survived 10 years without reaching E1–E3 (typically population 20–79) |
| E5 | **Exodus** (lose) | population < 20 or hope = 0 at any time |
| E6 | **Famine** (lose) | food at 0 for 2 consecutive seasons |
| E7 | **Removed from Office** (lose) | refused/failed the cotton quota 3 times (a first lost bargain only adds half the quota to next year; see §9) |
Each ending gets a pixel illustration (drawn in code) and an epilogue paragraph plus a stats summary.

## 3. Map & simulation
**Grid:** 32 × 20 tiles, 16 px tiles rendered with nearest-neighbour scaling (2× or 3× depending on viewport; mobile pans).
The sea occupies the north-east; a river enters from the south-west; the town starts in the middle-west.

**Tile fields:** terrain (deep sea, shallow sea, exposed seabed, sand, soil, river, canal, reeds), elevation (for the sea level),
salinity 0–100, moisture 0–100, building (optional).

**Sea level:** a single number. Each season it drops by `base + diversion` (diversion grows with your own cotton water use and
with the district's upstream quota). Tiles whose elevation is above the level become **exposed seabed** (salty, sterile, dust source).
Tiles behind a completed Great Dike keep their own level and can be refilled by allocating water.

**Salinity:** cotton fields +; exposed seabed emits salt dust each season; in spring a wind spreads dust downwind (west),
blocked by saxaul belts (each belt protects 3 tiles downwind); reeds −; leaching −(large) at heavy water cost.

## 4. Buildings
| Building | Cost (money / labour) | Effect |
|---|---|---|
| House | 40 / 2 | +8 population capacity |
| Fishing dock | 60 / 3 | must touch shallow sea; fish = food; output × sea health; becomes a **wreck** when the sea leaves |
| Wheat field | 20 / 1 | food at summer/autumn harvest; needs water (adjacent river/canal) |
| Melon field | 25 / 1 | food + some money; sensitive to salinity |
| Cotton field | 30 / 1 | lots of money + counts toward quota; very thirsty; +salinity to itself and neighbours; +diversion |
| Canal | 10 / 1 | carries water; fields must touch river or canal |
| Saxaul belt | 15 / 1 | on sand/seabed; blocks dust downwind; slowly lowers salinity |
| Reed bed | 20 / 2 | on seabed/shallow water with water allocation; −salinity, +fish nursery for nearby docks, +material |
| Leaching | 30 / 2 (one-off action) | big salinity drop on a field tile; uses a lot of water |
| Clinic | 120 / 4 | +health per season, reduces epidemic damage |
| Workshop | 80 / 3 | turns reeds into money; later wrecks → "museum" tourism money |
| Great Dike | 400 / 20 over 4 seasons (100 / 5 per season) | unlocked Y6; placed on a highlighted line; holds the northern bay |
Demolish refunds nothing and costs 1 labour.

## 5. Resources
Population (start 60, workers = 60%), Food (start 120), Water (seasonal allocation from the river, not stored),
Money (start 200 so'm), Health 0–100 (start 70), Hope 0–100 (start 60).
Each season: food consumption = population; births if food surplus and hope ≥ 50; emigration if hope < 40
(more if health < 40); health falls with dust/salinity near houses and rises with clinics and clean water.

## 6. Core loop (one season)
1. **Plan:** build/demolish on the map, set the **water allocation** sliders (Fields / Reeds & bay / Town),
   set **work focus** (Fishing / Farming / Building).
2. **End season:** resolve water → production → consumption → salinity & dust → sea level → health/hope →
   population → construction progress.
3. **Report** card: short summary with deltas (▲▼).
4. **Event card:** one per season (story beat if scheduled, otherwise a conditional random event from a pool of ≥ 20),
   2–3 choices with visible costs where known.

## 7. Progression & difficulty
- Years 1–3: fishing + wheat economy while the sea is close; first quotas; learn water allocation.
- Years 4–6: the salt storm and stranded docks force a pivot (reeds, saxaul, workshops, leaching).
- Years 6–10: the Great Dike gamble vs. a Green Delta strategy vs. cotton money.
- Difficulty scales sea recession speed, quota size, storm strength and event harshness.
- **Balance targets** (checked by automated strategy tests): "do nothing" → Exodus/Famine; "cotton only" → Cotton Town
  or Removed; a scripted "balanced eco" strategy can reach E1 or E2 on Normal; Hard is meaningfully harder.

## 8. Presentation
- Limited palette (~24 colours), procedurally drawn tiles with seeded noise, animated water (palette shimmer + waves),
  wind-blown dust particles in storms, gulls, boats bobbing at docks, wrecks on the seabed, tiny walking villagers.
- UI: top HUD (season/year, population, food, water, money, health, hope, sea level), build palette, tile inspector,
  water/work sliders, "End season" button, modal cards (report, event, ending), tutorial highlights for the first
  seasons, language + difficulty on the title screen, save/continue in `localStorage`, keyboard shortcuts.
- Works on desktop and phone widths (touch: tap to select, drag to pan).

## 9. Implementation notes (v1.0) — what the code actually does
These refine the sections above; where they differ, this section is authoritative.

**Season order.** Water → production → consumption (spoilage above 1.5 × population) → salinity & dust → sea level
(bay, wrecks) → dike construction → health & hope → population. The event card follows the report. Failure endings
(E5–E7) are checked after the season and after every event choice.

**Map.** 32 × 20 tiles, 16 px. Sea floor slopes gently near the shore (depth ≈ 0.32·d + 0.045·d², d = tiles offshore).
A sandy cape closes the northern bay (≈ 25–30 tiles) whose mouth is the Great Dike line (column x = 14, ≈ 7 tiles).
Start: 8 houses (capacity 64), 3 old-harbour piers that strand around Year 2–3, 2 wheat fields by the river.

**Water (units per season).** River flow 130 / 108 / 78 / 46 (spring → winter) × (1 − upstream diversion) where the
diversion is 10 % in Year 1 (+2.2 %/year on Normal, more on Hard/Brutal, +2 % per refused quota). Demands: wheat 5,
melon 4 (spring–summer), cotton 9, reed bed on dry seabed 1.5 (0.5 in winter; reeds standing in water need none),
town population/8 + 2 per clinic, leaching 18. Field water left unused and town water left unused flow to the sea;
the "Reeds & bay" share left after the reeds flows to the sea before the dike is finished and into the bay after.

**Sea.** Drop per season = base (0.09 / 0.10 / 0.12 m) + 0.25–0.3 × diversion + 0.006 per cotton field − 0.0004 per
unit of water reaching the sea (minimum 0.012). Sea salt = 20 + 10 per metre of drop; fish catch × (1.15 − salt/100).
Typical totals after 10 years: about −6 m on Normal, −7.5 m on Hard.

**Bay.** When the dike completes, the bay keeps its own level (starting at the current sea level, not below its floor).
Each season: level += (bay inflow − evaporation 1.2/2/1.2/0.4 per flooded tile) / (26 × max(3, flooded tiles)).
E1 counts water tiles behind the dike (the 8th-deepest tile is ≈ 1.2 m below the old shore).

**Salinity & dust.** "Average soil salinity" = mean salinity of all original dry land (sand + soil); exposed seabed is
not counted. Exposed seabed starts at 55 + 0.35 × sea salt and creeps +0.5 per season. Each season the wind blows west
along every row: seabed tiles emit 14 × strength × (salinity/100) dust (season strength 1.0 / 0.3 / 0.45 / 0.15 ×
difficulty); land takes 10 % of the carried dust per tile; water absorbs 40 %; a saxaul belt absorbs 70 % and shelters
the next 3 tiles completely (half effect in its first 2 seasons). Cotton +5 own / +1.5 to the 8 neighbours per growing
season; other irrigated fields +0.8; reeds −8 own / −2 neighbours; saxaul −2 own; leaching −35 once.
The Great Salt Storm (Y4 spring) multiplies dust by 2.6 / 3.2 / 3.8.

**Work.** Workers = 60 % of population, split by the Fishing / Farming / Building focus. A dock needs 5 crew, a field 3;
each builder gives 0.6 labour per season. Labour spent this season is honoured even if the focus is lowered later
(builders are taken from the other jobs). The dike reserves 5 labour per season while it is being built.

**Production.** Fish per dock = 20 × season (1 / 1.15 / 1 / 0.5) × sea health (0.9 for docks on the restored bay) ×
crew × (1 + 12 % per reed bed within 3 tiles, max +60 %). Wheat 27 (summer) + 31 (autumn), melon 18 food + 16 so'm
(summer), cotton 14 bales (autumn); all × water received while growing × salinity factor × crew. Taxes 0.4 / 0.33 / 0.3
so'm per person per season. Workshop turns up to 6 reed into 5 so'm each; with the museum flag it earns 5 so'm per
wreck (max 8). Upkeep: clinic 6, workshop 3 per season.

**Food market (new).** Grain caravans: 20 food for 28 / 34 / 40 so'm (+3 per year); every further caravan in the same
season costs 25 % more (max 8). This lets a cotton town buy food, at a rising price.

**People.** Births 3.5 % × (0.4 + health/100) (× 1.25 if hope ≥ 70) when hope ≥ 50, nobody went hungry and production or
stores cover the town; capped by housing. Base deaths 0.4 % (more below 50 health) + 15 % of unmet meals. Emigration
2.5 % × (40 − hope)/10 below 40 hope (× 1.5 if health < 40) plus 25 % of the overcrowding. Hope drifts −1.2 / −1.5 /
−1.8 per season, −0.25 per metre of sea drop beyond 1.5 m, +food, +(health − 60) × 0.04, +reeds/saxaul (max +3), +dike.
Health drifts −1.5 / −1.8 / −2.1, +2.5 per paid clinic (max 2, each covers 80 people), ±town water, −house dust and
salinity around homes, −8 when hungry.

**Cotton quota.** Every autumn Rais Tolib demands 10 + 3/year bales (Normal; 12 + 3.5 Hard; 15 + 4.5 Brutal) plus any
carried amount. Choices: *deliver* (he pays 5 so'm/bale; a shortfall is bought from neighbours at 12; the rest of the
cotton sells at 8), *bargain* (55 / 45 / 35 % chance: waived, 25 % carried; on failure the first time half the quota is
added to next year — failing again while still in debt counts as a failed quota), *refuse* (failed quota, +3 hope,
+2 % upstream diversion). Three failed quotas → E7.

**Events.** 37 cards: 9 story beats (intro, first quota, yearly quota, stranded harbour Y3 summer, storm warning Y3 winter,
storm aftermath Y4 spring, epidemic Y5 summer, dike plan Y6 spring, aid mission Y8 spring) and 28 conditional random events
with cooldowns. Autumn is always the quota card.

**Difficulty** scales sea recession, upstream diversion, quotas, storm and dust strength, event harshness, hope and health
drift, food prices, taxes, bargaining odds and the fish catch (see `src/sim/config.ts`). Default: Hard.

**Balance (scripted strategies, 20 seeds each; `npm run balance`).** Do-nothing always ends in Famine or Exodus;
cotton-only (no food farming, imports grain) collapses into Famine/Exodus; a cotton-heavy farmer that skips saxaul and
reeds reaches Cotton Town on Normal in about 1 game in 3; the balanced eco strategy reaches E1/E2 in ~90 % of Normal games,
~30 % on Hard and 0 % on Brutal; a dike-first variant reaches E1 in a few Normal games. See the README for the table.
