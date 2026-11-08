// Persisted player settings (language, sound, tutorial). Storage failures are ignored.
import type { Lang } from '../i18n';
import { readSetting, writeSetting } from '../sim/save';

export interface Settings {
  lang: Lang;
  sound: boolean;
  tutorialDone: boolean;
}

const KEY = 'lastshore.settings.v1';

function detectLang(): Lang {
  try {
    const nav = (navigator.language || 'uz').toLowerCase();
    if (nav.startsWith('ru')) return 'ru';
    if (nav.startsWith('en')) return 'en';
  } catch {
    /* ignore */
  }
  return 'uz';
}

export function loadSettings(): Settings {
  const def: Settings = { lang: detectLang(), sound: true, tutorialDone: false };
  const raw = readSetting(KEY);
  if (!raw) return def;
  try {
    const v = JSON.parse(raw) as Partial<Settings>;
    return {
      lang: v.lang === 'uz' || v.lang === 'ru' || v.lang === 'en' ? v.lang : def.lang,
      sound: typeof v.sound === 'boolean' ? v.sound : true,
      tutorialDone: !!v.tutorialDone,
    };
  } catch {
    return def;
  }
}

export function saveSettings(s: Settings): void {
  writeSetting(KEY, JSON.stringify(s));
}
