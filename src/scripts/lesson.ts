// Interactive lesson page: YouTube player, synced transcript, flashcards and the Story Challenge quiz.
// All progress is saved in the learner's browser (localStorage) — no account needed.

type Line = { t: number; text: string };
type Word = { word: string; pos: string; meaning: string; example: string; t?: number };
type Q =
  | { type: 'choice'; prompt: string; options: string[]; answer: number; explain?: string; t?: number }
  | { type: 'truefalse'; prompt: string; answer: boolean; explain?: string; t?: number }
  | { type: 'gap'; sentence: string; options: string[]; answer: string; explain?: string; t?: number }
  | { type: 'order'; prompt: string; sentence: string; explain?: string; t?: number }
  | { type: 'match'; prompt: string; pairs: { left: string; right: string }[]; t?: number };

type LessonData = {
  slug: string;
  title: string;
  person: string;
  youtubeId: string;
  transcript: Line[];
  vocabulary: Word[];
  quiz: Q[];
};


/* ---------- helpers ---------- */

const store = {
  get<T>(key: string, fallback: T): T {
    try {
      const v = localStorage.getItem(key);
      return v ? (JSON.parse(v) as T) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key: string, value: unknown) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage may be blocked; the page still works */
    }
  },
};

function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | boolean | undefined> = {},
  ...children: (Node | string | null | undefined)[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    if (k === 'class') el.className = String(v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of children) if (c != null) el.append(c);
  return el;
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

let voice: SpeechSynthesisVoice | undefined;
function pickVoice() {
  if (!('speechSynthesis' in window)) return;
  const voices = speechSynthesis.getVoices();
  voice =
    voices.find((v) => v.lang === 'en-GB' && /natural|google|daniel|serena/i.test(v.name)) ||
    voices.find((v) => v.lang === 'en-US' && /natural|google|samantha/i.test(v.name)) ||
    voices.find((v) => v.lang.startsWith('en'));
}
if ('speechSynthesis' in window) {
  pickVoice();
  speechSynthesis.addEventListener?.('voiceschanged', pickVoice);
}
function speak(text: string, rate = 0.9) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = voice?.lang || 'en-GB';
  if (voice) u.voice = voice;
  u.rate = rate;
  speechSynthesis.speak(u);
}

/* ---------- main ---------- */

function init(L: LessonData) {
  const progressKey = `ble:progress:${L.slug}`;
  const progress = store.get<Record<string, boolean>>(progressKey, {});

  function markStep(step: 'watch' | 'read' | 'words' | 'quiz') {
    if (!progress[step]) {
      progress[step] = true;
      store.set(progressKey, progress);
    }
    renderSteps();
  }
  function renderSteps() {
    document.querySelectorAll<HTMLElement>('[data-step]').forEach((el) => {
      el.classList.toggle('done', !!progress[el.dataset.step!]);
    });
    const n = ['watch', 'read', 'words', 'quiz'].filter((s) => progress[s]).length;
    document.querySelectorAll<HTMLElement>('[data-steps-count]').forEach((el) => (el.textContent = String(n)));
  }
  renderSteps();

  const player = setupPlayer(L, markStep);
  setupTranscript(L, player, markStep);
  const deck = setupVocab(L, player, markStep);
  setupWordPopover(L, deck);
  setupQuiz(L, player, markStep);
}

/* ---------- YouTube player ---------- */

type Player = {
  hasVideo: boolean;
  seek(t: number, scroll?: boolean): void;
  onTime(fn: (t: number) => void): void;
  setLoop(on: boolean): void;
};

