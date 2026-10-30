import { useEffect, useState, type ReactNode } from 'react';
import { VARIETIES } from '../content';
import type { Variety } from '../content/types';
import { hasClip, onPlaying, play, playingText } from '../engine/speech';
import { cleanSpeech, type VoiceId } from '../engine/voice-lines';
import { Snail, Speaker } from './icons';
import { useStore } from './store';

export const REPO_URL = 'https://github.com/ABDULLAAHI-DEVELOPER/sema-kenya';

export function VarietyBadge({ v }: { v: Variety }) {
  const { p } = useStore();
  const info = VARIETIES[v];
  return (
    <span className={`badge badge-${v}`} title={info.desc[p.lang]}>
      {info.name[p.lang]}
    </span>
  );
}

/** True while this text is being read aloud. */
export function usePlaying(text: string): boolean {
  const clean = cleanSpeech(text);
  const [on, setOn] = useState(() => playingText() === clean);
  useEffect(() => onPlaying((now) => setOn(now === clean)), [clean]);
  return on;
}

/** The speaker button (and the slow "snail" button) for a Swahili word or sentence. */
export function SpeakButtons({ text, voice = 'f', big = false, slow = true }: { text: string; voice?: VoiceId; big?: boolean; slow?: boolean }) {
  const { voice: browserVoice, t } = useStore();
  const playing = usePlaying(text);
  if (!hasClip(text, voice) && !browserVoice.available) return null;
  return (
    <span className="speak-row">
      <button
        type="button"
        className={`speak ${big ? 'speak-big' : ''} ${playing ? 'playing' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          void play(text, { voice });
        }}
        aria-label={t('listen')}
        title={t('listen')}
      >
        <Speaker size={big ? 34 : 20} />
      </button>
      {slow && (
        <button
          type="button"
          className="speak speak-slow"
          onClick={(e) => {
            e.stopPropagation();
            void play(text, { voice, slow: true });
          }}
          aria-label={t('slow')}
          title={t('slow')}
        >
          <Snail size={big ? 24 : 18} />
        </button>
      )}
    </span>
  );
}

export function Meaning({ item }: { item: { en: string; so: string } }) {
  const { p } = useStore();
  return (
    <span className="meaning">
      {item[p.lang]}
      {p.lang === 'so' && p.showEnglishToo && item.en !== item.so && <span className="meaning-en">{item.en}</span>}
    </span>
  );
}

export function reportUrl(title: string, body: string): string {
  const q = new URLSearchParams({ title, body, labels: 'content' });
  return `${REPO_URL}/issues/new?${q.toString()}`;
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`card ${className}`}>{children}</div>;
}
