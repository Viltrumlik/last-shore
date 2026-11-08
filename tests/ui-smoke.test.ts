// @vitest-environment happy-dom
// Drives the real DOM UI (with a stub 2D canvas) through a whole game in every language
// to catch runtime errors and untranslated keys. Rendering itself is not checked here.
import { beforeAll, describe, expect, it } from 'vitest';
import { LANGS, setLang, type Lang } from '../src/i18n';

function fakeContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const store: Record<string | symbol, unknown> = { canvas };
  const fns: Record<string, (...a: number[]) => unknown> = {
    createImageData: (w: number, h: number) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
    getImageData: (_x: number, _y: number, w: number, h: number) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
    measureText: () => ({ width: 10 }),
    createPattern: () => ({ setTransform() {} }),
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
  };
  return new Proxy(store, {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (typeof prop === 'string' && fns[prop]) return fns[prop];
      return () => undefined;
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
}

beforeAll(() => {
  const proto = HTMLCanvasElement.prototype as unknown as Record<string, unknown>;
  const ctxs = new WeakMap<HTMLCanvasElement, CanvasRenderingContext2D>();
  proto.getContext = function (this: HTMLCanvasElement) {
    let c = ctxs.get(this);
    if (!c) {
      c = fakeContext(this);
      ctxs.set(this, c);
    }
    return c;
  };
  proto.toDataURL = () => 'data:image/png;base64,';
  const g = globalThis as Record<string, unknown>;
  if (typeof g.ImageData !== 'function') {
    g.ImageData = class {
      constructor(
        public data: Uint8ClampedArray,
        public width: number,
        public height: number,
      ) {}
    };
  }
  if (typeof g.ResizeObserver !== 'function') {
    g.ResizeObserver = class {
      observe() {}
      disconnect() {}
      unobserve() {}
    };
  }
  if (typeof g.matchMedia !== 'function') g.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
});

function click(el: Element | null | undefined): void {
  expect(el, 'element to click').toBeTruthy();
  (el as HTMLElement).click();
}

function buttonWithText(text: string): HTMLButtonElement | undefined {
  return [...document.querySelectorAll('button')].find((b) => b.textContent?.includes(text)) as HTMLButtonElement | undefined;
}

/** Visible text must never contain raw i18n keys like "ui.endSeason" or "{placeholder}". */
function assertNoRawKeys(): void {
  const text = document.body.textContent ?? '';
  const raw = text.match(/\b(ui|hud|b|why|tile|insp|panel|water|work|goal|rep|note|ev|end|help|set|tut|tool|diff|lang|season|adv|story|market)\.[a-zA-Z][\w.]*/g) ?? [];
  // allow numbers like "0.12" in text; keys always contain letters after the dot
  expect(raw, `raw keys in UI: ${raw.slice(0, 5).join(', ')}`).toEqual([]);
  expect(/\{[a-z]+\}/i.test(text), 'unfilled {placeholder} in UI').toBe(false);
}

describe('UI smoke (happy-dom)', () => {
  for (const lang of LANGS) {
    it(`plays a full game through the DOM in ${lang}`, async () => {
      // fresh document & storage
      localStorage.clear();
      localStorage.setItem('lastshore.settings.v1', JSON.stringify({ lang, sound: false, tutorialDone: false }));
      document.body.innerHTML = '<div id="app"></div>';
      setLang(lang as Lang);
      const { App } = await import('../src/ui/app');
      const app = new App(document.getElementById('app')!);
      assertNoRawKeys();

      // title -> new game -> difficulty -> begin
      const { t } = await import('../src/i18n');
      click(buttonWithText(t('ui.newGame')));
      click(document.querySelector('.diff'));
      click(buttonWithText(t('ui.start')));
      expect(document.querySelector('.card.event')).toBeTruthy(); // intro card
      assertNoRawKeys();
      click(document.querySelector('.choice'));
      // tutorial visible, HUD built
      expect(document.getElementById('hud')).toBeTruthy();
      expect(document.getElementById('tutorial')?.hidden).toBe(false);
      assertNoRawKeys();

      // select a tool via keyboard and place a house through the controller
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }));
      expect(app.tool).toBe('house');
      const s = app.s;
      const { canUse } = await import('../src/sim');
      const tile = s.tiles.findIndex((_, i) => canUse(s, 'house', i).ok);
      expect(tile).toBeGreaterThanOrEqual(0);
      (app as unknown as { onTap(i: number): void }).onTap(tile);
      expect(s.tiles[tile]!.b?.id).toBe('house');
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(app.tool).toBeNull();

      // move a slider through the side panel
      const range = document.querySelector('.section-water input[type=range]') as HTMLInputElement;
      range.value = '60';
      range.dispatchEvent(new Event('input'));
      expect(app.s.water.fields).toBe(60);

      // open help + settings and close them
      app.openHelp();
      assertNoRawKeys();
      click(document.querySelector('.help .btn-primary'));
      app.openSettings();
      assertNoRawKeys();
      click(document.querySelector('.settings .btn-primary'));

      // play to the end: End season -> report -> event (first enabled choice) -> ...
      let guard = 0;
      while (!document.querySelector('.card.ending') && guard++ < 200) {
        const report = document.querySelector('.card.report');
        const event = document.querySelector('.card.event');
        if (report) {
          assertNoRawKeys();
          click(report.querySelector('.btn-primary'));
        } else if (event) {
          assertNoRawKeys();
          const choice = [...event.querySelectorAll<HTMLButtonElement>('.choice')].find((b) => !b.disabled);
          if (choice) click(choice);
          else click(event.querySelector('.btn-primary'));
        } else {
          click(document.getElementById('end-season'));
        }
      }
      expect(document.querySelector('.card.ending')).toBeTruthy();
      assertNoRawKeys();
      expect(app.s.ending).toBeTruthy();
      // back to the title screen works
      click(buttonWithText(t('ui.toTitle')));
      expect(document.getElementById('title')?.hidden).toBe(false);
    });
  }

  it('still runs when localStorage throws', async () => {
    const orig = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('blocked');
      },
    });
    try {
      document.body.innerHTML = '<div id="app"></div>';
      const { App } = await import('../src/ui/app');
      const app = new App(document.getElementById('app')!);
      app.startNew('normal');
      expect(app.s.season).toBe(0);
      click(document.querySelector('.choice'));
      app.endSeason();
      expect(document.querySelector('.card.report')).toBeTruthy();
    } finally {
      if (orig) Object.defineProperty(globalThis, 'localStorage', orig);
    }
  });
});
