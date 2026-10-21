// Checks every unit file before a build. Run: npm run validate
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'content', 'units');
const VARIETIES = new Set(['standard', 'everyday', 'sheng', 'coastal']);
const GOALS = new Set(['travel', 'street', 'family', 'business', 'sports']);
const LEVELS = new Set(['A1', 'A2', 'B1', 'B2']);

const errors = [];
const warnings = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);
const text = (where, t) => {
  if (!t || typeof t.en !== 'string' || !t.en.trim() || typeof t.so !== 'string' || !t.so.trim()) err(where, 'needs non-empty "en" and "so"');
};

const files = readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
const unitIds = new Set();
const orders = new Set();
const itemIds = new Set();
let itemCount = 0;
let lessonCount = 0;

for (const file of files) {
  let u;
  try {
    u = JSON.parse(readFileSync(join(dir, file), 'utf8'));
  } catch (e) {
    err(file, `invalid JSON: ${e.message}`);
    continue;
  }
  const W = (s) => `${file} > ${s}`;
  if (!u.id) err(file, 'missing id');
  if (unitIds.has(u.id)) err(file, `duplicate unit id "${u.id}"`);
  unitIds.add(u.id);
  if (orders.has(u.order)) err(file, `duplicate order ${u.order}`);
  orders.add(u.order);
  if (!LEVELS.has(u.level)) err(file, `bad level "${u.level}"`);
  if (typeof u.reviewed !== 'boolean') err(file, '"reviewed" must be true or false');
  text(W('title'), u.title);
  text(W('description'), u.description);
  if (!u.swTitle) err(file, 'missing swTitle');
  for (const g of u.goals ?? []) if (!GOALS.has(g)) err(file, `bad goal "${g}"`);
  (u.guide ?? []).forEach((tip, i) => {
    text(W(`guide[${i}].title`), tip.title);
    text(W(`guide[${i}].body`), tip.body);
    (tip.examples ?? []).forEach((ex, j) => {
      if (!ex.sw || !ex.en || !ex.so) err(W(`guide[${i}].examples[${j}]`), 'needs sw, en and so');
      if (ex.v && !VARIETIES.has(ex.v)) err(W(`guide[${i}].examples[${j}]`), `bad variety "${ex.v}"`);
    });
  });

  const local = new Map();
  for (const it of u.items ?? []) {
    itemCount++;
    const w = W(`item ${it.id}`);
    if (!it.id) err(W('item'), 'missing id');
    if (itemIds.has(it.id)) err(w, 'duplicate item id');
    itemIds.add(it.id);
    local.set(it.id, it);
    for (const f of ['sw', 'en', 'so']) if (typeof it[f] !== 'string' || !it[f].trim()) err(w, `missing "${f}"`);
    if (!VARIETIES.has(it.v)) err(w, `bad variety "${it.v}"`);
    if (it.note) text(`${w} note`, it.note);
    if (it.alt && !Array.isArray(it.alt)) err(w, '"alt" must be a list');
  }

  const used = new Set();
  const lessonIds = new Set();
  for (const l of u.lessons ?? []) {
    lessonCount++;
    const w = W(`lesson ${l.id}`);
    if (lessonIds.has(l.id)) err(w, 'duplicate lesson id');
    lessonIds.add(l.id);
    text(`${w} title`, l.title);
    if (!l.items?.length) err(w, 'has no items');
    for (const id of l.items ?? []) {
      if (!local.has(id)) err(w, `item "${id}" is not in this unit`);
      used.add(id);
    }
    for (const g of l.goals ?? []) if (!GOALS.has(g)) err(w, `bad goal "${g}"`);
    (l.extra ?? []).forEach((x, i) => {
      const wx = `${w} extra[${i}] (${x.type})`;
      switch (x.type) {
        case 'build':
          text(`${wx} prompt`, x.prompt);
          if (!x.answer?.trim()) err(wx, 'missing answer');
          if (!Array.isArray(x.extra)) err(wx, '"extra" (wrong tiles) must be a list');
          break;
        case 'respond':
          if (!x.heard) err(wx, 'missing heard');
          if (!(x.options?.length >= 2)) err(wx, 'needs at least 2 options');
          if (!(x.answer >= 0 && x.answer < x.options.length)) err(wx, 'answer index out of range');
          if (x.explain) text(`${wx} explain`, x.explain);
          break;
        case 'gap':
          if (!(x.options?.length >= 2)) err(wx, 'needs at least 2 options');
          if (!(x.answer >= 0 && x.answer < x.options.length)) err(wx, 'answer index out of range');
          text(`${wx} meaning`, x.meaning);
          break;
        case 'dialogue':
          if (!(x.lines?.length >= 2)) err(wx, 'needs at least 2 lines');
          (x.lines ?? []).forEach((ln, j) => {
            for (const f of ['who', 'sw', 'en', 'so']) if (!ln[f]) err(`${wx} line ${j}`, `missing "${f}"`);
          });
          text(`${wx} question`, x.question);
          (x.options ?? []).forEach((o, j) => text(`${wx} option ${j}`, o));
          if (!(x.answer >= 0 && x.answer < (x.options?.length ?? 0))) err(wx, 'answer index out of range');
          break;
        default:
          err(wx, `unknown exercise type "${x.type}"`);
      }
    });
  }
  for (const id of local.keys()) if (!used.has(id)) warnings.push(`${file}: item "${id}" is not used in any lesson`);
}

for (const w of warnings) console.warn(`warning: ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`error: ${e}`);
  console.error(`\n${errors.length} content error(s). Fix them before building.`);
  process.exit(1);
}
console.log(`Content OK: ${files.length} units, ${lessonCount} lessons, ${itemCount} items.`);
