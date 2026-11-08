// Event engine: chooses one event card per season (a scheduled story beat or a random
// conditional event) and applies the player's choice.
import { EVENTS } from '../content/events';
import { canAfford, applyDelta, payCost, type Delta } from './effects';
import { pickWeighted } from './rng';
import type { AdvisorId, GameState, Outcome, PendingEvent } from './types';

export interface ChoiceDef {
  /** i18n: ev.<event>.<id> is the button label */
  id: string;
  /** paid up front; the choice is disabled when unaffordable */
  cost?: Delta | ((s: GameState) => Delta);
  /** known, signed effects shown on the button and applied automatically */
  fx?: Delta | ((s: GameState) => Delta);
  /** the result is uncertain (shown with a question mark) */
  risky?: boolean;
  can?: (s: GameState) => boolean;
  /** extra logic; may return an outcome text key */
  apply?: (s: GameState) => Outcome | void;
}

export interface EventDef {
  id: string;
  advisor: AdvisorId;
  kind: 'story' | 'random';
  when?: (s: GameState) => boolean;
  weight?: number;
  /** minimum seasons before the event can repeat */
  cooldown?: number;
  once?: boolean;
  params?: (s: GameState) => Record<string, number | string>;
  /** called when the card is drawn (before the choice) */
  onDraw?: (s: GameState) => void;
  choices: ChoiceDef[];
}

const byId = new Map<string, EventDef>();
for (const e of EVENTS) byId.set(e.id, e);

export function eventDef(id: string): EventDef {
  const e = byId.get(id);
  if (!e) throw new Error(`unknown event ${id}`);
  return e;
}

export function allEvents(): readonly EventDef[] {
  return EVENTS;
}

/** Story beats fixed to a season (index of the season just resolved). */
export function storyEventFor(season: number): string | null {
  const so = season % 4;
  if (season === 2) return 'quota_first';
  if (so === 2) return 'quota';
  switch (season) {
    case 9:
      return 'harbour';
    case 11:
      return 'storm_warning';
    case 12:
      return 'storm_after';
    case 17:
      return 'epidemic';
    case 20:
      return 'dike_plan';
    case 28:
      return 'aid';
    default:
      return null;
  }
}

export function resolveDelta(s: GameState, d: Delta | ((s: GameState) => Delta) | undefined): Delta {
  if (!d) return {};
  return typeof d === 'function' ? d(s) : d;
}

export function choiceAvailable(s: GameState, c: ChoiceDef): boolean {
  if (c.can && !c.can(s)) return false;
  return canAfford(s, resolveDelta(s, c.cost));
}

function makePending(s: GameState, e: EventDef): PendingEvent {
  e.onDraw?.(s);
  return { id: e.id, params: e.params ? e.params(s) : {} };
}

/** Pick the event for the season that was just resolved. */
export function pickEvent(s: GameState, resolvedSeason: number): PendingEvent | null {
  const story = storyEventFor(resolvedSeason);
  if (story) return makePending(s, eventDef(story));
  const pool = EVENTS.filter((e) => {
    if (e.kind !== 'random') return false;
    const last = s.eventLog[e.id];
    if (last !== undefined) {
      if (e.once) return false;
      if (resolvedSeason - last < (e.cooldown ?? 10)) return false;
    }
    if (e.when && !e.when(s)) return false;
    // at least one choice must be possible
    return e.choices.some((c) => choiceAvailable(s, c));
  });
  const e = pickWeighted(s, pool, (x) => x.weight ?? 1);
  if (!e) return null;
  return makePending(s, e);
}

/** Apply choice `index` of the pending event. Returns an outcome (for the UI) or null if invalid. */
export function chooseEvent(s: GameState, index: number): Outcome | null {
  const p = s.pending;
  if (!p) return null;
  const e = eventDef(p.id);
  const c = e.choices[index];
  if (!c || !choiceAvailable(s, c)) return null;
  payCost(s, resolveDelta(s, c.cost));
  applyDelta(s, resolveDelta(s, c.fx));
  const out = c.apply?.(s) ?? null;
  s.eventLog[e.id] = s.season - 1;
  s.stats.eventsSeen++;
  s.pending = null;
  s.lastOutcome = out ?? { key: `ev.${e.id}.${c.id}`, params: {} };
  return s.lastOutcome;
}
