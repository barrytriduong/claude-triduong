// Letters tab: notes to her from anyone in the family, optionally sealed until a date.

import { state, hooks } from "./state.js";
import { $, h, openDialog, toast, todayISO } from "./util.js";
import { t, fmtDate } from "./i18n.js";
import { ensureName } from "./social.js";

export async function loadLetters() {
  state.letters = await state.store.listLetters();
}

const isSealed = (l) => l.unlock_on && l.unlock_on > todayISO();
const isMine = (l) => l.user_id && l.user_id === state.user?.id;

export function renderLetters() {
  const body = $("#lettersBody");
  if (!state.letters.length) {
    body.replaceChildren(h("div", { class: "empty" }, h("div", { class: "empty-emoji" }, "💌"), h("p", {}, t("lettersEmpty"))));
    return;
  }
  // Opened letters first (newest written first), then sealed ones by opening date.
  const opened = state.letters.filter((l) => !isSealed(l)).sort((a, b) => b.written_on.localeCompare(a.written_on));
  const sealed = state.letters.filter(isSealed).sort((a, b) => a.unlock_on.localeCompare(b.unlock_on));
  body.replaceChildren(...opened.map(letterCard), ...sealed.map(letterCard));
}

function letterCard(l) {
  const sealed = isSealed(l);
  const mine = isMine(l);
  const canEdit = (mine || state.access.admin) && l.body != null;
  const showBody = !sealed || mine;
  return h("article", { class: `letter${sealed ? " sealed" : ""}` },
    h("div", { class: "letter-stamp" }, sealed ? "🔒" : "💌"),
    canEdit && h("button", { type: "button", class: "card-edit always", onclick: () => openLetter(l) }, t("editCard")),
    l.title && h("h3", {}, l.title),
    h("div", { class: "letter-meta" },
      h("b", {}, t("letterFrom", { name: l.author_name || "💕" })),
      h("span", { class: "muted" }, ` · ${t("writtenOn", { date: fmtDate(l.written_on) })}`)),
    sealed && h("div", { class: "chip sealed-chip" }, t("sealedUntil", { date: fmtDate(l.unlock_on) })),
    !sealed && l.unlock_on && h("div", { class: "chip" }, t("openedOn", { date: fmtDate(l.unlock_on) })),
    showBody && l.body && h("p", { class: "letter-body" }, l.body),
    sealed && mine && h("p", { class: "muted small" }, t("sealedOwn")));
}

// ---------- Editor ----------

let editing = null;

async function openLetter(l = null) {
  const f = $("#letterForm");
  f.reset();
  editing = l;
  $("#letterDialogTitle").textContent = t(l ? "editLetter" : "newLetter");
  $("#letterError").hidden = true;
  $("#btnDeleteLetter").hidden = !l;
  f.title.value = l?.title || "";
  f.body.value = l?.body || "";
  f.author_name.value = l?.author_name || state.myName || "";
  f.unlock_on.value = l?.unlock_on || "";
  f.unlock_on.min = todayISO();
  openDialog("#letterDialog");
}

$("#btnWriteLetter").addEventListener("click", async () => {
  if (!(await ensureName())) return;
  openLetter();
});

$("#letterForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target;
  try {
    await state.store.saveLetter({
      id: editing?.id,
      title: f.title.value.trim(),
      body: f.body.value.trim(),
      author_name: f.author_name.value.trim(),
      unlock_on: f.unlock_on.value || null,
      written_on: editing?.written_on || todayISO(),
    });
    $("#letterDialog").close();
    await loadLetters();
    hooks.renderLetters();
    toast(t("letterSaved"));
  } catch (ex) {
    $("#letterError").textContent = ex.message;
    $("#letterError").hidden = false;
  }
});

$("#btnDeleteLetter").addEventListener("click", async () => {
  if (!editing || !confirm(t("confirmDeleteLetter"))) return;
  try {
    await state.store.deleteLetter(editing.id);
    $("#letterDialog").close();
    await loadLetters();
    hooks.renderLetters();
    toast(t("letterDeleted"));
  } catch (ex) {
    toast(ex.message);
  }
});
