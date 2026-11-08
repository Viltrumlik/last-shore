// The seven endings. Titles and epilogues are i18n keys end.<id>.title / end.<id>.text.
import type { EndingId } from '../sim/types';

export interface EndingDef {
  id: EndingId;
  tone: 'best' | 'good' | 'bitter' | 'grey' | 'lose';
  /** which procedural illustration to draw */
  scene: 'sea' | 'delta' | 'cotton' | 'graveyard' | 'exodus' | 'famine' | 'removed';
}

export const ENDINGS: EndingDef[] = [
  { id: 'E1', tone: 'best', scene: 'sea' },
  { id: 'E2', tone: 'good', scene: 'delta' },
  { id: 'E3', tone: 'bitter', scene: 'cotton' },
  { id: 'E4', tone: 'grey', scene: 'graveyard' },
  { id: 'E5', tone: 'lose', scene: 'exodus' },
  { id: 'E6', tone: 'lose', scene: 'famine' },
  { id: 'E7', tone: 'lose', scene: 'removed' },
];

export function endingDef(id: EndingId): EndingDef {
  return ENDINGS.find((e) => e.id === id)!;
}

export const ENDING_IDS: EndingId[] = ENDINGS.map((e) => e.id);
