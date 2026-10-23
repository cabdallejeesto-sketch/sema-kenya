// Content model for Sema Kenya. Every unit is one JSON file in src/content/units/.
// Adding a new unit = adding a new JSON file that follows these types.

/** Which kind of Swahili an item is. Shown as a coloured label on every word. */
export type Variety =
  | 'standard' // correct and understood everywhere in Kenya (also school Swahili)
  | 'everyday' // how Kenyans really say it in daily life
  | 'sheng' // Nairobi street talk; changes fast, may be dated
  | 'coastal'; // Mombasa / Lamu / coast forms

export type GoalId = 'travel' | 'street' | 'family' | 'business' | 'sports';

export type Level = 'A1' | 'A2' | 'B1' | 'B2';

/** Text shown to the learner in their chosen interface language. */
export interface Text {
  en: string;
  so: string;
}

export interface Item {
  /** Unique across all units, e.g. "g.sasa". */
  id: string;
  /** The Kenyan form that is taught. */
  sw: string;
  en: string;
  so: string;
  v: Variety;
  /** Other Swahili answers accepted in typing and building exercises. */
  alt?: string[];
  /** The textbook / Tanzanian form, shown as a comparison note. */
  tz?: string;
  note?: Text;
  /** Items with the same syn key mean (almost) the same thing and are never used as each other's wrong options. */
  syn?: string;
  /** Text for the voice to read, if different from sw. */
  say?: string;
}

export interface DialogueLine {
  who: string;
  sw: string;
  en: string;
  so: string;
}

/** Hand-written exercises, added to a lesson on top of the automatic ones. */
export type Authored =
  | { type: 'build'; prompt: Text; answer: string; extra: string[]; accept?: string[] }
  | { type: 'respond'; heard: string; options: string[]; answer: number; explain?: Text }
  | { type: 'gap'; before: string; after: string; options: string[]; answer: number; meaning: Text }
  | { type: 'dialogue'; lines: DialogueLine[]; question: Text; options: Text[]; answer: number }
  /** A short reading: the learner reads (and hears) it, then answers each question. */
  | { type: 'story'; title: Text; lines: StoryLine[]; questions: StoryQuestion[] };

/** One sentence of a story. "who" is set when a character speaks the line. */
export interface StoryLine {
  who?: string;
  sw: string;
  en: string;
  so: string;
}

export interface StoryQuestion {
  question: Text;
  options: Text[];
  answer: number;
}

export interface Lesson {
  id: string;
  title: Text;
  /** Item ids from this unit, taught in this order. */
  items: string[];
  /** If set, the lesson is only on the path for learners who chose one of these goals (or "show all lessons"). */
  goals?: GoalId[];
  extra?: Authored[];
}

export interface GuideExample {
  sw: string;
  en: string;
  so: string;
  v?: Variety;
}

export interface GuideTip {
  title: Text;
  body: Text;
  examples?: GuideExample[];
}

export interface Unit {
  id: string;
  order: number;
  level: Level;
  title: Text;
  /** Title in Swahili, shown under the main title. */
  swTitle: string;
  description: Text;
  goals?: GoalId[];
  /** True only after a native Kenyan speaker has checked the whole unit. */
  reviewed: boolean;
  reviewer?: string;
  color: string;
  guide: GuideTip[];
  items: Item[];
  lessons: Lesson[];
}
