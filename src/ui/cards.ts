// Modal cards: season report, event card, ending screen, help, settings, new game.
import { endingDef } from '../content/endings';
import { getLang, has, LANGS, t, type Lang } from '../i18n';
import { drawEnding, drawPortrait } from '../render';
import {
  choiceAvailable,
  eventDef,
  resolveDelta,
  type Difficulty,
  type GameState,
  type Outcome,
  type SeasonReport,
} from '../sim';
import type { Delta } from '../sim/effects';
import { fmt, h, signed } from './dom';
import { icon } from './icons';
import { closeModal, openModal } from './modal';
import { seasonLabel } from './panels';

// ---------------------------------------------------------------- season report

interface DeltaRow {
  key: string;
  ico: string;
  before: number;
  after: number;
  digits?: number;
  /** true if an increase is good */
  upGood: boolean;
  unit?: string;
}

function deltaCell(r: DeltaRow): HTMLElement {
  const d = r.after - r.before;
  const eps = r.digits ? 0.005 : 0.5;
  let cls = 'flat';
  let arrow = '•';
  if (d > eps) {
    arrow = '▲';
    cls = r.upGood ? 'up-good' : 'up-bad';
  } else if (d < -eps) {
    arrow = '▼';
    cls = r.upGood ? 'down-bad' : 'down-good';
  }
  return h(
    'div',
    { class: 'rep-row' },
    icon(r.ico),
    h('span', { class: 'rep-label', text: t(r.key) }),
    h('span', { class: 'rep-val', text: `${fmt(r.after, r.digits ?? 0)}${r.unit ?? ''}` }),
    h('span', { class: `rep-delta ${cls}` }, h('span', { class: 'arrow', text: arrow }), ` ${signed(d, r.digits ?? 0)}`),
  );
}

export function reportCard(s: GameState, rep: SeasonReport, onNext: () => void): void {
  const b = rep.before;
  const a = rep.after;
  const rows: DeltaRow[] = [
    { key: 'hud.pop', ico: 'pop', before: b.pop, after: a.pop, upGood: true },
    { key: 'hud.food', ico: 'food', before: b.food, after: a.food, upGood: true },
    { key: 'hud.money', ico: 'money', before: b.money, after: a.money, upGood: true },
    { key: 'hud.health', ico: 'health', before: b.health, after: a.health, upGood: true },
    { key: 'hud.hope', ico: 'hope', before: b.hope, after: a.hope, upGood: true },
    { key: 'hud.sea', ico: 'sea', before: b.seaLevel, after: a.seaLevel, digits: 2, upGood: true, unit: ' m' },
    { key: 'hud.salt', ico: 'salt', before: b.salinity, after: a.salinity, digits: 1, upGood: false },
    { key: 'rep.reeds', ico: 'reeds', before: b.reedBeds, after: a.reedBeds, upGood: true },
  ];
  if (s.dike.complete) rows.push({ key: 'rep.bay', ico: 'dike', before: b.bayWater, after: a.bayWater, upGood: true });

  const prod = h(
    'div',
    { class: 'rep-prod' },
    line('rep.fish', rep.fish),
    line('rep.grain', rep.grain),
    rep.cottonHarvest > 0 ? line('rep.cotton', rep.cottonHarvest) : null,
    line('rep.income', rep.income),
    rep.expenses > 0 ? line('rep.expenses', -rep.expenses) : null,
    line('rep.births', rep.births),
    rep.deaths > 0 ? line('rep.deaths', -rep.deaths) : null,
    rep.left > 0 ? line('rep.left', -rep.left) : null,
  );
  const w = rep.water;
  const water = h(
    'div',
    { class: 'rep-water' },
    t('rep.water', {
      flow: fmt(w.flow),
      f: Math.round(w.fieldsSat * 100),
      r: Math.round(w.reedsSat * 100),
      tw: Math.round(w.townSat * 100),
      sea: fmt(w.toSea),
    }),
    w.toBay > 0 ? ` ${t('rep.waterBay', { bay: fmt(w.toBay) })}` : '',
  );
  const notes = h('ul', { class: 'rep-notes' });
  for (const n of rep.notes) notes.append(h('li', { class: noteClass(n.key), text: t(n.key, n.params) }));
  if (rep.dustOnTown > 0.5) notes.append(h('li', { class: 'bad', text: t('rep.dust', { d: fmt(rep.dustOnTown, 1) }) }));

  const box = h(
    'div',
    { class: 'card report' },
    h('h2', { class: 'card-title', text: t('rep.title', { season: seasonLabel(rep.season) }) }),
    h('div', { class: 'rep-grid' }, ...rows.map(deltaCell)),
    prod,
    water,
    notes.childElementCount ? notes : null,
    h('div', { class: 'card-actions' }, h('button', { class: 'btn btn-primary', text: t('ui.continue'), on: { click: () => closeModal() } })),
  );
  openModal(box, { closable: true, onClose: onNext });
}

