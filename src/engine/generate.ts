// Turns lesson content into a sequence of exercises.
// Authors only write items (+ a few hand-made exercises); the standard exercises are generated here.

import { ITEMS, getItem, type IndexedItem } from '../content';
import type { Authored, Lesson, Unit } from '../content/types';
import { normalize } from './check';
import type { ItemState } from './srs';

export type Lang = 'en' | 'so';

type BuildEx = Extract<Authored, { type: 'build' }>;
type RespondEx = Extract<Authored, { type: 'respond' }>;
type GapEx = Extract<Authored, { type: 'gap' }>;
type DialogueEx = Extract<Authored, { type: 'dialogue' }>;

interface Base {
  key: string;
  /** Items whose memory strength this exercise tests. */
  itemIds: string[];
}

export type Exercise = Base &
  (
    | { kind: 'teach'; item: IndexedItem }
    | { kind: 'pick-meaning'; item: IndexedItem; options: IndexedItem[] }
    | { kind: 'pick-sw'; item: IndexedItem; options: IndexedItem[] }
    | { kind: 'listen-pick'; item: IndexedItem; options: IndexedItem[] }
    | { kind: 'type-sw'; item: IndexedItem }
    | { kind: 'match'; items: IndexedItem[]; right: IndexedItem[] }
    | { kind: 'build'; ex: BuildEx; tiles: string[] }
    | { kind: 'respond'; ex: RespondEx; order: number[] }
    | { kind: 'gap'; ex: GapEx; order: number[] }
    | { kind: 'dialogue'; ex: DialogueEx; order: number[] }
  );

export type ExerciseKind = Exercise['kind'];

let counter = 0;
const nextKey = () => `x${++counter}`;

export function shuffle<T>(arr: T[], rnd: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const meaningKey = (it: IndexedItem) => normalize(it.en);

/** Wrong options: never a synonym, never the same Swahili text, never the same meaning. */
export function pickDistractors(item: IndexedItem, n = 3, rnd: () => number = Math.random): IndexedItem[] {
  const ok = (c: IndexedItem) =>
    c.id !== item.id &&
    !(item.syn && c.syn === item.syn) &&
    normalize(c.sw) !== normalize(item.sw) &&
    meaningKey(c) !== meaningKey(item) &&
    normalize(c.so) !== normalize(item.so);
  const all = [...ITEMS.values()];
  const sameUnit = shuffle(all.filter((c) => c.unitId === item.unitId && ok(c)), rnd);
  const others = shuffle(all.filter((c) => c.unitId !== item.unitId && ok(c)), rnd);
  const chosen: IndexedItem[] = [];
  for (const c of [...sameUnit, ...others]) {
    if (chosen.length >= n) break;
    if (chosen.some((x) => normalize(x.sw) === normalize(c.sw) || meaningKey(x) === meaningKey(c))) continue;
    chosen.push(c);
  }
  return chosen;
}

function pick(kind: 'pick-meaning' | 'pick-sw' | 'listen-pick', item: IndexedItem, rnd: () => number): Exercise {
  return { key: nextKey(), itemIds: [item.id], kind, item, options: shuffle([item, ...pickDistractors(item, 3, rnd)], rnd) };
}

function typeSw(item: IndexedItem): Exercise {
  return { key: nextKey(), itemIds: [item.id], kind: 'type-sw', item };
}

function match(items: IndexedItem[], rnd: () => number): Exercise {
  const left = shuffle(items, rnd);
  return { key: nextKey(), itemIds: items.map((i) => i.id), kind: 'match', items: left, right: shuffle(left, rnd) };
}

export function authoredToExercise(a: Authored, rnd: () => number = Math.random): Exercise {
  const key = nextKey();
  switch (a.type) {
    case 'build':
      return { key, itemIds: [], kind: 'build', ex: a, tiles: shuffle([...a.answer.split(' '), ...a.extra], rnd) };
    case 'respond':
      return { key, itemIds: [], kind: 'respond', ex: a, order: shuffle(a.options.map((_, i) => i), rnd) };
    case 'gap':
      return { key, itemIds: [], kind: 'gap', ex: a, order: shuffle(a.options.map((_, i) => i), rnd) };
    case 'dialogue':
      return { key, itemIds: [], kind: 'dialogue', ex: a, order: shuffle(a.options.map((_, i) => i), rnd) };
  }
}

const isShort = (it: IndexedItem) => it.sw.split(/\s+/).length <= 4 && !it.sw.includes('...');

export interface BuildOptions {
  states: Record<string, ItemState>;
  canListen: boolean;
  rnd?: () => number;
}

/**
 * A lesson: teach new words in groups of three, check each one straight away,
 * then mix: match pairs, the hand-made exercises, typing, and a short final review.
 */
export function buildLesson(_unit: Unit, lesson: Lesson, opts: BuildOptions): Exercise[] {
  const rnd = opts.rnd ?? Math.random;
  const items = lesson.items.map(getItem);
  const kinds: ('pick-meaning' | 'pick-sw' | 'listen-pick')[] = opts.canListen
    ? ['pick-meaning', 'listen-pick', 'pick-sw']
    : ['pick-meaning', 'pick-sw'];
  const extras = (lesson.extra ?? []).map((a) => authoredToExercise(a, rnd));
  const firstHalf = extras.slice(0, Math.ceil(extras.length / 2));
  const secondHalf = extras.slice(firstHalf.length);

  const out: Exercise[] = [];
  let k = 0;
  for (let i = 0; i < items.length; i += 3) {
    const group = items.slice(i, i + 3);
    for (const it of group) if (!opts.states[it.id]) out.push({ key: nextKey(), itemIds: [], kind: 'teach', item: it });
    for (const it of group) out.push(pick(kinds[k++ % kinds.length], it, rnd));
    if (i === 3) out.push(...firstHalf);
  }
  if (items.length <= 3) out.push(...firstHalf);
  if (items.length >= 4) out.push(match(shuffle(items, rnd).slice(0, 5), rnd));
  out.push(...secondHalf);
  for (const it of shuffle(items.filter(isShort), rnd).slice(0, 3)) out.push(typeSw(it));
  for (const it of shuffle(items, rnd).slice(0, 2)) out.push(pick(kinds[k++ % kinds.length], it, rnd));
  return out;
}

/** A practice session from words the learner has already met. */
export function buildPractice(ids: string[], canListen: boolean, rnd: () => number = Math.random): Exercise[] {
  const items = ids.map((id) => ITEMS.get(id)).filter((x): x is IndexedItem => !!x);
  const kinds = canListen
    ? (['pick-meaning', 'pick-sw', 'listen-pick', 'type'] as const)
    : (['pick-meaning', 'pick-sw', 'type'] as const);
  const out: Exercise[] = items.map((it, i) => {
    const kind = kinds[i % kinds.length];
    return kind === 'type' ? (isShort(it) ? typeSw(it) : pick('pick-sw', it, rnd)) : pick(kind, it, rnd);
  });
  if (items.length >= 4) out.splice(Math.floor(out.length / 2), 0, match(shuffle(items, rnd).slice(0, 5), rnd));
  return shuffle(out, rnd);
}

/** Accepted Swahili answers for an item, in display order. */
export function acceptedSw(item: IndexedItem): string[] {
  return [item.sw, ...(item.alt ?? [])];
}

export function meaning(item: { en: string; so: string }, lang: Lang): string {
  return item[lang];
}