function setupPlayer(L: LessonData, markStep: (s: 'watch') => void): Player {
  const root = document.querySelector<HTMLElement>('[data-video]');
  const hasVideo = !!L.youtubeId && !!root;
  const listeners: ((t: number) => void)[] = [];
  let yt: any = null;
  let ready: Promise<any> | null = null;
  let rate = 1;
  let loop = false;
  let timer = 0;

  const starts = L.transcript.map((l) => l.t);
  const lineAt = (t: number) => {
    let i = 0;
    while (i + 1 < starts.length && starts[i + 1] <= t + 0.15) i++;
    return i;
  };
  let loopLine = -1;

  function tick() {
    if (!yt || typeof yt.getCurrentTime !== 'function') return;
    const t = yt.getCurrentTime();
    if (loop && loopLine >= 0) {
      const end = starts[loopLine + 1] ?? yt.getDuration();
      if (t >= end - 0.05 || t < starts[loopLine] - 0.5) yt.seekTo(starts[loopLine], true);
    }
    const d = yt.getDuration?.() || 0;
    if (d && t / d > 0.5) markStep('watch');
    listeners.forEach((fn) => fn(t));
  }

  function load(autoplay: boolean, start = 0): Promise<any> {
    if (ready) return ready;
    ready = new Promise((resolve) => {
      const mount = root!.querySelector<HTMLElement>('[data-player]')!;
      const holder = document.createElement('div');
      mount.append(holder);
      const create = () => {
        const YT = (window as any).YT;
        yt = new YT.Player(holder, {
          host: 'https://www.youtube-nocookie.com',
          videoId: L.youtubeId,
          playerVars: { autoplay: autoplay ? 1 : 0, start: Math.floor(start), rel: 0, playsinline: 1, modestbranding: 1 },
          events: {
            onReady: () => {
              root!.querySelector('[data-play]')?.remove();
              yt.setPlaybackRate(rate);
              if (autoplay) yt.playVideo();
              resolve(yt);
            },
            onStateChange: (e: any) => {
              clearInterval(timer);
              if (e.data === 1) timer = window.setInterval(tick, 250);
              tick();
            },
          },
        });
      };
      const w = window as any;
      if (w.YT?.Player) create();
      else {
        const prev = w.onYouTubeIframeAPIReady;
        w.onYouTubeIframeAPIReady = () => {
          prev?.();
          create();
        };
        const s = document.createElement('script');
        s.src = 'https://www.youtube.com/iframe_api';
        document.head.append(s);
      }
    });
    return ready;
  }

  if (hasVideo) {
    root!.querySelector('[data-play]')?.addEventListener('click', () => load(true));
    root!.querySelectorAll<HTMLButtonElement>('[data-rate]').forEach((b) =>
      b.addEventListener('click', () => {
        rate = Number(b.dataset.rate);
        root!.querySelectorAll('[data-rate]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        yt?.setPlaybackRate?.(rate);
      }),
    );
    const loopBtn = root!.querySelector<HTMLButtonElement>('[data-loop]');
    loopBtn?.addEventListener('click', () => api.setLoop(!loop));
  }

  const api: Player = {
    hasVideo,
    seek(t, scroll = false) {
      if (!hasVideo) return;
      if (scroll) {
        const r = root!.getBoundingClientRect();
        if (r.top < 70 || r.bottom > innerHeight) root!.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      loopLine = lineAt(t);
      if (yt) {
        yt.seekTo(t, true);
        yt.playVideo();
      } else load(true, t);
    },
    onTime(fn) {
      listeners.push(fn);
    },
    setLoop(on) {
      loop = on;
      root?.querySelector('[data-loop]')?.setAttribute('aria-pressed', String(on));
      if (on && yt) loopLine = lineAt(yt.getCurrentTime());
    },
  };
  return api;
}

/* ---------- Transcript ---------- */

function setupTranscript(L: LessonData, player: Player, markStep: (s: 'read' | 'watch') => void) {
  const root = document.querySelector<HTMLElement>('[data-transcript]');
  if (!root) return;
  const toggle = root.querySelector<HTMLButtonElement>('[data-ts-toggle]')!;
  const body = root.querySelector<HTMLElement>('[data-ts-body]')!;
  const label = root.querySelector<HTMLElement>('[data-ts-label]')!;
  const list = root.querySelector<HTMLElement>('.lines')!;
  const items = Array.from(root.querySelectorAll<HTMLElement>('[data-line]'));
  const follow = root.querySelector<HTMLInputElement>('[data-follow]');

  function setOpen(open: boolean) {
    body.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    label.textContent = open ? 'Hide transcript' : 'Show transcript';
    if (open) markStep('read');
  }
  toggle.addEventListener('click', () => setOpen(body.hidden));
  document.querySelectorAll('[data-open-transcript]').forEach((b) =>
    b.addEventListener('click', () => {
      setOpen(true);
      root.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }),
  );

  root.querySelectorAll<HTMLButtonElement>('[data-seek]').forEach((b, i) =>
    b.addEventListener('click', () => {
      if (player.hasVideo) player.seek(Number(b.dataset.seek), true);
      else {
        speak(L.transcript[i].text);
        setCurrent(i);
        // with no video, reading along counts as "watching"
        if (i >= L.transcript.length / 2) markStep('watch');
      }
    }),
  );

  let current = -1;
  function setCurrent(i: number) {
    if (i === current) return;
    items[current]?.classList.remove('now');
    current = i;
    const li = items[i];
    if (!li) return;
    li.classList.add('now');
    if (!body.hidden && (!follow || follow.checked)) {
      const top = li.offsetTop - list.offsetTop - list.clientHeight / 3;
      list.scrollTo({ top, behavior: 'smooth' });
    }
  }
  player.onTime((t) => {
    let i = 0;
    while (i + 1 < L.transcript.length && L.transcript[i + 1].t <= t + 0.15) i++;
    setCurrent(i);
  });
}

/* ---------- Word popover (transcript) ---------- */

function setupWordPopover(L: LessonData, deck: Deck | null) {
  const root = document.querySelector<HTMLElement>('[data-transcript]');
  if (!root) return;
  const pop = root.querySelector<HTMLElement>('[data-pop]')!;
  const wEl = pop.querySelector<HTMLElement>('[data-pop-word]')!;
  const pEl = pop.querySelector<HTMLElement>('[data-pop-pos]')!;
  const mEl = pop.querySelector<HTMLElement>('[data-pop-meaning]')!;
  let idx = -1;
  let opener: HTMLElement | null = null;

  const close = () => {
    pop.hidden = true;
    idx = -1;
  };

  root.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-word]');
    if (!b) return;
    e.stopPropagation();
    const i = Number(b.dataset.word);
    if (i === idx && !pop.hidden) return close();
    idx = i;
    opener = b;
    const w = L.vocabulary[i];
    wEl.textContent = w.word;
    pEl.textContent = w.pos;
    mEl.textContent = w.meaning;
    pop.hidden = false;
    const r = b.getBoundingClientRect();
    const s = root.getBoundingClientRect();
    const left = Math.min(Math.max(12, r.left - s.left - 20), s.width - pop.offsetWidth - 12);
    pop.style.left = `${left}px`;
    pop.style.top = `${r.bottom - s.top + 8}px`;
    speak(w.word);
  });
  pop.querySelector('[data-pop-say]')!.addEventListener('click', (e) => {
    e.stopPropagation();
    if (idx >= 0) speak(L.vocabulary[idx].word);
  });
  pop.querySelector('[data-pop-card]')!.addEventListener('click', (e) => {
    e.stopPropagation();
    if (idx >= 0 && deck) deck.show(idx, true);
    close();
  });
  pop.addEventListener('click', (e) => e.stopPropagation());
  document.addEventListener('click', close);
  root.querySelector('.lines')?.addEventListener('scroll', close, { passive: true });
  root.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !pop.hidden) {
      close();
      opener?.focus();
    }
  });
}