function noteClass(key: string): string {
  if (key === 'note.dikeDone' || key === 'note.restored') return 'good';
  if (key === 'note.storm' || key === 'note.hunger' || key === 'note.wrecks' || key === 'note.reedsDied' || key === 'note.upkeepUnpaid' || key === 'note.dikeStalled') return 'bad';
  return '';
}

function line(key: string, v: number): HTMLElement {
  return h('div', { class: 'rep-line' }, h('span', { text: t(key) }), h('span', { class: v < 0 ? 'neg' : v > 0 ? 'pos' : '', text: signed(v) }));
}

// ---------------------------------------------------------------- event card

const CHIP_ICON: Record<string, string> = {
  money: 'money',
  food: 'food',
  hope: 'hope',
  health: 'health',
  pop: 'pop',
  reedMat: 'reeds',
  cotton: 'cotton',
};

function chips(cost: Delta, fx: Delta, risky: boolean): HTMLElement {
  const wrap = h('span', { class: 'chips' });
  for (const [k, v] of Object.entries(cost)) {
    if (!v) continue;
    wrap.append(h('span', { class: 'chip neg' }, icon(CHIP_ICON[k] ?? 'tile'), signed(-v)));
  }
  for (const [k, v] of Object.entries(fx)) {
    if (!v) continue;
    const good = k === 'pop' ? v > 0 : v > 0;
    wrap.append(h('span', { class: `chip ${good ? 'pos' : 'neg'}` }, icon(CHIP_ICON[k] ?? 'tile'), signed(v)));
  }
  if (risky) wrap.append(h('span', { class: 'chip risky', text: '?' }));
  return wrap;
}

/** Outcome keys that are proper result texts (not just the choice label). */
export function isResultText(o: Outcome | null): boolean {
  if (!o) return false;
  return /\.(done|win|lose|warn|hit|spared)$/.test(o.key) && has(o.key);
}

export function eventCard(s: GameState, onChoose: (index: number) => Outcome | null, onDone: () => void): void {
  const p = s.pending;
  if (!p) return;
  const e = eventDef(p.id);
  const portrait = h('canvas', { class: 'portrait' });
  drawPortrait(portrait, e.advisor, 3);
  const choices = h('div', { class: 'choices' });
  const body = h('p', { class: 'ev-body', text: t(`ev.${e.id}.body`, p.params) });
  const box = h(
    'div',
    { class: `card event ev-${e.kind}` },
    h(
      'div',
      { class: 'ev-head' },
      portrait,
      h(
        'div',
        { class: 'ev-who' },
        h('div', { class: 'ev-name', text: t(`adv.${e.advisor}`) }),
        h('div', { class: 'ev-role', text: t(`adv.${e.advisor}.role`) }),
        h('div', { class: 'ev-when', text: seasonLabel(Math.max(0, s.season - 1)) + (e.kind === 'story' ? ` · ${t('ev.story')}` : '') }),
      ),
    ),
    h('h2', { class: 'card-title', text: t(`ev.${e.id}.title`) }),
    body,
    choices,
  );
  e.choices.forEach((c, idx) => {
    const ok = choiceAvailable(s, c);
    const btn = h(
      'button',
      { class: 'btn choice', disabled: !ok, on: { click: () => choose(idx) } },
      h('span', { class: 'choice-label', text: t(`ev.${e.id}.${c.id}`) }),
      chips(resolveDelta(s, c.cost), resolveDelta(s, c.fx), !!c.risky),
    );
    if (!ok) btn.title = t('ev.cantAfford');
    choices.append(btn);
  });

  function choose(idx: number): void {
    const out = onChoose(idx);
    if (isResultText(out)) {
      choices.replaceChildren(
        h('p', { class: 'ev-outcome', text: t(out!.key, out!.params) }),
        h('div', { class: 'card-actions' }, h('button', { class: 'btn btn-primary', text: t('ui.continue'), on: { click: () => closeModal() } })),
      );
      (choices.querySelector('button') as HTMLButtonElement | null)?.focus();
    } else {
      closeModal();
    }
  }
  openModal(box, { closable: false, onClose: onDone });
}

