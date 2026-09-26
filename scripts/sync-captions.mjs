// Set a lesson's transcript times from YouTube captions.
//
// Usage: node scripts/sync-captions.mjs src/content/lessons/<lesson>.md captions.sbv
//
// Download the captions in YouTube Studio → Subtitles → your video → ⋮ → Download
// (.sbv, .srt or .vtt all work; auto-captions are fine). The script matches the words of
// each transcript line to the captions and rewrites every `t:` in the lesson. Vocabulary
// and quiz times that pointed at a line's old start time move with that line.
import { readFileSync, writeFileSync } from 'node:fs';

const [lessonPath, captionPath] = process.argv.slice(2);
if (!lessonPath || !captionPath) {
  console.error('Usage: node scripts/sync-captions.mjs <lesson.md> <captions.sbv|srt|vtt>');
  process.exit(1);
}

const toSec = (s) => {
  const parts = s.trim().replace(',', '.').split(':').map(Number);
  return parts.reduce((acc, n) => acc * 60 + n, 0);
};

/** Parse SBV, SRT or VTT into words with an estimated time each. */
function parseCaptions(text) {
  const words = [];
  const cue = /(\d{1,2}:\d{2}(?::\d{2})?[.,]\d{1,3})\s*(?:,|-->)\s*(\d{1,2}:\d{2}(?::\d{2})?[.,]\d{1,3})[^\n]*\n([\s\S]*?)(?=\n\s*\n|\n?$)/g;
  for (const m of text.replace(/\r/g, '').matchAll(cue)) {
    const start = toSec(m[1]);
    const end = toSec(m[2]);
    const ws = m[3].replace(/<[^>]+>|\[[^\]]*\]/g, ' ').split(/\s+/).filter(Boolean);
    ws.forEach((w, i) => words.push({ w: norm(w), t: start + ((end - start) * i) / ws.length }));
  }
  return words.filter((x) => x.w);
}

function norm(w) {
  return w.toLowerCase().replace(/[^a-z0-9']/g, '');
}

/** Longest-common-subsequence alignment: transcript word index → caption word index. */
function align(a, b) {
  const n = a.length;
  const m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const map = new Map();
  for (let i = 0, j = 0; i < n && j < m; ) {
    if (a[i] === b[j]) map.set(i++, j++);
    else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  return { map, matched: dp[0][0] };
}

const md = readFileSync(lessonPath, 'utf8');
const cap = parseCaptions(readFileSync(captionPath, 'utf8'));
if (!cap.length) {
  console.error('No captions found in', captionPath);
  process.exit(1);
}

// Transcript lines look like:  - { t: 12, text: "..." }
const lineRe = /^(\s*-\s*\{\s*t:\s*)(\d+(?:\.\d+)?)(,\s*text:\s*)("(?:[^"\\]|\\.)*")/gm;
const lines = [...md.matchAll(lineRe)].map((m) => ({ old: m[2], text: JSON.parse(m[4]) }));
if (!lines.length) {
  console.error('No transcript lines found in', lessonPath);
  process.exit(1);
}

const tw = [];
const starts = lines.map((l) => {
  const s = tw.length;
  tw.push(...l.text.split(/\s+/).map(norm).filter(Boolean));
  return s;
});
const { map, matched } = align(tw, cap.map((c) => c.w));

const times = starts.map((s) => {
  for (let j = s; j < tw.length; j++) if (map.has(j)) return Math.max(0, Math.round(cap[map.get(j)].t - (j - s) * 0.35));
  return Math.round(cap[cap.length - 1].t);
});
for (let i = 1; i < times.length; i++) if (times[i] < times[i - 1]) times[i] = times[i - 1];

const remap = new Map(lines.map((l, i) => [Number(l.old), times[i]]));
let li = 0;
let out = md.replace(lineRe, (_, a, _t, b, text) => `${a}${times[li++]}${b}${text}`);
// Vocabulary and quiz times: move with the line they pointed at.
const [head, rest] = [out.slice(0, out.indexOf('vocabulary:')), out.slice(out.indexOf('vocabulary:'))];
out = head + rest.replace(/\bt:\s*(\d+(?:\.\d+)?)/g, (m, v) => (remap.has(Number(v)) ? `t: ${remap.get(Number(v))}` : m));

writeFileSync(lessonPath, out);
console.log(`Matched ${Math.round((matched / tw.length) * 100)}% of transcript words. Updated ${lines.length} line times.`);
if (matched / tw.length < 0.8) console.warn('Warning: low match. Check that the captions belong to this video.');
