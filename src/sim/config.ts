// All balance numbers live here so they can be tuned in one place.
import type { BuildingId, Difficulty } from './types';

export const MAP_W = 32;
export const MAP_H = 20;
export const TOTAL_SEASONS = 40;
export const SEASONS_PER_YEAR = 4;

export interface DifficultyConfig {
  /** base sea-level drop per season (metres) */
  baseDrop: number;
  /** upstream diversion (fraction of river flow) in year 1 */
  upstream0: number;
  /** extra upstream diversion per year */
  upstreamGrowth: number;
  /** how much upstream diversion speeds the sea's retreat */
  upstreamDropK: number;
  quotaBase: number;
  quotaGrowth: number;
  /** multiplier on the Great Salt Storm */
  storm: number;
  /** multiplier on ordinary seasonal dust */
  dust: number;
  /** multiplier on bad-event damage */
  harsh: number;
  /** hope lost every season to the slow death of the sea */
  hopeDrift: number;
  /** health lost every season (bad water, heat) */
  healthDrift: number;
  /** price of a 20-food caravan purchase in year 1 */
  foodPrice: number;
  /** money per inhabitant per season */
  tax: number;
  bargainChance: number;
  /** multiplier on fish catch */
  fish: number;
}

export const DIFFICULTY: Record<Difficulty, DifficultyConfig> = {
  normal: {
    baseDrop: 0.09,
    upstream0: 0.1,
    upstreamGrowth: 0.022,
    upstreamDropK: 0.25,
    quotaBase: 10,
    quotaGrowth: 3,
    storm: 2.6,
    dust: 1,
    harsh: 1,
    hopeDrift: 1.2,
    healthDrift: 1.5,
    foodPrice: 28,
    tax: 0.4,
    bargainChance: 0.55,
    fish: 1,
  },
  hard: {
    baseDrop: 0.1,
    upstream0: 0.12,
    upstreamGrowth: 0.025,
    upstreamDropK: 0.28,
    quotaBase: 12,
    quotaGrowth: 3.5,
    storm: 3.2,
    dust: 1.2,
    harsh: 1.25,
    hopeDrift: 1.5,
    healthDrift: 1.8,
    foodPrice: 34,
    tax: 0.33,
    bargainChance: 0.45,
    fish: 0.88,
  },
  brutal: {
    baseDrop: 0.12,
    upstream0: 0.15,
    upstreamGrowth: 0.032,
    upstreamDropK: 0.3,
    quotaBase: 15,
    quotaGrowth: 4.5,
    storm: 3.8,
    dust: 1.4,
    harsh: 1.5,
    hopeDrift: 1.8,
    healthDrift: 2.1,
    foodPrice: 40,
    tax: 0.3,
    bargainChance: 0.35,
    fish: 0.85,
  },
};

export interface BuildingCost {
  money: number;
  labour: number;
}

export const COSTS: Record<Exclude<BuildingId, 'wreck'> | 'leach', BuildingCost> = {
  house: { money: 40, labour: 2 },
  dock: { money: 60, labour: 3 },
  wheat: { money: 20, labour: 1 },
  melon: { money: 25, labour: 1 },
  cotton: { money: 30, labour: 1 },
  canal: { money: 10, labour: 1 },
  saxaul: { money: 15, labour: 1 },
  reeds: { money: 20, labour: 2 },
  clinic: { money: 120, labour: 4 },
  workshop: { money: 80, labour: 3 },
  // The Great Dike is paid per season of work: 4 x (100 money / 5 labour) = 400 / 20.
  dike: { money: 100, labour: 5 },
  leach: { money: 30, labour: 2 },
};

export const DEMOLISH_LABOUR = 1;
export const DIKE_SEASONS = 4;

export const BAL = {
  houseCapacity: 8,
  workerShare: 0.6,
  /** labour points produced per builder per season */
  labourPerBuilder: 0.6,
  dockCrew: 5,
  fieldCrew: 3,

  // --- river & water (units per season) ---
  flow: [130, 108, 78, 46] as const, // spring, summer, autumn, winter
  wheatWater: 5,
  melonWater: 4,
  cottonWater: 9,
  reedWater: 1.5,
  reedWaterWinter: 0.5,
  townWaterPer: 1 / 8,
  clinicWater: 2,
  leachWater: 18,
  /** sea-level drop avoided per unit of water reaching the sea */
  inflowK: 0.0004,
  /** extra sea-level drop per cotton field */
  cottonDrop: 0.006,
  minDrop: 0.012,

  // --- bay behind the Great Dike ---
  bayVolumePerTile: 26,
  bayEvapPerTile: [1.2, 2, 1.2, 0.4] as const,

  // --- production ---
  fishBase: 20,
  fishSeason: [1.0, 1.15, 1.0, 0.5] as const,
  nurseryPerReed: 0.12,
  nurseryMax: 0.6,
  nurseryRadius: 3,
  bayHealth: 0.9,
  seaSaltPerMetre: 10,
  wheatYield: [0, 27, 31, 0] as const,
  melonFood: 18,
  melonMoney: 16,
  cottonYield: 14,
  cottonMarket: 8,
  cottonState: 5,
  cottonBuy: 12,
  reedMatPer: 2,
  workshopUse: 6,
  workshopPrice: 5,
  museumPerWreck: 5,
  museumMaxWrecks: 8,
  clinicUpkeep: 6,
  workshopUpkeep: 3,
  marketFood: 20,
  marketMaxPerSeason: 8,
  marketMarkup: 0.25,
  marketPriceGrowth: 3,
  spoilShare: 0.1,

  // --- salinity & dust ---
  cottonSalSelf: 5,
  cottonSalNeighbour: 1.5,
  fieldSalSelf: 0.8,
  reedSalSelf: 8,
  reedSalNeighbour: 2,
  saxaulSalSelf: 2,
  leachAmount: 35,
  naturalLeach: 0.3,
  seabedCreep: 0.5,
  dustSeason: [1.0, 0.3, 0.45, 0.15] as const,
  dustEmit: 14,
  dustDeposit: 0.1,
  saxaulBlock: 0.7,
  saxaulShelter: 3,
  waterAbsorb: 0.6,

  // --- people ---
  birthRate: 0.035,
  baseDeath: 0.004,
  emigrationRate: 0.025,
  hopeBirthMin: 50,
  hopeLeave: 40,
  clinicHealth: 2.5,
  clinicMaxCount: 2,
};

export function diff(d: Difficulty): DifficultyConfig {
  return DIFFICULTY[d];
}