// ---------------------------------------------------------------- ending

export function endingCard(s: GameState, onNew: () => void, onTitle: () => void): void {
  const id = s.ending!;
  const def = endingDef(id);
  const art = h('canvas', { class: 'ending-art' });
  const st = s.stats;
  const last = s.history[s.history.length - 1]!;
  const stats = h(
    'div',
    { class: 'end-stats' },
    stat('end.st.seasons', `${Math.min(s.season, 40)}/40`),
    stat('end.st.pop', `${s.res.pop} (${t('end.st.peak', { n: st.peakPop })})`),
    stat('end.st.health', fmt(s.res.health)),
    stat('end.st.hope', fmt(s.res.hope)),
    stat('end.st.sea', `${s.seaLevel.toFixed(2)} m`),
    stat('end.st.salt', fmt(last.salinity, 1)),
    stat('end.st.reeds', String(last.reedBeds)),
    stat('end.st.bay', s.dike.complete ? String(last.bayWater) : '—'),
    stat('end.st.fish', fmt(st.fish)),
    stat('end.st.grain', fmt(st.grain)),
    stat('end.st.cotton', fmt(st.cotton)),
    stat('end.st.born', String(st.born)),
    stat('end.st.died', String(st.died)),
    stat('end.st.left', String(st.left)),
    stat('end.st.wrecks', String(st.wrecks)),
    stat('end.st.quotas', `${st.quotasMet} / ${s.quota.failures}`),
    stat('end.st.difficulty', t(`diff.${s.difficulty}`)),
    stat('end.st.seed', String(s.seed)),
  );
  const box = h(
    'div',
    { class: `card ending tone-${def.tone}` },
    art,
    h('div', { class: 'ending-kicker', text: t(`end.tone.${def.tone}`) }),
    h('h2', { class: 'card-title', text: t(`end.${id}.title`) }),
    h('p', { class: 'ending-text', text: t(`end.${id}.text`) }),
    h('p', { class: 'ending-cond', text: t(`end.${id}.cond`) }),
    stats,
    h(
      'div',
      { class: 'card-actions' },
      h('button', { class: 'btn btn-primary', text: t('ui.newGame'), on: { click: () => (closeModal(true), onNew()) } }),
      h('button', { class: 'btn', text: t('ui.toTitle'), on: { click: () => (closeModal(true), onTitle()) } }),
    ),
  );
  openModal(box, { closable: false, wide: true, cls: 'modal-ending' });
  requestAnimationFrame(() => drawEnding(art, def.scene, s.seed));
}

function stat(key: string, v: string): HTMLElement {
  return h('div', { class: 'stat' }, h('span', { class: 'k', text: t(key) }), h('span', { class: 'v', text: v }));
}

// ---------------------------------------------------------------- help

export function helpCard(): void {
  const keys: [string, string][] = [
    ['1–9', 'help.k.tools'],
    ['C W G X', 'help.k.more'],
    ['Enter', 'help.k.end'],
    ['Esc', 'help.k.esc'],
    ['←↑→↓ / + −', 'help.k.camera'],
    ['?', 'help.k.help'],
  ];
  const box = h(
    'div',
    { class: 'card help' },
    h('h2', { class: 'card-title', text: t('help.title') }),
    h('p', { text: t('help.goal') }),
    h('h3', { text: t('help.loopTitle') }),
    h('ol', null, ...['help.loop1', 'help.loop2', 'help.loop3', 'help.loop4'].map((k) => h('li', { text: t(k) }))),
    h('h3', { text: t('help.tipsTitle') }),
    h('ul', null, ...['help.tip1', 'help.tip2', 'help.tip3', 'help.tip4', 'help.tip5', 'help.tip6'].map((k) => h('li', { text: t(k) }))),
    h('h3', { text: t('help.keysTitle') }),
    h('div', { class: 'keys' }, ...keys.map(([k, v]) => h('div', { class: 'key-row' }, h('kbd', { text: k }), h('span', { text: t(v) })))),
    h('p', { class: 'hint', text: t('help.touch') }),
    h('h3', { text: t('help.endingsTitle') }),
    h('ul', { class: 'endings-list' }, ...(['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7'] as const).map((e) => h('li', null, h('b', { text: `${t(`end.${e}.title`)}: ` }), t(`end.${e}.cond`)))),
    h('div', { class: 'card-actions' }, h('button', { class: 'btn btn-primary', text: t('ui.close'), on: { click: () => closeModal() } })),
  );
  openModal(box, { closable: true, wide: true });
}

