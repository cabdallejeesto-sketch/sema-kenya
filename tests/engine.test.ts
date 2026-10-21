import { describe, expect, it } from 'vitest';
import { checkAnswer, levenshtein, normalize } from '../src/engine/check';
import { DAY, dueItems, review } from '../src/engine/srs';
import { currentStreak, initialProgress, reducer, sessionXp } from '../src/engine/progress';

describe('normalize', () => {
  it('ignores case, punctuation and extra spaces', () => {
    expect(normalize('  Habari  yako? ')).toBe('habari yako');
    expect(normalize('Boda-boda!')).toBe('boda boda');
  });
  it('keeps the apostrophe used in Swahili spelling', () => {
    expect(normalize('ng’ombe')).toBe("ng'ombe");
  });
});

describe('checkAnswer', () => {
  it('accepts exact answers and listed alternatives', () => {
    expect(checkAnswer('niko poa', ['Niko poa']).result).toBe('correct');
    expect(checkAnswer('Niko sawa', ['Niko poa', 'niko sawa']).result).toBe('correct');
  });
  it('accepts a one-letter slip as a typo', () => {
    const r = checkAnswer('asantee', ['Asante']);
    expect(r.result).toBe('typo');
    expect(r.closest).toBe('Asante');
  });
  it('rejects wrong answers and empty input', () => {
    expect(checkAnswer('kwaheri', ['Asante']).result).toBe('wrong');
    expect(checkAnswer('   ', ['Asante']).result).toBe('wrong');
  });
  it('does not allow typos in very short words', () => {
    expect(checkAnswer('ba', ['bo']).result).toBe('wrong');
  });
  it('computes edit distance', () => {
    expect(levenshtein('poa', 'poa')).toBe(0);
    expect(levenshtein('sasa', 'saa')).toBe(1);
  });
});

describe('spaced repetition', () => {
  const now = Date.UTC(2026, 0, 10);
  it('moves a word up a box when answered correctly', () => {
    const s1 = review(undefined, true, now);
    expect(s1.box).toBe(1);
    expect(s1.due).toBe(now + DAY);
    const s2 = review(s1, true, now);
    expect(s2.box).toBe(2);
    expect(s2.due).toBe(now + 3 * DAY);
  });
  it('sends a word back to box 1 after a mistake', () => {
    const s = review({ box: 4, due: now, seen: 5, wrong: 0 }, false, now);
    expect(s.box).toBe(1);
    expect(s.wrong).toBe(1);
  });
  it('lists due words, oldest first', () => {
    const states = {
      a: { box: 1, due: now - 2 * DAY, seen: 1, wrong: 0 },
      b: { box: 2, due: now + DAY, seen: 1, wrong: 0 },
      c: { box: 1, due: now - DAY, seen: 1, wrong: 0 },
    };
    expect(dueItems(states, now, 10)).toEqual(['a', 'c']);
  });
});

describe('streak and XP', () => {
  const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12).getTime();
  const finish = (p: ReturnType<typeof initialProgress>, now: number) =>
    reducer(p, { type: 'finishSession', lessonKey: 'u/l', accuracy: 90, xp: 10, results: { x: true }, now });

  it('counts consecutive days and resets after a missed day', () => {
    let p = initialProgress();
    p = finish(p, at(2026, 3, 1));
    expect(p.streak).toBe(1);
    p = finish(p, at(2026, 3, 1));
    expect(p.streak).toBe(1);
    p = finish(p, at(2026, 3, 2));
    expect(p.streak).toBe(2);
    expect(currentStreak(p, '2026-03-03')).toBe(2);
    expect(currentStreak(p, '2026-03-05')).toBe(0);
    p = finish(p, at(2026, 3, 5));
    expect(p.streak).toBe(1);
  });
  it('records lessons, XP and word states', () => {
    const p = finish(initialProgress(), at(2026, 3, 1));
    expect(p.xp).toBe(10);
    expect(p.lessons['u/l']).toEqual({ times: 1, best: 90 });
    expect(p.items.x.box).toBe(1);
  });
  it('gives a bonus for a perfect session', () => {
    expect(sessionXp(true, 0)).toBe(15);
    expect(sessionXp(true, 2)).toBe(10);
    expect(sessionXp(false, 0)).toBe(11);
  });
});
