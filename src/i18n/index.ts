// Tiny i18n layer: three dictionaries with identical keys, `t(key, params)` with
// {placeholder} substitution. UI strings live in ui.<lang>.ts, story/event/ending text in
// story.<lang>.ts.
import { STORY_EN } from './story.en';
import { STORY_RU } from './story.ru';
import { STORY_UZ } from './story.uz';
import { UI_EN } from './ui.en';
import { UI_RU } from './ui.ru';
import { UI_UZ } from './ui.uz';

export type Lang = 'uz' | 'ru' | 'en';
export const LANGS: Lang[] = ['uz', 'ru', 'en'];
export type Dict = Record<string, string>;

export const DICTS: Record<Lang, Dict> = {
  uz: { ...UI_UZ, ...STORY_UZ },
  ru: { ...UI_RU, ...STORY_RU },
  en: { ...UI_EN, ...STORY_EN },
};

let current: Lang = 'uz';
const listeners = new Set<(l: Lang) => void>();

export function getLang(): Lang {
  return current;
}

export function setLang(l: Lang): void {
  if (!LANGS.includes(l) || l === current) return;
  current = l;
  for (const fn of listeners) fn(l);
}

export function onLangChange(fn: (l: Lang) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function has(key: string, lang: Lang = current): boolean {
  return key in DICTS[lang];
}

export function format(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m));
}

/** Translate `key` in the current language; falls back to English, then to the key itself. */
export function t(key: string, params?: Record<string, string | number>, lang: Lang = current): string {
  const s = DICTS[lang][key] ?? DICTS.en[key] ?? key;
  return format(s, params);
}

/** Extract {placeholder} names from a template (used by the i18n test). */
export function placeholders(template: string): string[] {
  const out = new Set<string>();
  for (const m of template.matchAll(/\{(\w+)\}/g)) out.add(m[1]!);
  return [...out].sort();
}
