import test from 'node:test';
import assert from 'node:assert/strict';
import { maxScore, weekKey, cleanName, validate, insert, rankOf, TOP_N } from '../netlify/lib/leaderboard-core.mjs';

test('maxScore matches the quiz scoring (100 + 20 per streak step)', () => {
  // 3 in a row: 100 + 120 + 140
  assert.equal(maxScore(3), 360);
  assert.equal(maxScore(7), 7 * 100 + 20 * (0 + 1 + 2 + 3 + 4 + 5 + 6));
});

test('weekKey uses ISO weeks', () => {
  assert.equal(weekKey(new Date('2026-09-26T12:00:00Z')), '2026-W39');
  assert.equal(weekKey(new Date('2026-09-28T00:00:00Z')), '2026-W40'); // Monday
  assert.equal(weekKey(new Date('2027-01-01T00:00:00Z')), '2026-W53'); // Friday belongs to last year's week
  assert.equal(weekKey(new Date('2024-12-30T00:00:00Z')), '2025-W01');
});

test('cleanName accepts real nicknames and rejects junk', () => {
  assert.equal(cleanName('  Minh   Anh '), 'Minh Anh');
  assert.equal(cleanName('Trâm_99'), 'Trâm_99');
  assert.equal(cleanName('李明'), '李明');
  assert.equal(cleanName('a'), null);
  assert.equal(cleanName('x'.repeat(21)), null);
  assert.equal(cleanName('<script>'), null);
  assert.equal(cleanName('visit www.spam'), null);
  assert.equal(cleanName('Shit head'), null);
  assert.equal(cleanName(42), null);
});

test('validate checks lesson, name and possible scores', () => {
  const lessons = { 'terry-fox': 7 };
  assert.deepEqual(validate({ lesson: 'terry-fox', name: 'Lan', score: 580 }, lessons), { ok: true, entry: { name: 'Lan', score: 580 } });
  assert.equal(validate({ lesson: 'nope', name: 'Lan', score: 580 }, lessons).ok, false);
  assert.equal(validate({ lesson: 'terry-fox', name: 'Lan', score: 590 }, lessons).ok, false); // not a multiple of 20
  assert.equal(validate({ lesson: 'terry-fox', name: 'Lan', score: maxScore(7) + 20 }, lessons).ok, false);
  assert.equal(validate({ lesson: 'terry-fox', name: 'Lan', score: 0 }, lessons).ok, false);
  assert.equal(validate({ lesson: 'terry-fox', name: 'Lan', score: '580' }, lessons).ok, false);
  assert.equal(validate({ lesson: '__proto__', name: 'Lan', score: 580 }, lessons).ok, false);
  assert.equal(validate(null, lessons).ok, false);
});

test('insert keeps best score per name and only the top N', () => {
  let board = [];
  ({ board } = insert(board, { name: 'An', score: 300 }, 1));
  ({ board } = insert(board, { name: 'Binh', score: 500 }, 2));
  let r = insert(board, { name: 'an', score: 200 }, 3); // lower score for same name
  assert.equal(r.changed, false);
  r = insert(board, { name: 'an', score: 700 }, 4);
  assert.equal(r.changed, true);
  board = r.board;
  assert.deepEqual(board.map((e) => [e.name, e.score]), [['an', 700], ['Binh', 500]]);
  assert.equal(rankOf(board, 'BINH'), 2);

  for (let i = 0; i < TOP_N; i++) board = insert(board, { name: `P${i}`, score: 1000 + i * 20 }, 10 + i).board;
  assert.equal(board.length, TOP_N);
  assert.equal(rankOf(board, 'an'), null);
  const low = insert(board, { name: 'Late', score: 100 }, 99);
  assert.equal(low.changed, false);
});

test('ties go to whoever scored first', () => {
  let board = insert([], { name: 'First', score: 400 }, 1).board;
  board = insert(board, { name: 'Second', score: 400 }, 2).board;
  assert.deepEqual(board.map((e) => e.name), ['First', 'Second']);
});
