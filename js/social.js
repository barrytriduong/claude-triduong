// Hearts & comments under each memory, and the "what should we call you?" name.

import { state, hooks } from "./state.js";
import { $, h, openDialog, toast } from "./util.js";
import { t, fmtDate } from "./i18n.js";
import { attachEmojiInsert } from "./emoji.js";

// ---------- Your display name ----------

let nameResolver = null;

/** Resolves to the viewer's display name, asking once if we don't know it yet (null if they cancel). */
export function ensureName() {
  if (state.myName) return Promise.resolve(state.myName);
  const form = $("#nameForm");
  form.reset();
  openDialog("#nameDialog");
  form.name.focus();
  return new Promise((resolve) => { nameResolver = resolve; });
}

$("#nameForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = e.target.name.value.trim();
  if (!name) return;
  try {
    await state.store.setMyName(name);
    state.myName = name;
    $("#nameDialog").close();
    nameResolver?.(name);
    nameResolver = null;
  } catch (ex) {
    toast(ex.message);
  }
});
$("#nameDialog").addEventListener("close", () => { nameResolver?.(null); nameResolver = null; });

// ---------- Data ----------

export async function loadSocial() {
  const [comments, reactions] = await Promise.all([state.store.listComments(), state.store.listReactions()]);
  state.comments = [...comments].sort((a, b) => a.created_at.localeCompare(b.created_at));
  state.reactions = [...reactions];
}

const myId = () => state.user?.id;
const open = new Set(); // event ids whose comment box is expanded

// ---------- Rendering (one strip per memory card) ----------

export function renderSocial(ev) {
  const hearts = state.reactions.filter((r) => r.event_id === ev.id);
  const comments = state.comments.filter((c) => c.event_id === ev.id);
  const mine = hearts.some((r) => r.user_id === myId());
  const names = hearts.map((r) => r.author_name).filter(Boolean);

  const wrap = h("div", { class: "social" });
  const bar = h("div", { class: "social-bar" },
    h("button", {
      type: "button", class: `heart-btn${mine ? " on" : ""}`, "aria-pressed": String(mine),
      title: names.length ? t("lovedBy", { names: names.join(", ") }) : t("heart"),
      onclick: (e) => toggleHeart(ev, e.currentTarget),
    }, mine ? "❤️" : "🤍", h("span", {}, hearts.length || "")),
    h("button", {
      type: "button", class: "comment-btn", title: t("comments"), "aria-expanded": String(open.has(ev.id)),
      onclick: () => { open.has(ev.id) ? open.delete(ev.id) : open.add(ev.id); hooks.renderTimeline({ keepScroll: true }); },
    }, "💬", h("span", {}, comments.length || "")),
    names.length > 0 && h("span", { class: "loved-by" }, t("lovedBy", { names: shortNames(names) })));
  wrap.append(bar);

  if (open.has(ev.id)) {
    wrap.append(h("div", { class: "comments" },
      comments.map((c) => h("div", { class: "comment" },
        h("div", { class: "comment-head" },
          h("b", {}, c.author_name || "💕"),
          h("span", { class: "muted" }, fmtDate(c.created_at.slice(0, 10), { day: "numeric", month: "short", year: "numeric" })),
          (c.user_id === myId() || state.access.admin) && h("button", {
            type: "button", class: "link-btn", onclick: () => removeComment(c),
          }, t("deleteComment"))),
        h("p", {}, c.body))),
      commentForm(ev)));
  }
  return wrap;
}

function commentForm(ev) {
  const input = h("input", { name: "body", maxlength: "2000", placeholder: t("commentPh"), required: true, autocomplete: "off" });
  const form = h("form", { class: "comment-form", onsubmit: (e) => submitComment(e, ev) },
    input, h("button", { class: "btn btn-primary", type: "submit" }, t("send")));
  attachEmojiInsert(input);
  return form;
}

function shortNames(names) {
  return names.length <= 3 ? names.join(", ") : `${names.slice(0, 3).join(", ")} +${names.length - 3}`;
}

async function toggleHeart(ev, btn) {
  const mine = state.reactions.some((r) => r.event_id === ev.id && r.user_id === myId());
  const name = mine ? state.myName : await ensureName();
  if (!mine && !name) return;
  btn.disabled = true;
  try {
    if (mine) await state.store.removeReaction(ev.id);
    else await state.store.addReaction(ev.id, name);
    await loadSocial();
    hooks.renderTimeline({ keepScroll: true });
  } catch (ex) {
    toast(ex.message);
    btn.disabled = false;
  }
}

async function submitComment(e, ev) {
  e.preventDefault();
  const body = e.target.body.value.trim();
  if (!body) return;
  const name = await ensureName();
  if (!name) return;
  e.target.querySelector("button[type=submit]").disabled = true;
  try {
    await state.store.addComment({ event_id: ev.id, body, author_name: name });
    await loadSocial();
    hooks.renderTimeline({ keepScroll: true });
  } catch (ex) {
    toast(ex.message);
    e.target.querySelector("button[type=submit]").disabled = false;
  }
}

async function removeComment(c) {
  if (!confirm(t("confirmDeleteComment"))) return;
  try {
    await state.store.deleteComment(c.id);
    await loadSocial();
    hooks.renderTimeline({ keepScroll: true });
  } catch (ex) {
    toast(ex.message);
  }
}
