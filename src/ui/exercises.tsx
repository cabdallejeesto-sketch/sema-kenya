import { useEffect, useMemo, useRef, useState } from 'react';
import { acceptedSw, meaning, type Exercise, type Lang } from '../engine/generate';
import { checkAnswer, normalize } from '../engine/check';
import { speak } from '../engine/speech';
import { Meaning, SpeakButtons, VarietyBadge } from './common';
import { useStore } from './store';

/** What the learner has chosen or typed so far. */
export type Draft = { choice?: number; text?: string; words?: number[] };

export interface Grade {
  ok: boolean;
  typo?: boolean;
  /** The right answer, shown after a wrong (or typo) answer. */
  answer: string;
}

export function isReady(ex: Exercise, d: Draft): boolean {
  switch (ex.kind) {
    case 'teach':
      return true;
    case 'match':
      return false; // finishes by itself when every pair is matched
    case 'type-sw':
      return !!d.text?.trim();
    case 'build':
      return !!d.words?.length;
    default:
      return d.choice !== undefined;
  }
}

export function grade(ex: Exercise, d: Draft, lang: Lang): Grade {
  switch (ex.kind) {
    case 'pick-meaning': {
      const ok = ex.options[d.choice ?? -1]?.id === ex.item.id;
      return { ok, answer: meaning(ex.item, lang) };
    }
    case 'pick-sw':
    case 'listen-pick': {
      const ok = ex.options[d.choice ?? -1]?.id === ex.item.id;
      return { ok, answer: ex.item.sw };
    }
    case 'type-sw': {
      const r = checkAnswer(d.text ?? '', acceptedSw(ex.item));
      return { ok: r.result !== 'wrong', typo: r.result === 'typo', answer: r.result === 'typo' ? r.closest : ex.item.sw };
    }
    case 'build': {
      const given = normalize((d.words ?? []).map((i) => ex.tiles[i]).join(' '));
      const ok = [ex.ex.answer, ...(ex.ex.accept ?? [])].some((a) => normalize(a) === given);
      return { ok, answer: ex.ex.answer };
    }
    case 'respond': {
      const ok = ex.order[d.choice ?? -1] === ex.ex.answer;
      return { ok, answer: ex.ex.options[ex.ex.answer] };
    }
    case 'gap': {
      const ok = ex.order[d.choice ?? -1] === ex.ex.answer;
      return { ok, answer: `${ex.ex.before} ${ex.ex.options[ex.ex.answer]}${ex.ex.after}`.trim() };
    }
    case 'dialogue': {
      const ok = ex.order[d.choice ?? -1] === ex.ex.answer;
      return { ok, answer: ex.ex.options[ex.ex.answer][lang] };
    }
    default:
      return { ok: true, answer: '' };
  }
}

interface Props {
  ex: Exercise;
  draft: Draft;
  setDraft: (d: Draft) => void;
  locked: boolean; // true while feedback is shown
  onMatchDone?: (mistakeIds: string[]) => void;
}

function Options({
  labels,
  draft,
  setDraft,
  locked,
  sw = false,
}: {
  labels: React.ReactNode[];
  draft: Draft;
  setDraft: (d: Draft) => void;
  locked: boolean;
  sw?: boolean;
}) {
  return (
    <div className="options" role="radiogroup">
      {labels.map((label, i) => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={draft.choice === i}
          className={`option ${draft.choice === i ? 'selected' : ''} ${sw ? 'sw' : ''}`}
          disabled={locked}
          onClick={() => setDraft({ choice: i })}
        >
          <span className="key">{i + 1}</span>
          <span className="option-label">{label}</span>
        </button>
      ))}
    </div>
  );
}

