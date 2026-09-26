// Weekly leaderboard for each lesson's Story Challenge.
//   GET  /api/leaderboard?lesson=<slug>          → { week, entries: [{ name, score }] }
//   POST /api/leaderboard { lesson, name, score } → { week, entries, rank }
// Scores are stored in Netlify Blobs (store "leaderboard", key "<week>/<slug>").
import { getStore } from '@netlify/blobs';
import { validate, insert, rankOf, weekKey } from '../lib/leaderboard-core.mjs';

let lessonsCache = null;
async function lessons(origin) {
  if (lessonsCache) return lessonsCache;
  const res = await fetch(new URL('/leaderboard-lessons.json', origin));
  if (!res.ok) throw new Error('lessons list unavailable');
  lessonsCache = await res.json();
  return lessonsCache;
}

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

const publicEntries = (board) => (board || []).map(({ name, score }) => ({ name, score }));

export default async (req) => {
  const url = new URL(req.url);
  const store = getStore({ name: 'leaderboard', consistency: 'strong' });
  const week = weekKey();

  let map;
  try {
    map = await lessons(url.origin);
  } catch {
    return json({ error: 'Leaderboard unavailable.' }, 503);
  }

  if (req.method === 'GET') {
    const lesson = url.searchParams.get('lesson') || '';
    if (!Object.hasOwn(map, lesson)) return json({ error: 'Unknown lesson.' }, 404);
    const board = await store.get(`${week}/${lesson}`, { type: 'json' });
    return json({ week, entries: publicEntries(board) });
  }

  if (req.method === 'POST') {
    let body;
    try {
      body = await req.json();
    } catch {
      return json({ error: 'Invalid request.' }, 400);
    }
    const v = validate(body, map);
    if (!v.ok) return json({ error: v.error }, 400);
    const key = `${week}/${body.lesson}`;

    // Optimistic concurrency: retry if someone else wrote at the same moment.
    for (let attempt = 0; attempt < 4; attempt++) {
      const current = await store.getWithMetadata(key, { type: 'json' });
      const { board, changed } = insert(current?.data, v.entry);
      if (!changed) return json({ week, entries: publicEntries(board), rank: rankOf(board, v.entry.name) });
      const res = current
        ? await store.setJSON(key, board, { onlyIfMatch: current.etag })
        : await store.setJSON(key, board, { onlyIfNew: true });
      if (res.modified) return json({ week, entries: publicEntries(board), rank: rankOf(board, v.entry.name) });
    }
    return json({ error: 'Busy, please try again.' }, 409);
  }

  return json({ error: 'Method not allowed.' }, 405);
};

export const config = { path: '/api/leaderboard' };
