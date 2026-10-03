// Background music: built-in soft piano pieces (composed live in the browser, so
// nothing is downloaded) plus songs the admin uploads. One 🎵 button for everyone.

import { state } from "./state.js";
import { $, h, toast } from "./util.js";
import { t } from "./i18n.js";

// ---------- Built-in pieces ----------
// Soft, emotional piano pieces composed live in the browser (nothing is downloaded):
// a chord progression, a gentle arpeggio, a slow melody and a warm pad, with reverb.
// Each repeat varies the melody a little, like someone improvising at the piano.
const PIECES = {
  firstLight: { bpm: 66, beats: 4, key: "C", prog: ["C", "G/B", "Am", "Em/G", "F", "C/E", "Dm7", "G"] },
  canon: { bpm: 60, beats: 4, key: "D", prog: ["D", "A/C#", "Bm", "F#m/A", "G", "D/F#", "G", "A"] },
  littleHands: { bpm: 62, beats: 4, key: "C", prog: ["Am", "F", "C", "G", "F", "C", "Dm7", "Esus4"] },
  sleep: { bpm: 52, beats: 3, key: "F", prog: ["Fmaj7", "Am7", "Dm7", "Bbmaj7", "Gm7", "Am7", "Bbmaj7", "Csus4"] },
  timeFlies: { bpm: 70, beats: 4, key: "G", prog: ["G", "D/F#", "Em", "C", "G", "D", "Cmaj7", "D"] },
};
export const BUILTIN = Object.keys(PIECES);
const DEFAULT_SONG = "firstLight";

const PITCH = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const QUALITY = { "": [0, 4, 7], m: [0, 3, 7], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], "7": [0, 4, 7, 10], sus4: [0, 5, 7], add9: [0, 4, 7, 14] };
const SCALE = [0, 2, 4, 5, 7, 9, 11];
const pc = (name) => (PITCH[name[0]] + (name[1] === "#" ? 1 : name[1] === "b" ? -1 : 0) + 12) % 12;

function parseChord(sym) {
  const [main, slash] = sym.split("/");
  const m = main.match(/^([A-G][#b]?)(.*)$/);
  const root = pc(m[1]);
  return { root, tones: (QUALITY[m[2]] || QUALITY[""]).map((i) => (root + i) % 12), bass: slash ? pc(slash) : root };
}

/** Deterministic random numbers, so a piece sounds the same each time it starts. */
function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const nearest = (pitchClass, around) => {
  let best = null;
  for (let n = around - 12; n <= around + 12; n++) if (n % 12 === pitchClass && (best === null || Math.abs(n - around) < Math.abs(best - around))) best = n;
  return best;
};
const freq = (midi) => 440 * 2 ** ((midi - 69) / 12);

let ctx, master, dry, wet, timer, audioEl;
const player = { on: false, song: DEFAULT_SONG, volume: 0.5 };

try {
  const saved = JSON.parse(localStorage.getItem("music") || "{}");
  Object.assign(player, saved, { on: false });
  player.wanted = saved.on === true;
} catch { /* storage blocked */ }
const remember = () => {
  try { localStorage.setItem("music", JSON.stringify({ on: player.on, song: player.song, volume: player.volume })); } catch { /* ignore */ }
};

/** A soft room reverb made from fading noise. */
function impulse(c, seconds = 3.2) {
  const len = Math.floor(c.sampleRate * seconds);
  const buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
  }
  return buf;
}

/** Builds the effects chain (compressor + reverb) on a context; sets the shared ctx/master. */
function buildGraph(c) {
  ctx = c;
  {
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 3;
    comp.connect(ctx.destination);
    master = ctx.createGain();
    dry = ctx.createGain();
    dry.gain.value = 0.75;
    wet = ctx.createGain();
    wet.gain.value = 0.45;
    const verb = ctx.createConvolver();
    verb.buffer = impulse(ctx);
    master.connect(dry).connect(comp);
    master.connect(verb).connect(wet).connect(comp);
  }
  master.gain.value = player.volume * 2.4;
  return ctx;
}

function audioCtx() {
  return ctx || buildGraph(new AudioContext());
}

/** A warm, soft piano note. */
function piano(time, midi, dur, vel) {
  const f = freq(midi);
  const decay = Math.min(3.2, Math.max(0.9, 3 - (midi - 40) * 0.035));
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 1400 + vel * 2600;
  lp.connect(master);
  const end = time + dur;
  [[1, 1], [2, 0.42], [3, 0.16], [4, 0.08], [6, 0.03]].forEach(([mult, amp], k) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = f * mult * (1 + (k ? 0.0008 * k : 0));
    const peak = vel * amp * 0.22;
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(peak, time + 0.006);
    g.gain.setTargetAtTime(0.0001, time + 0.006, decay / (1 + k * 0.8) / 3);
    g.gain.setTargetAtTime(0.0001, end, 0.18); // damper
    o.connect(g).connect(lp);
    o.start(time);
    o.stop(end + 1.2);
  });
}

/** A quiet sustained chord underneath, for warmth. */
function pad(time, notes, dur) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, time);
  g.gain.linearRampToValueAtTime(0.03, time + dur * 0.4);
  g.gain.linearRampToValueAtTime(0.0001, time + dur + 0.6);
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 900;
  g.connect(lp).connect(master);
  for (const n of notes) {
    const o = ctx.createOscillator();
    o.type = "triangle";
    o.frequency.value = freq(n);
    o.connect(g);
    o.start(time);
    o.stop(time + dur + 0.8);
  }
}

