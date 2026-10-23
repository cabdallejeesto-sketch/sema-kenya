// Short sound effects for right and wrong answers, made with Web Audio (no sound files).

let ctx: AudioContext | null = null;

function tone(c: AudioContext, freq: number, start: number, length: number, type: OscillatorType, volume: number) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
  osc.connect(gain).connect(c.destination);
  osc.start(start);
  osc.stop(start + length + 0.02);
}

export function sfx(kind: 'correct' | 'wrong' | 'done'): void {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    const t = ctx.currentTime + 0.01;
    if (kind === 'correct') {
      tone(ctx, 784, t, 0.12, 'sine', 0.18);
      tone(ctx, 1175, t + 0.09, 0.22, 'sine', 0.16);
    } else if (kind === 'wrong') {
      tone(ctx, 233, t, 0.18, 'triangle', 0.22);
      tone(ctx, 185, t + 0.13, 0.28, 'triangle', 0.22);
    } else {
      [523, 659, 784, 1047].forEach((f, i) => tone(ctx!, f, t + i * 0.11, 0.3, 'sine', 0.15));
    }
  } catch {
    /* no Web Audio: stay silent */
  }
}
