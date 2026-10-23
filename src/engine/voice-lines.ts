// Which sentences have recorded audio, and in which voice.
// The app (speech.ts) and the audio script (scripts/make-audio.mjs) both use this file, so a clip
// made by the script is always found by the app. Keep it free of runtime imports.

import type { Authored, Item, Lesson, Unit } from '../content/types';

/** f = Zuri (female Kenyan voice), m = Rafiki (male Kenyan voice). */
export type VoiceId = 'f' | 'm';

/** Story narration and words on their own. */
export const NARRATOR: VoiceId = 'f';
/** The person speaking to the learner in "respond" exercises. */
export const HEARD: VoiceId = 'm';

/** Voices for the characters in dialogues and stories. Anyone not listed gets the opposite voice of the speaker before them. */
const SPEAKERS: Record<string, VoiceId> = {
  Abdi: 'm', Amina: 'f', Halima: 'f', Farah: 'm', Omar: 'm', Mwanaisha: 'f', Zawadi: 'f', Baraka: 'm',
  Wanjiku: 'f', Kamau: 'm', Otieno: 'm', Achieng: 'f', Wafula: 'm', Nekesa: 'f', Kiprotich: 'm', Chebet: 'f',
  Mutua: 'm', Mwikali: 'f', Njeri: 'f', Mwangi: 'm', Juma: 'm', Fatuma: 'f', Ali: 'm', Hassan: 'm', Asha: 'f',
  Konda: 'm', Makanga: 'm', Dereva: 'm', Dere: 'm', Mama: 'f', Baba: 'm', Bibi: 'f', Babu: 'm', Shangazi: 'f',
  Mjomba: 'm', Sungura: 'm', Abunuwasi: 'm', Brian: 'm', Wanjiru: 'f', Fadumo: 'f', Nyanya: 'f', Shosho: 'f', Guka: 'm',
};

/** Titles that tell the voice: "Mama Wanjiru", "Baba Otieno", "Mzee Kamau"... */
function voiceByTitle(who: string): VoiceId | undefined {
  if (/^(mama|bi|bibi|shangazi|dada|binti)\b/i.test(who)) return 'f';
  if (/^(baba|bw|bwana|mzee|babu|mjomba|kaka|bro)\b/i.test(who)) return 'm';
  return undefined;
}

export function cleanSpeech(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/** File name (without .mp3) of the clip for this text in this voice: FNV-1a hash of the UTF-8 text. */
export function clipKey(text: string, voice: VoiceId): string {
  let h = 0x811c9dc5;
  for (const byte of new TextEncoder().encode(`${voice}|${cleanSpeech(text)}`)) {
    h ^= byte;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return voice + h.toString(16).padStart(8, '0');
}

export function itemSpeech(it: Pick<Item, 'sw' | 'say'>): string {
  return it.say ?? it.sw;
}

export function gapSentence(g: { before: string; after: string; options: string[]; answer: number }): string {
  return `${g.before} ${g.options[g.answer]}${g.after}`.trim();
}

/** Gives every speaker in a conversation a voice, in the order they first speak. */
export function speakerVoices(lines: { who?: string }[]): (who?: string) => VoiceId {
  const voices = new Map<string, VoiceId>();
  let prev: VoiceId | null = null;
  for (const { who } of lines) {
    if (!who || voices.has(who)) continue;
    const v: VoiceId = SPEAKERS[who] ?? voiceByTitle(who) ?? (prev === 'f' ? 'm' : 'f');
    voices.set(who, v);
    prev = v;
  }
  return (who) => (who ? voices.get(who) ?? NARRATOR : NARRATOR);
}

export type Speech = [text: string, voice: VoiceId];

export function authoredSpeech(a: Authored): Speech[] {
  switch (a.type) {
    case 'build':
      return [[a.answer, NARRATOR]];
    case 'respond':
      return [[a.heard, HEARD], ...a.options.map((o): Speech => [o, NARRATOR])];
    case 'gap':
      return [[gapSentence(a), NARRATOR]];
    case 'dialogue':
    case 'story': {
      const voice = speakerVoices(a.lines);
      return a.lines.map((l): Speech => [l.sw, voice(l.who)]);
    }
  }
}

export function lessonSpeech(unit: Unit, lesson: Lesson): Speech[] {
  const items = unit.items.filter((it) => lesson.items.includes(it.id));
  return [...items.map((it): Speech => [itemSpeech(it), NARRATOR]), ...(lesson.extra ?? []).flatMap(authoredSpeech)];
}

/** Everything in a unit that the app can read aloud. */
export function unitSpeech(unit: Unit): Speech[] {
  return [
    ...unit.items.map((it): Speech => [itemSpeech(it), NARRATOR]),
    ...unit.guide.flatMap((tip) => (tip.examples ?? []).map((ex): Speech => [ex.sw, NARRATOR])),
    ...unit.lessons.flatMap((l) => (l.extra ?? []).flatMap(authoredSpeech)),
  ];
}
