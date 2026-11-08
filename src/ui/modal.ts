// Modal dialogs, toasts and the hover tooltip.
import { clear, h } from './dom';

let root: HTMLElement | null = null;
let current: { el: HTMLElement; closable: boolean; onClose?: () => void } | null = null;

function ensureRoot(): HTMLElement {
  if (root && root.isConnected) return root;
  root = document.getElementById('modal-root') ?? document.body.appendChild(h('div', { attrs: { id: 'modal-root' } }));
  return root;
}

export interface ModalOpts {
  closable?: boolean;
  onClose?: () => void;
  wide?: boolean;
  full?: boolean;
  cls?: string;
}

export function openModal(content: HTMLElement, opts: ModalOpts = {}): void {
  const r = ensureRoot();
  if (current && !current.el.isConnected) current = null;
  closeModal(true);
  const box = h('div', { class: `modal ${opts.wide ? 'modal-wide' : ''} ${opts.full ? 'modal-full' : ''} ${opts.cls ?? ''}`, attrs: { role: 'dialog', 'aria-modal': 'true' } }, content);
  const overlay = h('div', { class: 'overlay' }, box);
  if (opts.closable) {
    overlay.addEventListener('pointerdown', (e) => {
      if (e.target === overlay) closeModal();
    });
  }
  r.append(overlay);
  current = { el: overlay, closable: !!opts.closable, onClose: opts.onClose };
  const focusable = box.querySelector<HTMLElement>('button:not([disabled]), [tabindex]');
  focusable?.focus({ preventScroll: true });
}

export function closeModal(silent = false): void {
  if (!current) return;
  const c = current;
  current = null;
  c.el.remove();
  if (!silent) c.onClose?.();
}

export function modalOpen(): boolean {
  return current !== null;
}

export function modalClosable(): boolean {
  return !!current?.closable;
}

// ---------------------------------------------------------------- toasts

export function toast(text: string, kind: 'info' | 'warn' | 'good' = 'info', ms = 2600): void {
  const host = document.getElementById('toasts');
  if (!host) return;
  const el = h('div', { class: `toast toast-${kind}`, text });
  host.append(el);
  while (host.children.length > 3) host.firstElementChild?.remove();
  setTimeout(() => {
    el.classList.add('toast-out');
    setTimeout(() => el.remove(), 300);
  }, ms);
}

// ---------------------------------------------------------------- tooltip

let tip: HTMLElement | null = null;

export function showTip(anchor: HTMLElement, content: HTMLElement): void {
  if (!tip || !tip.isConnected) {
    tip = h('div', { class: 'tooltip', attrs: { role: 'tooltip' } });
    document.body.append(tip);
  }
  clear(tip);
  tip.append(content);
  tip.style.display = 'block';
  const r = anchor.getBoundingClientRect();
  const tw = tip.offsetWidth;
  const th = tip.offsetHeight;
  let x = r.right + 8;
  let y = r.top;
  if (x + tw > window.innerWidth - 8) x = Math.max(8, r.left - tw - 8);
  if (x < 8) x = 8;
  if (y + th > window.innerHeight - 8) y = Math.max(8, window.innerHeight - th - 8);
  if (window.innerWidth < 760) {
    x = Math.max(8, Math.min(window.innerWidth - tw - 8, r.left));
    y = Math.max(8, r.top - th - 8);
  }
  tip.style.left = `${x}px`;
  tip.style.top = `${y}px`;
}

export function hideTip(): void {
  if (tip) tip.style.display = 'none';
}