const RHYTHMS = { 4: [[2, 2], [3, 1], [1, 1, 2], [4], [1.5, 0.5, 2], [2, 1, 1]], 3: [[3], [2, 1], [1, 1, 1], [1.5, 1.5]] };

/** Returns a function that schedules the next bar of the piece and returns its end time. */
function composer(id, startAt) {
  const piece = PIECES[id];
  const beat = 60 / piece.bpm;
  const keyPc = pc(piece.key);
  const scale = SCALE.map((i) => (keyPc + i) % 12);
  const chords = piece.prog.map(parseChord);
  let bar = 0;
  let loop = 0;
  let rand = rng(7);
  let last = 72; // the melody starts around C5
  let next = startAt;

  const scheduleBar = () => {
    const c = chords[bar];
    const t0 = next;
    const barLen = piece.beats * beat;
    // Left hand: low bass note, then a flowing arpeggio of the chord.
    const bass = nearest(c.bass, 43);
    piano(t0, bass, barLen, 0.5);
    const voicing = c.tones.map((p, i) => nearest(p, 55 + i * 4)).sort((a, b) => a - b);
    const arp = [voicing[0], voicing[1], voicing[2], voicing[voicing.length - 1] + (voicing.length > 3 ? 0 : 12), voicing[2], voicing[1]];
    const steps = piece.beats * 2;
    for (let i = 1; i < steps; i++) piano(t0 + i * beat / 2, arp[i % arp.length], beat * 1.2, 0.22 + rand() * 0.06);
    pad(t0, voicing, barLen);
    // Right hand: a slow, singing melody — chord tones on strong beats, steps in between.
    // The first time through it's always the same; later repeats vary gently.
    const pattern = RHYTHMS[piece.beats][Math.floor(rand() * RHYTHMS[piece.beats].length)];
    let at = t0;
    pattern.forEach((len, i) => {
      if (!(i > 0 && rand() < 0.15)) {
        let note;
        if (i === 0) note = nearest(c.tones[Math.floor(rand() * c.tones.length)], last);
        else {
          const stepped = last + (rand() < 0.5 ? -1 : 1) * (rand() < 0.7 ? 1 : 2);
          note = [stepped, stepped + 1, stepped - 1].find((n) => scale.includes(((n % 12) + 12) % 12)) ?? last;
        }
        while (note > 81) note -= 12;
        while (note < 64) note += 12;
        piano(at, note, len * beat * 0.95, 0.42 + rand() * 0.1);
        last = note;
      }
      at += len * beat;
    });
    next += barLen;
    bar++;
    if (bar === chords.length) {
      bar = 0;
      loop++;
      rand = rng(7 + loop); // a new variation each time round
    }
    return next;
  };
  return scheduleBar;
}

function playBuiltin(id) {
  const scheduleBar = composer(id, audioCtx().currentTime + 0.15);
  let next = 0;
  const tick = () => {
    while (ctx && next < ctx.currentTime + 1.5) next = scheduleBar();
  };
  tick();
  timer = setInterval(tick, 250);
}

async function playCustom(song) {
  if (!audioEl) {
    audioEl = new Audio();
    audioEl.loop = true;
  }
  audioEl.src = await state.store.fileUrl(song.path);
  audioEl.volume = player.volume;
  await audioEl.play();
}

function stopAll() {
  clearInterval(timer);
  timer = null;
  if (ctx) ctx.close();
  ctx = null;
  audioEl?.pause();
}

const customSongs = () => state.settings.songs || [];
const songLabel = (id) => (PIECES[id] ? t(`song_${id}`) : customSongs().find((s) => s.id === id)?.name || "🎵");

export async function startMusic() {
  stopAll();
  const custom = customSongs().find((s) => s.id === player.song);
  if (!PIECES[player.song] && !custom) player.song = DEFAULT_SONG;
  try {
    if (custom) await playCustom(custom);
    else playBuiltin(player.song);
    player.on = true;
  } catch (ex) {
    console.warn(ex);
    player.on = false;
    toast(t("musicError"));
  }
  remember();
  renderButton();
}

