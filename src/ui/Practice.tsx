import { ITEMS } from '../content';
import { dueItems, strength } from '../engine/srs';
import { Meaning, VarietyBadge } from './common';
import { Repeat } from './icons';
import { useStore } from './store';

export function PracticeView({ go }: { go: (hash: string) => void }) {
  const { p, t } = useStore();
  const learned = Object.keys(p.items).filter((id) => ITEMS.has(id));
  const due = dueItems(p.items, Date.now(), 999).filter((id) => ITEMS.has(id));
  const sorted = [...learned].sort((a, b) => strength(p.items[a]) - strength(p.items[b]));

  return (
    <div className="page">
      <h1>{t('practiceTitle')}</h1>
      <p className="muted">{t('practiceIntro')}</p>
      {!learned.length ? (
        <p className="notice">{t('practiceNothing')}</p>
      ) : (
        <>
          <div className="card practice-card">
            <Repeat size={32} />
            <p>{due.length ? t('practiceDue', { n: due.length }) : t('practiceNoneDue')}</p>
            <button type="button" className="btn btn-primary" onClick={() => go('#/practice/go')}>
              {t('practiceStart')}
            </button>
          </div>
          <h2>
            {t('wordsLearned')}: {learned.length}
          </h2>
          <ul className="word-list">
            {sorted.map((id) => {
              const it = ITEMS.get(id)!;
              const s = strength(p.items[id]);
              return (
                <li key={id} className="word-row">
                  <div>
                    <span className="sw">{it.sw}</span> <VarietyBadge v={it.v} />
                    <div className="muted small">
                      <Meaning item={it} />
                    </div>
                  </div>
                  <div className="strength" title={s >= 50 ? t('strong') : t('learning')}>
                    <div className="strength-fill" style={{ width: `${Math.max(8, s)}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
