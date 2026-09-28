export type Segment = { text: string; word?: number; grammar?: boolean };

type Vocab = { word: string; forms: string[] };

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Split a transcript line into plain text and vocabulary-word segments. */
export function highlight(line: string, vocab: Vocab[]): Segment[] {
  const alts: { re: string; idx: number }[] = [];
  vocab.forEach((v, idx) => {
    for (const f of [v.word, ...v.forms]) {
      // allow simple endings on the last word: dream -> dreams, notice -> noticed
      alts.push({ re: `${escape(f)}(?:s|es|d|ed|ing)?`, idx });
    }
  });
  if (!alts.length) return [{ text: line }];
  // longest first so "stand up to" wins over "stand"
  alts.sort((a, b) => b.re.length - a.re.length);
  const re = new RegExp(`\\b(${alts.map((a) => `(${a.re})`).join('|')})\\b`, 'gi');

  const out: Segment[] = [];
  let last = 0;
  for (const m of line.matchAll(re)) {
    const i = m.index!;
    if (i > last) out.push({ text: line.slice(last, i) });
    // find which alternative matched (groups start at 2)
    const g = m.slice(2).findIndex((x) => x !== undefined);
    out.push({ text: m[0], word: alts[g].idx });
    last = i + m[0].length;
  }
  if (last < line.length) out.push({ text: line.slice(last) });
  return out;
}

export function fmtTime(t: number) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Mark the target-structure words (e.g. "could", "couldn't") inside plain text segments. */
export function markGrammar(segments: Segment[], words: string[]): Segment[] {
  if (!words.length) return segments;
  const alts = [...words].sort((a, b) => b.length - a.length).map(escape);
  const re = new RegExp(`(?<![\\p{L}'])(${alts.join('|')})(?![\\p{L}'])`, 'giu');
  const out: Segment[] = [];
  for (const s of segments) {
    if (s.word !== undefined) {
      out.push(s);
      continue;
    }
    let last = 0;
    for (const m of s.text.matchAll(re)) {
      if (m.index! > last) out.push({ text: s.text.slice(last, m.index) });
      out.push({ text: m[0], grammar: true });
      last = m.index! + m[0].length;
    }
    if (last < s.text.length) out.push({ text: s.text.slice(last) });
  }
  return out;
}

/** True if the line contains one of the structure words. */
export function hasGrammar(text: string, words: string[]) {
  return markGrammar([{ text }], words).some((s) => s.grammar);
}
