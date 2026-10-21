// Tests the real lesson content through the exercise generator.
import { describe, expect, it } from 'vitest';
import { ITEMS, UNITS } from '../src/content';
import { buildLesson, buildPractice, pickDistractors } from '../src/engine/generate';
import { normalize } from '../src/engine/check';

function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

describe('content', () => {
  it('loads all units in order', () => {
    expect(UNITS.length).toBeGreaterThanOrEqual(4);
    const orders = UNITS.map((u) => u.order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });

  it('every item has Kenyan Swahili, English and Somali text and a label', () => {
    for (const it of ITEMS.values()) {
      expect(it.sw.trim(), it.id).not.toBe('');
      expect(it.en.trim(), it.id).not.toBe('');
      expect(it.so.trim(), it.id).not.toBe('');
      expect(['standard', 'everyday', 'sheng', 'coastal']).toContain(it.v);
    }
  });

  it('wrong options are never a synonym, the same word or the same meaning', () => {
    const rnd = seeded(7);
    for (const it of ITEMS.values()) {
      const ds = pickDistractors(it, 3, rnd);
      expect(ds.length, it.id).toBe(3);
      for (const d of ds) {
        expect(d.id).not.toBe(it.id);
        if (it.syn) expect(d.syn, `${it.id} vs ${d.id}`).not.toBe(it.syn);
        expect(normalize(d.sw)).not.toBe(normalize(it.sw));
        expect(normalize(d.en)).not.toBe(normalize(it.en));
      }
    }
  });

  it('every lesson builds a full exercise sequence', () => {
    for (const unit of UNITS) {
      for (const lesson of unit.lessons) {
        const withVoice = buildLesson(unit, lesson, { states: {}, canListen: true, rnd: seeded(3) });
        const noVoice = buildLesson(unit, lesson, { states: {}, canListen: false, rnd: seeded(3) });
        expect(withVoice.length, lesson.id).toBeGreaterThanOrEqual(lesson.items.length * 2);
        expect(noVoice.some((e) => e.kind === 'listen-pick'), lesson.id).toBe(false);
        // every new word is taught before it is tested
        const taught = new Set<string>();
        for (const e of withVoice) {
          if (e.kind === 'teach') taught.add(e.item.id);
          if (e.kind === 'pick-meaning' || e.kind === 'pick-sw' || e.kind === 'listen-pick' || e.kind === 'type-sw') {
            expect(taught.has(e.item.id), `${lesson.id}: ${e.item.id}`).toBe(true);
          }
        }
        // build tiles always contain the full answer
        for (const e of withVoice) {
          if (e.kind === 'build') for (const w of e.ex.answer.split(' ')) expect(e.tiles).toContain(w);
        }
      }
    }
  });

  it('skips teaching cards for words the learner already knows', () => {
    const unit = UNITS[0];
    const lesson = unit.lessons[0];
    const states = Object.fromEntries(lesson.items.map((id) => [id, { box: 2, due: 0, seen: 3, wrong: 0 }]));
    const ex = buildLesson(unit, lesson, { states, canListen: true, rnd: seeded(5) });
    expect(ex.some((e) => e.kind === 'teach')).toBe(false);
  });

  it('builds a practice session from known words', () => {
    const ids = [...ITEMS.keys()].slice(0, 8);
    const ex = buildPractice(ids, true, seeded(11));
    expect(ex.length).toBe(9);
    expect(ex.some((e) => e.kind === 'match')).toBe(true);
  });
});
