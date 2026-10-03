// 🌱 Growing tab: watch-her-grow flipbook, milestones, "All about me" cards,
// and a parents-only health record. (Height & weight live in growth.js.)

import { state } from "./state.js";
import { $, h, fill, toast, todayISO } from "./util.js";
import { t, fmtDate, ageLabel } from "./i18n.js";
import { openForm } from "./form.js";
import { loadRows } from "./collections.js";
import { keepFile } from "./words.js";
import { compressImage } from "./media.js";
import { photoDateInfo } from "./exif.js";
import { startMusic, stopMusic, musicOn } from "./music.js";

const age = (date) => (state.settings.birthday ? ageLabel(state.settings.birthday, date) : fmtDate(date));
const reload = async (render) => { await loadRows(); render(); };

// ---------- 📸 Watch her grow ----------

export function renderFlipbook() {
  const admin = state.access.admin;
  const list = state.rows.portraits;
  fill($("#flipBody"), 
    h("div", { class: "section-head" },
      h("p", { class: "muted" }, t("flipIntro")),
      h("div", { class: "row" },
        list.length > 1 && h("button", { type: "button", class: "btn btn-primary", onclick: playFlipbook }, t("flipPlay")),
        admin && h("label", { class: "btn btn-ghost file-btn" }, t("flipAdd"),
          h("input", { type: "file", accept: "image/*,.heic,.heif", multiple: true, hidden: true, onchange: addPortraits })))),
    list.length ? h("div", { class: "portraits" }, list.map((p) => h("figure", { class: "portrait" },
      h("img", { src: p._url, alt: "", loading: "lazy" }),
      h("figcaption", {}, age(p.date)),
      admin && state.editing && h("button", { type: "button", class: "chip-x portrait-x", title: t("remove"), onclick: () => removePortrait(p) }, "✕"))))
      : h("div", { class: "empty" }, h("div", { class: "empty-emoji" }, "📸"), h("p", {}, t(admin ? "flipEmptyAdmin" : "flipEmpty"))));
}

async function addPortraits(e) {
  const files = [...e.target.files];
  e.target.value = "";
  let done = 0;
  for (const file of files) {
    toast(t("bulkProgress", { done, total: files.length }), 60000);
    try {
      const { date } = await photoDateInfo(file);
      const path = await state.store.uploadFile("portraits", await compressImage(file, 1400));
      await state.store.insertRow("portraits", { date, path });
      done++;
    } catch (ex) {
      toast(ex.message, 6000);
    }
  }
  toast(t("flipAdded", { n: done }));
  await reload(renderFlipbook);
}

async function removePortrait(p) {
  if (!confirm(t("confirmDelete"))) return;
  await state.store.deleteRow("portraits", p.id);
  await state.store.deleteFile(p.path).catch(() => {});
  await reload(renderFlipbook);
}

function playFlipbook() {
  const list = state.rows.portraits;
  if (list.length < 2) return;
  const ownMusic = !musicOn();
  if (ownMusic) startMusic();
  let i = 0, speed = 1, timer = null;
  const imgs = list.map((p) => h("img", { src: p._url, alt: "" }));
  const label = h("div", { class: "flip-age" });
  const progress = h("input", { type: "range", min: "0", max: String(list.length - 1), value: "0", "aria-label": t("flipProgress") });
  const show = (n) => {
    i = (n + list.length) % list.length;
    imgs.forEach((img, k) => img.classList.toggle("on", k === i));
    label.textContent = age(list[i].date);
    progress.value = String(i);
  };
  const tick = () => { show(i + 1); timer = setTimeout(tick, 1100 / speed); };
  const close = () => {
    clearTimeout(timer);
    overlay.remove();
    document.removeEventListener("keydown", onKey);
    if (ownMusic) stopMusic();
  };
  const onKey = (e) => { if (e.key === "Escape") close(); };
  const speedBtn = (v, txt) => h("button", { type: "button", class: `slide-speed${v === speed ? " on" : ""}`, onclick: (e) => {
    speed = v;
    e.currentTarget.parentElement.querySelectorAll(".slide-speed").forEach((b) => b.classList.toggle("on", b === e.currentTarget));
  } }, txt);
  progress.addEventListener("input", () => show(Number(progress.value)));
  const overlay = h("div", { class: "flipbook" },
    h("div", { class: "flip-stage" }, imgs, label),
    h("div", { class: "slide-bar flip-bar" },
      progress, speedBtn(0.6, t("speed_slow")), speedBtn(1, t("speed_normal")), speedBtn(1.8, t("speed_fast")),
      h("button", { type: "button", class: "slide-stop", onclick: close }, "✕ ", t("close"))));
  document.body.append(overlay);
  document.addEventListener("keydown", onKey);
  show(0);
  timer = setTimeout(tick, 1400);
}

