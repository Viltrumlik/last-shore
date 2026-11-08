// HUD, build palette and the side panel (inspector, water, work, goals).
import { quotaFor } from '../content/events';
import { TOOLS } from '../content/buildings';
import { t } from '../i18n';
import { toolSprite } from '../render/renderer';
import {
  BAL,
  END_RULES,
  activeReeds,
  avgSoilSalinity,
  bayWaterTiles,
  canBuyFood,
  canUse,
  capacity,
  computeWater,
  connectedCanals,
  costOf,
  dikeReserve,
  dockActive,
  irrigationMask,
  isField,
  isWater,
  labourCap,
  labourFree,
  n4,
  nursery,
  rebalance,
  seasonOfYear,
  setFocus,
  setWater,
  tileKind,
  upstreamDiversion,
  waterDepth,
  workforce,
  workers,
  year,
  foodPrice,
  type GameState,
  type ToolId,
} from '../sim';
import { clear, fmt, h, signed } from './dom';
import { icon } from './icons';
import { hideTip, showTip } from './modal';

export interface UiCtx {
  s: GameState;
  tool: ToolId | null;
  hover: number | null;
  selected: number | null;
  setTool(tool: ToolId | null): void;
  refresh(): void;
  endSeason(): void;
  buyFood(): void;
  openHelp(): void;
  openSettings(): void;
  toggleSound(): void;
  soundOn(): boolean;
}

export function seasonLabel(season: number): string {
  const sc = Math.min(season, 39);
  return t('ui.seasonYear', { season: t(`season.${seasonOfYear(sc)}`), y: year(sc) });
}

// ================================================================== HUD

interface HudItem {
  el: HTMLElement;
  val: HTMLElement;
}

export class Hud {
  readonly el: HTMLElement;
  private items: Record<string, HudItem> = {};
  private seasonIco: HTMLImageElement;
  private seasonText: HTMLElement;
  private seasonProg: HTMLElement;
  private soundBtn: HTMLButtonElement;

  constructor(private ctx: () => UiCtx) {
    this.seasonIco = icon('season0');
    this.seasonText = h('span', { class: 'hud-season-text' });
    this.seasonProg = h('span', { class: 'hud-season-prog' });
    const season = h('div', { class: 'hud-season' }, this.seasonIco, h('div', null, this.seasonText, this.seasonProg));
    const list = h('div', { class: 'hud-items' });
    for (const k of ['pop', 'food', 'water', 'money', 'health', 'hope', 'sea', 'salt', 'labour', 'cotton']) {
      const val = h('span', { class: 'hud-val' });
      const el = h('div', { class: `hud-item hud-${k}`, attrs: { tabindex: '0' } }, icon(k), val);
      el.addEventListener('mouseenter', () => showTip(el, this.tipFor(k)));
      el.addEventListener('focus', () => showTip(el, this.tipFor(k)));
      el.addEventListener('mouseleave', hideTip);
      el.addEventListener('blur', hideTip);
      el.addEventListener('click', () => showTip(el, this.tipFor(k)));
      this.items[k] = { el, val };
      list.append(el);
    }
    this.soundBtn = h('button', { class: 'icon-btn', attrs: { 'aria-label': 'sound' }, on: { click: () => this.ctx().toggleSound() } });
    const buttons = h(
      'div',
      { class: 'hud-buttons' },
      this.soundBtn,
      h('button', { class: 'icon-btn', attrs: { 'aria-label': 'help' }, on: { click: () => this.ctx().openHelp() } }, icon('help')),
      h('button', { class: 'icon-btn', attrs: { 'aria-label': 'settings' }, on: { click: () => this.ctx().openSettings() } }, icon('gear')),
    );
    this.el = h('header', { class: 'hud', attrs: { id: 'hud' } }, season, list, buttons);
  }

