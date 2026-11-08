// The application controller: title screen <-> game, input, saving, modals flow.
import { TOOLS } from '../content/buildings';
import { getLang, onLangChange, setLang, t, type Lang } from '../i18n';
import { PAL, Renderer, attachMapInput } from '../render';
import {
  afterChoice,
  applyTool,
  buyFood,
  canUse,
  chooseEvent,
  clearSave,
  endSeason,
  loadGame,
  newGame,
  saveGame,
  type Difficulty,
  type GameState,
  type ToolId,
} from '../sim';
import { setSound, sfx, soundOn } from './audio';
import { confirmCard, endingCard, eventCard, helpCard, newGameCard, reportCard, settingsCard } from './cards';
import { h } from './dom';
import { closeModal, hideTip, modalClosable, modalOpen, toast } from './modal';
import { Hud, Palette, SidePanel, type UiCtx } from './panels';
import { loadSettings, saveSettings, type Settings } from './settings';
import { TitleScreen } from './title';
import { Tutorial } from './tutorial';

export class App implements UiCtx {
  s!: GameState;
  tool: ToolId | null = null;
  hover: number | null = null;
  selected: number | null = null;

  private settings: Settings;
  private title: TitleScreen;
  private game: HTMLElement | null = null;
  private renderer: Renderer | null = null;
  private hud: Hud | null = null;
  private palette: Palette | null = null;
  private side: SidePanel | null = null;
  private tutorial: Tutorial | null = null;
  private saved: GameState | null = null;
  private inGame = false;
  private refreshQueued = false;

