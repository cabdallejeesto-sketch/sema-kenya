import { useEffect, useMemo, useRef, useState } from 'react';
import { acceptedSw, meaning, type Exercise, type Lang, type StoryEx } from '../engine/generate';
import { checkAnswer, normalize } from '../engine/check';
import { play, playAll, stop } from '../engine/speech';
import { gapSentence, HEARD, itemSpeech, NARRATOR, speakerVoices, type Speech, type VoiceId } from '../engine/voice-lines';
import { Meaning, SpeakButtons, usePlaying, VarietyBadge } from './common';
import { Play, StopIcon } from './icons';
import { useStore } from './store';

/** What the learner has chosen or typed so far. */
export type Draft = { choice?: number; text?: string; words?: number[] };

export interface Grade {
  ok: boolean;
  typo?: boolean;
  /** The right answer, shown after a wrong (or typo) answer. */
  answer: string;
}

/** Screens that only show something and need no answer. */
export const isInfo = (ex: Exercise) => ex.kind === 'teach' || ex.kind === 'story-read';

export function isReady(ex: Exercise, d: Draft): boolean {
  switch (ex.kind) {
    case 'teach':
    case 'story-read':
      return true;
    case 'match':
      return false; // finishes by itself when every pair is matched
    case 'type-sw':
    case 'listen-type':
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
    case 'type-sw':
    case 'listen-type': {
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
      return { ok, answer: gapSentence(ex.ex) };
    }
    case 'dialogue': {
      const ok = ex.order[d.choice ?? -1] === ex.ex.answer;
      return { ok, answer: ex.ex.options[ex.ex.answer][lang] };
    }
    case 'story-q': {
      const q = ex.story.questions[ex.q];
      const ok = ex.order[d.choice ?? -1] === q.answer;
      return { ok, answer: q.options[q.answer][lang] };
    }
    default:
      return { ok: true, answer: '' };
  }
}

/** The Swahili that is read aloud once the answer has been checked. */
export function answerSpeech(ex: Exercise): Speech | null {
  switch (ex.kind) {
    case 'pick-sw':
    case 'listen-pick':
    case 'type-sw':
    case 'listen-type':
      return [itemSpeech(ex.item), NARRATOR];
    case 'build':
      return [ex.ex.answer, NARRATOR];
    case 'gap':
      return [gapSentence(ex.ex), NARRATOR];
    case 'respond':
      return [ex.ex.options[ex.ex.answer], NARRATOR];
    default:
      return null;
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
  speech,
}: {
  labels: React.ReactNode[];
  draft: Draft;
  setDraft: (d: Draft) => void;
  locked: boolean;
  sw?: boolean;
  /** Swahili read aloud when an option is chosen. */
  speech?: string[];
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
          onClick={() => {
            setDraft({ choice: i });
            if (speech?.[i]) void play(speech[i]);
          }}
        >
          <span className="key">{i + 1}</span>
          <span className="option-label">{label}</span>
        </button>
      ))}
    </div>
  );
}

function TypeInput({ draft, setDraft, locked }: Omit<Props, 'ex' | 'onMatchDone'>) {
  const { t } = useStore();
  return (
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
  );
}