  private tipFor(k: string): HTMLElement {
    const s = this.ctx().s;
    const box = h('div', { class: 'tip' }, h('div', { class: 'tip-title', text: t(`hud.${k}`) }), h('div', { class: 'tip-body', text: t(`hud.${k}.tip`) }));
    if (k === 'cotton') box.append(h('div', { class: 'tip-body', text: t('hud.cotton.next', { q: quotaFor(s), fails: s.quota.failures }) }));
    if (k === 'water') box.append(h('div', { class: 'tip-body', text: t('hud.water.up', { p: Math.round(upstreamDiversion(s) * 100) }) }));
    return box;
  }

  update(): void {
    const c = this.ctx();
    const s = c.s;
    const r = s.res;
    this.seasonIco.src = icon(`season${seasonOfYear(Math.min(s.season, 39))}`).src;
    this.seasonText.textContent = seasonLabel(s.season);
    this.seasonProg.textContent = `${Math.min(s.season + 1, 40)}/40`;
    const w = computeWater(s);
    const set = (k: string, v: string, warn = false) => {
      this.items[k]!.val.textContent = v;
      this.items[k]!.el.classList.toggle('warn', warn);
    };
    set('pop', `${r.pop}/${capacity(s)}`, r.pop < 30 || r.pop > capacity(s));
    set('food', fmt(r.food), r.food < r.pop);
    set('water', fmt(w.flow), w.fieldsSat < 0.7 || w.townSat < 1);
    set('money', fmt(r.money), r.money < 30);
    set('health', fmt(r.health), r.health < 40);
    set('hope', fmt(r.hope), r.hope < 40);
    set('sea', `${s.seaLevel.toFixed(1)}m`, s.seaLevel < -3);
    set('salt', fmt(avgSoilSalinity(s)), avgSoilSalinity(s) >= END_RULES.e2Salinity);
    set('labour', `${Math.max(0, labourFree(s))}/${labourCap(s)}`, labourFree(s) <= 0);
    set('cotton', `${r.cotton}/${quotaFor(s)}`, s.quota.failures >= 2);
    clear(this.soundBtn);
    this.soundBtn.append(icon(c.soundOn() ? 'sound' : 'mute'));
  }
}

// ================================================================== build palette

export class Palette {
  readonly el: HTMLElement;
  private buttons = new Map<ToolId, HTMLButtonElement>();

  constructor(private ctx: () => UiCtx) {
    this.el = h('nav', { class: 'palette', attrs: { id: 'palette', 'aria-label': 'build' } });
    for (const def of TOOLS) {
      const sp = toolSprite(def.id, 1);
      const cv = h('canvas', { class: 'tool-icon' });
      if (sp) {
        cv.width = sp.w;
        cv.height = sp.h;
        cv.getContext('2d')!.drawImage(sp.canvas, 0, 0);
      }
      const name = h('span', { class: 'tool-name' });
      const cost = h('span', { class: 'tool-cost' });
      const btn = h(
        'button',
        { class: 'tool', data: { tool: def.id }, on: { click: () => this.pick(def.id) } },
        cv,
        h('span', { class: 'tool-text' }, name, cost),
        h('kbd', { class: 'tool-key', text: def.key.toUpperCase() }),
      );
      btn.addEventListener('mouseenter', () => showTip(btn, toolTip(this.ctx().s, def.id)));
      btn.addEventListener('mouseleave', hideTip);
      btn.addEventListener('blur', hideTip);
      this.buttons.set(def.id, btn);
      this.el.append(btn);
    }
  }

  private pick(id: ToolId): void {
    const c = this.ctx();
    c.setTool(c.tool === id ? null : id);
  }

  update(): void {
    const c = this.ctx();
    const s = c.s;
    for (const [id, btn] of this.buttons) {
      const cost = costOf(s, id);
      (btn.querySelector('.tool-name') as HTMLElement).textContent = t(`b.${id}.name`);
      const costEl = btn.querySelector('.tool-cost') as HTMLElement;
      const key = `${cost.money}|${cost.labour}`;
      if (costEl.dataset.key !== key) {
        costEl.dataset.key = key;
        costEl.replaceChildren();
        if (id !== 'demolish') costEl.append(icon('money'), id === 'dike' ? `${cost.money}×4` : String(cost.money));
        costEl.append(icon('labour'), String(cost.labour));
      }
      const locked = id === 'dike' && (!s.dike.unlocked || s.dike.started);
      const poor = s.res.money < cost.money || (id === 'dike' ? labourCap(s) - s.labourUsed < cost.labour : labourFree(s) < cost.labour);
      btn.classList.toggle('active', c.tool === id);
      btn.classList.toggle('locked', locked);
      btn.classList.toggle('poor', !locked && poor);
      btn.hidden = id === 'dike' && !s.dike.unlocked;
    }
  }

