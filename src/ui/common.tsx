import type { ReactNode } from 'react';
import { VARIETIES } from '../content';
import type { Variety } from '../content/types';
import { speak } from '../engine/speech';
import { Snail, Speaker } from './icons';
import { useStore } from './store';

export const REPO_URL = 'https://github.com/cabdallejeesto-sketch/sema-kenya';

export function VarietyBadge({ v }: { v: Variety }) {
  const { p } = useStore();
  const info = VARIETIES[v];
  return (
    <span className={`badge badge-${v}`} title={info.desc[p.lang]}>
      {info.name[p.lang]}
    </span>
  );
}

export function SpeakButtons({ text, big = false, autoPlay = false }: { text: string; big?: boolean; autoPlay?: boolean }) {
  const { voice, t } = useStore();
  if (!voice.available) return autoPlay ? <p className="muted small">{t('noVoiceShort')}</p> : null;
  return (
    <span className="speak-row">
      <button type="button" className={`speak ${big ? 'speak-big' : ''}`} onClick={() => speak(text)} aria-label={t('listen')}>
        <Speaker size={big ? 30 : 20} />
      </button>
      <button type="button" className="speak speak-slow" onClick={() => speak(text, true)} aria-label={t('slow')}>
        <Snail size={big ? 24 : 18} />
      </button>
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
