import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TOOLS } from '../src/content/buildings';
import { ENDING_IDS } from '../src/content/endings';
import { EVENTS } from '../src/content/events';
import { DICTS, LANGS, placeholders } from '../src/i18n';

const en = DICTS.en;

describe('i18n dictionaries', () => {
  it('have identical keys in uz, ru and en', () => {
    const keys = Object.keys(en).sort();
    for (const l of LANGS) expect(Object.keys(DICTS[l]).sort()).toEqual(keys);
  });

  it('use the same {placeholders} for each key', () => {
    for (const k of Object.keys(en)) {
      const p = placeholders(en[k]!);
      for (const l of LANGS) expect(placeholders(DICTS[l][k]!), `${l}:${k}`).toEqual(p);
    }
  });

  it('contain no empty strings', () => {
    for (const l of LANGS) for (const [k, v] of Object.entries(DICTS[l])) expect(v.trim().length, `${l}:${k}`).toBeGreaterThan(0);
  });

  it('write Uzbek with the ASCII apostrophe (o\', g\', tutuq belgisi)', () => {
    for (const [k, v] of Object.entries(DICTS.uz)) {
      expect(/[ʻʼ‘’`]/.test(v), `uz:${k} uses a typographic apostrophe`).toBe(false);
    }
    expect(DICTS.uz['story.title']).toBe("So'nggi qirg'oq");
  });

  it('have text for every event, choice, building and ending in all languages', () => {
    for (const l of LANGS) {
      const d = DICTS[l];
      for (const e of EVENTS) {
        expect(d[`ev.${e.id}.title`], `${l} ev.${e.id}.title`).toBeTruthy();
        expect(d[`ev.${e.id}.body`], `${l} ev.${e.id}.body`).toBeTruthy();
        expect(d[`adv.${e.advisor}`], `${l} adv.${e.advisor}`).toBeTruthy();
        for (const c of e.choices) expect(d[`ev.${e.id}.${c.id}`], `${l} ev.${e.id}.${c.id}`).toBeTruthy();
      }
      for (const t of TOOLS) for (const f of ['name', 'effect', 'rule']) expect(d[`b.${t.id}.${f}`], `${l} b.${t.id}.${f}`).toBeTruthy();
      for (const f of ['name', 'effect', 'rule']) expect(d[`b.wreck.${f}`]).toBeTruthy();
      for (const id of ENDING_IDS) for (const f of ['title', 'text', 'cond']) expect(d[`end.${id}.${f}`], `${l} end.${id}.${f}`).toBeTruthy();
    }
  });

  it('event bodies only use parameters the event provides', () => {
    for (const e of EVENTS) {
      const used = placeholders(en[`ev.${e.id}.body`]!);
      if (!used.length) continue;
      expect(e.params, `${e.id} uses ${used.join(',')} but has no params`).toBeTruthy();
    }
  });

  it('every static key used in the source exists', () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const f of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, f.name);
        if (f.isDirectory()) walk(p);
        else if (p.endsWith('.ts') && !p.includes('/i18n/')) files.push(p);
      }
    };
    walk(join(__dirname, '..', 'src'));
    const missing = new Set<string>();
    const re = /(?:\bt\(|key: |\breason: |no\()\s*'((?:ui|hud|why|note|tile|insp|panel|water|work|goal|rep|ev|end|help|set|tut|tool|diff|lang|season|market|inspect|story)\.[\w.]+)'/g;
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      for (const m of src.matchAll(re)) if (!(m[1]! in en)) missing.add(m[1]!);
    }
    expect([...missing]).toEqual([]);
  });
});