export function ExerciseView({ ex, draft, setDraft, locked, onMatchDone }: Props) {
  const { t, p, voice } = useStore();

  switch (ex.kind) {
    case 'teach': {
      const it = ex.item;
      return (
        <div className="ex teach">
          <p className="ex-title">{it.sw.includes(' ') ? t('newPhrase') : t('newWord')}</p>
          <div className="teach-card">
            <div className="teach-sw">
              <span className="sw big">{it.sw}</span>
              <SpeakButtons text={it.say ?? it.sw} big />
            </div>
            <div className="teach-meaning">
              <Meaning item={it} />
            </div>
            <VarietyBadge v={it.v} />
            {it.tz && (
              <p className="tz">
                {t('textbook')} <span className="sw">{it.tz}</span>
              </p>
            )}
            {it.note && (
              <p className="note">
                <strong>{t('note')}:</strong> {it.note[p.lang]}
              </p>
            )}
          </div>
          <AutoSpeak text={it.say ?? it.sw} enabled={voice.available} />
        </div>
      );
    }

    case 'pick-meaning':
      return (
        <div className="ex">
          <p className="ex-title">{t('pickMeaning')}</p>
          <div className="prompt">
            <span className="sw big">{ex.item.sw}</span>
            <SpeakButtons text={ex.item.say ?? ex.item.sw} />
          </div>
          <Options
            labels={ex.options.map((o) => <Meaning key={o.id} item={o} />)}
            draft={draft}
            setDraft={setDraft}
            locked={locked}
          />
        </div>
      );

    case 'pick-sw':
      return (
        <div className="ex">
          <p className="ex-title">{t('pickSw')}</p>
          <div className="prompt">
            <span className="big">
              <Meaning item={ex.item} />
            </span>
          </div>
          <Options labels={ex.options.map((o) => o.sw)} draft={draft} setDraft={setDraft} locked={locked} sw />
        </div>
      );

    case 'listen-pick':
      return (
        <div className="ex">
          <p className="ex-title">{t('listenPick')}</p>
          <div className="prompt center">
            <SpeakButtons text={ex.item.say ?? ex.item.sw} big />
          </div>
          <AutoSpeak text={ex.item.say ?? ex.item.sw} enabled={voice.available} />
          <Options labels={ex.options.map((o) => o.sw)} draft={draft} setDraft={setDraft} locked={locked} sw />
        </div>
      );

    case 'type-sw':
      return (
        <div className="ex">
          <p className="ex-title">{t('typeSw')}</p>
          <div className="prompt">
            <span className="big">
              <Meaning item={ex.item} />
            </span>
          </div>
          <input
            className="type-input sw"
            autoFocus
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            lang="sw"
            placeholder={t('typePlaceholder')}
            value={draft.text ?? ''}
            disabled={locked}
            onChange={(e) => setDraft({ text: e.target.value })}
          />
        </div>
      );

    case 'build':
      return <Build ex={ex} draft={draft} setDraft={setDraft} locked={locked} />;

    case 'match':
      return <Match ex={ex} onDone={onMatchDone} />;

    case 'respond':
      return (
        <div className="ex">
          <p className="ex-title">{t('respond')}</p>
          <div className="bubble">
            <span className="sw">{ex.ex.heard}</span>
            <SpeakButtons text={ex.ex.heard} />
          </div>
          <AutoSpeak text={ex.ex.heard} enabled={voice.available} />
          <Options labels={ex.order.map((i) => ex.ex.options[i])} draft={draft} setDraft={setDraft} locked={locked} sw />
          {locked && ex.ex.explain && <p className="note">{ex.ex.explain[p.lang]}</p>}
        </div>
      );

    case 'gap':
      return (
        <div className="ex">
          <p className="ex-title">{t('gap')}</p>
          <div className="prompt gap-sentence sw">
            {ex.ex.before} <span className="gap-slot">{draft.choice !== undefined ? ex.ex.options[ex.order[draft.choice]] : '____'}</span>
            {ex.ex.after}
          </div>
          <p className="muted">{ex.ex.meaning[p.lang]}</p>
          <Options labels={ex.order.map((i) => ex.ex.options[i])} draft={draft} setDraft={setDraft} locked={locked} sw />
        </div>
      );

    case 'dialogue':
      return <DialogueView ex={ex} draft={draft} setDraft={setDraft} locked={locked} />;
  }
}

function AutoSpeak({ text, enabled }: { text: string; enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return;
    const id = window.setTimeout(() => speak(text), 250);
    return () => window.clearTimeout(id);
  }, [text, enabled]);
  return null;
}

