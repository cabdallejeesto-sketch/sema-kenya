import { getUnit } from '../content';
import { SpeakButtons, VarietyBadge } from './common';
import { useStore } from './store';

export function GuideView({ unitId, go }: { unitId: string; go: (hash: string) => void }) {
  const { p, t } = useStore();
  const unit = getUnit(unitId);
  if (!unit) return <p className="page">Unit not found.</p>;
  return (
    <div className="page guide" style={{ ['--unit' as string]: unit.color }}>
      <button type="button" className="btn btn-ghost" onClick={() => go('#/')}>
        ← {t('back')}
      </button>
      <h1>
        {t('guide')}: {unit.title[p.lang]}
      </h1>
      <p className="sw unit-sw">{unit.swTitle}</p>
      <p className={`review-status ${unit.reviewed ? 'ok' : ''}`}>{unit.reviewed ? t('checked') : t('notChecked')}</p>
      {unit.guide.map((tip, i) => (
        <section key={i} className="card tip">
          <h2>{tip.title[p.lang]}</h2>
          <p>{tip.body[p.lang]}</p>
          {tip.examples && (
            <ul className="examples">
              {tip.examples.map((ex, j) => (
                <li key={j}>
                  <span className="sw">{ex.sw}</span>
                  <SpeakButtons text={ex.sw} />
                  {ex.v && <VarietyBadge v={ex.v} />}
                  <span className="muted">{ex[p.lang]}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
