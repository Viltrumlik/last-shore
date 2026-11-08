// Core data types for the Last Shore simulation. Everything here is plain data
// so the whole GameState can be JSON-serialised for save/load.

export type Difficulty = 'normal' | 'hard' | 'brutal';

/** Base terrain that never changes. Whether a 'sea' tile is water or exposed seabed depends on the water level. */
export type Terrain = 'sea' | 'sand' | 'soil' | 'river';

/** What the player sees on a tile right now (derived from terrain + elevation + water level). */
export type TileKind = 'deep' | 'shallow' | 'seabed' | 'sand' | 'soil' | 'river';

export type BuildingId =
  | 'house'
  | 'dock'
  | 'wheat'
  | 'melon'
  | 'cotton'
  | 'canal'
  | 'saxaul'
  | 'reeds'
  | 'clinic'
  | 'workshop'
  | 'dike'
  | 'wreck';

export type ToolId = Exclude<BuildingId, 'wreck'> | 'leach' | 'demolish';

export type AdvisorId = 'ermek' | 'dilnoza' | 'tolib' | 'saida' | 'timur' | 'elder';

export type EndingId = 'E1' | 'E2' | 'E3' | 'E4' | 'E5' | 'E6' | 'E7';

export interface Building {
  id: BuildingId;
  /** seasons since built */
  age: number;
  /** fields: accumulated water satisfaction since the last harvest */
  acc: number;
  /** fields: number of growing seasons accumulated */
  n: number;
  /** reeds: consecutive dry seasons */
  dry: number;
  /** placed at game start (the old harbour etc.) */
  initial?: boolean;
}

export interface Tile {
  terrain: Terrain;
  /** elevation in metres relative to the original sea level (sea floor < 0) */
  elev: number;
  /** soil salinity 0..100 */
  sal: number;
  /** moisture 0..100 (mostly cosmetic + inspector) */
  moist: number;
  b: Building | null;
  /** part of the northern bay basin */
  bay: boolean;
  /** on the Great Dike line */
  dikeLine: boolean;
  /** decorative prop seed: 0 none, 1 old hull, 2 anchor/bones, 3 shells */
  prop: number;
  /** salt dust deposited here last season (for the inspector and particles) */
  dust: number;
}

export interface Resources {
  pop: number;
  food: number;
  money: number;
  health: number;
  hope: number;
  /** harvested reed material, used by the workshop */
  reedMat: number;
  /** cotton bales in store, delivered at the autumn quota */
  cotton: number;
}

export interface WaterAlloc {
  fields: number;
  reeds: number;
  town: number;
}

export interface WorkFocus {
  fishing: number;
  farming: number;
  building: number;
}

export interface DikeState {
  unlocked: boolean;
  started: boolean;
  /** paid seasons of work, 0..4 */
  progress: number;
  complete: boolean;
  /** seasons in which work stalled (no money / labour) */
  stalled: number;
  /** discount on each season's payment (from the Y6 story choice) */
  discount: number;
}

export interface QuotaState {
  failures: number;
  met: number;
  /** cotton demanded this year (set when the autumn quota event fires) */
  demand: number;
  /** extra demand carried over from a lost bargain */
  carry: number;
}

export interface Modifier {
  kind:
    | 'fish'
    | 'wheat'
    | 'water'
    | 'health'
    | 'hope'
    | 'labour'
    | 'dust'
    | 'townWater'
    | 'melonSalt'
    | 'leachCost';
  /** multiplier (for fish/wheat/water/labour/dust/townWater) or per-season delta (health/hope) */
  value: number;
  /** seasons remaining; -1 = permanent */
  seasons: number;
}

export interface PendingEvent {
  id: string;
  params: Record<string, number | string>;
}

export interface Outcome {
  key: string;
  params: Record<string, number | string>;
}

export interface WaterReport {
  flow: number;
  fieldsDemand: number;
  fieldsSat: number;
  reedsDemand: number;
  reedsSat: number;
  townDemand: number;
  townSat: number;
  toSea: number;
  toBay: number;
}

export interface SeasonReport {
  season: number;
  before: Snapshot;
  after: Snapshot;
  fish: number;
  grain: number;
  melon: number;
  cottonHarvest: number;
  income: number;
  expenses: number;
  births: number;
  deaths: number;
  left: number;
  newWrecks: number;
  restoredTiles: number;
  dustOnTown: number;
  water: WaterReport;
  notes: Outcome[];
  storm: boolean;
}

export interface Snapshot {
  pop: number;
  food: number;
  money: number;
  health: number;
  hope: number;
  seaLevel: number;
  salinity: number;
  reedBeds: number;
  bayWater: number;
}

export interface HistoryPoint extends Snapshot {
  season: number;
}

export interface Stats {
  fish: number;
  grain: number;
  cotton: number;
  earned: number;
  born: number;
  died: number;
  left: number;
  built: number;
  wrecks: number;
  peakPop: number;
  quotasMet: number;
  eventsSeen: number;
}

export interface GameState {
  v: 1;
  seed: number;
  /** RNG state (mulberry32), advanced by every random draw */
  rng: number;
  difficulty: Difficulty;
  /** season currently being planned, 0..39 (0 = Spring of Year 1) */
  season: number;
  w: number;
  h: number;
  tiles: Tile[];
  /** tile indices of the Great Dike line, north to south */
  dikeLine: number[];
  /** tile indices of the northern bay basin (behind the dike line) */
  bayTiles: number[];
  /** tile indices of the river, upstream to mouth */
  river: number[];
  seaLevel: number;
  bayLevel: number;
  /** salinity of the open sea water, rises as it shrinks */
  seaSalt: number;
  res: Resources;
  water: WaterAlloc;
  focus: WorkFocus;
  labourUsed: number;
  /** water debt from leaching this season */
  leachWater: number;
  marketBuys: number;
  dike: DikeState;
  quota: QuotaState;
  famineStreak: number;
  /** extra upstream diversion (fraction of river flow) from district punishments etc. */
  upstreamExtra: number;
  flags: Record<string, number>;
  modifiers: Modifier[];
  pending: PendingEvent | null;
  lastOutcome: Outcome | null;
  lastReport: SeasonReport | null;
  history: HistoryPoint[];
  stats: Stats;
  /** season each event last fired */
  eventLog: Record<string, number>;
  ending: EndingId | null;
  /** true once the final season has been resolved */
  finished: boolean;
}
