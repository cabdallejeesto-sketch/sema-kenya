import { GOALS, VARIETIES } from '../content';
import type { Variety } from '../content/types';
import { play } from '../engine/speech';
import { REPO_URL, VarietyBadge } from './common';
import { useStore } from './store';

export function ProfileView() {
  const { p, t, dispatch, voice } = useStore();
  const set = (patch: Partial<typeof p>) => dispatch({ type: 'set', patch });

  return (
    <div className="page settings">
      <h1>{t('settings')}</h1>

      <section className="card">
        <h2>{t('language')}</h2>
        <div className="segmented">
          {(['en', 'so'] as const).map((lang) => (
            <button key={lang} type="button" className={p.lang === lang ? 'selected' : ''} onClick={() => set({ lang })}>
              {lang === 'en' ? 'English' : 'Af-Soomaali'}
            </button>
          ))}
        </div>
        {p.lang === 'so' && (
          <label className="toggle">
            <input type="checkbox" checked={p.showEnglishToo} onChange={(e) => set({ showEnglishToo: e.target.checked })} />
            {t('englishToo')}
          </label>
        )}
      </section>

      <section className="card">
        <h2>{t('goals')}</h2>
        <div className="chips">
          {GOALS.map((g) => (
            <button
              key={g.id}
              type="button"
              aria-pressed={p.goals.includes(g.id)}
              className={`chip ${p.goals.includes(g.id) ? 'selected' : ''}`}
              onClick={() => dispatch({ type: 'toggleGoal', goal: g.id })}
            >
              {g.title[p.lang]}
            </button>
          ))}
        </div>
        <label className="toggle">
          <input type="checkbox" checked={p.showAllLessons} onChange={(e) => set({ showAllLessons: e.target.checked })} />
          <span>
            {t('showAll')}
            <small className="muted">{t('showAllHint')}</small>
          </span>
        </label>
        <label className="toggle">
          <input type="checkbox" checked={p.unlockAll} onChange={(e) => set({ unlockAll: e.target.checked })} />
          <span>
            {t('unlockAll')}
            <small className="muted">{t('unlockAllHint')}</small>
          </span>
        </label>
      </section>

      <section className="card">
        <h2>{t('dailyGoal')}</h2>
        <div className="segmented">
          {[10, 20, 40].map((xp) => (
            <button key={xp} type="button" className={p.dailyGoal === xp ? 'selected' : ''} onClick={() => set({ dailyGoal: xp })}>
              {xp} XP
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>{t('voice')}</h2>
        <p>{t('voiceRecorded')}</p>
        <div className="row-buttons">
          <button type="button" className="btn btn-ghost" onClick={() => void play('Karibu')}>
            {t('testVoice')}: Zuri
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => void play('Karibu', { voice: 'm' })}>
            {t('testVoice')}: Rafiki
          </button>
        </div>
        <label className="toggle">
          <input type="checkbox" checked={p.sfx} onChange={(e) => set({ sfx: e.target.checked })} />
          <span>
            {t('sfx')}
            <small className="muted">{t('sfxHint')}</small>
          </span>
        </label>
        <p className="muted small">{t('voiceHelp')}</p>
        {voice.available && <p className="muted small">{t('voiceOk', { name: voice.name ?? '' })}</p>}
      </section>

      <section className="card">
        <h2>{t('labelsTitle')}</h2>
        <ul className="legend">
          {(Object.keys(VARIETIES) as Variety[]).map((v) => (
            <li key={v}>
              <VarietyBadge v={v} />
              <span>{VARIETIES[v].desc[p.lang]}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2>{t('about')}</h2>
        <p>{t('aboutBody')}</p>
        <p>
          <a href={`${REPO_URL}/issues`} target="_blank" rel="noreferrer">
            {t('report')}
          </a>
        </p>
      </section>

      <button
        type="button"
        className="btn btn-danger-ghost"
        onClick={() => {
          if (window.confirm(t('resetConfirm'))) dispatch({ type: 'reset' });
        }}
      >
        {t('reset')}
      </button>
    </div>
  );
}