  button(id: ToolId): HTMLButtonElement | undefined {
    return this.buttons.get(id);
  }
}

export function toolTip(s: GameState, id: ToolId): HTMLElement {
  const cost = costOf(s, id);
  const costLine =
    id === 'dike'
      ? t('tool.costDike', { m: cost.money, l: cost.labour })
      : id === 'demolish'
        ? t('tool.costLabour', { l: cost.labour })
        : t('tool.cost', { m: cost.money, l: cost.labour });
  return h(
    'div',
    { class: 'tip' },
    h('div', { class: 'tip-title', text: t(`b.${id}.name`) }),
    h('div', { class: 'tip-cost', text: costLine }),
    h('div', { class: 'tip-body', text: t(`b.${id}.effect`) }),
    h('div', { class: 'tip-rule', text: t(`b.${id}.rule`) }),
    id === 'dike' && !s.dike.unlocked ? h('div', { class: 'tip-warn', text: t('why.dikeLocked') }) : null,
  );
}

// ================================================================== side panel

function row(label: string, value: string | HTMLElement, cls = ''): HTMLElement {
  return h('div', { class: `kv ${cls}` }, h('span', { class: 'k', text: label }), typeof value === 'string' ? h('span', { class: 'v', text: value }) : value);
}

function bar(v: number, max: number, cls: string): HTMLElement {
  const pct = Math.max(0, Math.min(100, (v / max) * 100));
  const fill = h('span', { class: `bar-fill ${cls}` });
  fill.style.width = `${pct}%`;
  return h('span', { class: 'bar' }, fill);
}

function salClass(sal: number): string {
  return sal >= 60 ? 'bad' : sal >= 40 ? 'mid' : 'good';
}

/** A three-way linked slider group that always sums to 100. */
class TriSlider {
  readonly el: HTMLElement;
  private inputs: Record<string, HTMLInputElement> = {};
  private vals: Record<string, HTMLElement> = {};
  private notes: Record<string, HTMLElement> = {};
  private dragging = false;

  constructor(
    private keys: [string, string, string],
    private icons: [string, string, string],
    private labelKey: (k: string) => string,
    private get: () => Record<string, number>,
    private set: (v: Record<string, number>) => void,
  ) {
    this.el = h('div', { class: 'tri' });
    keys.forEach((k, n) => {
      const input = h('input', { attrs: { type: 'range', min: '0', max: '100', step: '1', 'aria-label': k } });
      input.addEventListener('input', () => {
        this.dragging = true;
        const next = rebalance(this.get(), k, Number(input.value));
        this.set(next);
      });
      input.addEventListener('change', () => {
        this.dragging = false;
      });
      const val = h('span', { class: 'tri-val' });
      const note = h('div', { class: 'tri-note' });
      const label = h('span', { class: 'tri-label' });
      label.dataset.key = k;
      this.inputs[k] = input;
      this.vals[k] = val;
      this.notes[k] = note;
      this.el.append(h('div', { class: 'tri-row' }, h('div', { class: 'tri-head' }, icon(this.icons[n]!), label, val), input, note));
    });
  }

  update(notes: Record<string, { text: string; warn?: boolean }>): void {
    const v = this.get();
    for (const k of this.keys) {
      const input = this.inputs[k]!;
      if (document.activeElement !== input || !this.dragging) input.value = String(v[k]);
      input.style.setProperty('--pct', `${v[k]}%`);
      this.vals[k]!.textContent = `${v[k]}%`;
      (this.el.querySelector(`.tri-label[data-key="${k}"]`) as HTMLElement).textContent = t(this.labelKey(k));
      const n = notes[k];
      this.notes[k]!.textContent = n?.text ?? '';
      this.notes[k]!.classList.toggle('warn', !!n?.warn);
    }
  }
}