/* ---------- Vocabulary flashcards ---------- */

type Deck = { show(i: number, scroll?: boolean): void };

function setupVocab(L: LessonData, player: Player, markStep: (s: 'words') => void): Deck | null {
  const root = document.querySelector<HTMLElement>('[data-vocab]');
  if (!root) return null;
  const key = `ble:vocab:${L.slug}`;
  const status = store.get<Record<string, 'known' | 'learning'>>(key, {});
  const cards = Array.from(root.querySelectorAll<HTMLElement>('[data-card]'));
  const n = cards.length;
  const $ = <T extends HTMLElement>(s: string) => root.querySelector<T>(s)!;
  const cardsView = $('[data-cards]');
  const listView = $('[data-list]');
  const posEl = $('[data-pos]');
  const totalEl = $('[data-total]');
  const doneEl = $('[data-done]');

  let mode: 'cards' | 'list' | 'review' = 'cards';
  let order = [...Array(n).keys()];
  let at = 0;

  function refreshStats() {
    const known = Object.values(status).filter((s) => s === 'known').length;
    $('[data-known]').textContent = String(known);
    $<HTMLElement>('[data-ring]').style.setProperty('--p', String(Math.round((known / n) * 100)));
    $('[data-learning]').textContent = String(Object.values(status).filter((s) => s === 'learning').length);
    cards.forEach((c, i) => {
      const s = status[L.vocabulary[i].word];
      const el = c.querySelector<HTMLElement>('[data-status]')!;
      el.dataset.s = s || '';
      el.textContent = s === 'known' ? 'Known' : s === 'learning' ? 'Practising' : '';
    });
    root.querySelectorAll<HTMLElement>('[data-li]').forEach((li, i) => {
      li.querySelector<HTMLElement>('[data-li-status]')!.textContent = status[L.vocabulary[i].word] === 'known' ? 'known' : '';
    });
    doneEl.hidden = known < n;
    if (Object.keys(status).length >= n) markStep('words');
  }

  function render() {
    cards.forEach((c, i) => {
      c.hidden = i !== order[at];
      c.classList.remove('flipped');
    });
    posEl.textContent = String(order.length ? at + 1 : 0);
    totalEl.textContent = String(order.length);
  }

  function setMode(m: typeof mode) {
    mode = m;
    root.querySelectorAll<HTMLElement>('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === m)));
    listView.hidden = m !== 'list';
    cardsView.hidden = m === 'list';
    if (m === 'review') {
      order = [...Array(n).keys()].filter((i) => status[L.vocabulary[i].word] === 'learning');
      if (!order.length) order = [...Array(n).keys()].filter((i) => status[L.vocabulary[i].word] !== 'known');
      if (!order.length) order = [...Array(n).keys()];
    } else order = [...Array(n).keys()];
    at = 0;
    render();
  }

  root.querySelectorAll<HTMLButtonElement>('[data-view]').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.view as typeof mode)));
  root.querySelectorAll<HTMLButtonElement>('[data-flip]').forEach((b) =>
    b.addEventListener('click', () => b.closest<HTMLElement>('[data-card]')!.classList.toggle('flipped')),
  );
  const move = (d: number) => {
    if (!order.length) return;
    at = (at + d + order.length) % order.length;
    render();
  };
  $('[data-prev]').addEventListener('click', () => move(-1));
  $('[data-next]').addEventListener('click', () => move(1));
  $('[data-say]').addEventListener('click', () => speak(L.vocabulary[order[at]].word));
  root.querySelector('[data-hear]')?.addEventListener('click', () => {
    const w = L.vocabulary[order[at]];
    if (w.t !== undefined) player.seek(w.t, true);
  });
  root.querySelectorAll<HTMLButtonElement>('[data-judge]').forEach((b) =>
    b.addEventListener('click', () => {
      const w = L.vocabulary[order[at]];
      status[w.word] = b.dataset.judge as 'known' | 'learning';
      store.set(key, status);
      refreshStats();
      setTimeout(() => move(1), 180);
    }),
  );
  root.querySelectorAll<HTMLButtonElement>('[data-say-word]').forEach((b) =>
    b.addEventListener('click', () => speak(L.vocabulary[Number(b.dataset.sayWord)].word)),
  );
  cardsView.addEventListener('keydown', (e) => {
    if ((e.target as HTMLElement).matches('input, textarea')) return;
    if (e.key === 'ArrowRight') move(1);
    if (e.key === 'ArrowLeft') move(-1);
  });

  refreshStats();
  render();

  return {
    show(i, scroll) {
      setMode('cards');
      at = i;
      render();
      cards[i].classList.add('flipped');
      if (scroll) root.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
  };
}