// ---------- ✅ Milestones ----------

const MILESTONES = [
  ["smile", "😊"], ["laugh", "😆"], ["rollOver", "🔄"], ["sitUp", "🪑"], ["tooth", "🦷"], ["crawl", "🐛"],
  ["word", "🗣️"], ["steps", "👣"], ["haircut", "✂️"], ["nightSleep", "🌙"], ["school", "🎒"], ["bike", "🚲"],
  ["swim", "🏊"], ["lostTooth", "🧚"], ["writeName", "✏️"], ["read", "📖"],
];

export function renderMilestones() {
  const admin = state.access.admin;
  const saved = new Map(state.rows.milestones.map((m) => [m.key, m]));
  const builtIn = MILESTONES.map(([key, emoji]) => ({ ...saved.get(key), key, emoji, label: t(`ms_${key}`) }));
  const custom = state.rows.milestones.filter((m) => m.key.startsWith("custom-"));
  const all = [...builtIn, ...custom];
  const reached = all.filter((m) => m.date).sort((a, b) => a.date.localeCompare(b.date));
  const ahead = all.filter((m) => !m.date);
  const card = (m) => h(admin ? "button" : "div", {
    type: admin ? "button" : null, class: `milestone${m.date ? " done" : ""}`, onclick: admin ? () => editMilestone(m) : null,
  },
  h("span", { class: "ms-emoji" }, m.emoji || "⭐"),
  h("b", {}, m.label),
  h("small", {}, m.date ? `${age(m.date)} · ${fmtDate(m.date)}` : t("msNotYet")),
  m.note && h("small", { class: "muted" }, m.note));
  fill($("#milestonesBody"), 
    h("div", { class: "section-head" },
      h("p", { class: "muted" }, t("msIntro", { n: reached.length, total: all.length })),
      admin && h("button", { type: "button", class: "btn btn-ghost", onclick: () => editMilestone(null) }, t("msAddOwn"))),
    reached.length > 0 && h("div", { class: "milestones" }, reached.map(card)),
    ahead.length > 0 && h("h3", { class: "ms-ahead" }, t("msAhead")),
    ahead.length > 0 && h("div", { class: "milestones ahead" }, ahead.map(card)));
}

function editMilestone(m) {
  const isCustom = !m || m.key.startsWith("custom-");
  openForm({
    title: m ? `${m.emoji || "⭐"} ${m.label}` : t("msAddOwn"),
    fields: [
      isCustom && { name: "label", label: t("msLabel"), value: m?.label, required: true, placeholder: t("msLabelPh") },
      isCustom && { name: "emoji", label: t("fEmoji"), type: "emoji", value: m?.emoji || "⭐" },
      { name: "date", label: t("msDate"), type: "date", value: m?.date || (m ? todayISO() : ""), hint: t("msDateHint") },
      { name: "note", label: t("mNote"), value: m?.note, placeholder: t("msNotePh") },
    ].filter(Boolean),
    onSubmit: async (v) => {
      const key = m?.key || `custom-${crypto.randomUUID()}`;
      await state.store.upsertRow("milestones", {
        key, date: v.date || null, note: v.note || "", label: isCustom ? v.label : "", emoji: isCustom ? v.emoji : "",
      }, "key");
      await reload(renderMilestones);
      toast(t("saved"));
    },
    onDelete: m?.date || (m && isCustom) ? async () => {
      await state.store.deleteRow("milestones", m.key, "key");
      await reload(renderMilestones);
    } : null,
  });
}

// ---------- 🧸 All about me ----------

const QUESTIONS = ["food", "toy", "song", "book", "color", "friend", "loves", "word", "dream", "habit"];