  constructor(private root: HTMLElement) {
    this.settings = loadSettings();
    setLang(this.settings.lang);
    setSound(this.settings.sound);
    this.applyCssPalette();
    this.saved = loadGame();
    this.title = new TitleScreen({
      saved: () => this.saved,
      onContinue: () => this.continueGame(),
      onNew: () => this.askNewGame(),
      onHelp: () => helpCard(),
      onSettings: () => this.openSettings(),
      onLang: (l) => this.changeLang(l),
    });
    root.append(this.title.el, h('div', { attrs: { id: 'modal-root' } }));
    onLangChange(() => {
      document.documentElement.lang = getLang();
      document.title = `${t('story.title')} — ${t('ui.docTitle')}`;
      this.title.render();
      if (this.inGame) this.refresh();
    });
    document.documentElement.lang = getLang();
    document.title = `${t('story.title')} — ${t('ui.docTitle')}`;
    window.addEventListener('keydown', (e) => this.onKey(e));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.inGame && !this.s.ending) saveGame(this.s);
    });
    this.showTitle();
  }

  private applyCssPalette(): void {
    const st = document.documentElement.style;
    for (const [k, v] of Object.entries(PAL)) st.setProperty(`--${k}`, v);
  }

  // ---------------------------------------------------------------- screens

  showTitle(): void {
    this.inGame = false;
    this.renderer?.stop();
    if (this.game) this.game.hidden = true;
    this.tutorial?.stop();
    this.saved = loadGame();
    this.title.show();
  }

  private askNewGame(): void {
    sfx('click');
    const start = () => newGameCard((d) => this.startNew(d));
    if (this.saved && !this.saved.ending) confirmCard(t('ui.overwrite'), t('ui.newGame'), start);
    else start();
  }

  startNew(d: Difficulty): void {
    const seed = (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;
    const s = newGame(seed % 1000000, d);
    this.enter(s);
    if (!this.settings.tutorialDone) this.tutorialStartPending = true;
    this.showPending();
  }

  private tutorialStartPending = false;

  continueGame(): void {
    const s = loadGame();
    if (!s) {
      toast(t('ui.noSave'), 'warn');
      return;
    }
    this.enter(s);
    if (s.ending) this.showEnding();
    else if (s.pending) this.showPending();
  }

  private enter(s: GameState): void {
    this.s = s;
    this.tool = null;
    this.hover = null;
    this.selected = null;
    this.title.hide();
    this.buildGame();
    this.game!.hidden = false;
    this.inGame = true;
    this.renderer!.resize();
    this.renderer!.setState(s);
    this.renderer!.setTool(null);
    this.renderer!.setSelected(null);
    this.renderer!.setHighlights(null);
    this.renderer!.centerOn(s.w * 10 + 11);
    this.renderer!.start();
    this.refresh();
  }

  private buildGame(): void {
    if (this.game) return;
    const ctx = () => this as UiCtx;
    this.hud = new Hud(ctx);
    this.palette = new Palette(ctx);
    this.side = new SidePanel(ctx);
    const canvas = h('canvas', { class: 'map-canvas', attrs: { id: 'map', 'aria-label': 'map' } });
    const toasts = h('div', { class: 'toasts', attrs: { id: 'toasts', 'aria-live': 'polite' } });
    this.tutorial = new Tutorial({
      renderer: () => this.renderer,
      state: () => (this.inGame ? this.s : null),
      paletteButton: (id) => this.palette?.button(id),
      section: (n) => this.side?.section(n),
      endButton: () => this.side?.endButton(),
      showTab: (n) => this.side?.showTab(n, true),
      finished: () => {
        this.settings.tutorialDone = true;
        saveSettings(this.settings);
      },
    });
    const mapWrap = h('div', { class: 'map-wrap' }, canvas, toasts, this.tutorial.el);
    this.game = h('div', { class: 'game', attrs: { id: 'game' } }, this.hud.el, h('main', { class: 'game-main' }, this.palette.el, mapWrap, this.side.el));
    this.root.insertBefore(this.game, this.root.firstChild);
    this.renderer = new Renderer(canvas);
    attachMapInput(canvas, this.renderer, {
      onTap: (i) => this.onTap(i),
      onHover: (i) => {
        if (i === this.hover) return;
        this.hover = i;
        this.renderer?.setHover(i);
        this.queueRefresh();
      },
    });
    canvas.addEventListener('mouseleave', () => {
      this.hover = null;
      this.renderer?.setHover(null);
      this.queueRefresh();
    });
    window.addEventListener('resize', () => this.renderer?.resize());
  }

  // ---------------------------------------------------------------- UiCtx

  queueRefresh(): void {
    if (this.refreshQueued) return;
    this.refreshQueued = true;
    requestAnimationFrame(() => {
      this.refreshQueued = false;
      if (this.inGame) this.refresh();
    });
  }

  refresh(): void {
    if (!this.inGame) return;
    this.renderer?.setState(this.s);
    this.hud?.update();
    this.palette?.update();
    this.side?.update();
    this.tutorial?.update();
  }

  setTool(tool: ToolId | null): void {
    if (tool === 'dike' && !this.s.dike.unlocked) {
      toast(t('why.dikeLocked'), 'warn');
      return;
    }
    this.tool = tool;
    this.renderer?.setTool(tool);
    if (tool) {
      this.side?.showTab('tile', false);
      sfx('click');
    }
    hideTip();
    this.refresh();
  }

  private onTap(i: number | null): void {
    if (!this.inGame || modalOpen()) return;
    if (i === null) {
      this.selected = null;
      this.renderer?.setSelected(null);
      this.refresh();
      return;
    }
    if (this.tool) {
      const chk = canUse(this.s, this.tool, i);
      if (!chk.ok) {
        sfx('error');
        toast(t(chk.reason ?? 'why.unknown'), 'warn');
        return;
      }
      const tool = this.tool;
      if (applyTool(this.s, tool, i)) {
        this.selected = i;
        this.renderer?.setSelected(i);
        this.renderer?.setState(this.s);
        this.renderer?.flash('build');
        sfx('build');
        if (tool === 'dike') {
          toast(t('ui.dikeStarted'), 'good');
          this.setTool(null);
        }
        saveGame(this.s);
      }
      this.refresh();
      return;
    }
    this.selected = this.selected === i ? null : i;
    this.renderer?.setSelected(this.selected);
    this.side?.showTab('tile', this.selected !== null);
    this.refresh();
  }

  endSeason(): void {
    if (!this.inGame || modalOpen()) return;
    if (this.s.ending) return this.showEnding();
    if (this.s.pending) return this.showPending();
    this.tool = null;
    this.renderer?.setTool(null);
    const rep = endSeason(this.s);
    if (!rep) return;
    if (this.s.ending) clearSave();
    else saveGame(this.s);
    sfx('end');
    this.refresh();
    if (rep.storm) {
      this.renderer?.flash('storm');
      sfx('storm');
    }
    if (rep.newWrecks > 0) this.renderer?.flash('wreck');
    reportCard(this.s, rep, () => {
      if (this.s.ending) this.showEnding();
      else if (this.s.pending) this.showPending();
    });
  }

  private showPending(): void {
    if (!this.s.pending) return;
    sfx('event');
    eventCard(
      this.s,
      (idx) => {
        const out = chooseEvent(this.s, idx);
        afterChoice(this.s);
        if (this.s.ending) clearSave();
        else saveGame(this.s);
        this.refresh();
        return out;
      },
      () => {
        this.refresh();
        if (this.s.ending) {
          this.showEnding();
          return;
        }
        if (this.tutorialStartPending) {
          this.tutorialStartPending = false;
          this.tutorial?.start(this.s);
        }
        this.tutorial?.update();
      },
    );
  }

  private showEnding(): void {
    this.tutorial?.stop();
    const good = this.s.ending === 'E1' || this.s.ending === 'E2';
    sfx(good ? 'ending' : 'bad');
    clearSave();
    this.saved = null;
    endingCard(
      this.s,
      () => newGameCard((d) => this.startNew(d)),
      () => this.showTitle(),
    );
  }

  buyFood(): void {
    if (buyFood(this.s)) {
      sfx('good');
      saveGame(this.s);
    } else sfx('error');
    this.refresh();
  }

  openHelp(): void {
    helpCard();
  }

  openSettings(): void {
    settingsCard({
      lang: () => getLang(),
      setLang: (l) => this.changeLang(l),
      sound: () => soundOn(),
      setSound: (on) => {
        setSound(on);
        this.settings.sound = on;
        saveSettings(this.settings);
        this.refresh();
      },
      inGame: this.inGame,
      toTitle: () => {
        if (this.inGame && !this.s.ending) saveGame(this.s);
        this.showTitle();
      },
      resetTutorial: () => {
        this.settings.tutorialDone = false;
        saveSettings(this.settings);
        if (this.inGame) this.tutorial?.start(this.s);
        toast(t('set.tutorialOn'), 'good');
      },
    });
  }

  toggleSound(): void {
    const on = !soundOn();
    setSound(on);
    this.settings.sound = on;
    saveSettings(this.settings);
    if (on) sfx('click');
    this.refresh();
  }

  soundOn(): boolean {
    return soundOn();
  }

  private changeLang(l: Lang): void {
    this.settings.lang = l;
    saveSettings(this.settings);
    setLang(l);
  }

  // ---------------------------------------------------------------- keyboard

  private onKey(e: KeyboardEvent): void {
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') && (target as HTMLInputElement).type !== 'range') return;
    if (modalOpen()) {
      if (e.key === 'Escape' && modalClosable()) {
        e.preventDefault();
        closeModal();
      }
      return;
    }
    if (!this.inGame) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (e.key === 'Escape') {
      e.preventDefault();
      if (this.tool) this.setTool(null);
      else {
        this.selected = null;
        this.renderer?.setSelected(null);
        this.refresh();
      }
      return;
    }
    if (e.key === 'Enter') {
      if (target && target.tagName === 'BUTTON') return;
      e.preventDefault();
      this.endSeason();
      return;
    }
    if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
      e.preventDefault();
      this.openHelp();
      return;
    }
    const tool = TOOLS.find((d) => d.key === k);
    if (tool) {
      e.preventDefault();
      this.setTool(this.tool === tool.id ? null : tool.id);
      return;
    }
    const r = this.renderer;
    if (!r) return;
    const step = 48;
    if (e.key === 'ArrowLeft') r.panBy(step, 0);
    else if (e.key === 'ArrowRight') r.panBy(-step, 0);
    else if (e.key === 'ArrowUp') r.panBy(0, step);
    else if (e.key === 'ArrowDown') r.panBy(0, -step);
    else if (e.key === '+' || e.key === '=') {
      const c = (document.getElementById('map') as HTMLCanvasElement).getBoundingClientRect();
      r.zoomAt(1, c.left + c.width / 2, c.top + c.height / 2);
    } else if (e.key === '-' || e.key === '_') {
      const c = (document.getElementById('map') as HTMLCanvasElement).getBoundingClientRect();
      r.zoomAt(-1, c.left + c.width / 2, c.top + c.height / 2);
    } else return;
    e.preventDefault();
  }
}
