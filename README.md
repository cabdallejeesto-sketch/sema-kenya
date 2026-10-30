# Sema Kenya Language Platform

Learn **Kenyan Swahili** (Kiswahili as it is spoken in Kenya) with short daily lessons, explained in **English or Somali**.

*Baro Sawaaxiliga Kenya, sida Kenyaanku ugu hadlaan, casharro gaagaaban oo maalinle ah, sharraxaad Ingiriis ama Soomaali ah leh.*

Live site: https://abdullaahi-developer.github.io/sema-kenya/

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

- Learning path in four sections, Beginner (A1) to Upper intermediate (B2); lessons unlock one after another
- Goals chosen at the start (travel, street talk, family, business, sports) add matching lessons to the path
- Exercises: new-word cards, pick the meaning, pick the Kenyan phrase, listen and choose, type what you hear,
  type in Swahili, match pairs, build a sentence, choose the right reply, fill the gap, Kenyan dialogues,
  and short stories with questions
- Typo-tolerant typing (a one-letter slip is accepted and shown)
- Spaced repetition review ("Practice") so weak words come back sooner
- XP, daily goal and streak
- Recorded audio for every word and sentence in two Kenyan Swahili voices (a woman and a man), with a
  speaker button and a slow button, like Duolingo. Dialogues and stories can be played line by line
- Sound effects for right and wrong answers (can be switched off)
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
npm run audio      # record audio for any new or changed sentences (see below)
npm test           # run the automated tests
npm run build      # validate, type-check and build the site into dist/
```

## Audio

Each Swahili word and sentence has its own MP3 in `public/audio/`, made with Microsoft's Kenyan Swahili
neural voices (sw-KE Zuri and Rafiki) through the free [edge-tts](https://github.com/rany2/edge-tts) tool.
After adding or changing lesson text, run:

```bash
py -m pip install edge-tts   # once (on Mac/Linux: python3 -m pip install edge-tts)
npm run audio
```

It only records sentences that have no clip yet, deletes clips nothing uses any more, and updates
`src/content/audio.json` (the list of clips the app can play). Anything without a clip falls back to the
browser's own Swahili voice if the device has one. Which voice reads what is decided in
`src/engine/voice-lines.ts` (dialogue characters get a voice by name).

edge-tts is an unofficial tool that uses the read-aloud voices built into Microsoft Edge. Before turning this
into a paid or large product, switch to Azure Speech (the official paid service with the same voices) or record
a native Kenyan speaker.

## Add or edit lessons

All content lives in `src/content/units/*.json`, one file per unit. To add a unit, copy an existing file,
give it a new `id` and `order`, and run `npm run validate`. The types are documented in `src/content/types.ts`.

A unit has:

- `items`: words and phrases (`sw`, `en`, `so`, label `v`, optional `alt` answers, `tz` textbook form, `note`, `syn` group)
- `lessons`: which items each lesson teaches, optional `goals`, and optional hand-made `extra` exercises
  (`build`, `respond`, `gap`, `dialogue`, `story`)
- `guide`: short tips with examples, shown from the unit's **Guide** button

The standard exercises (cards, multiple choice, listening, typing, matching) are generated automatically from the items.

## Publishing

Every push to `main` runs the tests, builds the site and publishes it to GitHub Pages
(`.github/workflows/deploy.yml`).

## Project structure

```
src/content/      lesson content (JSON) and content types
src/engine/       exercise generator, answer checking, spaced repetition, progress, audio
src/ui/           screens and components
src/i18n.ts       interface text in English and Somali
public/audio/     recorded audio clips (made by npm run audio)
scripts/          content validator and audio recorder
tests/            automated tests
```

## License

**All rights reserved. This is not open-source software.** You may use the website for your own learning and
read the code here on GitHub, but you may not download, copy, reuse or republish the code, lessons or audio
outside this repository. See [LICENSE](LICENSE) for the full terms.
