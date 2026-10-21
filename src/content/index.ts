import type { GoalId, Item, Lesson, Text, Unit, Variety } from './types';

const modules = import.meta.glob<{ default: Unit }>('./units/*.json', { eager: true });

export const UNITS: Unit[] = Object.values(modules)
  .map((m) => m.default)
  .sort((a, b) => a.order - b.order);

export interface IndexedItem extends Item {
  unitId: string;
}

export const ITEMS = new Map<string, IndexedItem>();
for (const u of UNITS) for (const it of u.items) ITEMS.set(it.id, { ...it, unitId: u.id });

export function getItem(id: string): IndexedItem {
  const it = ITEMS.get(id);
  if (!it) throw new Error(`Unknown item ${id}`);
  return it;
}

export function getUnit(id: string): Unit | undefined {
  return UNITS.find((u) => u.id === id);
}

export function getLesson(unitId: string, lessonId: string): Lesson | undefined {
  return getUnit(unitId)?.lessons.find((l) => l.id === lessonId);
}

export const GOALS: { id: GoalId; title: Text; hint: Text }[] = [
  {
    id: 'travel',
    title: { en: 'Travel & getting around', so: 'Safar iyo socod' },
    hint: { en: 'Matatus, directions, hotels, airports', so: 'Matatu, jihooyin, hoteello, garoomo' },
  },
  {
    id: 'street',
    title: { en: 'Youth & street talk (Sheng)', so: 'Hadalka dhallinyarada iyo jidka (Sheng)' },
    hint: { en: 'How young Nairobi people really talk', so: 'Sida dhallinyarada Nairobi dhab ahaan u hadlaan' },
  },
  {
    id: 'family',
    title: { en: 'Family & people', so: 'Qoyska iyo dadka' },
    hint: { en: 'Respect, elders, visiting homes, marriage', so: 'Ixtiraam, waayeelka, booqasho guryo, guur' },
  },
  {
    id: 'business',
    title: { en: 'Business & work', so: 'Ganacsi iyo shaqo' },
    hint: { en: 'Shops, prices, customers, money', so: 'Dukaamo, qiimo, macaamiil, lacag' },
  },
  {
    id: 'sports',
    title: { en: 'Sports & fun', so: 'Isboorti iyo madadaalo' },
    hint: { en: 'Football, running, music (more lessons coming)', so: 'Kubadda cagta, orod, muusig (casharro badan ayaa imanaya)' },
  },
];

export const VARIETIES: Record<Variety, { name: Text; desc: Text }> = {
  standard: {
    name: { en: 'Kenya standard', so: 'Heerka Kenya' },
    desc: {
      en: 'Correct and understood everywhere in Kenya. This is also the Swahili taught in schools.',
      so: 'Sax ah, laguna fahmo meel kasta oo Kenya ah. Waa Sawaaxiliga dugsiyada lagu barto.',
    },
  },
  everyday: {
    name: { en: 'Kenyan everyday', so: 'Hadalka maalinlaha Kenya' },
    desc: {
      en: 'How Kenyans really say it in daily life, at home, in shops and on the street.',
      so: 'Sida Kenyaanku dhab ahaan u yiraahdaan nolol maalmeedka, guriga, dukaanka iyo jidka.',
    },
  },
  sheng: {
    name: { en: 'Sheng', so: 'Sheng' },
    desc: {
      en: 'Nairobi street talk. It changes fast, so some words may be dated. Use it with friends, not with elders.',
      so: 'Hadalka jidka ee Nairobi. Si dhakhso ah ayuu isu beddelaa, sidaa darteed erayada qaarkood way duugoobi karaan. La isticmaal saaxiibbada, ha la isticmaalin waayeelka.',
    },
  },
  coastal: {
    name: { en: 'Coastal', so: 'Xeebta' },
    desc: {
      en: 'Forms used on the Kenyan coast (Mombasa, Lamu) and in Tanzania.',
      so: 'Qaababka laga isticmaalo xeebta Kenya (Mombasa, Lamu) iyo Tanzania.',
    },
  },
};
