// Daily learning streak, shared by all lessons. Saved in the learner's browser.
const KEY = 'ble:days';

const dayId = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function readDays(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

/** Number of days in a row with activity, ending today (or yesterday, so it isn't lost before today's lesson). */
export function getStreak(now = new Date()): { days: number; today: boolean } {
  const set = new Set(readDays());
  const d = new Date(now);
  const today = set.has(dayId(d));
  if (!today) d.setDate(d.getDate() - 1);
  let days = 0;
  while (set.has(dayId(d))) {
    days++;
    d.setDate(d.getDate() - 1);
  }
  return { days, today };
}

let recorded = '';
/** Call when the learner completes something. Safe to call often. */
export function recordActivity() {
  const id = dayId(new Date());
  if (recorded === id) return;
  recorded = id;
  const days = readDays().filter((x) => x !== id);
  days.push(id);
  try {
    localStorage.setItem(KEY, JSON.stringify(days.slice(-400)));
  } catch {
    return;
  }
  document.dispatchEvent(new CustomEvent('ble:activity'));
}
