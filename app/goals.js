// Pure data logic for the goal tracker. No DOM access here, so it can be
// loaded by the browser as a plain script and by Node for tests.
(function (root) {
  'use strict';

  const STATUSES = ['idea', 'active', 'paused', 'done'];
  const PRIORITIES = ['low', 'medium', 'high'];
  const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };
  const EXPORT_VERSION = 1;

  function makeId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }

  function isoDate(value) {
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : '';
  }

  function normalizeMilestone(m) {
    return {
      id: typeof m.id === 'string' && m.id ? m.id : makeId(),
      text: String(m.text || '').trim(),
      done: Boolean(m.done),
    };
  }

  // Coerce arbitrary input into a valid project. Throws if there is no title.
  function normalizeProject(input, now) {
    const title = String((input && input.title) || '').trim();
    if (!title) throw new Error('A project needs a title.');
    const stamp = (now || new Date()).toISOString();
    return {
      id: typeof input.id === 'string' && input.id ? input.id : makeId(),
      title,
      description: String(input.description || '').trim(),
      status: STATUSES.includes(input.status) ? input.status : 'idea',
      priority: PRIORITIES.includes(input.priority) ? input.priority : 'medium',
      targetDate: isoDate(input.targetDate),
      notes: String(input.notes || ''),
      milestones: Array.isArray(input.milestones)
        ? input.milestones.map(normalizeMilestone).filter((m) => m.text)
        : [],
      createdAt: typeof input.createdAt === 'string' ? input.createdAt : stamp,
      updatedAt: typeof input.updatedAt === 'string' ? input.updatedAt : stamp,
    };
  }

  function createProject(fields, now) {
    return normalizeProject(Object.assign({}, fields, { id: undefined, createdAt: undefined, updatedAt: undefined }), now);
  }

  function updateProject(project, patch, now) {
    const merged = Object.assign({}, project, patch, {
      id: project.id,
      createdAt: project.createdAt,
      updatedAt: (now || new Date()).toISOString(),
    });
    return normalizeProject(merged, now);
  }

  function addMilestone(project, text, now) {
    const clean = String(text || '').trim();
    if (!clean) return project;
    return updateProject(project, {
      milestones: project.milestones.concat({ id: makeId(), text: clean, done: false }),
    }, now);
  }

  function toggleMilestone(project, milestoneId, now) {
    return updateProject(project, {
      milestones: project.milestones.map((m) => (m.id === milestoneId ? Object.assign({}, m, { done: !m.done }) : m)),
    }, now);
  }

  function removeMilestone(project, milestoneId, now) {
    return updateProject(project, {
      milestones: project.milestones.filter((m) => m.id !== milestoneId),
    }, now);
  }

  // Percent complete, 0-100. Milestones drive it; without any, only "done" counts as 100.
  function progress(project) {
    const total = project.milestones.length;
    if (!total) return project.status === 'done' ? 100 : 0;
    const done = project.milestones.filter((m) => m.done).length;
    return Math.round((done / total) * 100);
  }

  function todayIso(now) {
    const d = now || new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  // Whole days from `today` to the target date; negative when past. null if no date.
  function daysUntil(targetDate, today) {
    if (!targetDate) return null;
    const a = Date.UTC(...today.split('-').map((n, i) => (i === 1 ? n - 1 : +n)));
    const b = Date.UTC(...targetDate.split('-').map((n, i) => (i === 1 ? n - 1 : +n)));
    return Math.round((b - a) / 86400000);
  }

  function isOverdue(project, today) {
    const d = daysUntil(project.targetDate, today);
    return d !== null && d < 0 && project.status !== 'done';
  }

  function filterProjects(list, opts) {
    const status = (opts && opts.status) || 'all';
    const query = String((opts && opts.query) || '').trim().toLowerCase();
    return list.filter((p) => {
      if (status !== 'all' && p.status !== status) return false;
      if (!query) return true;
      return (p.title + ' ' + p.description + ' ' + p.notes).toLowerCase().includes(query);
    });
  }

  const SORTERS = {
    priority: (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority],
    // Projects without a target date go last.
    target: (a, b) => (a.targetDate || '9999-99-99').localeCompare(b.targetDate || '9999-99-99'),
    progress: (a, b) => progress(b) - progress(a),
    updated: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
  };

  function sortProjects(list, by) {
    const cmp = SORTERS[by] || SORTERS.updated;
    // Ties fall back to title so the order is stable across renders.
    return list.slice().sort((a, b) => cmp(a, b) || a.title.localeCompare(b.title));
  }

  function summarize(list, today) {
    const counts = { idea: 0, active: 0, paused: 0, done: 0 };
    list.forEach((p) => { counts[p.status] += 1; });
    const active = list.filter((p) => p.status === 'active');
    return {
      total: list.length,
      counts,
      overdue: list.filter((p) => isOverdue(p, today)).length,
      activeProgress: active.length
        ? Math.round(active.reduce((sum, p) => sum + progress(p), 0) / active.length)
        : 0,
    };
  }

  function serialize(list) {
    return JSON.stringify({ version: EXPORT_VERSION, projects: list }, null, 2);
  }

  // Accepts either an exported file ({version, projects}) or a bare array.
  function parseImport(text) {
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error('That file is not valid JSON.');
    }
    const items = Array.isArray(data) ? data : data && Array.isArray(data.projects) ? data.projects : null;
    if (!items) throw new Error('No projects found in that file.');
    return items.map((item) => normalizeProject(item || {}));
  }

  const api = {
    STATUSES, PRIORITIES,
    createProject, updateProject, normalizeProject,
    addMilestone, toggleMilestone, removeMilestone,
    progress, todayIso, daysUntil, isOverdue,
    filterProjects, sortProjects, summarize,
    serialize, parseImport,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Goals = api;
})(typeof window !== 'undefined' ? window : this);