export class SidePanel {
  readonly el: HTMLElement;
  private sections: Record<string, HTMLElement> = {};
  private bodies: Record<string, HTMLElement> = {};
  private titles: Record<string, HTMLElement> = {};
  private tabButtons: Record<string, HTMLButtonElement> = {};
  private water: TriSlider;
  private work: TriSlider;
  private waterInfo = h('div', { class: 'panel-info' });
  private workInfo = h('div', { class: 'panel-info' });
  private market: HTMLButtonElement;
  private marketNote = h('div', { class: 'tri-note' });
  private endBtn: HTMLButtonElement;
  private sheetToggle: HTMLButtonElement;
  activeTab = 'tile';

  constructor(private ctx: () => UiCtx) {
    const tabs = h('div', { class: 'tabs', attrs: { role: 'tablist' } });
    for (const k of ['tile', 'water', 'work', 'goals']) {
      const b = h('button', { class: 'tab', attrs: { role: 'tab' }, on: { click: () => this.showTab(k, true) } });
      this.tabButtons[k] = b;
      tabs.append(b);
    }
    this.sheetToggle = h('button', { class: 'sheet-toggle', attrs: { 'aria-label': 'toggle panel' }, on: { click: () => this.el.classList.toggle('collapsed') } });
    tabs.append(this.sheetToggle);

    this.water = new TriSlider(
      ['fields', 'reeds', 'town'],
      ['food', 'reeds', 'pop'],
      (k) => `water.${k}`,
      () => ({ ...this.ctx().s.water }),
      (v) => {
        const s = this.ctx().s;
        setWater(s, v.fields!, v.reeds!, v.town!);
        this.ctx().refresh();
      },
    );
    this.work = new TriSlider(
      ['fishing', 'farming', 'building'],
      ['fish', 'food', 'labour'],
      (k) => `work.${k}`,
      () => ({ ...this.ctx().s.focus }),
      (v) => {
        const s = this.ctx().s;
        setFocus(s, v.fishing!, v.farming!, v.building!);
        this.ctx().refresh();
      },
    );
    this.market = h('button', { class: 'btn btn-small', on: { click: () => this.ctx().buyFood() } });

    const scroll = h('div', { class: 'panel-scroll' });
    for (const k of ['tile', 'water', 'work', 'goals']) {
      const title = h('h3', { class: 'section-title' });
      const body = h('div', { class: 'section-body' });
      const sec = h('section', { class: `section section-${k}`, data: { tab: k } }, title, body);
      this.sections[k] = sec;
      this.bodies[k] = body;
      this.titles[k] = title;
      scroll.append(sec);
    }
    this.bodies.water!.append(this.waterInfo, this.water.el);
    this.bodies.work!.append(this.workInfo, this.work.el, h('div', { class: 'market' }, this.market, this.marketNote));

    this.endBtn = h('button', { class: 'btn btn-end', attrs: { id: 'end-season' }, on: { click: () => this.ctx().endSeason() } });
    this.el = h('aside', { class: 'side', attrs: { id: 'side' } }, tabs, scroll, h('div', { class: 'end-wrap' }, this.endBtn));
    this.showTab('tile', false);
  }

  showTab(k: string, user: boolean): void {
    this.activeTab = k;
    this.el.dataset.tab = k;
    for (const [key, b] of Object.entries(this.tabButtons)) b.classList.toggle('active', key === k);
    if (user) this.el.classList.remove('collapsed');
  }

  section(k: string): HTMLElement {
    return this.sections[k]!;
  }

  endButton(): HTMLButtonElement {
    return this.endBtn;
  }

