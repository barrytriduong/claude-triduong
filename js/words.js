// 💌 Words tab: things she said (optionally in her own voice) and birthday wishes.
// (Letters live in letters.js and are shown in this tab too.)

import { state } from "./state.js";
import { $, h, fill, toast, todayISO } from "./util.js";
import { t, fmtDate, ageLabel, ageParts } from "./i18n.js";
import { openForm } from "./form.js";
import { voicePlayer } from "./voice.js";
import { loadRows } from "./collections.js";
import { ensureName } from "./social.js";

const age = (date) => (state.settings.birthday ? ageLabel(state.settings.birthday, date) : "");

/** Saves an uploaded file for a row field; returns the new path ("" when removed, old when unchanged). */
export async function keepFile(folder, file, oldPath) {
  if (file === undefined) return oldPath || "";
  if (oldPath) await state.store.deleteFile(oldPath).catch(() => {});
  return file ? state.store.uploadFile(folder, file) : "";
}

// ---------- 💬 Things she said ----------

export function renderSayings() {
  const admin = state.access.admin;
  const list = state.rows.sayings;
  fill($("#sayingsBody"), 
    h("div", { class: "section-head" },
      h("p", { class: "muted" }, t("sayingsIntro")),
      admin && h("button", { type: "button", class: "btn btn-primary", onclick: () => editSaying() }, t("addSaying"))),
    list.length ? h("div", { class: "sayings" }, list.map((s) => h("article", { class: "saying" },
      admin && h("button", { type: "button", class: "card-edit always", onclick: () => editSaying(s) }, t("editCard")),
      h("blockquote", {}, s.text),
      s._url && voicePlayer(s._url, t("inHerVoice")),
      s.note && h("p", { class: "muted saying-note" }, s.note),
      h("div", { class: "card-meta" }, h("span", { class: "chip" }, fmtDate(s.date)), age(s.date) && h("span", { class: "chip age" }, age(s.date))))))
      : h("div", { class: "empty" }, h("div", { class: "empty-emoji" }, "💬"), h("p", {}, t("sayingsEmpty"))));
}

function editSaying(s = null) {
  openForm({
    title: t(s ? "editSaying" : "newSaying"),
    fields: [
      { name: "text", label: t("sayingText"), type: "textarea", value: s?.text, required: true, placeholder: t("sayingPh"), emojiButton: true, rows: "3" },
      { name: "date", label: t("fDate"), type: "date", value: s?.date || todayISO(), required: true },
      { name: "note", label: t("sayingNote"), value: s?.note, placeholder: t("sayingNotePh") },
      { name: "audio", label: t("sayingVoice"), type: "voice", value: s?._url },
    ],
    onSubmit: async (v) => {
      const audio = await keepFile("voice", v.audio, s?.audio);
      const row = { date: v.date, text: v.text, note: v.note, audio: audio || null };
      if (s) await state.store.updateRow("sayings", s.id, row);
      else await state.store.insertRow("sayings", row);
      await loadRows();
      renderSayings();
      toast(t("saved"));
    },
    onDelete: s && (async () => {
      await state.store.deleteRow("sayings", s.id);
      if (s.audio) await state.store.deleteFile(s.audio).catch(() => {});
      await loadRows();
      renderSayings();
    }),
  });
}

// ---------- 🎂 Birthday wishes ----------

/** The year of her next birthday (today counts as "next" on the day itself). */
export function nextBirthdayYear() {
  const b = state.settings.birthday;
  if (!b) return null;
  const today = todayISO();
  const year = Number(today.slice(0, 4));
  return `${year}${b.slice(4)}` >= today ? year : year + 1;
}

const turning = (year) => year - Number(state.settings.birthday.slice(0, 4));
const ordinal = (n) => n + (["th", "st", "nd", "rd"][(n % 100 - 20) % 10] || ["th", "st", "nd", "rd"][n % 100] || "th");

export function renderWishes() {
  const body = $("#wishesBody");
  if (!state.settings.birthday) {
    fill(body, h("div", { class: "empty" }, h("div", { class: "empty-emoji" }, "🎂"), h("p", {}, t("wishesNoBirthday"))));
    return;
  }
  const next = nextBirthdayYear();
  const years = [...new Set([next, ...state.rows.wishes.map((w) => w.year)])].sort((a, b) => b - a);
  const me = state.user?.id;
  fill(body, 
    h("div", { class: "section-head" },
      h("p", { class: "muted" }, t("wishesIntro", { n: turning(next), nth: ordinal(turning(next)), date: fmtDate(`${next}${state.settings.birthday.slice(4)}`) })),
      h("button", { type: "button", class: "btn btn-primary", onclick: writeWish }, t("writeWish"))),
    years.map((y) => {
      const wishes = state.rows.wishes.filter((w) => w.year === y);
      if (!wishes.length && y !== next) return null;
      return h("section", { class: "wish-year" },
        h("h3", {}, t("wishesFor", { n: turning(y), nth: ordinal(turning(y)) })),
        wishes.length ? h("div", { class: "wishes" }, wishes.map((w) => h("article", { class: "wish" },
          h("p", {}, w.body),
          h("div", { class: "wish-from" }, h("b", {}, `— ${w.author_name || "💕"}`),
            (w.user_id === me || state.access.admin) && h("button", { type: "button", class: "link-btn", onclick: () => removeWish(w) }, t("deleteComment"))))))
          : h("p", { class: "muted" }, t("wishesNone")));
    }));
}

async function writeWish() {
  const name = await ensureName();
  if (!name) return;
  openForm({
    title: t("writeWish"),
    fields: [{ name: "body", label: t("wishText"), type: "textarea", required: true, placeholder: t("wishPh"), emojiButton: true, rows: "5" }],
    submitLabel: t("send"),
    onSubmit: async (v) => {
      await state.store.insertRow("wishes", { year: nextBirthdayYear(), author_name: name, body: v.body });
      await loadRows();
      renderWishes();
      toast(t("wishSent"));
    },
  });
}

async function removeWish(w) {
  if (!confirm(t("confirmDeleteComment"))) return;
  await state.store.deleteRow("wishes", w.id);
  await loadRows();
  renderWishes();
}

/** Is today her birthday? Returns how old she turns, or 0. */
export function birthdayToday() {
  const b = state.settings.birthday;
  if (!b) return 0;
  const today = todayISO();
  if (b.slice(5) !== today.slice(5) || today <= b) return 0;
  return ageParts(b, today).months / 12;
}

export const ordinalEn = ordinal;
