// Title screen: animated backdrop, menu, language switch.
import { LANGS, getLang, t, type Lang } from '../i18n';
import { drawTitleArt } from '../render';
import type { GameState } from '../sim';
import { h } from './dom';
import { seasonLabel } from './panels';

export interface TitleActions {
  saved(): GameState | null;
  onContinue(): void;
  onNew(): void;
  onHelp(): void;
  onSettings(): void;
  onLang(l: Lang): void;
}

export class TitleScreen {
  readonly el: HTMLElement;
  private art: HTMLCanvasElement;
  private box: HTMLElement;
  private raf = 0;
  private t0 = performance.now();

  constructor(private a: TitleActions) {
    this.art = h('canvas', { class: 'title-art' });
    this.box = h('div', { class: 'title-box' });
    this.el = h('div', { class: 'title-screen', attrs: { id: 'title' } }, this.art, this.box);
  }

  show(): void {
    this.el.hidden = false;
    this.render();
    cancelAnimationFrame(this.raf);
    const loop = () => {
      if (this.el.hidden) return;
      if (!document.hidden) {
        try {
          drawTitleArt(this.art, (performance.now() - this.t0) / 1000);
        } catch {
          /* canvas unavailable */
        }
      }
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  hide(): void {
    this.el.hidden = true;
    cancelAnimationFrame(this.raf);
  }

  render(): void {
    const saved = this.a.saved();
    const lang = getLang();
    const others = LANGS.filter((l) => l !== lang).map((l) => t('story.title', undefined, l));
    const menu = h('div', { class: 'menu' });
    if (saved && !saved.ending) {
      menu.append(
        h(
          'button',
          { class: 'btn btn-primary btn-big', on: { click: () => this.a.onContinue() } },
          h('span', { text: t('ui.continue') }),
          h('small', { text: `${seasonLabel(saved.season)} · ${t(`diff.${saved.difficulty}`)}` }),
        ),
      );
    }
    menu.append(
      h('button', { class: `btn btn-big ${saved && !saved.ending ? '' : 'btn-primary'}`, text: t('ui.newGame'), on: { click: () => this.a.onNew() } }),
      h('button', { class: 'btn', text: t('ui.howToPlay'), on: { click: () => this.a.onHelp() } }),
      h('button', { class: 'btn', text: t('set.title'), on: { click: () => this.a.onSettings() } }),
    );
    const langs = h('div', { class: 'lang-switch', attrs: { role: 'group', 'aria-label': 'language' } });
    for (const l of LANGS) {
      langs.append(h('button', { class: `btn btn-small ${l === lang ? 'active' : ''}`, text: l.toUpperCase(), title: t(`lang.${l}`), on: { click: () => this.a.onLang(l) } }));
    }
    this.box.replaceChildren(
      h('h1', { class: 'game-title', text: t('story.title') }),
      h('div', { class: 'title-alt', text: others.join(' · ') }),
      h('p', { class: 'tagline', text: t('story.tagline') }),
      menu,
      langs,
      h('p', { class: 'teaser', text: t('story.teaser') }),
      h('p', { class: 'credits', text: t('ui.credits') }),
    );
  }
}