/* ---------- Quiz: the Story Challenge ---------- */

const PRAISE = ['Nice one!', 'Exactly right!', 'You got it!', 'Brilliant!', 'Spot on!'];
const NUDGE = ['Not quite.', 'Almost!', 'Good try.'];
const pick = (a: string[]) => a[Math.floor(Math.random() * a.length)];
const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}' ]/gu, '').replace(/\s+/g, ' ').trim();

function setupQuiz(L: LessonData, player: Player, markStep: (s: 'quiz') => void) {
  const root = document.querySelector<HTMLElement>('[data-quiz]');
  if (!root || !L.quiz.length) return;
  const $ = <T extends HTMLElement>(s: string) => root.querySelector<T>(s)!;
  const screens = {
    start: $('[data-screen="start"]'),
    play: $('[data-screen="play"]'),
    result: $('[data-screen="result"]'),
  };
  const body = $('[data-body]');
  const fb = $('[data-feedback]');
  const bestKey = `ble:quiz:${L.slug}`;
  const total = L.quiz.length;

  let i = 0;
  let score = 0;
  let streak = 0;
  let bestStreak = 0;
  let correct = 0;
  let missed: { q: string; a: string }[] = [];

  const showBest = () => {
    const best = store.get<number>(bestKey, 0);
    if (best > 0) {
      $('[data-best-wrap]').hidden = false;
      $('[data-best]').textContent = String(best);
    }
  };
  showBest();

  function show(name: keyof typeof screens) {
    for (const [k, el] of Object.entries(screens)) el.hidden = k !== name;
  }

  function start() {
    i = score = streak = bestStreak = correct = 0;
    missed = [];
    show('play');
    renderQ();
    root.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function hud() {
    $('[data-qnum]').textContent = String(i + 1);
    $('[data-score]').textContent = String(score);
    const bar = $('[data-bar]');
    bar.setAttribute('aria-valuenow', String(i));
    bar.querySelector<HTMLElement>('span')!.style.width = `${(i / total) * 100}%`;
    const st = $('[data-streak]');
    st.hidden = streak < 2;
    $('[data-streak-n]').textContent = String(streak);
  }

  function answer(ok: boolean, q: Q, correctText: string) {
    if (ok) {
      correct++;
      streak++;
      bestStreak = Math.max(bestStreak, streak);
      score += 100 + (streak - 1) * 20;
      if (streak >= 2) {
        const st = $('[data-streak]');
        st.classList.remove('pop');
        void st.offsetWidth;
        st.classList.add('pop');
      }
    } else {
      streak = 0;
      missed.push({ q: questionText(q), a: correctText });
    }
    hud();
    fb.hidden = false;
    fb.className = `feedback ${ok ? 'good' : 'bad'}`;
    $('[data-fb-title]').textContent = ok ? `${pick(PRAISE)} +${100 + Math.max(0, streak - 1) * 20}` : pick(NUDGE);
    const explain = 'explain' in q && q.explain ? q.explain : '';
    const showAnswer = !ok && q.type !== 'match';
    $('[data-fb-explain]').textContent = showAnswer ? [`Answer: ${correctText}.`, explain].filter(Boolean).join(' ') : explain;
    const rw = $<HTMLButtonElement>('[data-rewatch]');
    rw.hidden = !(player.hasVideo && q.t !== undefined);
    rw.onclick = () => q.t !== undefined && player.seek(q.t, true);
    $<HTMLButtonElement>('[data-next]').textContent = i + 1 < total ? 'Next' : 'See my result';
    $<HTMLButtonElement>('[data-next]').focus({ preventScroll: true });
  }

  function questionText(q: Q) {
    if (q.type === 'gap') return q.sentence.replace('___', '_____');
    if (q.type === 'order') return 'Build the sentence';
    return q.prompt;
  }

  function prompt(kind: string, text: string) {
    const p = h('p', { class: 'q-prompt', tabindex: '-1' }, text);
    return [h('span', { class: 'q-kind' }, kind), p];
  }

  function renderQ() {
    fb.hidden = true;
    body.replaceChildren();
    hud();
    const q = L.quiz[i];
    let focusEl: HTMLElement | null = null;

    if (q.type === 'choice' || q.type === 'truefalse') {
      const opts = q.type === 'choice' ? q.options : ['True', 'False'];
      const right = q.type === 'choice' ? q.answer : q.answer ? 0 : 1;
      const [k, p] = prompt(q.type === 'choice' ? 'Choose the answer' : 'True or false?', q.prompt);
      focusEl = p;
      const wrap = h('div', { class: `opts ${q.type === 'truefalse' ? 'tf' : ''}` });
      const buttons = opts.map((o, idx) => {
        const b = h('button', { type: 'button', class: 'opt' }, o);
        b.addEventListener('click', () => {
          buttons.forEach((x, j) => {
            x.disabled = true;
            if (j === right) x.classList.add('right');
            else if (x !== b) x.classList.add('dim');
          });
          if (idx !== right) b.classList.add('wrong');
          answer(idx === right, q, opts[right]);
        });
        return b;
      });
      wrap.append(...buttons);
      body.append(k, p, wrap);
    }

    if (q.type === 'gap') {
      const [before, after = ''] = q.sentence.split('___');
      const blank = h('span', { class: 'blank' }, ' ');
      const line = h('p', { class: 'gap-line', tabindex: '-1' }, before, blank, after);
      focusEl = line;
      const row = h('div', { class: 'chips-row' });
      const buttons = shuffle(q.options).map((o) => {
        const b = h('button', { type: 'button', class: 'opt' }, o);
        b.addEventListener('click', () => {
          const ok = norm(o) === norm(q.answer);
          blank.textContent = o;
          blank.classList.add(ok ? 'filled-right' : 'filled-wrong');
          buttons.forEach((x) => {
            x.disabled = true;
            if (norm(x.textContent!) === norm(q.answer)) x.classList.add('right');
            else if (x !== b) x.classList.add('dim');
          });
          if (!ok) b.classList.add('wrong');
          answer(ok, q, q.answer);
        });
        return b;
      });
      row.append(...buttons);
      body.append(h('span', { class: 'q-kind' }, 'Fill the gap'), line, row);
    }

    if (q.type === 'order') {
      const words = q.sentence.split(/\s+/);
      let tiles = shuffle(words.map((w, idx) => ({ w, idx })));
      if (tiles.every((t, k) => t.idx === k) && words.length > 1) tiles = tiles.reverse();
      const [k, p] = prompt('Build the sentence', q.prompt);
      focusEl = p;
      const build = h('div', { class: 'build', 'aria-label': 'Your sentence' }, h('span', { class: 'build-empty' }, 'Tap the words below…'));
      const pool = h('div', { class: 'chips-row' });
      const check = h('button', { type: 'button', class: 'btn btn-sun check', disabled: true }, 'Check');
      const placed: HTMLButtonElement[] = [];
      let locked = false;

      const sync = () => {
        build.querySelector('.build-empty')?.remove();
        if (!placed.length) build.append(h('span', { class: 'build-empty' }, 'Tap the words below…'));
        check.disabled = placed.length !== words.length;
      };
      tiles.forEach(({ w }) => {
        const t = h('button', { type: 'button', class: 'tile' }, w);
        t.addEventListener('click', () => {
          if (locked || t.classList.contains('used')) return;
          t.classList.add('used');
          const chip = h('button', { type: 'button', class: 'tile' }, w);
          chip.addEventListener('click', () => {
            if (locked) return;
            chip.remove();
            placed.splice(placed.indexOf(chip), 1);
            t.classList.remove('used');
            sync();
          });
          placed.push(chip);
          build.querySelector('.build-empty')?.remove();
          build.append(chip);
          sync();
        });
        pool.append(t);
      });
      check.addEventListener('click', () => {
        locked = true;
        const built = Array.from(build.querySelectorAll('.tile')).map((x) => x.textContent).join(' ');
        const ok = norm(built) === norm(q.sentence);
        build.classList.add(ok ? 'right' : 'wrong');
        check.remove();
        pool.remove();
        if (!ok) body.append(h('p', { class: 'correct-answer' }, q.sentence));
        answer(ok, q, `“${q.sentence}”`);
      });
      body.append(k, p, build, pool, check);
    }

    if (q.type === 'match') {
      const [k, p] = prompt('Match the pairs', q.prompt);
      focusEl = p;
      const grid = h('div', { class: 'match' });
      const leftCol = h('div', { class: 'match-col' });
      const rightCol = h('div', { class: 'match-col' });
      let sel: HTMLButtonElement | null = null;
      let mistakes = 0;
      let done = 0;
      const mk = (text: string, pair: number, side: 'l' | 'r') => {
        const b = h('button', { type: 'button', class: `opt ${side}`, 'data-pair': String(pair), 'data-side': side }, text);
        b.addEventListener('click', () => {
          if (b.classList.contains('done')) return;
          if (!sel || sel.dataset.side === side) {
            sel?.classList.remove('sel');
            sel = b;
            b.classList.add('sel');
            if (side === 'l') speak(text);
            return;
          }
          const a = sel;
          sel = null;
          a.classList.remove('sel');
          if (a.dataset.pair === b.dataset.pair) {
            [a, b].forEach((x) => {
              x.classList.add('done');
              x.disabled = true;
            });
            done++;
            if (done === q.pairs.length) {
              const ok = mistakes === 0;
              const explain = ok ? 'Perfect matching, no mistakes.' : `All matched, with ${mistakes} mistake${mistakes > 1 ? 's' : ''}. Aim for zero next time!`;
              answer(ok, { ...q, explain } as Q, q.pairs.map((pr) => `${pr.left} = ${pr.right}`).join('; '));
            }
          } else {
            mistakes++;
            [a, b].forEach((x) => {
              x.classList.remove('wrong');
              void x.offsetWidth;
              x.classList.add('wrong');
              setTimeout(() => x.classList.remove('wrong'), 450);
            });
          }
        });
        return b;
      };
      q.pairs.forEach((pr, idx) => leftCol.append(mk(pr.left, idx, 'l')));
      shuffle(q.pairs.map((pr, idx) => ({ pr, idx }))).forEach(({ pr, idx }) => rightCol.append(mk(pr.right, idx, 'r')));
      grid.append(leftCol, rightCol);
      body.append(k, p, grid);
    }

    if (focusEl && i > 0) focusEl.focus({ preventScroll: true });
  }

  function finish() {
    show('result');
    markStep('quiz');
    const pct = correct / total;
    const stars = pct >= 0.9 ? 3 : pct >= 0.6 ? 2 : pct >= 0.3 ? 1 : 0;
    root.querySelectorAll('[data-stars] svg').forEach((s, k) => s.classList.toggle('on', k < stars));
    const best = store.get<number>(bestKey, 0);
    const isBest = score > best;
    if (isBest) store.set(bestKey, score);
    showBest();
    $('[data-r-title]').textContent = ['Keep practising!', 'Good start!', 'Great job!', 'Superstar!'][stars];
    $('[data-r-line]').textContent = isBest && best > 0 ? `New personal best! You beat your old score of ${best}.` : `You finished the ${L.person} Story Challenge.`;
    $('[data-r-score]').textContent = String(score);
    $('[data-r-correct]').textContent = `${correct}/${total}`;
    $('[data-r-streak]').textContent = String(bestStreak);
    const review = $('[data-review]');
    const ul = $('[data-review-list]');
    ul.replaceChildren(...missed.map((m) => h('li', {}, `${m.q} → `, h('b', {}, m.a))));
    review.hidden = !missed.length;
    $<HTMLElement>('[data-bar] span').style.width = '100%';
  }

  $('[data-start]').addEventListener('click', start);
  $('[data-retry]').addEventListener('click', start);
  $('[data-next]').addEventListener('click', () => {
    i++;
    if (i < total) renderQ();
    else finish();
  });
  $('[data-share]').addEventListener('click', async () => {
    const text = `I scored ${score} points on the ${L.person} Story Challenge at Bright Lives English. Can you beat me?`;
    const url = location.href.split('#')[0] + '#quiz';
    try {
      if (navigator.share) await navigator.share({ title: L.title, text, url });
      else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        $('[data-share-note]').hidden = false;
      }
    } catch {
      /* share cancelled */
    }
  });
}

/* ---------- start ---------- */

const dataEl = document.getElementById('lesson-data');
if (dataEl) init(JSON.parse(dataEl.textContent || '{}') as LessonData);
