// Learner progress, saved in the browser (localStorage). No account, no server.

import type { GoalId } from '../content/types';
import type { Lang } from './generate';
import { review, type ItemState } from './srs';

export interface LessonRecord {
  times: number;
  best: number; // best accuracy, 0-100
}

export interface Progress {
  version: 1;
  lang: Lang;
  onboarded: boolean;
  goals: GoalId[];
  showAllLessons: boolean;
  unlockAll: boolean;
  dailyGoal: number; // XP per day
  xp: number;
  daily: Record<string, number>; // YYYY-MM-DD -> XP earned that day
  streak: number;
  lastDay: string | null;
  lessons: Record<string, LessonRecord>; // "unitId/lessonId"
  items: Record<string, ItemState>;
  showEnglishToo: boolean; // in Somali mode, also show English meanings
  sfx: boolean; // sound effects for right and wrong answers
}

export const STORAGE_KEY = 'sema-kenya:v1';

export const initialProgress = (): Progress => ({
  version: 1,
  lang: 'en',
  onboarded: false,
  goals: [],
  showAllLessons: false,
  unlockAll: false,
  dailyGoal: 20,
  xp: 0,
  daily: {},
  streak: 0,
  lastDay: null,
  lessons: {},
  items: {},
  showEnglishToo: true,
  sfx: true,
});

export function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function previousDay(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d - 1));
}

/** The streak that should be shown today (0 if a day was missed). */
export function currentStreak(p: Progress, today: string): number {
  if (!p.lastDay) return 0;
  return p.lastDay === today || p.lastDay === previousDay(today) ? p.streak : 0;
}

export function loadProgress(storage: Pick<Storage, 'getItem'> | undefined = globalThis.localStorage): Progress {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (!raw) return initialProgress();
    const parsed = JSON.parse(raw) as Partial<Progress>;
    if (parsed.version !== 1) return initialProgress();
    return { ...initialProgress(), ...parsed };
  } catch {
    return initialProgress();
  }
}

export function saveProgress(p: Progress, storage: Pick<Storage, 'setItem'> | undefined = globalThis.localStorage): void {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    /* storage full or blocked: progress for this session only */
  }
}

export type Action =
  | { type: 'set'; patch: Partial<Progress> }
  | { type: 'toggleGoal'; goal: GoalId }
  | {
      type: 'finishSession';
      lessonKey?: string; // undefined for practice sessions
      accuracy: number;
      xp: number;
      results: Record<string, boolean>; // itemId -> answered without mistakes
      now: number;
    }
  | { type: 'reset' };

export function reducer(p: Progress, a: Action): Progress {
  switch (a.type) {
    case 'set':
      return { ...p, ...a.patch };
    case 'toggleGoal':
      return { ...p, goals: p.goals.includes(a.goal) ? p.goals.filter((g) => g !== a.goal) : [...p.goals, a.goal] };
    case 'reset':
      return { ...initialProgress(), lang: p.lang };
    case 'finishSession': {
      const today = dayKey(new Date(a.now));
      let streak = p.streak;
      if (p.lastDay !== today) streak = p.lastDay === previousDay(today) ? p.streak + 1 : 1;
      const items = { ...p.items };
      for (const [id, ok] of Object.entries(a.results)) items[id] = review(items[id], ok, a.now);
      const lessons = { ...p.lessons };
      if (a.lessonKey) {
        const prev = lessons[a.lessonKey];
        lessons[a.lessonKey] = { times: (prev?.times ?? 0) + 1, best: Math.max(prev?.best ?? 0, a.accuracy) };
      }
      return {
        ...p,
        xp: p.xp + a.xp,
        daily: { ...p.daily, [today]: (p.daily[today] ?? 0) + a.xp },
        streak,
        lastDay: today,
        items,
        lessons,
      };
    }
  }
}

/** XP for a finished session: 10 for finishing, +5 with no mistakes. Practice gives a little less. */
export function sessionXp(isLesson: boolean, mistakes: number): number {
  const base = isLesson ? 10 : 6;
  return base + (mistakes === 0 ? 5 : 0);
}