// ---------------------------------------------------------------- settings

export interface SettingsActions {
  lang(): Lang;
  setLang(l: Lang): void;
  sound(): boolean;
  setSound(on: boolean): void;
  inGame: boolean;
  toTitle(): void;
  resetTutorial(): void;
}

export function settingsCard(a: SettingsActions): void {
  const render = (): HTMLElement => {
    const langRow = h('div', { class: 'seg' });
    for (const l of LANGS) {
      langRow.append(
        h('button', {
          class: `btn btn-small ${a.lang() === l ? 'active' : ''}`,
          text: t(`lang.${l}`),
          on: {
            click: () => {
              a.setLang(l);
              reopen();
            },
          },
        }),
      );
    }
    const soundRow = h(
      'div',
      { class: 'seg' },
      h('button', { class: `btn btn-small ${a.sound() ? 'active' : ''}`, text: t('set.on'), on: { click: () => (a.setSound(true), reopen()) } }),
      h('button', { class: `btn btn-small ${!a.sound() ? 'active' : ''}`, text: t('set.off'), on: { click: () => (a.setSound(false), reopen()) } }),
    );
    return h(
      'div',
      { class: 'card settings' },
      h('h2', { class: 'card-title', text: t('set.title') }),
      h('div', { class: 'set-row' }, h('span', { text: t('set.lang') }), langRow),
      h('div', { class: 'set-row' }, h('span', { text: t('set.sound') }), soundRow),
      h('div', { class: 'set-row' }, h('span', { text: t('set.tutorial') }), h('button', { class: 'btn btn-small', text: t('set.tutorialReset'), on: { click: () => (a.resetTutorial(), reopen()) } })),
      h('p', { class: 'hint', text: t('set.saveNote') }),
      h(
        'div',
        { class: 'card-actions' },
        a.inGame ? h('button', { class: 'btn', text: t('ui.toTitle'), on: { click: () => (closeModal(true), a.toTitle()) } }) : null,
        h('button', { class: 'btn btn-primary', text: t('ui.close'), on: { click: () => closeModal() } }),
      ),
    );
  };
  const reopen = () => openModal(render(), { closable: true });
  reopen();
}

// ---------------------------------------------------------------- new game

export function newGameCard(onStart: (d: Difficulty) => void): void {
  let pick: Difficulty = 'hard';
  const opts = h('div', { class: 'diffs' });
  const render = () => {
    opts.replaceChildren(
      ...(['normal', 'hard', 'brutal'] as Difficulty[]).map((d) =>
        h(
          'button',
          { class: `diff ${pick === d ? 'active' : ''}`, on: { click: () => ((pick = d), render()) } },
          h('span', { class: 'diff-name', text: t(`diff.${d}`) + (d === 'hard' ? ` ★` : '') }),
          h('span', { class: 'diff-desc', text: t(`diff.${d}.desc`) }),
        ),
      ),
    );
  };
  render();
  const box = h(
    'div',
    { class: 'card newgame' },
    h('h2', { class: 'card-title', text: t('ui.newGame') }),
    h('p', { class: 'hint', text: t('diff.pick') }),
    opts,
    h(
      'div',
      { class: 'card-actions' },
      h('button', { class: 'btn', text: t('ui.back'), on: { click: () => closeModal() } }),
      h('button', { class: 'btn btn-primary', text: t('ui.start'), on: { click: () => (closeModal(true), onStart(pick)) } }),
    ),
  );
  openModal(box, { closable: true });
}

export function confirmCard(text: string, yes: string, onYes: () => void): void {
  const box = h(
    'div',
    { class: 'card confirm' },
    h('p', { text }),
    h(
      'div',
      { class: 'card-actions' },
      h('button', { class: 'btn', text: t('ui.cancel'), on: { click: () => closeModal() } }),
      h('button', { class: 'btn btn-primary', text: yes, on: { click: () => (closeModal(true), onYes()) } }),
    ),
  );
  openModal(box, { closable: true });
}

export function currentLangName(): string {
  return t(`lang.${getLang()}`);
}
