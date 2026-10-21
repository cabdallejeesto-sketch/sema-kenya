import { GOALS, UNITS } from '../content';
import type { Lesson, Unit } from '../content/types';
import type { Progress } from '../engine/progress';
import { Book, Check, Lock, Star } from './icons';
import { useStore } from './store';

export function visibleLessons(unit: Unit, p: Progress): Lesson[] {
  return unit.lessons.filter((l) => !l.goals || p.showAllLessons || l.goals.some((g) => p.goals.includes(g)));
}

export function pathOrder(p: Progress): { unit: Unit; lesson: Lesson; key: string }[] {
  return UNITS.flatMap((unit) => visibleLessons(unit, p).map((lesson) => ({ unit, lesson, key: `${unit.id}/${lesson.id}` })));
}

const OFFSETS = [0, 46, 72, 46, 0, -46, -72, -46];

export function PathView({ go }: { go: (hash: string) => void }) {
  const { p, t } = useStore();
  const order = pathOrder(p);
  const isDone = (key: string) => !!p.lessons[key];
  const unlocked = (i: number) => p.unlockAll || i === 0 || isDone(order[i - 1].key);
  const nextIndex = order.findIndex((x, i) => !isDone(x.key) && unlocked(i));
  const goalName = (id: string) => GOALS.find((g) => g.id === id)?.title[p.lang] ?? id;

  let n = 0;
  return (
    <div className="path">
      {p.goals.includes('sports') && <p className="notice">{t('sportsComing')}</p>}
      {UNITS.map((unit, ui) => {
        const lessons = visibleLessons(unit, p);
        if (!lessons.length) return null;
        return (
          <section key={unit.id} className="unit" style={{ ['--unit' as string]: unit.color }}>
            <header className="unit-head">
              <div>
                <p className="unit-kicker">
                  {t('unit', { n: ui + 1 })} · {t('level', { level: unit.level })}
                </p>
                <h2>{unit.title[p.lang]}</h2>
                <p className="unit-sw sw">{unit.swTitle}</p>
                <p className="unit-desc">{unit.description[p.lang]}</p>
                <p className={`review-status ${unit.reviewed ? 'ok' : ''}`}>{unit.reviewed ? t('checked') : t('notChecked')}</p>
              </div>
              <button type="button" className="btn btn-ghost unit-guide" onClick={() => go(`#/guide/${unit.id}`)}>
                <Book size={18} /> {t('openGuide')}
              </button>
            </header>
            <ol className="lessons">
              {lessons.map((lesson, li) => {
                const i = order.findIndex((x) => x.unit.id === unit.id && x.lesson.id === lesson.id);
                const key = `${unit.id}/${lesson.id}`;
                const done = isDone(key);
                const open = unlocked(i);
                const current = i === nextIndex;
                const offset = OFFSETS[(n++) % OFFSETS.length];
                return (
                  <li key={lesson.id} className="lesson-node" style={{ transform: `translateX(${offset}px)` }}>
                    <button
                      type="button"
                      className={`node ${done ? 'done' : ''} ${open ? 'open' : 'locked'} ${current ? 'current' : ''}`}
                      disabled={!open}
                      title={open ? lesson.title[p.lang] : t('locked')}
                      aria-label={`${lesson.title[p.lang]}${done ? ` (${t('lessonDone')})` : ''}`}
                      onClick={() => go(`#/lesson/${unit.id}/${lesson.id}`)}
                    >
                      {done ? <Check size={30} /> : open ? <Star size={28} /> : <Lock size={24} />}
                    </button>
                    <span className="node-label">
                      {li + 1}. {lesson.title[p.lang]}
                      {lesson.goals && <span className="for-you">{t('forYou', { goal: lesson.goals.map(goalName).join(', ') })}</span>}
                    </span>
                    {current && <span className="node-start">{t('start')}</span>}
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
