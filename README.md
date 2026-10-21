# Sema Kenya Language Platform

Learn **Kenyan Swahili** (Kiswahili as it is spoken in Kenya) with short daily lessons, explained in **English or Somali**.

*Baro Sawaaxiliga Kenya, sida Kenyaanku ugu hadlaan, casharro gaagaaban oo maalinle ah, sharraxaad Ingiriis ama Soomaali ah leh.*

Live site: https://cabdallejeesto-sketch.github.io/sema-kenya/

## What makes it Kenyan

Every word and phrase has a label, so learners always know what kind of Swahili they are learning:

| Label | Meaning |
|---|---|
| **Kenya standard** | Correct and understood everywhere in Kenya (also school Swahili) |
| **Kenyan everyday** | How Kenyans really say it: *Ako wapi?*, *Niko fiti*, *Lipa na M-Pesa* |
| **Sheng** | Nairobi street talk. Changes fast, may be dated |
| **Coastal** | Mombasa / Lamu forms, also used in Tanzania (*Shikamoo*) |

The Kenyan form is taught first. Where Tanzania or textbooks differ, the other form is shown as a note
(for example *matatu* vs *daladala*, *Nishukishe hapa* vs *Nishushe hapa*).
Lessons use Kenyan settings: Nairobi, Mombasa, matatus, M-Pesa, Kenyan shillings, Kenyan names.

**Content status:** units are marked *"Not yet checked by a Kenyan speaker"* until a native Kenyan speaker has
reviewed them (set `"reviewed": true` in the unit file). Learners can report mistakes from any exercise.

## Features

- Learning path from beginner (A1) upward, lessons unlock one after another
- Goals chosen at the start (travel, street talk, family, business, sports) add matching lessons to the path
- Exercises: new-word cards, pick the meaning, pick the Kenyan phrase, listen and choose, type in Swahili,
  match pairs, build a sentence, choose the right reply, fill the gap, short Kenyan dialogues
- Typo-tolerant typing (a one-letter slip is accepted and shown)
- Spaced repetition review ("Practice") so weak words come back sooner
- XP, daily goal and streak
- Kenyan Swahili voice (sw-KE) through the browser's speech engine, with a slow button
- English or Somali interface; in Somali mode English meanings can be shown too
- Works offline and can be installed on a phone (PWA)
- No account and no server: progress is saved in the browser

## Run it on your computer

```bash
npm install
npm run dev
```

Then open the address it prints (usually http://localhost:5173).

Other commands:

```bash
npm run validate   # check all lesson content
npm test           # run the automated tests
npm run build      # validate, type-check and build the site into dist/
```

## Add or edit lessons

All content lives in `src/content/units/*.json`, one file per unit. To add a unit, copy an existing file,
give it a new `id` and `order`, and run `npm run validate`. The types are documented in `src/content/types.ts`.

A unit has:

- `items`: words and phrases (`sw`, `en`, `so`, label `v`, optional `alt` answers, `tz` textbook form, `note`, `syn` group)
- `lessons`: which items each lesson teaches, optional `goals`, and optional hand-made `extra` exercises
  (`build`, `respond`, `gap`, `dialogue`)
- `guide`: short tips with examples, shown from the unit's **Guide** button

The standard exercises (cards, multiple choice, listening, typing, matching) are generated automatically from the items.

## Publishing

Every push to `main` runs the tests, builds the site and publishes it to GitHub Pages
(`.github/workflows/deploy.yml`).

## Project structure

```
src/content/      lesson content (JSON) and content types
src/engine/       exercise generator, answer checking, spaced repetition, progress, speech
src/ui/           screens and components
src/i18n.ts       interface text in English and Somali
scripts/          content validator
tests/            automated tests
```
