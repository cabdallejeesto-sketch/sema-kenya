// Makes the recorded audio: one MP3 per Swahili word or sentence, in a Kenyan Swahili voice.
// Run: npm run audio   (needs Python with edge-tts: py -m pip install edge-tts)
//
// Only missing clips are made, so it is quick after the first run. Clips that no lesson uses any
// more are deleted. Writes src/content/audio.json, the list of clips the app can play.
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { cleanSpeech, clipKey, unitSpeech } from '../src/engine/voice-lines.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const unitsDir = join(root, 'src', 'content', 'units');
const outDir = join(root, 'public', 'audio');
mkdirSync(outDir, { recursive: true });

// Optional: only some unit files, e.g. `npm run audio -- 05 06` (unused clips are then kept).
const only = process.argv.slice(2);
const files = readdirSync(unitsDir)
  .filter((f) => f.endsWith('.json') && (!only.length || only.some((o) => f.startsWith(o))))
  .sort();

const wanted = new Map(); // key -> { text, voice }
for (const file of files) {
  const unit = JSON.parse(readFileSync(join(unitsDir, file), 'utf8'));
  for (const [text, voice] of unitSpeech(unit)) {
    const clean = cleanSpeech(text);
    if (!clean) continue;
    const key = clipKey(clean, voice);
    const prev = wanted.get(key);
    if (prev && prev.text !== clean) throw new Error(`Two texts share the clip name ${key}: "${prev.text}" and "${clean}"`);
    wanted.set(key, { key, text: clean, voice });
  }
}

// Loanwords the voice should say the Kenyan way, e.g. "stage" -> "steji" (scripts/pronunciation.json).
const { _about, ...say } = JSON.parse(readFileSync(join(root, 'scripts', 'pronunciation.json'), 'utf8'));
const esc = (w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const sayRules = Object.entries(say).map(([w, s]) => [new RegExp(`(?<!\\p{L})${esc(w)}(?!\\p{L})`, 'giu'), s]);
const spoken = (text) => sayRules.reduce((t, [re, s]) => t.replace(re, s), text);

const missing = [...wanted.values()]
  .filter((j) => !existsSync(join(outDir, `${j.key}.mp3`)))
  .map((j) => ({ ...j, text: spoken(j.text) }));
console.log(`${wanted.size} clips needed, ${missing.length} to make.`);

if (missing.length) {
  const jobs = join(tmpdir(), `sema-audio-${process.pid}.json`);
  writeFileSync(jobs, JSON.stringify(missing));
  const python = process.env.PYTHON ?? (process.platform === 'win32' ? 'py' : 'python3');
  const r = spawnSync(python, [join(root, 'scripts', 'tts.py'), jobs, outDir], { stdio: 'inherit' });
  unlinkSync(jobs);
  if (r.status !== 0) console.error('Some clips could not be made. Run npm run audio again to retry them.');
}

let removed = 0;
for (const f of only.length ? [] : readdirSync(outDir)) {
  if (f.endsWith('.mp3') && !wanted.has(f.slice(0, -4))) {
    unlinkSync(join(outDir, f));
    removed++;
  }
}

// With a filter, keep the clips of the other units in the list too.
const listed = only.length ? JSON.parse(readFileSync(join(root, 'src', 'content', 'audio.json'), 'utf8')) : [];
const have = [...new Set([...listed, ...wanted.keys()])].filter((k) => existsSync(join(outDir, `${k}.mp3`))).sort();
writeFileSync(join(root, 'src', 'content', 'audio.json'), JSON.stringify(have) + '\n');
const ready = [...wanted.keys()].filter((k) => have.includes(k)).length;
console.log(`${ready} of ${wanted.size} clips ready${removed ? `, ${removed} unused clips deleted` : ''}. audio.json lists ${have.length}.`);
if (ready < wanted.size) process.exitCode = 1;