function Build({ ex, draft, setDraft, locked }: { ex: Extract<Exercise, { kind: 'build' }> } & Omit<Props, 'ex' | 'onMatchDone'>) {
  const { t, p } = useStore();
  const chosen = draft.words ?? [];
  const toggle = (i: number) => {
    if (locked) return;
    setDraft({ words: chosen.includes(i) ? chosen.filter((x) => x !== i) : [...chosen, i] });
  };
  return (
    <div className="ex">
      <p className="ex-title">{t('build')}</p>
      <div className="prompt">
        <span className="big">{ex.ex.prompt[p.lang]}</span>
      </div>
      <div className="build-line" aria-live="polite">
        {chosen.map((i) => (
          <button key={i} type="button" className="tile sw placed" onClick={() => toggle(i)} disabled={locked}>
            {ex.tiles[i]}
          </button>
        ))}
      </div>
      <div className="tile-bank">
        {ex.tiles.map((w, i) => (
          <button
            key={i}
            type="button"
            className={`tile sw ${chosen.includes(i) ? 'used' : ''}`}
            onClick={() => toggle(i)}
            disabled={locked || chosen.includes(i)}
          >
            {w}
          </button>
        ))}
      </div>
    </div>
  );
}

function Match({ ex, onDone }: { ex: Extract<Exercise, { kind: 'match' }>; onDone?: (mistakeIds: string[]) => void }) {
  const { t } = useStore();
  const [left, setLeft] = useState<string | null>(null);
  const [right, setRight] = useState<string | null>(null);
  const [done, setDone] = useState<string[]>([]);
  const [wrong, setWrong] = useState<string[]>([]);
  const mistakes = useRef(new Set<string>());
  const finished = useRef(false);

  useEffect(() => {
    if (!left || !right) return;
    if (left === right) {
      setDone((d) => [...d, left]);
      speak(ex.items.find((i) => i.id === left)?.sw ?? '');
    } else {
      mistakes.current.add(left);
      mistakes.current.add(right);
      setWrong([left, right]);
      window.setTimeout(() => setWrong([]), 600);
    }
    setLeft(null);
    setRight(null);
  }, [left, right, ex.items]);

  useEffect(() => {
    if (!finished.current && done.length === ex.items.length) {
      finished.current = true;
      onDone?.([...mistakes.current]);
    }
  }, [done, ex.items.length, onDone]);

  const cls = (id: string, side: 'l' | 'r') =>
    `tile match-tile ${done.includes(id) ? 'matched' : ''} ${wrong.includes(id) ? 'wrong' : ''} ${
      (side === 'l' ? left : right) === id ? 'selected' : ''
    }`;

  return (
    <div className="ex">
      <p className="ex-title">{t('match')}</p>
      <div className="match-grid">
        <div className="match-col">
          {ex.items.map((it) => (
            <button key={it.id} type="button" className={`${cls(it.id, 'l')} sw`} disabled={done.includes(it.id)} onClick={() => setLeft(it.id)}>
              {it.sw}
            </button>
          ))}
        </div>
        <div className="match-col">
          {ex.right.map((it) => (
            <button key={it.id} type="button" className={cls(it.id, 'r')} disabled={done.includes(it.id)} onClick={() => setRight(it.id)}>
              <Meaning item={it} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function DialogueView({ ex, draft, setDraft, locked }: { ex: Extract<Exercise, { kind: 'dialogue' }> } & Omit<Props, 'ex' | 'onMatchDone'>) {
  const { t, p } = useStore();
  const [shown, setShown] = useState<number[]>([]);
  const speakers = useMemo(() => [...new Set(ex.ex.lines.map((l) => l.who))], [ex.ex.lines]);
  return (
    <div className="ex">
      <p className="ex-title">{t('dialogue')}</p>
      <div className="dialogue">
        {ex.ex.lines.map((l, i) => (
          <div key={i} className={`line ${speakers.indexOf(l.who) % 2 ? 'line-right' : ''}`}>
            <span className="who">{l.who}</span>
            <button type="button" className="line-bubble" onClick={() => setShown((s) => (s.includes(i) ? s : [...s, i]))}>
              <span className="sw">{l.sw}</span>
              {(shown.includes(i) || locked) && <span className="line-meaning">{l[p.lang]}</span>}
            </button>
            <SpeakButtons text={l.sw} />
          </div>
        ))}
      </div>
      <p className="question">{ex.ex.question[p.lang]}</p>
      <Options labels={ex.order.map((i) => ex.ex.options[i][p.lang])} draft={draft} setDraft={setDraft} locked={locked} />
    </div>
  );
}