  update(): void {
    const c = this.ctx();
    const s = c.s;
    for (const k of ['tile', 'water', 'work', 'goals']) {
      this.titles[k]!.textContent = t(`panel.${k}`);
      this.tabButtons[k]!.textContent = t(`panel.${k}`);
    }
    this.sheetToggle.textContent = this.el.classList.contains('collapsed') ? '▴' : '▾';
    this.endBtn.textContent = s.ending ? t('ui.seeEnding') : t('ui.endSeason');
    this.endBtn.title = t('ui.endSeason.tip');
    this.updateInspector();
    this.updateWater();
    this.updateWork();
    this.updateGoals();
  }

  // ---------------------------------------------------------------- inspector

  private updateInspector(): void {
    const c = this.ctx();
    const s = c.s;
    const body = this.bodies.tile!;
    clear(body);
    if (c.tool) {
      body.append(toolTip(s, c.tool));
      const i = c.hover ?? c.selected;
      if (i !== null) {
        const chk = canUse(s, c.tool, i);
        body.append(h('div', { class: chk.ok ? 'ok-line' : 'warn-line' }, icon(chk.ok ? 'ok' : 'no'), h('span', { text: chk.ok ? t('tool.canPlace') : t(chk.reason ?? 'why.unknown') })));
      } else {
        body.append(h('div', { class: 'hint', text: t('tool.pickTile') }));
      }
      body.append(h('div', { class: 'hint', text: t('tool.cancelHint') }));
      return;
    }
    const i = c.selected ?? c.hover;
    if (i === null) {
      body.append(h('div', { class: 'hint', text: t('inspect.hint') }));
      return;
    }
    body.append(...inspectTile(s, i));
  }

  // ---------------------------------------------------------------- water

  private updateWater(): void {
    const s = this.ctx().s;
    const w = computeWater(s);
    clear(this.waterInfo);
    this.waterInfo.append(
      row(t('water.flow'), t('water.units', { n: fmt(w.flow) })),
      row(t('water.upstream'), `${Math.round(upstreamDiversion(s) * 100)}%`),
    );
    const fieldsAlloc = (w.flow * s.water.fields) / 100;
    const reedsAlloc = (w.flow * s.water.reeds) / 100;
    const townAlloc = (w.flow * s.water.town) / 100;
    const rest = Math.max(0, reedsAlloc - w.reedsDemand);
    this.water.update({
      fields: {
        text: t('water.fieldsNote', { a: fmt(fieldsAlloc), n: fmt(w.fieldsDemand + s.leachWater), p: Math.round(w.fieldsSat * 100) }),
        warn: w.fieldsSat < 0.999,
      },
      reeds: {
        text: s.dike.complete
          ? t('water.reedsNoteBay', { a: fmt(reedsAlloc), n: fmt(w.reedsDemand), b: fmt(rest) })
          : t('water.reedsNote', { a: fmt(reedsAlloc), n: fmt(w.reedsDemand), b: fmt(rest) }),
        warn: w.reedsSat < 0.999,
      },
      town: { text: t('water.townNote', { a: fmt(townAlloc), n: fmt(w.townDemand), p: Math.round(w.townSat * 100) }), warn: w.townSat < 0.999 },
    });
    this.waterInfo.append(
      row(s.dike.complete ? t('water.toBay') : t('water.toSea'), fmt(s.dike.complete ? w.toBay : w.toSea), 'accent'),
      h('div', { class: 'hint', text: s.dike.complete ? t('water.hintBay') : t('water.hint') }),
    );
  }

  // ---------------------------------------------------------------- work

