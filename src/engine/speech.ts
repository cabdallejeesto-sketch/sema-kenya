// Text-to-speech using the browser's built-in voices. A Kenyan Swahili voice (sw-KE) is preferred.

export interface VoiceInfo {
  available: boolean;
  name: string | null;
  lang: string | null;
}

let chosen: SpeechSynthesisVoice | null = null;

function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const sw = voices.filter((v) => /^sw([-_]|$)/i.test(v.lang));
  return (
    sw.find((v) => /ke/i.test(v.lang) && /natural|online/i.test(v.name)) ??
    sw.find((v) => /ke/i.test(v.lang)) ??
    sw.find((v) => /natural|online/i.test(v.name)) ??
    sw[0] ??
    null
  );
}

export function supported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/** Resolves once the browser has listed its voices (some browsers load them late). */
export function loadVoice(): Promise<VoiceInfo> {
  return new Promise((resolve) => {
    if (!supported()) return resolve({ available: false, name: null, lang: null });
    const done = () => {
      chosen = pickVoice(window.speechSynthesis.getVoices());
      resolve({ available: !!chosen, name: chosen?.name ?? null, lang: chosen?.lang ?? null });
    };
    if (window.speechSynthesis.getVoices().length) return done();
    const timer = window.setTimeout(done, 1500);
    window.speechSynthesis.addEventListener(
      'voiceschanged',
      () => {
        window.clearTimeout(timer);
        done();
      },
      { once: true },
    );
  });
}

export function speak(text: string, slow = false): void {
  if (!supported() || !chosen) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/\.\.\./g, ''));
  u.voice = chosen;
  u.lang = chosen.lang;
  u.rate = slow ? 0.6 : 0.92;
  window.speechSynthesis.speak(u);
}
