// First-seasons tutorial voiced by Ermek-ota and Dilnoza: speech bubble + highlights.
import { t } from '../i18n';
import { drawPortrait, type Renderer } from '../render';
import { buildingTiles, canUse, countBuildings, type AdvisorId, type GameState, type ToolId } from '../sim';
import { h } from './dom';

interface Step {
  id: string;
  who: AdvisorId;
  /** wait for this to become true (otherwise a Next button is shown) */
  until?: (s: GameState) => boolean;
  /** only start when this holds */
  when?: (s: GameState) => boolean;
  tool?: ToolId;
  tiles?: (s: GameState) => number[];
  el?: () => HTMLElement | null | undefined;
}

export interface TutorialHost {
  renderer(): Renderer | null;
  state(): GameState | null;
  paletteButton(id: ToolId): HTMLElement | undefined;
  section(name: string): HTMLElement | undefined;
  endButton(): HTMLElement | undefined;
  showTab(name: string): void;
  finished(): void;
}

export class Tutorial {
  readonly el: HTMLElement;
  private steps: Step[];
  private idx = -1;
  private active = false;
  private base = { house: 0, dock: 0, wheat: 0 };
  private lit: HTMLElement | null = null;

  constructor(private host: TutorialHost) {
    this.el = h('div', { class: 'tutorial', attrs: { id: 'tutorial', role: 'status', 'aria-live': 'polite' } });
    this.el.hidden = true;
    const freeFor = (tool: ToolId) => (s: GameState) => {
      const out: number[] = [];
      for (let i = 0; i < s.tiles.length && out.length < 6; i++) if (canUse(s, tool, i).ok) out.push(i);
      return out;
    };
    this.steps = [
      { id: 'welcome', who: 'ermek', tiles: (s) => buildingTiles(s, 'dock') },
      { id: 'house', who: 'dilnoza', tool: 'house', until: (s) => countBuildings(s, 'house') > this.base.house },
      { id: 'dock', who: 'ermek', tool: 'dock', tiles: freeFor('dock'), until: (s) => countBuildings(s, 'dock') > this.base.dock },
      { id: 'field', who: 'dilnoza', tool: 'wheat', tiles: freeFor('wheat'), until: (s) => countBuildings(s, 'wheat') > this.base.wheat },
      { id: 'water', who: 'dilnoza', el: () => this.host.section('water') },
      { id: 'work', who: 'ermek', el: () => this.host.section('work') },
      { id: 'end', who: 'ermek', el: () => this.host.endButton(), until: (s) => s.season >= 1 },
      { id: 'sea', who: 'dilnoza', when: (s) => s.season >= 1 && !s.pending, el: () => document.getElementById('hud') },
      { id: 'quota', who: 'ermek', when: (s) => s.season >= 1 && !s.pending, tool: 'cotton' },
      { id: 'done', who: 'dilnoza', when: (s) => s.season >= 1 && !s.pending },
    ];
  }

  start(s: GameState): void {
    this.active = true;
    this.shownKey = '';
    this.base = { house: countBuildings(s, 'house'), dock: countBuildings(s, 'dock'), wheat: countBuildings(s, 'wheat') };
    this.idx = 0;
    this.render();
  }

  stop(): void {
    this.active = false;
    this.el.hidden = true;
    this.clearHighlight();
  }

  isActive(): boolean {
    return this.active;
  }

  private shownKey = '';

  /** Called after every state change; re-renders only when the step or its visibility changes. */
  update(): void {
    if (!this.active) return;
    const s = this.host.state();
    if (!s) return;
    const step = this.steps[this.idx];
    if (!step) return this.finish();
    if (step.until && step.until(s)) {
      this.next();
      return;
    }
    const key = `${this.idx}|${!step.when || step.when(s)}`;
    if (key !== this.shownKey) this.render();
  }

  private next(): void {
    this.idx++;
    if (this.idx >= this.steps.length) return this.finish();
    this.render();
  }

  private finish(): void {
    this.stop();
    this.host.finished();
  }

  private clearHighlight(): void {
    this.lit?.classList.remove('tut-glow');
    this.lit = null;
    this.host.renderer()?.setHighlights(null);
  }

  render(): void {
    const s = this.host.state();
    const step = this.steps[this.idx];
    if (!this.active || !s || !step) return;
    this.shownKey = `${this.idx}|${!step.when || step.when(s)}`;
    if (step.when && !step.when(s)) {
      this.el.hidden = true;
      this.clearHighlight();
      return;
    }
    this.el.hidden = false;
    this.clearHighlight();
    let target: HTMLElement | null | undefined = null;
    if (step.tool) target = this.host.paletteButton(step.tool);
    if (step.el) target = step.el();
    if (step.id === 'water') this.host.showTab('water');
    if (step.id === 'work') this.host.showTab('work');
    if (target) {
      target.classList.add('tut-glow');
      this.lit = target;
    }
    if (step.tiles) this.host.renderer()?.setHighlights(step.tiles(s));
    const portrait = h('canvas', { class: 'tut-portrait' });
    drawPortrait(portrait, step.who, 2);
    const actions = h('div', { class: 'tut-actions' });
    if (!step.until) actions.append(h('button', { class: 'btn btn-small btn-primary', text: this.idx === this.steps.length - 1 ? t('tut.finish') : t('tut.next'), on: { click: () => this.next() } }));
    actions.append(h('button', { class: 'btn btn-small', text: t('tut.skip'), on: { click: () => this.finish() } }));
    this.el.replaceChildren(
      portrait,
      h(
        'div',
        { class: 'tut-text' },
        h('div', { class: 'tut-who', text: t(`adv.${step.who}`) }),
        h('p', { text: t(`tut.${step.id}`) }),
        actions,
      ),
    );
  }
}