export function ExerciseView({ ex, draft, setDraft, locked, onMatchDone }: Props) {
  const { t, p } = useStore();

  switch (ex.kind) {
    case 'teach': {
      const it = ex.item;
      return (
        <div className="ex teach">
          <p className="ex-title">{it.sw.includes(' ') ? t('newPhrase') : t('newWord')}</p>
          <div className="teach-card">
            <div className="teach-sw">
              <SpeakButtons text={itemSpeech(it)} big />
              <span className="sw big">{it.sw}</span>
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
          <AutoSpeak text={itemSpeech(it)} />
        </div>
      );
    }

    case 'pick-meaning':
      return (
        <div className="ex">
          <p className="ex-title">{t('pickMeaning')}</p>
          <div className="prompt">
            <SpeakButtons text={itemSpeech(ex.item)} />
            <span className="sw big">{ex.item.sw}</span>
          </div>
          <AutoSpeak text={itemSpeech(ex.item)} />
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
          <Options
            labels={ex.options.map((o) => o.sw)}
            speech={ex.options.map(itemSpeech)}
            draft={draft}
            setDraft={setDraft}
            locked={locked}
            sw
          />
        </div>
      );

    case 'listen-pick':
      return (
        <div className="ex">
          <p className="ex-title">{t('listenPick')}</p>
          <div className="prompt center">
            <SpeakButtons text={itemSpeech(ex.item)} big />
          </div>
          <AutoSpeak text={itemSpeech(ex.item)} />
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
          <TypeInput draft={draft} setDraft={setDraft} locked={locked} />
        </div>
      );

    case 'listen-type':
      return (
        <div className="ex">
          <p className="ex-title">{t('listenType')}</p>
          <div className="prompt center">
            <SpeakButtons text={itemSpeech(ex.item)} big />
          </div>
          <AutoSpeak text={itemSpeech(ex.item)} />
          <TypeInput draft={draft} setDraft={setDraft} locked={locked} />
          {locked && (
            <p className="muted center">
              <Meaning item={ex.item} />
            </p>
          )}
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
            <SpeakButtons text={ex.ex.heard} voice={HEARD} />
            <span className="sw">{ex.ex.heard}</span>
          </div>
          <AutoSpeak text={ex.ex.heard} voice={HEARD} />
          <Options
            labels={ex.order.map((i) => ex.ex.options[i])}
            speech={ex.order.map((i) => ex.ex.options[i])}
            draft={draft}
            setDraft={setDraft}
            locked={locked}
            sw
          />
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

    case 'story-read':
      return (
        <div className="ex">
          <p className="ex-title">{t('storyRead')}</p>
          <StoryText story={ex.story} autoPlay />
        </div>
      );

    case 'story-q': {
      const q = ex.story.questions[ex.q];
      return (
        <div className="ex">
          <p className="ex-title">{t('storyQuestion', { n: ex.q + 1, total: ex.story.questions.length })}</p>
          <details className="story-again">
            <summary>{t('storyAgain', { title: ex.story.title[p.lang] })}</summary>
            <StoryText story={ex.story} />
          </details>
          <p className="question">{q.question[p.lang]}</p>
          <Options labels={ex.order.map((i) => q.options[i][p.lang])} draft={draft} setDraft={setDraft} locked={locked} />
        </div>
      );
    }
  }
}

/** Reads the text aloud a moment after the screen opens. */
function AutoSpeak({ text, voice = NARRATOR }: { text: string; voice?: VoiceId }) {
  useEffect(() => {
    const id = window.setTimeout(() => void play(text, { voice }), 250);
    return () => window.clearTimeout(id);
  }, [text, voice]);
  return null;
}

/** "Play all" for a conversation or story: reads every line in turn and shows which line is playing. */
function PlayAllButton({ lines, onLine, autoPlay = false }: { lines: Speech[]; onLine: (i: number) => void; autoPlay?: boolean }) {
  const { t } = useStore();
  const [on, setOn] = useState(false);
  const start = () => {
    setOn(true);
    void playAll(lines, onLine).then(() => setOn(false));
  };
  useEffect(() => {
    if (!autoPlay) return;
    const id = window.setTimeout(start, 400);
    return () => window.clearTimeout(id);
  }, []);
  useEffect(() => () => stop(), []);
  return (
    <button
      type="button"
      className="btn btn-ghost play-all"
      onClick={() => {
        if (on) {
          stop();
          setOn(false);
        } else start();
      }}
    >
      {on ? <StopIcon size={18} /> : <Play size={18} />} {on ? t('stopAudio') : t('playAll')}
    </button>
  );
}

function Line({ sw, who, voice, translation, right, current, reveal }: {
  sw: string;
  who?: string;
  voice: VoiceId;
  translation: string;
  right: boolean;
  current: boolean;
  reveal: boolean;
}) {
  const [shown, setShown] = useState(false);
  const playing = usePlaying(sw);
  return (
    <div className={`line ${right ? 'line-right' : ''} ${who ? '' : 'line-narration'}`}>
      {who && <span className="who">{who}</span>}
      <button type="button" className={`line-bubble ${current || playing ? 'line-playing' : ''}`} onClick={() => setShown((s) => !s)}>
        <span className="sw">{sw}</span>
        {(shown || reveal) && <span className="line-meaning">{translation}</span>}
      </button>
      <SpeakButtons text={sw} voice={voice} slow={false} />
    </div>
  );
}

function StoryText({ story, autoPlay = false }: { story: StoryEx; autoPlay?: boolean }) {
  const { t, p } = useStore();
  const [current, setCurrent] = useState(-1);
  const voice = useMemo(() => speakerVoices(story.lines), [story.lines]);
  const speakers = useMemo(() => [...new Set(story.lines.map((l) => l.who).filter(Boolean))], [story.lines]);
  const lines = useMemo(() => story.lines.map((l): Speech => [l.sw, voice(l.who)]), [story.lines, voice]);
  return (
    <div className="story">
      <div className="story-head">
        <h2 className="story-title">{story.title[p.lang]}</h2>
        <PlayAllButton lines={lines} onLine={setCurrent} autoPlay={autoPlay} />
      </div>
      <p className="muted small">{t('tapLine')}</p>
      <div className="dialogue">
        {story.lines.map((l, i) => (
          <Line
            key={i}
            sw={l.sw}
            who={l.who}
            voice={voice(l.who)}
            translation={l[p.lang]}
            right={!!l.who && speakers.indexOf(l.who) % 2 === 1}
            current={current === i}
            reveal={false}
          />
        ))}
      </div>
    </div>
  );
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
    } else {
      mistakes.current.add(left);
      mistakes.current.add(right);
      setWrong([left, right]);
      window.setTimeout(() => setWrong([]), 600);
    }
    setLeft(null);
    setRight(null);
  }, [left, right]);

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
            <button
              key={it.id}
              type="button"
              className={`${cls(it.id, 'l')} sw`}
              disabled={done.includes(it.id)}
              onClick={() => {
                setLeft(it.id);
                void play(itemSpeech(it));
              }}
            >
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
  const [current, setCurrent] = useState(-1);
  const speakers = useMemo(() => [...new Set(ex.ex.lines.map((l) => l.who))], [ex.ex.lines]);
  const voice = useMemo(() => speakerVoices(ex.ex.lines), [ex.ex.lines]);
  const lines = useMemo(() => ex.ex.lines.map((l): Speech => [l.sw, voice(l.who)]), [ex.ex.lines, voice]);
  return (
    <div className="ex">
      <div className="story-head">
        <p className="ex-title">{t('dialogue')}</p>
        <PlayAllButton lines={lines} onLine={setCurrent} autoPlay />
      </div>
      <div className="dialogue">
        {ex.ex.lines.map((l, i) => (
          <Line
            key={i}
            sw={l.sw}
            who={l.who}
            voice={voice(l.who)}
            translation={l[p.lang]}
            right={speakers.indexOf(l.who) % 2 === 1}
            current={current === i}
            reveal={locked}
          />
        ))}
      </div>
      <p className="question">{ex.ex.question[p.lang]}</p>
      <Options labels={ex.order.map((i) => ex.ex.options[i][p.lang])} draft={draft} setDraft={setDraft} locked={locked} />
    </div>
  );
}
