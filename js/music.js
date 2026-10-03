// Background music: built-in music-box lullabies (synthesized in the browser, so
// nothing is downloaded) plus songs the admin uploads. One 🎵 button for everyone.

import { state } from "./state.js";
import { $, h, toast } from "./util.js";
import { t } from "./i18n.js";

// ---------- Built-in songs (public-domain melodies) ----------
// Notes: name+octave, then length in beats. "r" is a rest.
const SONGS = {
  twinkle: { bpm: 100, notes: "C4 1 C4 1 G4 1 G4 1 A4 1 A4 1 G4 2 F4 1 F4 1 E4 1 E4 1 D4 1 D4 1 C4 2 G4 1 G4 1 F4 1 F4 1 E4 1 E4 1 D4 2 G4 1 G4 1 F4 1 F4 1 E4 1 E4 1 D4 2 C4 1 C4 1 G4 1 G4 1 A4 1 A4 1 G4 2 F4 1 F4 1 E4 1 E4 1 D4 1 D4 1 C4 2" },
  brahms: { bpm: 84, notes: "E4 .5 E4 .5 G4 1.5 E4 .5 E4 1 G4 2 E4 .5 G4 .5 C5 1 B4 1.5 A4 .5 A4 1 G4 1 D4 .5 E4 .5 F4 1 D4 1 D4 .5 E4 .5 F4 2 D4 .5 F4 .5 B4 1 A4 1 G4 1 B4 1 C5 2 r 1" },
  butterfly: { bpm: 112, notes: "C4 1 D4 1 E4 1 C4 1 C4 1 D4 1 E4 1 C4 1 E4 1 F4 1 G4 2 E4 1 F4 1 G4 2 G4 .5 A4 .5 G4 .5 F4 .5 E4 1 C4 1 G4 .5 A4 .5 G4 .5 F4 .5 E4 1 C4 1 C4 1 G3 1 C4 2 C4 1 G3 1 C4 2" },
  lamb: { bpm: 110, notes: "E4 1 D4 1 C4 1 D4 1 E4 1 E4 1 E4 2 D4 1 D4 1 D4 2 E4 1 G4 1 G4 2 E4 1 D4 1 C4 1 D4 1 E4 1 E4 1 E4 1 E4 1 D4 1 D4 1 E4 1 D4 1 C4 4" },
  birthday: { bpm: 96, notes: "G4 .75 G4 .25 A4 1 G4 1 C5 1 B4 2 G4 .75 G4 .25 A4 1 G4 1 D5 1 C5 2 G4 .75 G4 .25 G5 1 E5 1 C5 1 B4 1 A4 2 F5 .75 F5 .25 E5 1 C5 1 D5 1 C5 3" },
};
export const BUILTIN = Object.keys(SONGS);

const FREQ = (note) => {
  const m = note.match(/^([A-G])(#?)(\d)$/);
  const semis = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] ? 1 : 0) + (Number(m[3]) - 4) * 12 - 9;
  return 440 * 2 ** (semis / 12);
};

let ctx, master, timer, audioEl;
const player = { on: false, song: "twinkle", volume: 0.5 };

try {
  Object.assign(player, JSON.parse(localStorage.getItem("music") || "{}"), { on: false });
  player.wanted = JSON.parse(localStorage.getItem("music") || "{}").on === true;
} catch { /* storage blocked */ }
const remember = () => {
  try { localStorage.setItem("music", JSON.stringify({ on: player.on, song: player.song, volume: player.volume })); } catch { /* ignore */ }
};

function audioCtx() {
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    // A little echo makes it sound like a music box in a room.
    const delay = ctx.createDelay();
    delay.delayTime.value = 0.18;
    const fb = ctx.createGain();
    fb.gain.value = 0.25;
    delay.connect(fb).connect(delay);
    master.connect(ctx.destination);
    master.connect(delay).connect(ctx.destination);
  }
  master.gain.value = player.volume * 0.35;
  return ctx;
}

function chime(time, freq, dur) {
  for (const [mult, gain] of [[1, 0.6], [2, 0.18], [3, 0.06]]) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = freq * mult;
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(gain, time + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, time + Math.max(dur, 0.25) * 2.2);
    o.connect(g).connect(master);
    o.start(time);
    o.stop(time + Math.max(dur, 0.25) * 2.3);
  }
}

function playBuiltin(id) {
  const song = SONGS[id];
  const beat = 60 / song.bpm;
  const tokens = song.notes.split(" ");
  const loop = () => {
    let at = audioCtx().currentTime + 0.1;
    for (let i = 0; i < tokens.length; i += 2) {
      const len = Number(tokens[i + 1]) * beat;
      if (tokens[i] !== "r") chime(at, FREQ(tokens[i]), len);
      at += len;
    }
    const total = at - ctx.currentTime + beat * 2; // short pause between repeats
    timer = setTimeout(loop, total * 1000);
  };
  loop();
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
  clearTimeout(timer);
  timer = null;
  if (ctx) ctx.close();
  ctx = null;
  audioEl?.pause();
}

const customSongs = () => state.settings.songs || [];
const songLabel = (id) => (SONGS[id] ? t(`song_${id}`) : customSongs().find((s) => s.id === id)?.name || "🎵");

export async function startMusic() {
  stopAll();
  const custom = customSongs().find((s) => s.id === player.song);
  if (!SONGS[player.song] && !custom) player.song = "twinkle";
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
          if (master) master.gain.value = player.volume * 0.35;
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
  if (player.song === id) { player.song = "twinkle"; if (player.on) await startMusic(); }
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
