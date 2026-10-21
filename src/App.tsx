import { useEffect, useState } from 'react';
import { getLesson, getUnit } from './content';
import { buildLesson, buildPractice } from './engine/generate';
import { currentStreak, dayKey } from './engine/progress';
import { dueItems, weakestItems } from './engine/srs';
import { GuideView } from './ui/Guide';
import { Bolt, Flame, Path as PathIcon, Repeat, User } from './ui/icons';
import { Logo } from './ui/Logo';
import { Onboarding } from './ui/Onboarding';
import { PathView } from './ui/Path';
import { Player } from './ui/Player';
import { PracticeView } from './ui/Practice';
import { ProfileView } from './ui/Profile';
import { useStore } from './ui/store';

function useHash(): [string, (h: string) => void] {
  const [hash, setHash] = useState(() => window.location.hash || '#/');
  useEffect(() => {
    const on = () => setHash(window.location.hash || '#/');
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const go = (h: string) => {
    if (h === window.location.hash) setHash(h);
    window.location.hash = h;
    window.scrollTo(0, 0);
  };
  return [hash, go];
}

function LessonRoute({ unitId, lessonId, go }: { unitId: string; lessonId: string; go: (h: string) => void }) {
  const { p, voice } = useStore();
  const unit = getUnit(unitId);
  const lesson = getLesson(unitId, lessonId);
  // Built once when the lesson opens, so saving progress at the end does not rebuild it.
  const [exercises] = useState(() =>
    unit && lesson ? buildLesson(unit, lesson, { states: p.items, canListen: voice.available }) : [],
  );
  if (!unit || !lesson) return <p className="page">Lesson not found.</p>;
  return <Player exercises={exercises} lessonKey={`${unitId}/${lessonId}`} title={lesson.title[p.lang]} onExit={() => go('#/')} />;
}

function PracticeRoute({ go }: { go: (h: string) => void }) {
  const { p, voice, t } = useStore();
  const [exercises] = useState(() => {
    const due = dueItems(p.items, Date.now(), 12);
    const ids = due.length >= 4 ? due : [...new Set([...due, ...weakestItems(p.items, 12)])].slice(0, 12);
    return buildPractice(ids, voice.available);
  });
  if (!exercises.length) {
    go('#/practice');
    return null;
  }
  return <Player exercises={exercises} title={t('practiceTitle')} onExit={() => go('#/practice')} />;
}

export function App() {
  const { p, t } = useStore();
  const [hash, go] = useHash();

  if (!p.onboarded) return <Onboarding />;

  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts[0] === 'lesson' && parts[1] && parts[2]) return <LessonRoute key={hash} unitId={parts[1]} lessonId={parts[2]} go={go} />;
  if (parts[0] === 'practice' && parts[1] === 'go') return <PracticeRoute key={hash} go={go} />;

  const tab = parts[0] === 'practice' ? 'practice' : parts[0] === 'me' ? 'me' : 'learn';
  const today = dayKey(new Date());
  const todayXp = p.daily[today] ?? 0;
  const goalPct = Math.min(100, Math.round((todayXp / p.dailyGoal) * 100));

  return (
    <div className="shell">
      <header className="topbar">
        <button type="button" className="brand" onClick={() => go('#/')}>
          <Logo size={34} />
          <span>{t('appName')}</span>
        </button>
        <div className="top-stats">
          <span className="top-stat streak" title={t('streak')}>
            <Flame size={20} /> {currentStreak(p, today)}
          </span>
          <span className="top-stat xp" title={t('xp')}>
            <Bolt size={20} /> {p.xp}
          </span>
          <span className="goal-ring" title={`${t('todayGoal')}: ${todayXp}/${p.dailyGoal} XP`} style={{ ['--pct' as string]: `${goalPct}%` }}>
            <span>{goalPct}%</span>
          </span>
        </div>
      </header>

      <main className="content">
        {parts[0] === 'guide' && parts[1] ? (
          <GuideView unitId={parts[1]} go={go} />
        ) : tab === 'practice' ? (
          <PracticeView go={go} />
        ) : tab === 'me' ? (
          <ProfileView />
        ) : (
          <PathView go={go} />
        )}
      </main>

      <nav className="bottomnav" aria-label="Main">
        <button type="button" className={tab === 'learn' ? 'active' : ''} onClick={() => go('#/')}>
          <PathIcon /> <span>{t('navLearn')}</span>
        </button>
        <button type="button" className={tab === 'practice' ? 'active' : ''} onClick={() => go('#/practice')}>
          <Repeat /> <span>{t('navPractice')}</span>
        </button>
        <button type="button" className={tab === 'me' ? 'active' : ''} onClick={() => go('#/me')}>
          <User /> <span>{t('navProfile')}</span>
        </button>
      </nav>
    </div>
  );
}
