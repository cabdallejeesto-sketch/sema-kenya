// Spaced repetition: a simple Leitner box system.
// A word moves up a box each time it is answered without mistakes, and back to box 1 after a mistake.

export interface ItemState {
  box: number;
  due: number; // timestamp (ms) when the word should be practised again
  seen: number;
  wrong: number;
}

export const DAY = 24 * 60 * 60 * 1000;

/** Days until the next review for each box. */
export const INTERVALS = [0, 1, 3, 7, 16, 35, 80];

export function review(prev: ItemState | undefined, correct: boolean, now: number): ItemState {
  const s = prev ?? { box: 0, due: now, seen: 0, wrong: 0 };
  const box = correct ? Math.min(s.box + 1, INTERVALS.length - 1) : 1;
  return {
    box,
    due: now + INTERVALS[box] * DAY,
    seen: s.seen + 1,
    wrong: s.wrong + (correct ? 0 : 1),
  };
}

/** Words that are due for practice, oldest due first. */
export function dueItems(states: Record<string, ItemState>, now: number, limit: number): string[] {
  return Object.entries(states)
    .filter(([, s]) => s.due <= now)
    .sort((a, b) => a[1].due - b[1].due || a[1].box - b[1].box)
    .slice(0, limit)
    .map(([id]) => id);
}

/** The weakest words, used when nothing is due yet. */
export function weakestItems(states: Record<string, ItemState>, limit: number): string[] {
  return Object.entries(states)
    .sort((a, b) => a[1].box - b[1].box || b[1].wrong - a[1].wrong || a[1].due - b[1].due)
    .slice(0, limit)
    .map(([id]) => id);
}

export function strength(state: ItemState | undefined): number {
  if (!state) return 0;
  return Math.round((state.box / (INTERVALS.length - 1)) * 100);
}
