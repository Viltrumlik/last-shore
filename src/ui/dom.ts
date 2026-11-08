// Minimal DOM helpers (no framework).
type Child = Node | string | number | null | undefined | false;

export interface Props {
  class?: string;
  text?: string;
  title?: string;
  attrs?: Record<string, string>;
  data?: Record<string, string>;
  on?: Partial<Record<keyof HTMLElementEventMap, (e: Event) => void>>;
  disabled?: boolean;
}

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, props: Props | null = null, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (props) {
    if (props.class) el.className = props.class;
    if (props.text !== undefined) el.textContent = props.text;
    if (props.title) el.title = props.title;
    if (props.attrs) for (const [k, v] of Object.entries(props.attrs)) el.setAttribute(k, v);
    if (props.data) for (const [k, v] of Object.entries(props.data)) el.dataset[k] = v;
    if (props.on) for (const [k, fn] of Object.entries(props.on)) if (fn) el.addEventListener(k, fn as EventListener);
    if (props.disabled && 'disabled' in el) (el as HTMLButtonElement).disabled = true;
  }
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    el.append(typeof c === 'number' ? String(c) : c);
  }
  return el;
}

export function clear(el: Element): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}

export function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} missing`);
  return el as T;
}

export function fmt(n: number, digits = 0): string {
  const v = digits ? n.toFixed(digits) : String(Math.round(n));
  return v;
}

export function signed(n: number, digits = 0): string {
  const r = digits ? Number(n.toFixed(digits)) : Math.round(n);
  if (r > 0) return `+${digits ? r.toFixed(digits) : r}`;
  if (r < 0) return `−${digits ? Math.abs(r).toFixed(digits) : Math.abs(r)}`;
  return digits ? (0).toFixed(digits) : '0';
}