export function renderAbout() {
  const admin = state.access.admin;
  const cards = [...state.rows.about_cards].reverse();
  fill($("#aboutBody"), 
    h("div", { class: "section-head" },
      h("p", { class: "muted" }, t("aboutIntro")),
      admin && h("button", { type: "button", class: "btn btn-primary", onclick: () => editAbout() }, t("aboutAdd"))),
    cards.length ? h("div", { class: "about-cards" }, cards.map((c) => h("article", { class: "about-card" },
      admin && h("button", { type: "button", class: "card-edit always", onclick: () => editAbout(c) }, t("editCard")),
      h("h3", {}, t("aboutAt", { age: age(c.date) })),
      h("p", { class: "muted small" }, fmtDate(c.date)),
      h("dl", {}, QUESTIONS.filter((q) => c.answers?.[q]).map((q) => [h("dt", {}, t(`aq_${q}`)), h("dd", {}, c.answers[q])])))))
      : h("div", { class: "empty" }, h("div", { class: "empty-emoji" }, "🧸"), h("p", {}, t("aboutEmpty"))));
}

function editAbout(c = null) {
  // A new card starts from the latest answers, so only what changed needs typing.
  const base = c || state.rows.about_cards.at(-1);
  openForm({
    title: t(c ? "aboutEdit" : "aboutAdd"),
    intro: c ? null : t("aboutFormIntro"),
    wide: true,
    fields: [
      { name: "date", label: t("fDate"), type: "date", value: c?.date || todayISO(), required: true },
      ...QUESTIONS.map((q) => ({ name: q, label: t(`aq_${q}`), value: base?.answers?.[q] || "", emojiButton: true })),
    ],
    onSubmit: async (v) => {
      const answers = Object.fromEntries(QUESTIONS.map((q) => [q, v[q]]).filter(([, a]) => a));
      if (c) await state.store.updateRow("about_cards", c.id, { date: v.date, answers });
      else await state.store.insertRow("about_cards", { date: v.date, answers });
      await reload(renderAbout);
      toast(t("saved"));
    },
    onDelete: c && (async () => { await state.store.deleteRow("about_cards", c.id); await reload(renderAbout); }),
  });
}

// ---------- 🩺 Health (parents only) ----------

const KINDS = { vaccine: "💉", checkup: "🩺", illness: "🤒", allergy: "⚠️", medicine: "💊", other: "📝" };

export function renderHealth() {
  const list = state.rows.health;
  fill($("#healthBody"), 
    h("div", { class: "section-head" },
      h("p", { class: "muted" }, t("healthIntro")),
      h("button", { type: "button", class: "btn btn-primary", onclick: () => editHealth() }, t("healthAdd"))),
    list.length ? h("div", { class: "health-list" }, list.map((r) => h("button", { type: "button", class: "health-row", onclick: () => editHealth(r) },
      h("span", { class: "health-kind" }, KINDS[r.kind] || "📝"),
      h("span", { class: "health-main" }, h("b", {}, r.title), r.notes && h("small", { class: "muted" }, r.notes)),
      h("span", { class: "health-date" }, fmtDate(r.date), h("small", { class: "muted" }, age(r.date))))))
      : h("div", { class: "empty" }, h("div", { class: "empty-emoji" }, "🩺"), h("p", {}, t("healthEmpty"))));
}

function editHealth(r = null) {
  openForm({
    title: t(r ? "healthEdit" : "healthAdd"),
    fields: [
      { name: "kind", label: t("healthKind"), type: "select", value: r?.kind || "checkup", options: Object.entries(KINDS).map(([k, e]) => [k, `${e} ${t(`hk_${k}`)}`]) },
      { name: "title", label: t("fTitle"), value: r?.title, required: true, placeholder: t("healthTitlePh") },
      { name: "date", label: t("fDate"), type: "date", value: r?.date || todayISO(), required: true },
      { name: "notes", label: t("mNote"), type: "textarea", value: r?.notes, rows: "3", placeholder: t("healthNotesPh") },
    ],
    onSubmit: async (v) => {
      const row = { kind: v.kind, title: v.title, date: v.date, notes: v.notes };
      if (r) await state.store.updateRow("health", r.id, row);
      else await state.store.insertRow("health", row);
      await reload(renderHealth);
      toast(t("saved"));
    },
    onDelete: r && (async () => { await state.store.deleteRow("health", r.id); await reload(renderHealth); }),
  });
}