  private updateWork(): void {
    const s = this.ctx().s;
    const wf = workforce(s);
    const docks = countActiveDocks(s);
    let fields = 0;
    for (const tl of s.tiles) if (tl.b && isField(tl.b.id)) fields++;
    clear(this.workInfo);
    this.workInfo.append(row(t('work.workers'), t('work.workersOf', { w: workers(s), p: s.res.pop })));
    this.work.update({
      fishing: { text: t('work.fishNote', { n: fmt(wf.fishers), need: docks * BAL.dockCrew }), warn: wf.fishers < docks * BAL.dockCrew - 0.5 },
      farming: { text: t('work.farmNote', { n: fmt(wf.farmers), need: fields * BAL.fieldCrew }), warn: wf.farmers < fields * BAL.fieldCrew - 0.5 },
      building: {
        text: dikeReserve(s) > 0 ? t('work.buildNoteDike', { free: Math.max(0, labourFree(s)), cap: labourCap(s), d: dikeReserve(s) }) : t('work.buildNote', { free: Math.max(0, labourFree(s)), cap: labourCap(s) }),
        warn: labourFree(s) <= 0,
      },
    });
    const chk = canBuyFood(s);
    this.market.textContent = t('market.buy', { f: BAL.marketFood, m: foodPrice(s) });
    this.market.disabled = !chk.ok;
    this.marketNote.textContent = chk.ok ? t('market.note') : t(chk.reason ?? 'why.unknown');
  }

  // ---------------------------------------------------------------- goals

  private updateGoals(): void {
    const s = this.ctx().s;
    const body = this.bodies.goals!;
    clear(body);
    const check = (ok: boolean, text: string) => h('div', { class: `goal ${ok ? 'met' : ''}` }, icon(ok ? 'ok' : 'no'), h('span', { text }));
    const sal = avgSoilSalinity(s);
    const bay = bayWaterTiles(s);
    body.append(
      h('div', { class: 'goal-head', text: t('end.E1.title') }),
      check(s.dike.complete, t('goal.dike', { p: s.dike.progress })),
      check(bay >= END_RULES.e1BayTiles, t('goal.bay', { n: bay, need: END_RULES.e1BayTiles })),
      check(s.res.pop >= END_RULES.e1Pop, t('goal.pop', { n: s.res.pop, need: END_RULES.e1Pop })),
      check(s.res.health >= END_RULES.e1Health, t('goal.health', { n: Math.round(s.res.health), need: END_RULES.e1Health })),
      h('div', { class: 'goal-head', text: t('end.E2.title') }),
      check(activeReeds(s) >= END_RULES.e2Reeds, t('goal.reeds', { n: activeReeds(s), need: END_RULES.e2Reeds })),
      check(s.res.pop >= END_RULES.e2Pop, t('goal.pop', { n: s.res.pop, need: END_RULES.e2Pop })),
      check(sal < END_RULES.e2Salinity, t('goal.salt', { n: fmt(sal), need: END_RULES.e2Salinity })),
      h('div', { class: 'goal-head danger', text: t('goal.dangers') }),
      danger(s.quota.failures >= 2, t('goal.quota', { n: s.quota.failures, max: END_RULES.removedAfter, q: quotaFor(s), have: s.res.cotton })),
      danger(s.famineStreak >= 1, t('goal.famine', { n: s.famineStreak, max: END_RULES.famineSeasons })),
      danger(s.res.hope < 30, t('goal.hope', { n: Math.round(s.res.hope) })),
      danger(s.res.pop < 35, t('goal.popMin', { n: s.res.pop, min: END_RULES.exodusPop })),
      h('div', { class: 'hint', text: t('goal.hint') }),
    );
  }
}

function danger(on: boolean, text: string): HTMLElement {
  return h('div', { class: `goal ${on ? 'alarm' : ''}` }, icon(on ? 'danger' : 'ok'), h('span', { text }));
}

function countActiveDocks(s: GameState): number {
  let n = 0;
  for (let i = 0; i < s.tiles.length; i++) {
    const b = s.tiles[i]!.b;
    if (b && b.id === 'dock' && dockActive(s, i)) n++;
  }
  return n;
}

