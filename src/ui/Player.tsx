import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Exercise } from '../engine/generate';
import { sessionXp } from '../engine/progress';
import { currentStreak, dayKey } from '../engine/progress';
import { reportUrl } from './common';
import { ExerciseView, grade, isReady, type Draft, type Grade } from './exercises';
import { Bolt, Check, Close, Flame, Flag } from './icons';
import { useStore } from './store';

interface Props {
  exercises: Exercise[];
  /** "unitId/lessonId" for lessons, undefined for practice. */
  lessonKey?: string;
  title: string;
  onExit: () => void;
}

interface Summary {
  xp: number;
  accuracy: number;
  words: number;
}

export function Player({ exercises, lessonKey, title, onExit }: Props) {
  const { t, p, dispatch } = useStore();
  const [queue, setQueue] = useState<Exercise[]>(exercises);
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState<Draft>({});
  const [feedback, setFeedback] = useState<Grade | null>(null);
  const [matchDone, setMatchDone] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const mistakeItems = useRef(new Set<string>());
  const seenItems = useRef(new Set<string>());
  const repeated = useRef(new Set<string>());
  const graded = useRef({ total: 0, correct: 0 });

  const ex = queue[index];
  const graded_ = ex && ex.kind !== 'teach' && ex.kind !== 'match';

  const finish = useCallback(() => {
    const results: Record<string, boolean> = {};
    for (const id of seenItems.current) results[id] = !mistakeItems.current.has(id);
    const { total, correct } = graded.current;
    const accuracy = total ? Math.round((correct / total) * 100) : 100;
    const xp = sessionXp(!!lessonKey, mistakeItems.current.size);
    dispatch({ type: 'finishSession', lessonKey, accuracy, xp, results, now: Date.now() });
    setSummary({ xp, accuracy, words: seenItems.current.size });
  }, [dispatch, lessonKey]);

  const advance = useCallback(() => {
    setFeedback(null);
    setDraft({});
    setMatchDone(false);
    if (index + 1 >= queue.length) finish();
    else setIndex(index + 1);
  }, [index, queue.length, finish]);

  const check = useCallback(() => {
    if (!ex || feedback) return;
    if (ex.kind === 'teach') return advance();
    if (!graded_) return; // match: wait until every pair is matched
    if (!isReady(ex, draft)) return;
    const g = grade(ex, draft, p.lang);
    ex.itemIds.forEach((id) => seenItems.current.add(id));
    graded.current.total += 1;
    if (g.ok) graded.current.correct += 1;
    else {
      ex.itemIds.forEach((id) => mistakeItems.current.add(id));
      if (!repeated.current.has(ex.key)) {
        repeated.current.add(ex.key);
        setQueue((q) => [...q, { ...ex, key: `${ex.key}-again` }]);
      }
    }
    setFeedback(g);
  }, [ex, feedback, graded_, draft, p.lang, advance]);

  const onMatchDone = useCallback((wrongIds: string[]) => {
    if (!ex) return;
    ex.itemIds.forEach((id) => seenItems.current.add(id));
    wrongIds.forEach((id) => mistakeItems.current.add(id));
    graded.current.total += 1;
    if (!wrongIds.length) graded.current.correct += 1;
    setMatchDone(true);
  }, [ex]);

  // Keyboard: Enter checks / continues, number keys pick options.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (summary) {
        if (e.key === 'Enter') onExit();
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (feedback || (ex?.kind === 'match' && matchDone) || ex?.kind === 'teach') advance();
        else check();
        return;
      }
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT') return;
      const n = Number(e.key);
      if (!feedback && n >= 1 && n <= 9 && ex && 'options' in ex && n <= ex.options.length) setDraft({ choice: n - 1 });
      if (!feedback && n >= 1 && n <= 9 && ex && 'order' in ex && n <= ex.order.length) setDraft({ choice: n - 1 });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [summary, feedback, ex, matchDone, advance, check, onExit]);

  const progress = useMemo(() => (queue.length ? (index + (feedback || matchDone ? 1 : 0)) / queue.length : 0), [index, queue.length, feedback, matchDone]);

  if (summary) {
    const today = dayKey(new Date());
    return (
      <div className="complete">
        <div className="complete-badge">
          <Check size={44} />
        </div>
        <h1>{lessonKey ? t('lessonComplete') : t('practiceComplete')}</h1>
        <p className="muted">{title}</p>
        <div className="stats-grid">
          <div className="stat">
            <Bolt />
            <strong>+{summary.xp}</strong>
            <span>{t('xpEarned')}</span>
          </div>
          <div className="stat">
            <Check />
            <strong>{summary.accuracy}%</strong>
            <span>{t('accuracy')}</span>
          </div>
          <div className="stat">
            <Flame />
            <strong>{currentStreak(p, today)}</strong>
            <span>{t('streakDays')}</span>
          </div>
        </div>
        <button type="button" className="btn btn-primary btn-wide" onClick={onExit} autoFocus>
          {t('continue')}
        </button>
      </div>
    );
  }

  if (!ex) return null;

  const canContinue = feedback || ex.kind === 'teach' || (ex.kind === 'match' && matchDone);
  const fbClass = feedback ? (feedback.ok ? (feedback.typo ? 'fb-typo' : 'fb-ok') : 'fb-bad') : '';
  const itemText = 'item' in ex ? ex.item.sw : ex.kind === 'build' ? ex.ex.answer : '';

  return (
    <div className="player">
      <header className="player-top">
        <button
          type="button"
          className="icon-btn"
          aria-label={t('quit')}
          onClick={() => {
            if (window.confirm(t('quitConfirm'))) onExit();
          }}
        >
          <Close />
        </button>
        <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
          <div className="bar-fill" style={{ width: `${progress * 100}%` }} />
        </div>
      </header>

      <main className="player-body" key={ex.key}>
        <ExerciseView ex={ex} draft={draft} setDraft={setDraft} locked={!!feedback} onMatchDone={onMatchDone} />
      </main>

      <footer className={`player-foot ${fbClass}`}>
        {feedback && (
          <div className="fb">
            <strong className="fb-title">{feedback.ok ? (feedback.typo ? t('typo') : t('correct')) : t('wrong')}</strong>
            {(!feedback.ok || feedback.typo) && <span className="fb-answer sw">{feedback.answer}</span>}
            <a
              className="report"
              href={reportUrl(`Content: ${itemText || ex.kind}`, `Lesson: ${lessonKey ?? 'practice'}\nExercise: ${ex.kind}\nShown answer: ${feedback.answer}\n\nWhat is wrong?\n`)}
              target="_blank"
              rel="noreferrer"
            >
              <Flag size={16} /> {t('report')}
            </a>
          </div>
        )}
        <button
          type="button"
          className={`btn btn-wide ${canContinue ? (feedback && !feedback.ok ? 'btn-danger' : 'btn-primary') : 'btn-primary'}`}
          disabled={!canContinue && !isReady(ex, draft)}
          onClick={canContinue ? advance : check}
        >
          {canContinue ? t('continue') : t('check')}
        </button>
      </footer>
    </div>
  );
}
