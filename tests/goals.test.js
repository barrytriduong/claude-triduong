const test = require('node:test');
const assert = require('node:assert/strict');
const G = require('../app/goals.js');

const NOW = new Date('2026-09-26T12:00:00Z');

test('createProject requires a title and fills defaults', () => {
  assert.throws(() => G.createProject({ title: '   ' }), /title/);
  const p = G.createProject({ title: ' Learn piano ', status: 'bogus', priority: 'nope', targetDate: 'soon' }, NOW);
  assert.equal(p.title, 'Learn piano');
  assert.equal(p.status, 'idea');
  assert.equal(p.priority, 'medium');
  assert.equal(p.targetDate, '');
  assert.deepEqual(p.milestones, []);
  assert.equal(p.createdAt, NOW.toISOString());
  assert.ok(p.id);
});

test('updateProject keeps id and createdAt, bumps updatedAt', () => {
  const p = G.createProject({ title: 'A' }, NOW);
  const later = new Date('2026-09-27T00:00:00Z');
  const u = G.updateProject(p, { title: 'B', id: 'hijack', createdAt: 'x' }, later);
  assert.equal(u.id, p.id);
  assert.equal(u.createdAt, p.createdAt);
  assert.equal(u.updatedAt, later.toISOString());
  assert.equal(u.title, 'B');
});

test('milestones drive progress', () => {
  let p = G.createProject({ title: 'Garden' }, NOW);
  assert.equal(G.progress(p), 0);
  p = G.addMilestone(p, 'Buy seeds');
  p = G.addMilestone(p, '  ');
  p = G.addMilestone(p, 'Plant');
  p = G.addMilestone(p, 'Water');
  assert.equal(p.milestones.length, 3);
  p = G.toggleMilestone(p, p.milestones[0].id);
  assert.equal(G.progress(p), 33);
  p = G.removeMilestone(p, p.milestones[2].id);
  assert.equal(G.progress(p), 50);
});

test('progress without milestones is 100 only when done', () => {
  assert.equal(G.progress(G.createProject({ title: 'x', status: 'done' })), 100);
  assert.equal(G.progress(G.createProject({ title: 'x', status: 'active' })), 0);
});

test('daysUntil and isOverdue', () => {
  assert.equal(G.daysUntil('', '2026-09-26'), null);
  assert.equal(G.daysUntil('2026-10-01', '2026-09-26'), 5);
  assert.equal(G.daysUntil('2026-09-20', '2026-09-26'), -6);
  const late = G.createProject({ title: 'x', status: 'active', targetDate: '2026-09-01' });
  assert.equal(G.isOverdue(late, '2026-09-26'), true);
  assert.equal(G.isOverdue(G.updateProject(late, { status: 'done' }), '2026-09-26'), false);
});

test('todayIso uses local date parts', () => {
  assert.equal(G.todayIso(new Date(2026, 0, 5)), '2026-01-05');
});

test('filterProjects by status and text', () => {
  const list = [
    G.createProject({ title: 'Run a marathon', status: 'active' }),
    G.createProject({ title: 'Write a novel', status: 'idea', notes: 'sci-fi' }),
  ];
  assert.equal(G.filterProjects(list, { status: 'active' }).length, 1);
  assert.equal(G.filterProjects(list, { query: 'SCI' })[0].title, 'Write a novel');
  assert.equal(G.filterProjects(list, {}).length, 2);
});

test('sortProjects by priority and target date', () => {
  const list = [
    G.createProject({ title: 'b', priority: 'low', targetDate: '2026-12-01' }),
    G.createProject({ title: 'a', priority: 'high' }),
    G.createProject({ title: 'c', priority: 'medium', targetDate: '2026-10-01' }),
  ];
  assert.deepEqual(G.sortProjects(list, 'priority').map((p) => p.title), ['a', 'c', 'b']);
  assert.deepEqual(G.sortProjects(list, 'target').map((p) => p.title), ['c', 'b', 'a']);
  assert.equal(list[0].title, 'b', 'sort does not mutate the input');
});

test('summarize counts statuses, overdue and active progress', () => {
  let a = G.createProject({ title: 'a', status: 'active', targetDate: '2026-01-01' });
  a = G.addMilestone(a, 'one');
  a = G.toggleMilestone(a, a.milestones[0].id);
  const b = G.createProject({ title: 'b', status: 'active' });
  const c = G.createProject({ title: 'c', status: 'done' });
  const s = G.summarize([a, b, c], '2026-09-26');
  assert.deepEqual(s.counts, { idea: 0, active: 2, paused: 0, done: 1 });
  assert.equal(s.overdue, 1);
  assert.equal(s.activeProgress, 50);
});

test('serialize and parseImport round-trip', () => {
  const list = [G.addMilestone(G.createProject({ title: 'x', priority: 'high' }), 'm')];
  const back = G.parseImport(G.serialize(list));
  assert.deepEqual(back, list);
  assert.equal(G.parseImport(JSON.stringify([{ title: 'bare' }]))[0].title, 'bare');
  assert.throws(() => G.parseImport('not json'), /valid JSON/);
  assert.throws(() => G.parseImport('{"foo":1}'), /No projects/);
});
