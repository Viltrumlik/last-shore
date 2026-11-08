// Building / tool definitions for the build palette. Costs come from sim/config.ts;
// names, effects and placement rules are i18n keys (b.<id>.name / .effect / .rule).
import type { ToolId } from '../sim/types';

export interface ToolDef {
  id: ToolId;
  /** keyboard shortcut */
  key: string;
  group: 'town' | 'food' | 'water' | 'eco' | 'special';
}

export const TOOLS: ToolDef[] = [
  { id: 'house', key: '1', group: 'town' },
  { id: 'dock', key: '2', group: 'food' },
  { id: 'wheat', key: '3', group: 'food' },
  { id: 'melon', key: '4', group: 'food' },
  { id: 'cotton', key: '5', group: 'food' },
  { id: 'canal', key: '6', group: 'water' },
  { id: 'saxaul', key: '7', group: 'eco' },
  { id: 'reeds', key: '8', group: 'eco' },
  { id: 'leach', key: '9', group: 'eco' },
  { id: 'clinic', key: 'c', group: 'town' },
  { id: 'workshop', key: 'w', group: 'town' },
  { id: 'dike', key: 'g', group: 'special' },
  { id: 'demolish', key: 'x', group: 'special' },
];

export const BUILDING_IDS = [
  'house',
  'dock',
  'wheat',
  'melon',
  'cotton',
  'canal',
  'saxaul',
  'reeds',
  'clinic',
  'workshop',
  'dike',
  'wreck',
] as const;
