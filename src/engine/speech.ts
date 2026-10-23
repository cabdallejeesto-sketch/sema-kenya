// Audio: recorded Kenyan Swahili clips (public/audio, made by `npm run audio`), with the browser's
// own text-to-speech as a fallback for anything that has no clip yet.

import clips from '../content/audio.json';
import { clipKey, cleanSpeech, type Speech, type VoiceId } from './voice-lines';

export interface VoiceInfo {
  available: boolean;
  name: string | null;
  lang: string | null;
}

const CLIPS = new Set<string>(clips as string[]);
export const clipCount = CLIPS.size;

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

/** The clip for this text: in the wanted voice if there is one, otherwise in the other voice. */
function findClip(text: string, voice: VoiceId): string | null {
  for (const v of [voice, voice === 'f' ? 'm' : 'f'] as const) {
    const key = clipKey(text, v);
    if (CLIPS.has(key)) return key;
  }
  return null;
}

export function hasClip(text: string, voice: VoiceId = 'f'): boolean {
  return !!findClip(text, voice);
}

/** True if this text can be played: as a recorded clip, or with the browser's Swahili voice. */
export function canSpeak(text: string, voice: VoiceId = 'f'): boolean {
  return hasClip(text, voice) || !!chosen;
}

// One audio element for the whole app. Phones (iOS) only let a page play sound from an element that
// was first played during a tap, so it is "unlocked" with a silent sound on the first touch or key.
const SILENT = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
let el: HTMLAudioElement | null = null;
function audio(): HTMLAudioElement {
  el ??= new Audio();
  return el;
}
if (typeof window !== 'undefined') {
  const unlock = () => {
    const a = audio();
    if (!a.src) {
      a.src = SILENT;
      a.play().catch(() => {});
    }
  };
  window.addEventListener('pointerdown', unlock, { once: true, capture: true });
  window.addEventListener('keydown', unlock, { once: true, capture: true });
}

const blobs = new Map<string, Promise<string>>();
function clipUrl(key: string): Promise<string> {
  let url = blobs.get(key);
  if (!url) {
    url = fetch(`${import.meta.env.BASE_URL}audio/${key}.mp3`)
      .then((r) => {
        if (!r.ok) throw new Error(`audio ${r.status}`);
        return r.blob();
      })
      .then((b) => URL.createObjectURL(b));
    url.catch(() => blobs.delete(key));
    blobs.set(key, url);
  }
  return url;
}

/** Downloads clips ahead of time so they play straight away. */
export function prefetch(lines: Speech[]): void {
  for (const [text, voice] of lines) {
    const key = findClip(cleanSpeech(text), voice);
    if (key) clipUrl(key).catch(() => {});
  }
}

// Which text is playing, so speaker buttons can show it.
type Listener = (text: string | null) => void;
const listeners = new Set<Listener>();
let nowPlaying: string | null = null;
function setPlaying(text: string | null) {
  nowPlaying = text;
  for (const l of listeners) l(text);
}
export function onPlaying(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}
export function playingText(): string | null {
  return nowPlaying;
}

let run = 0;
let finishCurrent: (() => void) | null = null;

export function stop(): void {
  const finish = finishCurrent;
  finishCurrent = null;
  run++;
  el?.pause();
  if (supported()) window.speechSynthesis.cancel();
  setPlaying(null);
  finish?.();
}

function speakTts(text: string, slow: boolean, done: () => void): boolean {
  if (!supported() || !chosen) return false;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/\.\.\./g, ''));
  u.voice = chosen;
  u.lang = chosen.lang;
  u.rate = slow ? 0.6 : 0.92;
  u.onend = done;
  u.onerror = done;
  window.speechSynthesis.speak(u);
  return true;
}

/** Plays the text and resolves when it has finished, was stopped, or could not be played. */
export function play(text: string, opts: { slow?: boolean; voice?: VoiceId } = {}): Promise<void> {
  stop();
  const id = run;
  const clean = cleanSpeech(text);
  const slow = !!opts.slow;
  return new Promise((resolve) => {
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      if (id === run) {
        finishCurrent = null;
        setPlaying(null);
      }
      resolve();
    };
    finishCurrent = done;
    const fallback = () => {
      if (id !== run || !speakTts(clean, slow, done)) done();
    };
    const key = findClip(clean, opts.voice ?? 'f');
    setPlaying(clean);
    if (!key) return fallback();
    clipUrl(key)
      .then((url) => {
        if (id !== run) return done();
        const a = audio();
        a.onended = done;
        a.onerror = fallback;
        a.src = url;
        a.defaultPlaybackRate = slow ? 0.7 : 1;
        a.playbackRate = slow ? 0.7 : 1;
        a.preservesPitch = true;
        return a.play().catch((e: unknown) => {
          // Blocked until the learner taps something: stay quiet instead of using the robot voice.
          if (e instanceof DOMException && e.name === 'NotAllowedError') done();
          else fallback();
        });
      })
      .catch(fallback);
  });
}

/** Plays several lines one after another. Stops as soon as anything else is played or stopped. */
export async function playAll(lines: Speech[], onLine?: (i: number) => void): Promise<void> {
  for (let i = 0; i < lines.length; i++) {
    onLine?.(i);
    const playing = play(lines[i][0], { voice: lines[i][1] });
    const id = run;
    await playing;
    if (id !== run) return onLine?.(-1);
    await new Promise((r) => window.setTimeout(r, 350));
    if (id !== run) return onLine?.(-1);
  }
  onLine?.(-1);
}
