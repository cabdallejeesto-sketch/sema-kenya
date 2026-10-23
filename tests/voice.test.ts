// Tests how sentences are matched to their recorded clips and voices.
import { describe, expect, it } from 'vitest';
import { UNITS } from '../src/content';
import { clipKey, gapSentence, speakerVoices, unitSpeech } from '../src/engine/voice-lines';

describe('audio clips', () => {
  it('names a clip from its text and voice', () => {
    const k = clipKey('Habari yako?', 'f');
    expect(k).toMatch(/^f[0-9a-f]{8}$/);
    expect(clipKey('  Habari   yako? ', 'f')).toBe(k);
    expect(clipKey('Habari yako?', 'm')).not.toBe(k.replace(/^f/, 'm'));
    expect(clipKey('Habari yako', 'f')).not.toBe(k);
  });

  it('gives each speaker a voice and keeps it for the whole conversation', () => {
    const v = speakerVoices([{ who: 'Abdi' }, { who: 'Wanjiku' }, { who: 'Abdi' }, { who: 'Stranger' }]);
    expect(v('Abdi')).toBe('m');
    expect(v('Wanjiku')).toBe('f');
    expect(v('Stranger')).toBe('m'); // opposite of the speaker before
    expect(v(undefined)).toBe('f'); // narration
  });

  it('reads the full gap sentence with the right word', () => {
    expect(gapSentence({ before: 'Nishukishe', after: '.', options: ['hapa', 'kesho'], answer: 0 })).toBe('Nishukishe hapa.');
  });

  it('every unit has something to read aloud, and no two texts share a clip name', () => {
    const seen = new Map<string, string>();
    for (const unit of UNITS) {
      const lines = unitSpeech(unit);
      expect(lines.length, unit.id).toBeGreaterThan(unit.items.length - 1);
      for (const [text, voice] of lines) {
        const key = clipKey(text, voice);
        const clean = text.replace(/\s+/g, ' ').trim();
        if (seen.has(key)) expect(seen.get(key), key).toBe(clean);
        seen.set(key, clean);
      }
    }
  });
});
