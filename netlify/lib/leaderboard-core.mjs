// Pure logic for the weekly quiz leaderboard (no I/O), so it can be unit-tested.

export const TOP_N = 10;

/** Highest possible Story Challenge score: 100 per answer plus 20 × streak bonus. */
export function maxScore(questions) {
  return 100 * questions + 10 * questions * (questions - 1);
}

/** ISO-8601 week id in UTC, e.g. "2026-W39". Weeks start on Monday. */
export function weekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day); // Thursday of this week decides the year
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

const BLOCKED = ['fuck', 'shit', 'bitch', 'cunt', 'nigg', 'fag', 'dick', 'pussy', 'whore', 'slut', 'rape', 'nazi', 'http', 'www.'];

/** Returns a cleaned nickname, or null if it isn't acceptable. */
export function cleanName(input) {
  if (typeof input !== 'string') return null;
  const name = input.normalize('NFC').replace(/\s+/g, ' ').trim();
  if (name.length < 2 || name.length > 20) return null;
  if (!/^[\p{L}\p{N} ._'-]+$/u.test(name)) return null;
  const flat = name.toLowerCase().replace(/[^a-z]/g, '');
  if (BLOCKED.some((w) => flat.includes(w.replace(/[^a-z]/g, '')))) return null;
  return name;
}

/**
 * Validate a submission against the lessons map ({ slug: questionCount }).
 * Returns { ok: true, entry } or { ok: false, error }.
 */
export function validate(body, lessons) {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Invalid request.' };
  const { lesson, name, score } = body;
  if (typeof lesson !== 'string' || !Object.hasOwn(lessons, lesson)) return { ok: false, error: 'Unknown lesson.' };
  const clean = cleanName(name);
  if (!clean) return { ok: false, error: 'Please choose a nickname of 2–20 letters or numbers.' };
  const max = maxScore(lessons[lesson]);
  if (!Number.isInteger(score) || score < 100 || score > max || score % 20 !== 0) {
    return { ok: false, error: 'That score is not possible.' };
  }
  return { ok: true, entry: { name: clean, score } };
}

/** Add an entry, keeping each nickname's best score and only the top N. */
export function insert(board, entry, now = Date.now()) {
  const list = Array.isArray(board) ? board.slice() : [];
  const key = entry.name.toLocaleLowerCase();
  const i = list.findIndex((e) => e.name.toLocaleLowerCase() === key);
  if (i >= 0) {
    if (list[i].score >= entry.score) return { board: list, changed: false };
    list.splice(i, 1);
  }
  list.push({ name: entry.name, score: entry.score, at: now });
  // higher score first; on a tie, whoever got there first
  list.sort((a, b) => b.score - a.score || a.at - b.at);
  const top = list.slice(0, TOP_N);
  return { board: top, changed: top.some((e) => e.at === now && e.name === entry.name) };
}

export function rankOf(board, name) {
  const key = name.toLocaleLowerCase();
  const i = board.findIndex((e) => e.name.toLocaleLowerCase() === key);
  return i >= 0 ? i + 1 : null;
}
