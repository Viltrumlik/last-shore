// Save / load. The state is plain JSON; storage access is wrapped so the game still
// works when localStorage is unavailable (private mode, blocked cookies, tests).
import type { GameState } from './types';

export const SAVE_KEY = 'lastshore.save.v1';

export function serialize(s: GameState): string {
  return JSON.stringify(s);
}

export function deserialize(json: string): GameState | null {
  try {
    const s = JSON.parse(json) as GameState;
    if (!s || s.v !== 1 || !Array.isArray(s.tiles) || typeof s.season !== 'number') return null;
    return s;
  } catch {
    return null;
  }
}

export interface KV {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

function storage(): KV | null {
  try {
    const ls = (globalThis as { localStorage?: KV }).localStorage;
    if (!ls) return null;
    const probe = '__lastshore_probe__';
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return ls;
  } catch {
    return null;
  }
}

export function saveGame(s: GameState, kv: KV | null = storage()): boolean {
  if (!kv) return false;
  try {
    kv.setItem(SAVE_KEY, serialize(s));
    return true;
  } catch {
    return false;
  }
}

export function loadGame(kv: KV | null = storage()): GameState | null {
  if (!kv) return null;
  try {
    const raw = kv.getItem(SAVE_KEY);
    return raw ? deserialize(raw) : null;
  } catch {
    return null;
  }
}

export function clearSave(kv: KV | null = storage()): void {
  try {
    kv?.removeItem(SAVE_KEY);
  } catch {
    /* storage blocked: nothing to clear */
  }
}

export function readSetting(key: string, kv: KV | null = storage()): string | null {
  try {
    return kv ? kv.getItem(key) : null;
  } catch {
    return null;
  }
}

export function writeSetting(key: string, value: string, kv: KV | null = storage()): void {
  try {
    kv?.setItem(key, value);
  } catch {
    /* ignore */
  }
}
