// Public API of the simulation (no DOM).
export * from './types';
export * from './config';
export * from './grid';
export { newGame } from './state';
export { generateMap, DIKE_X } from './mapgen';
export * from './rules';
export { endSeason, afterChoice, computeWater, workforce, riverFlow, nursery } from './season';
export { chooseEvent, eventDef, allEvents, storyEventFor, choiceAvailable, resolveDelta } from './events';
export type { EventDef, ChoiceDef } from './events';
export { checkFailure, finalEnding, goalProgress, END_RULES } from './endings';
export { upstreamDiversion, seaHealth, seaDrop, bayFloor } from './sea';
export { capacity, houseDust, houseSalinity } from './population';
export { snapshot } from './snapshot';
export * from './save';
