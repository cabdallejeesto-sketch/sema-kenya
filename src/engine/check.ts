// Answer checking for typed and built answers.

export function normalize(s: string): string {
  return s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/[.,!?¿¡;:"“”()\-–—…]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = cur;
  }
  return prev[b.length];
}

export type CheckResult = 'correct' | 'typo' | 'wrong';

/**
 * Compare a learner's answer with all accepted answers.
 * A small spelling slip (1 letter, or 2 in long answers) counts as a typo: accepted, but shown.
 */
export function checkAnswer(input: string, accepted: string[]): { result: CheckResult; closest: string } {
  const given = normalize(input);
  let best = { dist: Infinity, answer: accepted[0] ?? '' };
  for (const a of accepted) {
    const d = levenshtein(given, normalize(a));
    if (d < best.dist) best = { dist: d, answer: a };
  }
  if (!given) return { result: 'wrong', closest: best.answer };
  if (best.dist === 0) return { result: 'correct', closest: best.answer };
  const len = normalize(best.answer).length;
  const allowed = len >= 10 ? 2 : len >= 4 ? 1 : 0;
  return { result: best.dist <= allowed ? 'typo' : 'wrong', closest: best.answer };
}
