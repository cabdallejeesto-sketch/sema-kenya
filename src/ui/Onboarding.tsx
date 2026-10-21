import { useState } from 'react';
import { GOALS } from '../content';
import { Check } from './icons';
import { Logo } from './Logo';
import { useStore } from './store';

const DAILY = [
  { xp: 10, min: 5, key: 'obDailyCasual' },
  { xp: 20, min: 10, key: 'obDailyRegular' },
  { xp: 40, min: 20, key: 'obDailySerious' },
] as const;

export function Onboarding() {
  const { p, t, dispatch } = useStore();
  const [step, setStep] = useState(0);
  const [someSwahili, setSomeSwahili] = useState(false);

  const finish = () => dispatch({ type: 'set', patch: { onboarded: true, unlockAll: someSwahili } });

  return (
    <div className="onboarding">
      <div className="ob-head">
        <Logo size={64} />
        <div className="ob-dots" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={i <= step ? 'on' : ''} />
          ))}
        </div>
      </div>

      {step === 0 && (
        <section className="ob-step">
          <h1>{t('obWelcome')}</h1>
          <p className="muted">{t('obIntro')}</p>
          <h2>{t('obLanguage')}</h2>
          <div className="choice-list">
            {(['en', 'so'] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                className={`choice ${p.lang === lang ? 'selected' : ''}`}
                onClick={() => dispatch({ type: 'set', patch: { lang } })}
              >
                <strong>{lang === 'en' ? 'English' : 'Af-Soomaali'}</strong>
                <span className="muted">{lang === 'en' ? 'Explanations in English' : 'Sharraxaad Soomaali ah'}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {step === 1 && (
        <section className="ob-step">
          <h1>{t('obGoals')}</h1>
          <p className="muted">{t('obGoalsHint')}</p>
          <div className="choice-list">
            {GOALS.map((g) => {
              const on = p.goals.includes(g.id);
              return (
                <button
                  key={g.id}
                  type="button"
                  aria-pressed={on}
                  className={`choice ${on ? 'selected' : ''}`}
                  onClick={() => dispatch({ type: 'toggleGoal', goal: g.id })}
                >
                  <strong>{g.title[p.lang]}</strong>
                  <span className="muted">{g.hint[p.lang]}</span>
                  {on && <Check className="choice-check" />}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="ob-step">
          <h1>{t('obLevel')}</h1>
          <div className="choice-list">
            {[false, true].map((some) => (
              <button
                key={String(some)}
                type="button"
                className={`choice ${someSwahili === some ? 'selected' : ''}`}
                onClick={() => setSomeSwahili(some)}
              >
                <strong>{some ? t('obLevelSome') : t('obLevelNew')}</strong>
                <span className="muted">{some ? t('obLevelSomeHint') : t('obLevelNewHint')}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="ob-step">
          <h1>{t('obDaily')}</h1>
          <div className="choice-list">
            {DAILY.map((d) => (
              <button
                key={d.xp}
                type="button"
                className={`choice ${p.dailyGoal === d.xp ? 'selected' : ''}`}
                onClick={() => dispatch({ type: 'set', patch: { dailyGoal: d.xp } })}
              >
                <strong>{t(d.key)}</strong>
                <span className="muted">
                  {t('obMinutes', { n: d.min })} · {d.xp} XP
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="ob-nav">
        {step > 0 && (
          <button type="button" className="btn btn-ghost" onClick={() => setStep(step - 1)}>
            {t('back')}
          </button>
        )}
        {step < 3 ? (
          <button type="button" className="btn btn-primary" onClick={() => setStep(step + 1)}>
            {t('next')}
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={finish}>
            {t('obStart')}
          </button>
        )}
      </div>
    </div>
  );
}