/** Inspector lines for a tile. */
export function inspectTile(s: GameState, i: number): HTMLElement[] {
  const tl = s.tiles[i]!;
  const kind = tileKind(s, i);
  const out: HTMLElement[] = [];
  const x = i % s.w;
  const y = Math.floor(i / s.w);
  const title = tl.b ? t(`b.${tl.b.id}.name`) : t(`tile.${kind}`);
  out.push(h('div', { class: 'insp-title' }, h('span', { text: title }), h('span', { class: 'insp-xy', text: `${x},${y}` })));
  if (tl.b) out.push(h('div', { class: 'insp-sub', text: t(`tile.${kind}`) + (tl.bay ? ` · ${t('tile.bay')}` : '') }));
  else if (tl.bay) out.push(h('div', { class: 'insp-sub', text: t('tile.bay') }));
  if (tl.dikeLine) out.push(h('div', { class: 'insp-sub accent', text: t('tile.dikeLine') }));

  if (tl.terrain === 'sea') {
    const d = waterDepth(s, i);
    out.push(d > 0 ? row(t('insp.depth'), `${d.toFixed(1)} m`) : row(t('insp.floor'), `${tl.elev.toFixed(1)} m`));
  } else if (tl.terrain !== 'river') {
    out.push(row(t('insp.height'), `+${tl.elev.toFixed(1)} m`));
  }
  if (!(tl.terrain === 'sea' && isWater(s, i)) && tl.terrain !== 'river') {
    out.push(h('div', { class: 'kv' }, h('span', { class: 'k', text: t('insp.salinity') }), h('span', { class: 'v' }, bar(tl.sal, 100, salClass(tl.sal)), ` ${Math.round(tl.sal)}`)));
    if (tl.dust > 0.05) out.push(row(t('insp.dust'), `+${tl.dust.toFixed(1)}`, 'warn'));
  }
  const b = tl.b;
  if (b) {
    out.push(h('div', { class: 'insp-effect', text: t(`b.${b.id}.effect`) }));
    const lines: string[] = [];
    switch (b.id) {
      case 'dock': {
        if (!dockActive(s, i)) lines.push(t('insp.dockDry'));
        else {
          let maxD = 0;
          for (const n of n4(s, i)) maxD = Math.max(maxD, waterDepth(s, n));
          lines.push(t('insp.dockDepth', { d: maxD.toFixed(1) }));
          if (maxD < 0.35) lines.push(t('insp.dockSoon'));
          const nb = nursery(s, i);
          if (nb > 0) lines.push(t('insp.nursery', { p: Math.round(nb * 100) }));
        }
        break;
      }
      case 'wheat':
      case 'melon':
      case 'cotton': {
        const irr = irrigationMask(s)[i];
        lines.push(irr ? t('insp.irrigated') : t('insp.dry'));
        const sal = tl.sal;
        const pen = b.id === 'cotton' ? Math.max(0, sal - 60) / 70 : b.id === 'melon' ? Math.max(0, sal - 25) / 55 : Math.max(0, sal - 35) / 75;
        if (pen > 0.02) lines.push(t('insp.saltLoss', { p: Math.min(95, Math.round(pen * 100)) }));
        break;
      }
      case 'reeds':
        lines.push(isWater(s, i) ? t('insp.reedsWet') : t('insp.reedsNeed'));
        if (b.dry > 0) lines.push(t('insp.reedsDry', { n: b.dry }));
        break;
      case 'saxaul':
        lines.push(b.age >= 2 ? t('insp.saxaulGrown') : t('insp.saxaulYoung'));
        break;
      case 'canal':
        lines.push(connectedCanals(s)[i] ? t('insp.canalOk') : t('insp.canalCut'));
        break;
      case 'dike':
        lines.push(s.dike.complete ? t('insp.dikeDone', { n: bayWaterTiles(s) }) : t('insp.dikeProgress', { p: s.dike.progress }));
        break;
      case 'wreck':
        if ((s.flags.museum ?? 0) > 0) lines.push(t('insp.museum'));
        break;
      case 'house':
        lines.push(t('insp.capacity', { n: capacity(s), p: s.res.pop }));
        break;
      default:
        break;
    }
    for (const l of lines) out.push(h('div', { class: 'insp-line', text: l }));
  } else if (tl.prop && kind === 'seabed') {
    out.push(h('div', { class: 'insp-line', text: t(`insp.prop${tl.prop}`) }));
  }
  return out;
}

export { signed };
