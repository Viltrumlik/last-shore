// Optional WebAudio blips. Created lazily on the first sound after a user gesture.
type Sfx = 'click' | 'build' | 'error' | 'end' | 'event' | 'good' | 'bad' | 'ending' | 'storm';

let ctx: AudioContext | null = null;
let enabled = true;

export function setSound(on: boolean): void {
  enabled = on;
}

export function soundOn(): boolean {
  return enabled;
}

function ac(): AudioContext | null {
  if (!enabled) return null;
  try {
    if (!ctx) {
      const Ctor = (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext) as
        | typeof AudioContext
        | undefined;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'square', vol = 0.05, slide = 0): void {
  const a = ac();
  if (!a) return;
  const t0 = a.currentTime + start;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.linearRampToValueAtTime(freq + slide, t0 + dur);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(a.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

function noise(start: number, dur: number, vol = 0.03): void {
  const a = ac();
  if (!a) return;
  const len = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = a.createBufferSource();
  const g = a.createGain();
  g.gain.value = vol;
  src.buffer = buf;
  src.connect(g).connect(a.destination);
  src.start(a.currentTime + start);
}

export function sfx(kind: Sfx): void {
  if (!enabled) return;
  switch (kind) {
    case 'click':
      tone(660, 0, 0.05, 'square', 0.03);
      break;
    case 'build':
      tone(330, 0, 0.06, 'square', 0.05);
      tone(495, 0.06, 0.08, 'square', 0.05);
      break;
    case 'error':
      tone(180, 0, 0.12, 'square', 0.05, -40);
      break;
    case 'end':
      tone(392, 0, 0.1, 'triangle', 0.08);
      tone(523, 0.1, 0.1, 'triangle', 0.08);
      tone(659, 0.2, 0.16, 'triangle', 0.08);
      break;
    case 'event':
      tone(523, 0, 0.08, 'triangle', 0.07);
      tone(784, 0.09, 0.12, 'triangle', 0.06);
      break;
    case 'good':
      tone(523, 0, 0.08, 'square', 0.04);
      tone(784, 0.08, 0.14, 'square', 0.04);
      break;
    case 'bad':
      tone(330, 0, 0.12, 'triangle', 0.08);
      tone(247, 0.12, 0.2, 'triangle', 0.08);
      break;
    case 'storm':
      noise(0, 1.2, 0.05);
      break;
    case 'ending':
      [392, 494, 587, 784].forEach((f, i) => tone(f, i * 0.16, 0.3, 'triangle', 0.07));
      break;
  }
}