export function stopMusic() {
  stopAll();
  player.on = false;
  remember();
  renderButton();
}

export const musicOn = () => player.on;

/** Renders a piece to an AudioBuffer (used to make preview recordings). */
export async function renderPiece(id, seconds = 40, sampleRate = 44100) {
  const saved = { ctx, master, dry, wet };
  const off = new OfflineAudioContext(2, sampleRate * seconds, sampleRate);
  buildGraph(off);
  master.gain.value = 0.5 * 2.4;
  const scheduleBar = composer(id, 0.1);
  let end = 0;
  while (end < seconds - 2) end = scheduleBar();
  const buffer = await off.startRendering();
  ({ ctx, master, dry, wet } = saved);
  return buffer;
}

// ---------- UI ----------

function renderButton() {
  const btn = $("#btnMusic");
  btn.classList.toggle("on", player.on);
  btn.title = player.on ? t("musicOff") : t("musicOn");
  btn.textContent = player.on ? "🎶" : "🎵";
}

function renderPanel() {
  const panel = $("#musicPanel");
  const admin = state.access.admin;
  const choice = (id, removable) => h("label", { class: `song${player.song === id ? " on" : ""}` },
    h("input", {
      type: "radio", name: "song", checked: player.song === id,
      onchange: () => { player.song = id; startMusic(); renderPanel(); },
    }),
    h("span", {}, songLabel(id)),
    removable && admin && h("button", { type: "button", class: "link-btn danger", onclick: (e) => { e.preventDefault(); removeSong(id); } }, "✕"));
  panel.replaceChildren(
    h("div", { class: "music-head" },
      h("b", {}, t("musicTitle")),
      h("button", { type: "button", class: `btn ${player.on ? "btn-ghost" : "btn-primary"} small-btn`, onclick: () => { player.on ? stopMusic() : startMusic(); renderPanel(); } },
        player.on ? `⏸️ ${t("musicPause")}` : `▶️ ${t("musicPlay")}`)),
    h("div", { class: "song-list" }, BUILTIN.map((id) => choice(id, false)), customSongs().map((s) => choice(s.id, true))),
    h("label", { class: "volume" }, "🔈",
      h("input", {
        type: "range", min: "0", max: "1", step: "0.05", value: String(player.volume), "aria-label": t("musicVolume"),
        oninput: (e) => {
          player.volume = Number(e.target.value);
          if (master) master.gain.value = player.volume * 2.4;
          if (audioEl) audioEl.volume = player.volume;
          remember();
        },
      }), "🔊"),
    admin && state.store.mode && h("label", { class: "btn btn-ghost small-btn file-btn upload-song" }, t("musicUpload"),
      h("input", { type: "file", accept: "audio/*", hidden: true, onchange: uploadSong })),
    admin && h("small", { class: "muted" }, t("musicUploadHint")));
}

async function uploadSong(e) {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;
  if (file.size > 15 * 1024 * 1024) return toast(t("musicTooBig"), 5000);
  toast(t("saving"), 30000);
  try {
    const path = await state.store.uploadFile("music", file);
    const song = { id: crypto.randomUUID(), name: file.name.replace(/\.\w+$/, ""), path };
    state.settings = { ...state.settings, songs: [...customSongs(), song] };
    await state.store.saveSettings(state.settings);
    player.song = song.id;
    toast(t("saved"));
    await startMusic();
    renderPanel();
  } catch (ex) {
    toast(ex.message, 6000);
  }
}

async function removeSong(id) {
  const song = customSongs().find((s) => s.id === id);
  if (!song || !confirm(t("musicRemoveConfirm", { name: song.name }))) return;
  state.settings = { ...state.settings, songs: customSongs().filter((s) => s.id !== id) };
  await state.store.saveSettings(state.settings);
  await state.store.deleteFile(song.path).catch(() => {});
  if (player.song === id) { player.song = DEFAULT_SONG; if (player.on) await startMusic(); }
  renderPanel();
}

$("#btnMusic").addEventListener("click", (e) => {
  e.stopPropagation();
  const panel = $("#musicPanel");
  panel.hidden = !panel.hidden;
  if (!panel.hidden) renderPanel();
});
document.addEventListener("pointerdown", (e) => {
  const panel = $("#musicPanel");
  if (!panel.hidden && !panel.contains(e.target) && e.target.id !== "btnMusic") panel.hidden = true;
});

// Browsers only allow sound after the visitor touches the page, so if music was
// on last time, start it on their first tap.
if (player.wanted) {
  const resume = () => { if (!player.on) startMusic(); };
  document.addEventListener("pointerdown", resume, { once: true });
}

export function initMusic() {
  $("#btnMusic").hidden = false;
  renderButton();
}
