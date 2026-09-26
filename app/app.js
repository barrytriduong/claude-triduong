// UI layer: renders projects, handles the editor dialog, persists to localStorage.
(function () {
  'use strict';

  const G = window.Goals;
  const STORAGE_KEY = 'project-goals.v1';
  const PREFS_KEY = 'project-goals.prefs';
  const LABELS = {
    idea: 'Idea', active: 'Active', paused: 'Paused', done: 'Done',
    low: 'Low', medium: 'Medium', high: 'High',
  };

  const $ = (id) => document.getElementById(id);

  // Tiny element builder. Text always goes through textContent, never innerHTML.
  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (v === undefined || v === null || v === false) return;
      if (k === 'class') node.className = v;
      else if (k === 'text') node.textContent = v;
      else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v === true ? '' : v);
    });
    (children || []).forEach((c) => c && node.append(c));
    return node;
  }

  // ---- storage -----------------------------------------------------------

  function safeGet(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function safeSet(key, value) {
    try { localStorage.setItem(key, value); return true; } catch (e) { return false; }
  }

  function loadProjects() {
    const raw = safeGet(STORAGE_KEY);
    if (!raw) return [];
    try { return G.parseImport(raw); } catch (e) { return []; }
  }

  const state = {
    projects: loadProjects(),
    filter: 'all',
    query: '',
    sort: 'updated',
    draft: null, // project being edited in the dialog
    isNew: false,
  };

  try {
    const prefs = JSON.parse(safeGet(PREFS_KEY) || '{}');
    if (prefs.filter) state.filter = prefs.filter;
    if (prefs.sort) state.sort = prefs.sort;
  } catch (e) { /* ignore bad prefs */ }

  function persist() {
    if (!safeSet(STORAGE_KEY, G.serialize(state.projects))) {
      alert('Could not save to browser storage. Use Export to keep a copy of your data.');
    }
  }
  function persistPrefs() {
    safeSet(PREFS_KEY, JSON.stringify({ filter: state.filter, sort: state.sort }));
  }

  // ---- rendering ---------------------------------------------------------

  function renderStats() {
    const s = G.summarize(state.projects, G.todayIso());
    const tile = (label, value, tone) =>
      el('div', { class: 'stat' + (tone ? ' ' + tone : '') }, [
        el('span', { class: 'stat-value', text: String(value) }),
        el('span', { class: 'stat-label', text: label }),
      ]);
    $('stats').replaceChildren(
      tile('Active', s.counts.active),
      tile('Active progress', s.activeProgress + '%'),
      tile('Done', s.counts.done),
      tile('Overdue', s.overdue, s.overdue ? 'warn' : ''),
    );
  }

  function renderFilter() {
    const counts = G.summarize(state.projects, G.todayIso()).counts;
    const options = [['all', 'All', state.projects.length]].concat(
      G.STATUSES.map((s) => [s, LABELS[s], counts[s]]),
    );
    $('status-filter').replaceChildren(...options.map(([value, label, n]) =>
      el('button', {
        type: 'button',
        class: 'chip',
        'aria-pressed': String(state.filter === value),
        onclick: () => { state.filter = value; persistPrefs(); render(); },
      }, [label + ' ', el('span', { class: 'count', text: String(n) })]),
    ));
  }

  function dueLabel(project, today) {
    const d = G.daysUntil(project.targetDate, today);
    if (d === null) return null;
    if (project.status === 'done') return { text: 'Target ' + project.targetDate, tone: '' };
    if (d < 0) return { text: Math.abs(d) + 'd overdue', tone: 'warn' };
    if (d === 0) return { text: 'Due today', tone: 'soon' };
    if (d <= 7) return { text: 'Due in ' + d + 'd', tone: 'soon' };
    return { text: 'Due ' + project.targetDate, tone: '' };
  }

  function card(p, today) {
    const pct = G.progress(p);
    const due = dueLabel(p, today);
    const doneCount = p.milestones.filter((m) => m.done).length;
    return el('button', {
      type: 'button',
      class: 'card status-' + p.status,
      onclick: () => openEditor(p),
      'aria-label': 'Edit ' + p.title,
    }, [
      el('div', { class: 'card-head' }, [
        el('span', { class: 'pill ' + p.status, text: LABELS[p.status] }),
        el('span', { class: 'prio ' + p.priority, text: LABELS[p.priority] + ' priority' }),
      ]),
      el('h3', { text: p.title }),
      p.description ? el('p', { class: 'desc', text: p.description }) : null,
      el('div', { class: 'bar', role: 'progressbar', 'aria-valuenow': String(pct), 'aria-valuemin': '0', 'aria-valuemax': '100' }, [
        el('span', { style: 'width:' + pct + '%' }),
      ]),
      el('div', { class: 'card-foot' }, [
        el('span', { text: p.milestones.length ? doneCount + '/' + p.milestones.length + ' milestones' : pct + '%' }),
        due ? el('span', { class: 'due ' + due.tone, text: due.text }) : null,
      ]),
    ]);
  }

  function renderList() {
    const today = G.todayIso();
    const visible = G.sortProjects(
      G.filterProjects(state.projects, { status: state.filter, query: state.query }),
      state.sort,
    );
    $('list').replaceChildren(...visible.map((p) => card(p, today)));
    const empty = $('empty');
    empty.hidden = visible.length > 0;
    empty.textContent = state.projects.length
      ? 'No projects match this filter.'
      : 'No projects yet. Click “New project” to add your first goal.';
  }

  function render() {
    renderStats();
    renderFilter();
    renderList();
  }

  // ---- editor dialog -----------------------------------------------------

  const form = $('editor-form');
  const dialog = $('editor');

  function fillSelect(select, values) {
    select.replaceChildren(...values.map((v) => el('option', { value: v, text: LABELS[v] })));
  }
  fillSelect(form.elements.status, G.STATUSES);
  fillSelect(form.elements.priority, G.PRIORITIES);

  function readForm() {
    const f = form.elements;
    return {
      title: f.title.value,
      description: f.description.value,
      status: f.status.value,
      priority: f.priority.value,
      targetDate: f.targetDate.value,
      notes: f.notes.value,
    };
  }

  function renderMilestones() {
    const d = state.draft;
    $('ms-progress').textContent = d.milestones.length ? '· ' + G.progress(d) + '%' : '';
    $('ms-list').replaceChildren(...d.milestones.map((m) =>
      el('li', { class: m.done ? 'done' : '' }, [
        el('label', {}, [
          el('input', {
            type: 'checkbox',
            checked: m.done,
            onchange: () => { state.draft = G.toggleMilestone(state.draft, m.id); renderMilestones(); },
          }),
          el('span', { text: m.text }),
        ]),
        el('button', {
          type: 'button',
          class: 'icon',
          'aria-label': 'Remove milestone ' + m.text,
          text: '×',
          onclick: () => { state.draft = G.removeMilestone(state.draft, m.id); renderMilestones(); },
        }),
      ]),
    ));
  }

  function openEditor(project) {
    state.isNew = !project;
    // The draft keeps milestone edits until Save; a placeholder title lets it normalize.
    state.draft = project || G.createProject({ title: 'Untitled', status: 'active' });
    const f = form.elements;
    f.title.value = project ? project.title : '';
    f.description.value = state.draft.description;
    f.status.value = state.draft.status;
    f.priority.value = state.draft.priority;
    f.targetDate.value = state.draft.targetDate;
    f.notes.value = state.draft.notes;
    $('editor-title').textContent = project ? 'Edit project' : 'New project';
    $('delete').hidden = !project;
    $('editor-error').textContent = '';
    $('ms-input').value = '';
    renderMilestones();
    dialog.showModal();
    f.title.focus();
  }

  function addMilestoneFromInput() {
    const input = $('ms-input');
    if (!input.value.trim()) return;
    state.draft = G.addMilestone(state.draft, input.value);
    input.value = '';
    renderMilestones();
    input.focus();
  }

  $('ms-add').addEventListener('click', addMilestoneFromInput);
  $('ms-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addMilestoneFromInput(); }
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    let saved;
    try {
      saved = G.updateProject(state.draft, readForm());
    } catch (err) {
      $('editor-error').textContent = err.message;
      return;
    }
    if (state.isNew) state.projects.push(saved);
    else state.projects = state.projects.map((p) => (p.id === saved.id ? saved : p));
    persist();
    dialog.close();
    render();
  });

  $('cancel').addEventListener('click', () => dialog.close());

  $('delete').addEventListener('click', () => {
    if (!confirm('Delete “' + state.draft.title + '”? This cannot be undone.')) return;
    state.projects = state.projects.filter((p) => p.id !== state.draft.id);
    persist();
    dialog.close();
    render();
  });

  // ---- toolbar & import/export ------------------------------------------

  $('new-project').addEventListener('click', () => openEditor(null));
  $('search').addEventListener('input', (e) => { state.query = e.target.value; renderList(); });
  $('sort').value = state.sort;
  $('sort').addEventListener('change', (e) => { state.sort = e.target.value; persistPrefs(); renderList(); });

  $('export').addEventListener('click', () => {
    const blob = new Blob([G.serialize(state.projects)], { type: 'application/json' });
    const a = el('a', { href: URL.createObjectURL(blob), download: 'project-goals-' + G.todayIso() + '.json' });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  $('import').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    let imported;
    try {
      imported = G.parseImport(await file.text());
    } catch (err) {
      alert(err.message);
      return;
    }
    const n = imported.length + ' project(s)';
    if (state.projects.length === 0 || confirm('Replace all your current projects with the ' + n + ' in this file?')) {
      state.projects = imported;
    } else if (confirm('Merge the ' + n + ' into your current list instead? Projects with the same ID are overwritten.')) {
      const byId = new Map(state.projects.map((p) => [p.id, p]));
      imported.forEach((p) => byId.set(p.id, p));
      state.projects = Array.from(byId.values());
    } else {
      return;
    }
    persist();
    render();
  });

  render();
})();
