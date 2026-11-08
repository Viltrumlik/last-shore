// Mouse + touch input for the map canvas: hover, tap/click to select, drag to pan,
// wheel / pinch to zoom (integer steps). Uses Pointer Events so mouse, pen and touch
// share one code path.
import type { Renderer } from './renderer';

export interface MapInputHandlers {
  onTap(tile: number | null): void;
  onHover(tile: number | null): void;
}

const DRAG_THRESHOLD = 5;
const TAP_MS = 600;

interface Ptr {
  id: number;
  x: number;
  y: number;
  sx: number;
  sy: number;
  t0: number;
  button: number;
  type: string;
}

export function attachMapInput(canvas: HTMLCanvasElement, r: Renderer, h: MapInputHandlers): () => void {
  const ptrs = new Map<number, Ptr>();
  let dragging = false;
  let pinchBase = 0;
  let pinched = false;
  let wheelAcc = 0;

  canvas.style.touchAction = 'none';

  const dist = () => {
    const [a, b] = [...ptrs.values()];
    if (!a || !b) return 0;
    return Math.hypot(a.x - b.x, a.y - b.y);
  };
  const mid = () => {
    const [a, b] = [...ptrs.values()];
    if (!a || !b) return { x: 0, y: 0 };
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  };

  const onDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0 && e.button !== 1 && e.button !== 2) return;
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      /* capture is best-effort */
    }
    ptrs.set(e.pointerId, { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t0: performance.now(), button: e.button, type: e.pointerType });
    if (ptrs.size === 2) {
      pinchBase = dist();
      pinched = true;
      dragging = true;
    } else {
      dragging = false;
      pinched = false;
    }
    if (e.button === 1) e.preventDefault();
  };

  const onMove = (e: PointerEvent) => {
    const p = ptrs.get(e.pointerId);
    if (!p) {
      if (e.pointerType === 'mouse') h.onHover(r.screenToTile(e.clientX, e.clientY));
      return;
    }
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    p.x = e.clientX;
    p.y = e.clientY;
    if (ptrs.size >= 2) {
      const d = dist();
      if (pinchBase > 0 && d > 0) {
        const ratio = d / pinchBase;
        const m = mid();
        if (ratio > 1.3) {
          r.zoomAt(1, m.x, m.y);
          pinchBase = d;
        } else if (ratio < 0.77) {
          r.zoomAt(-1, m.x, m.y);
          pinchBase = d;
        }
      }
      r.panBy(dx / 2, dy / 2);
      return;
    }
    if (!dragging && Math.hypot(e.clientX - p.sx, e.clientY - p.sy) > DRAG_THRESHOLD) dragging = true;
    if (dragging) r.panBy(dx, dy);
    else if (e.pointerType === 'mouse') h.onHover(r.screenToTile(e.clientX, e.clientY));
  };

  const onUp = (e: PointerEvent) => {
    const p = ptrs.get(e.pointerId);
    ptrs.delete(e.pointerId);
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    if (!p) return;
    if (ptrs.size > 0) return; // still pinching with another finger
    const wasDrag = dragging || pinched;
    dragging = false;
    pinched = false;
    if (wasDrag) return;
    if (p.type === 'mouse' && p.button !== 0) return;
    if (performance.now() - p.t0 > TAP_MS && p.type !== 'mouse') return;
    const tile = r.screenToTile(e.clientX, e.clientY);
    if (p.type !== 'mouse') h.onHover(tile);
    h.onTap(tile);
  };

  const onCancel = (e: PointerEvent) => {
    ptrs.delete(e.pointerId);
    if (ptrs.size === 0) {
      dragging = false;
      pinched = false;
    }
  };

  const onLeave = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && !ptrs.size) h.onHover(null);
  };

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    wheelAcc += e.deltaY;
    if (Math.abs(wheelAcc) < 40 && e.deltaMode === 0) return;
    r.zoomAt(wheelAcc < 0 ? 1 : -1, e.clientX, e.clientY);
    wheelAcc = 0;
  };

  const onContext = (e: Event) => e.preventDefault();

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onCancel);
  canvas.addEventListener('pointerleave', onLeave);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('contextmenu', onContext);

  return () => {
    canvas.removeEventListener('pointerdown', onDown);
    canvas.removeEventListener('pointermove', onMove);
    canvas.removeEventListener('pointerup', onUp);
    canvas.removeEventListener('pointercancel', onCancel);
    canvas.removeEventListener('pointerleave', onLeave);
    canvas.removeEventListener('wheel', onWheel);
    canvas.removeEventListener('contextmenu', onContext);
  };
}
