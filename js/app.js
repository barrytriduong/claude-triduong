import config from "./config.js";
import { LocalStore } from "./store-local.js";
import { compressImage, parseVideoLink, hydrateLink } from "./media.js";
import { $, h, openDialog, toast, todayISO } from "./util.js";
import { t, setLang, lang, applyI18n, fmtDate, ageLabel, ageParts } from "./i18n.js";
import { state, hooks, COLORS, COLOR_KEYS, PRESET_TAGS } from "./state.js";
import { renderSocial, loadSocial } from "./social.js";
import { loadGrowth, renderGrowth } from "./growth.js";
import { loadLetters, renderLetters } from "./letters.js";
import { openBulk } from "./bulk.js";
import { openBackup } from "./backup.js";
import { attachEmojiInsert, attachEmojiSelect } from "./emoji.js";
import { openSlideshow } from "./slideshow.js";
import { openFamily, handleInviteLink } from "./family.js";
import { ensureName } from "./social.js";
import { initMusic, stopMusic } from "./music.js";
import { renderAvatar, initProfileFields, commitProfile } from "./profile.js";
import { setCuteCursor } from "./cursor.js";
import { photoDateInfo } from "./exif.js";

const tagLabel = (tag) => (PRESET_TAGS.includes(tag) ? t(`tag_${tag}`) : `🏷️ ${tag}`);

// ---------- Hero ----------

function renderHero() {
  const s = state.settings;
  const name = s.name || t("defaultName");
  $("#heroName").textContent = name;
  renderAvatar($("#heroAvatar"), { ...s, emoji: s.emoji || config.defaults.emoji });
  $("#btnHeroEdit").hidden = !state.editing;
  setCuteCursor(s.cuteCursor !== false);
  $("#heroTagline").textContent = s.tagline || t("defaultTagline");
  let age = "";
  if (s.birthday && s.birthday <= todayISO()) {
    const label = ageLabel(s.birthday, todayISO());
    age = `🎈 ${ageParts(s.birthday, todayISO()).isBirthday ? t("heroBirthday", { age: label }) : t("heroNow", { age: label })}`;
  }
  $("#heroAge").textContent = age;
  document.title = s.name ? t("pageTitle", { name: s.name }) : t("defaultName");
}

// ---------- Views (tabs) ----------

const VIEWS = ["timeline", "growth", "letters"];

function setView(view) {
  state.view = VIEWS.includes(view) ? view : "timeline";
  for (const v of VIEWS) $(`#view${v[0].toUpperCase()}${v.slice(1)}`).hidden = v !== state.view;
  document.querySelectorAll("#tabs a").forEach((a) => a.classList.toggle("active", a.dataset.view === state.view));
  $("#fabAdd").hidden = !(state.editing && state.view === "timeline");
  if (state.view === "growth") renderGrowth();
  if (state.view === "letters") renderLetters();
  if (state.view === "timeline") updateLineFill();
}

window.addEventListener("hashchange", () => {
  if (location.hash.startsWith("#invite=")) return openInvite();
  const view = location.hash.slice(1);
  if (VIEWS.includes(view)) {
    setView(view);
    $("#tabs").scrollIntoView({ behavior: "smooth" });
  }
});

// ---------- Timeline ----------

function sortedEvents() {
  const dir = state.settings.newestFirst ? -1 : 1;
  return [...state.events].sort((a, b) => dir * (a.date.localeCompare(b.date) || (a.updatedAt || "").localeCompare(b.updatedAt || "")));
}

const statusOf = (ev) => ev.status || "published";

function visibleEvents() {
  let list = sortedEvents();
  if (state.range) {
    const { from, to } = state.range;
    list = list.filter((ev) => statusOf(ev) === "published" && (!from || ev.date >= from) && (!to || ev.date <= to));
  }
  if (state.filterTag === "__draft") return list.filter((ev) => statusOf(ev) === "draft");
  if (state.filterTag === "__pending") return list.filter((ev) => statusOf(ev) === "pending");
  return state.filterTag ? list.filter((ev) => ev.tags?.includes(state.filterTag)) : list;
}

const countStatus = (status) => state.events.filter((ev) => statusOf(ev) === status).length;

function renderGallery(ev) {
  const media = (ev.media || []).map((m) => (m.type === "link" ? hydrateLink(m) : m));
  if (!media.length) return null;
  const viewable = media.filter((m) => m.type === "image" || m.type === "video");
  const cls = media.length === 1 ? "one" : media.length === 2 ? "two" : "";
  return h("div", { class: `gallery ${cls}` }, media.map((m) => {
    if (m.type === "image") {
      return h("button", { class: "item", type: "button", onclick: () => openLightbox(viewable, viewable.indexOf(m)) },
        h("img", { src: m.src, alt: ev.title, loading: "lazy" }));
    }
    if (m.type === "video") {
      return h("button", { class: "item", type: "button", onclick: () => openLightbox(viewable, viewable.indexOf(m)) },
        h("video", { src: `${m.src}#t=0.1`, preload: "metadata", muted: true, playsInline: true }),
        h("span", { class: "play" }));
    }
    if (m.type === "embed") {
      return h("div", { class: "item embed" },
        h("iframe", { src: m.embed, loading: "lazy", allowfullscreen: true, allow: "autoplay; encrypted-media; picture-in-picture", title: ev.title }));
    }
    return h("a", { class: "item link", href: m.url, target: "_blank", rel: "noopener" }, "🔗 ", m.url);
  }));
}

function renderFilters() {
  const counts = new Map();
  for (const ev of state.events) for (const tag of ev.tags || []) counts.set(tag, (counts.get(tag) || 0) + 1);
  const drafts = state.access.admin ? countStatus("draft") : 0;
  const pending = state.access.admin ? countStatus("pending") : 0;
  const special = { __draft: drafts, __pending: pending };
  if (state.filterTag && !counts.has(state.filterTag) && !special[state.filterTag]) state.filterTag = null;
  const bar = $("#filters");
  bar.hidden = counts.size === 0 && !drafts && !pending;
  const chip = (tag, label) => h("button", {
    type: "button", class: `filter-chip${state.filterTag === tag ? " on" : ""}`, "aria-pressed": String(state.filterTag === tag),
    onclick: () => { state.filterTag = tag; renderTimeline(); },
  }, label);
  const ordered = [...counts.keys()].sort((a, b) => (PRESET_TAGS.indexOf(a) + 1 || 99) - (PRESET_TAGS.indexOf(b) + 1 || 99) || a.localeCompare(b));
  bar.replaceChildren(...[chip(null, t("filterAll")),
    pending > 0 && chip("__pending", `📬 ${t("filterPending")} · ${pending}`),
    drafts > 0 && chip("__draft", `📝 ${t("filterDrafts")} · ${drafts}`),
    ...ordered.map((tag) => {
      const c = chip(tag, `${tagLabel(tag)} · ${counts.get(tag)}`);
      if (!state.editing || PRESET_TAGS.includes(tag)) return c;
      return h("span", { class: "chip-wrap" }, c,
        h("button", { type: "button", class: "chip-x", title: t("deleteTag"), "aria-label": t("deleteTag"), onclick: () => deleteTag(tag) }, "✕"));
    })].filter(Boolean));
}

function jumpAgeLabel(date) {
  const b = state.settings.birthday;
  if (!b) return "";
  const { days, months } = ageParts(b, date);
  if (days < 0) return "🤰";
  if (months < 12) return "👶";
  return t("ageShort", { n: Math.floor(months / 12) });
}

function renderJumpbar(events) {
  const years = [];
  for (const ev of events) {
    const y = ev.date.slice(0, 4);
    if (!years.some((x) => x.year === y)) years.push({ year: y, date: ev.date });
  }
  const bar = $("#jumpbar");
  bar.hidden = years.length < 2;
  bar.replaceChildren(h("span", { class: "jump-label" }, t("jumpTo")), ...years.map(({ year, date }) =>
    h("a", { href: `#y${year}`, class: "jump-pill", onclick: (e) => { e.preventDefault(); scrollToEl($(`#year-${year}`)); } },
      year, jumpAgeLabel(date) && h("small", {}, jumpAgeLabel(date)))));
}

function renderOnThisDay() {
  const today = todayISO();
  const matches = state.events
    .filter((ev) => ev.date.slice(5) === today.slice(5) && ev.date < today)
    .sort((a, b) => b.date.localeCompare(a.date));
  const box = $("#onThisDay");
  box.hidden = matches.length === 0;
  box.replaceChildren(
    h("div", { class: "otd-title" }, "🗓️ ", t("onThisDay")),
    ...matches.map((ev) => h("button", {
      type: "button", class: "otd-item",
      onclick: () => { state.filterTag = null; renderTimeline(); flash(ev.id); },
    }, h("span", { class: "otd-emoji" }, ev.emoji || "⭐"),
      h("span", {}, h("b", {}, ev.title), h("small", {}, t("yearsAgo", { n: Number(today.slice(0, 4)) - Number(ev.date.slice(0, 4)) }))))));
}

function renderTimeline({ keepScroll = false } = {}) {
  const y = window.scrollY;
  renderFilters();
  renderOnThisDay();
  const events = visibleEvents();
  renderJumpbar(events);

  const container = $("#events");
  container.replaceChildren();
  const noneAtAll = state.events.length === 0;
  $("#emptyState").hidden = events.length > 0;
  $("#emptyText").textContent = noneAtAll ? t("emptyText") : t("emptyFiltered");
  $("#timeline").hidden = events.length === 0;
  $("#btnSample").hidden = !(noneAtAll && state.store?.mode === "local" && state.editing);

  const perYear = {};
  for (const ev of events) perYear[ev.date.slice(0, 4)] = (perYear[ev.date.slice(0, 4)] || 0) + 1;

  let lastYear = null;
  events.forEach((ev, i) => {
    const year = ev.date.slice(0, 4);
    if (year !== lastYear) {
      container.append(h("div", { class: "year-marker", id: `year-${year}` },
        h("span", {}, year, h("small", {}, t("memoryCount", { n: perYear[year] })))));
      lastYear = year;
    }
    const age = ageLabel(state.settings.birthday, ev.date);
    container.append(h("article", {
      class: `event ${i % 2 ? "right" : "left"}${keepScroll ? " visible" : ""}`, id: `ev-${ev.id}`,
      "data-color": ev.color || COLOR_KEYS[i % COLOR_KEYS.length],
    },
      h("div", { class: "event-dot" }, ev.emoji || "⭐"),
      h("div", { class: "card" },
        h("button", { class: "card-edit", type: "button", onclick: () => openEditor(ev) }, t("editCard")),
        statusBar(ev),
        h("div", { class: "card-meta" },
          state.editing
            ? h("input", { type: "date", class: "chip date-edit", value: ev.date, title: t("changeDate"), onchange: (e) => changeDate(ev, e.target.value) })
            : h("span", { class: "chip" }, fmtDate(ev.date)),
          age && h("span", { class: "chip age" }, age)),
        h("h3", {}, ev.title),
        ev.description && h("p", { class: "desc" }, ev.description),
        renderGallery(ev),
        ev.tags?.length > 0 && h("div", { class: "card-tags" }, ev.tags.map((tag) => h("button", {
          type: "button", class: "tag-chip", onclick: () => { state.filterTag = tag; renderTimeline(); scrollToEl($("#filters")); },
        }, tagLabel(tag)))),
        statusOf(ev) === "published" && renderSocial(ev))));
  });

  observeReveal();
  if (keepScroll) window.scrollTo(0, y);
  updateLineFill();
}
hooks.renderTimeline = renderTimeline;

/** Edit mode: change a memory's date right on its card. */
async function changeDate(ev, date) {
  if (!date || date === ev.date) return;
  try {
    await state.store.updateEvent(ev.id, { date });
    await reloadEvents();
    toast(t("dateChanged", { date: fmtDate(date) }));
    flash(ev.id);
  } catch (ex) {
    toast(ex.message, 5000);
  }
}

/** Removes a tag from every memory (for tags made by mistake). */
async function deleteTag(tag) {
  const tagged = state.events.filter((ev) => ev.tags?.includes(tag));
  if (!confirm(t("deleteTagConfirm", { tag: tagLabel(tag), n: tagged.length }))) return false;
  try {
    for (const ev of tagged) await state.store.updateEvent(ev.id, { tags: ev.tags.filter((x) => x !== tag) });
    if (state.filterTag === tag) state.filterTag = null;
    await reloadEvents();
    toast(t("tagDeleted"));
    return true;
  } catch (ex) {
    toast(ex.message, 5000);
    return false;
  }
}

/** Draft / waiting-for-approval banner on a card, with the admin's publish/approve buttons. */
function statusBar(ev) {
  const status = statusOf(ev);
  if (status === "published") return null;
  const admin = state.access.admin;
  const label = status === "draft" ? t("draftBadge")
    : admin ? t("pendingFrom", { name: ev.submitted_name || "💕" }) : t("pendingBadge");
  return h("div", { class: `status-bar ${status}` },
    h("span", {}, label),
    admin && h("span", { class: "status-actions" },
      h("button", { type: "button", class: "btn btn-primary small-btn", onclick: () => publish(ev) },
        status === "draft" ? t("publishBtn") : t("approveBtn")),
      status === "pending" && h("button", { type: "button", class: "btn btn-ghost small-btn", onclick: () => openEditor(ev) }, t("editCard")),
      status === "pending" && h("button", { type: "button", class: "btn btn-danger small-btn", onclick: () => reject(ev) }, t("rejectBtn"))));
}

async function publish(ev) {
  try {
    await state.store.setEventStatus(ev.id, "published");
    toast(t(statusOf(ev) === "draft" ? "published" : "approved"));
    await hooks.memoriesAdded([{ ...ev, status: "published" }]);
  } catch (ex) {
    toast(ex.message, 5000);
  }
}

async function reject(ev) {
  if (!confirm(t("rejectConfirm"))) return;
  try {
    await state.store.deleteEvent(ev.id);
    await reloadEvents();
    toast(t("rejected"));
  } catch (ex) {
    toast(ex.message, 5000);
  }
}
hooks.renderGrowth = renderGrowth;
hooks.renderLetters = renderLetters;

function scrollToEl(el) {
  if (!el) return;
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: "smooth" });
}

function flash(id) {
  const el = $(`#ev-${CSS.escape(id)}`);
  if (!el) return;
  el.classList.add("visible");
  scrollToEl(el);
  el.classList.remove("flash");
  void el.offsetWidth;
  el.classList.add("flash");
}

// Reveal cards as they scroll into view.
const revealObserver = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) { e.target.classList.add("visible"); revealObserver.unobserve(e.target); }
}, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });

function observeReveal() {
  document.querySelectorAll(".event:not(.visible)").forEach((el) => revealObserver.observe(el));
}

// The center line fills with color as you scroll.
function updateLineFill() {
  const rect = $("#timeline").getBoundingClientRect();
  const progress = Math.min(Math.max(window.innerHeight * 0.6 - rect.top, 0), rect.height);
  $("#lineFill").style.height = `${progress}px`;
}
window.addEventListener("scroll", () => requestAnimationFrame(updateLineFill), { passive: true });
window.addEventListener("resize", updateLineFill);

// ---------- Edit mode ----------

function setEditing(on) {
  state.editing = on;
  document.body.classList.toggle("editing", on);
  $("#btnHeroEdit").hidden = !on;
  renderToolbar();
  setView(state.view);
  renderTimeline({ keepScroll: true });
}

function renderToolbar() {
  const on = state.editing;
  $("#btnEditMode").replaceChildren(on ? "✅ " : "✏️ ", h("span", {}, t(on ? "done" : "edit")));
  $("#btnSettings").hidden = !on;
  $("#btnBackup").hidden = !on;
  $("#btnBulk").hidden = !on;
  const cloud = state.store.mode === "cloud";
  $("#btnFamily").hidden = !(on && cloud && state.access.admin);
  $("#btnShare").hidden = !(cloud && state.access.family && !state.access.admin);
  const pending = state.access.admin ? countStatus("pending") : 0;
  $("#btnReview").hidden = !pending;
  $("#btnReview").replaceChildren("📬 ", h("span", {}, t("reviewBtn", { n: pending })));
  $("#btnSlideshow").hidden = state.events.filter((ev) => statusOf(ev) === "published").length < 2;
}

// Cloud mode is private: signed-out visitors only see the sign-in gate, family
// members see the site, and only admins get the Edit button. The database
// enforces the same rules, so hiding things here is just for a tidy page.
async function updateAuthUI() {
  state.user = await state.store.getUser();
  state.access = state.user ? await state.store.getAccess() : { admin: false, family: false };
  const allowed = state.access.family;

  $("#gate").hidden = allowed;
  $("#app").hidden = !allowed;
  $("#btnEditMode").hidden = !state.access.admin;
  $("#btnSignOut").hidden = !(allowed && state.store.needsAuth);
  $("#btnGateLogin").hidden = !!state.user;
  $("#btnGateSignOut").hidden = !state.user;
  $("#gateText").textContent = !state.user
    ? t("gateText")
    : state.access.setupNeeded ? t("gateSetup") : t("gateNoAccess", { email: state.user.email });
  if (!state.access.admin && state.editing) setEditing(false);
  return allowed;
}

async function loadAll() {
  const [settings, events, myName] = await Promise.all([state.store.getSettings(), state.store.listEvents(), state.store.getMyName()]);
  state.settings = { ...config.defaults, ...(settings || {}) };
  state.events = events;
  state.myName = myName;
  initMusic();
  // Each extra feature loads on its own, so one missing table can't take down the timeline.
  await Promise.all([loadSocial(), loadGrowth(), loadLetters()].map((p) => p.catch((ex) => console.warn(ex))));
  renderAll();
  if (state.access.outdated && state.access.admin) toast(t("gateSetup"), 12000);
}

function renderAll() {
  applyI18n();
  renderHero();
  renderToolbar();
  renderTimeline();
  setView(state.view);
}

async function reloadEvents() {
  state.events = await state.store.listEvents();
  renderToolbar();
  renderTimeline({ keepScroll: true });
}

$("#btnGateLogin").addEventListener("click", () => openDialog("#loginDialog"));
$("#btnEditMode").addEventListener("click", () => setEditing(!state.editing));

async function signOut() {
  stopMusic();
  $("#btnMusic").hidden = true;
  await state.store.signOut();
  setEditing(false);
  Object.assign(state, { events: [], comments: [], reactions: [], measurements: [], letters: [], myName: "", settings: { ...config.defaults } });
  await updateAuthUI();
}

$("#btnSignOut").addEventListener("click", async () => {
  await signOut();
  toast(t("signedOut"));
});
$("#btnGateSignOut").addEventListener("click", signOut);

$("#loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target;
  const err = $("#loginError");
  const btn = $("#btnLoginSubmit");
  err.hidden = true;
  btn.disabled = true;
  try {
    await state.store.signIn(f.email.value.trim(), f.password.value);
    f.reset();
    $("#loginDialog").close();
    if (await updateAuthUI()) {
      await loadAll();
      toast(t(state.access.admin ? "welcomeAdmin" : "welcomeFamily"));
    }
  } catch (ex) {
    err.textContent = ex.message === "Invalid login credentials" ? t("wrongLogin") : ex.message;
    err.hidden = false;
  } finally {
    btn.disabled = false;
  }
});

// ---------- Language ----------

$("#btnLang").addEventListener("click", () => {
  setLang(lang === "vi" ? "en" : "vi");
  if (!$("#app").hidden) renderAll();
  else updateAuthUI();
});

// ---------- Memory editor ----------

let draft = null; // { id, color, tags, media, status, submit }

/** `submit: true` is the family "Share a memory" form: it goes to the admin for approval. */
function openEditor(ev = null, { submit = false } = {}) {
  const f = $("#eventForm");
  f.reset();
  $("#eventError").hidden = true;
  $("#eventDialogTitle").textContent = t(submit ? "shareTitle" : ev ? "editMemory" : "newMemory");
  $("#btnDelete").hidden = !ev || submit;
  $("#tagField").hidden = submit;
  $("#visibleRow").hidden = submit;
  $("#btnSave").textContent = t(submit ? "shareSend" : "saveMemory");
  f.published.checked = !ev || statusOf(ev) === "published";
  f.title.value = ev?.title || "";
  f.emoji.value = ev?.emoji || "";
  f.date.value = ev?.date || todayISO();
  f.description.value = ev?.description || "";
  $("#tagCustom").value = "";
  $("#photoDateHint").hidden = true;
  draft = {
    id: ev?.id || null,
    color: ev?.color || COLOR_KEYS[Math.floor(Math.random() * COLOR_KEYS.length)],
    tags: [...(ev?.tags || [])],
    media: (ev?.media || []).map((m) => ({ ...m })),
    status: ev ? statusOf(ev) : "published",
    submit,
  };
  renderSwatches();
  renderTagPicker();
  renderMediaEdit();
  openDialog("#eventDialog");
}

function renderSwatches() {
  $("#colorSwatches").replaceChildren(...COLOR_KEYS.map((key) =>
    h("button", {
      type: "button", class: "swatch", role: "radio", title: key, "aria-checked": String(draft.color === key),
      style: `background:${COLORS[key]}`,
      onclick: () => { draft.color = key; renderSwatches(); },
    })));
}

function renderTagPicker() {
  const used = new Set(state.events.flatMap((ev) => ev.tags || []));
  const all = [...new Set([...PRESET_TAGS, ...used, ...draft.tags])];
  $("#tagPicker").replaceChildren(...all.map((tag) => {
    const on = draft.tags.includes(tag);
    const chip = h("button", {
      type: "button", class: `filter-chip${on ? " on" : ""}`, "aria-pressed": String(on),
      onclick: () => {
        draft.tags = on ? draft.tags.filter((x) => x !== tag) : [...draft.tags, tag];
        renderTagPicker();
      },
    }, tagLabel(tag));
    if (PRESET_TAGS.includes(tag) || draft.submit) return chip;
    return h("span", { class: "chip-wrap" }, chip, h("button", {
      type: "button", class: "chip-x", title: t("deleteTag"), "aria-label": t("deleteTag"),
      onclick: async () => {
        if (!used.has(tag)) { draft.tags = draft.tags.filter((x) => x !== tag); return renderTagPicker(); }
        if (await deleteTag(tag)) { draft.tags = draft.tags.filter((x) => x !== tag); renderTagPicker(); }
      },
    }, "✕"));
  }));
}

$("#tagCustom").addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  e.preventDefault();
  const tag = e.target.value.trim().toLowerCase();
  if (tag && !draft.tags.includes(tag)) draft.tags.push(tag);
  e.target.value = "";
  renderTagPicker();
});

function renderMediaEdit() {
  $("#mediaEdit").replaceChildren(...draft.media.map((m, i) => {
    const src = m.src || m.preview;
    let body;
    if (m.type === "image") body = h("img", { src, alt: "" });
    else if (m.type === "video") body = h("video", { src: `${src}#t=0.1`, muted: true, preload: "metadata" });
    else body = h("span", {}, "🔗 ", hydrateLink(m).type === "embed" ? t("mediaVideoLink") : t("mediaLink"));
    return h("div", { class: "media-thumb" }, body,
      h("span", { class: "tag" }, m.file ? t("mediaNew") : m.type === "link" ? t("mediaLink") : m.type),
      i > 0 && h("button", { type: "button", class: "move", title: t("moveEarlier"), onclick: () => {
        [draft.media[i - 1], draft.media[i]] = [draft.media[i], draft.media[i - 1]];
        renderMediaEdit();
      } }, "◀"),
      h("button", { type: "button", class: "remove", title: t("remove"), onclick: () => {
        if (m.preview) URL.revokeObjectURL(m.preview);
        draft.media.splice(i, 1);
        renderMediaEdit();
      } }, "✕"));
  }));
}

// Offer the date the photo was taken (e.g. "📷 Use the photo's date: 14 March 2024").
async function suggestPhotoDate(files) {
  const hint = $("#photoDateHint");
  for (const file of files) {
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) continue;
    const info = await photoDateInfo(file);
    if (!info.sure || info.date === $("#eventForm").date.value) continue;
    hint.textContent = t("usePhotoDate", { date: fmtDate(info.date) });
    hint.onclick = () => { $("#eventForm").date.value = info.date; hint.hidden = true; };
    hint.hidden = false;
    return;
  }
}

$("#fileInput").addEventListener("change", (e) => {
  suggestPhotoDate([...e.target.files]);
  for (const file of e.target.files) {
    const type = file.type.startsWith("video/") ? "video" : file.type.startsWith("image/") ? "image" : null;
    if (!type) continue;
    if (type === "video" && file.size > config.maxVideoMB * 1024 * 1024) {
      toast(t("videoTooBig", { name: file.name, mb: config.maxVideoMB }), 6000);
      continue;
    }
    draft.media.push({ type, file, preview: URL.createObjectURL(file) });
  }
  e.target.value = "";
  renderMediaEdit();
});

function addLink() {
  const input = $("#linkInput");
  if (!input.value.trim()) return;
  const parsed = parseVideoLink(input.value);
  if (!parsed) return toast(t("notALink"));
  draft.media.push({ type: "link", url: parsed.url });
  input.value = "";
  renderMediaEdit();
}
$("#btnAddLink").addEventListener("click", addLink);
$("#linkInput").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); addLink(); } });

$("#eventForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target;
  const btn = $("#btnSave");
  const err = $("#eventError");
  err.hidden = true;
  btn.disabled = true;
  btn.textContent = t("saving");
  const isNew = !draft.id;
  const submit = draft.submit;
  const name = submit ? await ensureName() : null;
  if (submit && !name) { btn.disabled = false; btn.textContent = t("shareSend"); return; }
  try {
    const media = [];
    for (const m of draft.media) {
      if (m.file && m.type === "image") media.push({ ...m, file: await compressImage(m.file, config.maxImageSize) });
      else media.push(m);
    }
    const ev = {
      id: draft.id,
      title: f.title.value.trim(),
      emoji: f.emoji.value.trim(),
      date: f.date.value,
      description: f.description.value.trim(),
      color: draft.color,
      tags: draft.tags,
      media,
      // Unticking "visible to family" makes a draft; a submission keeps waiting until approved.
      status: f.published.checked ? "published" : draft.status === "pending" ? "pending" : "draft",
    };
    if (submit) await state.store.submitEvent(ev, name);
    else await state.store.saveEvent(ev);
    draft.media.forEach((m) => m.preview && URL.revokeObjectURL(m.preview));
    $("#eventDialog").close();
    if (submit) {
      toast(t("shareSent"), 5000);
      await reloadEvents();
    } else if (isNew || (draft.status !== "published" && ev.status === "published")) {
      toast(t("memoryAdded"));
      await hooks.memoriesAdded([ev]);
    } else {
      toast(t("memoryUpdated"));
      await reloadEvents();
    }
  } catch (ex) {
    console.error(ex);
    err.textContent = ex.message;
    err.hidden = false;
  } finally {
    btn.disabled = false;
    btn.textContent = t(draft.submit ? "shareSend" : "saveMemory");
  }
});

$("#btnDelete").addEventListener("click", async () => {
  if (!draft?.id || !confirm(t("confirmDeleteMemory"))) return;
  try {
    await state.store.deleteEvent(draft.id);
    $("#eventDialog").close();
    await reloadEvents();
    toast(t("memoryDeleted"));
  } catch (ex) {
    $("#eventError").textContent = ex.message;
    $("#eventError").hidden = false;
  }
});

$("#fabAdd").addEventListener("click", () => openEditor());
$("#btnBulk").addEventListener("click", openBulk);
$("#btnBackup").addEventListener("click", openBackup);
$("#btnFamily").addEventListener("click", openFamily);
$("#btnSlideshow").addEventListener("click", openSlideshow);
$("#btnShare").addEventListener("click", () => openEditor(null, { submit: true }));
$("#btnReview").addEventListener("click", () => {
  state.filterTag = "__pending";
  if (state.view !== "timeline") location.hash = "#timeline";
  renderTimeline();
  scrollToEl($("#filters"));
});

// Emoji buttons on the text fields; the bubble emoji becomes a dropdown.
attachEmojiInsert($("#eventForm").title);
attachEmojiInsert($("#eventForm").description);
attachEmojiInsert($("#letterForm").title);
attachEmojiInsert($("#letterForm").body);
attachEmojiSelect($("#eventForm").emoji, "⭐");
attachEmojiSelect($("#settingsForm").emoji, "🌷");

// ---------- "Email the family" after adding memories ----------

hooks.memoriesAdded = async (all, { quiet = false } = {}) => {
  await reloadEvents();
  const added = all.filter((ev) => statusOf(ev) === "published");
  if (quiet || state.store.mode !== "cloud" || !added.length) return;
  let emails = [];
  try { emails = await state.store.familyEmails(); } catch (ex) { console.warn(ex); }
  if (!emails.length) return;
  const name = state.settings.name || t("defaultName");
  const url = location.origin + location.pathname;
  const one = added.length === 1 ? added[0] : null;
  const subject = one ? t("notifySubject", { title: one.title }) : t("notifySubjectMany", { n: added.length });
  const body = one
    ? t("notifyBody", { name, title: one.title, date: fmtDate(one.date), url })
    : t("notifyBodyMany", { name, n: added.length, url });
  $("#notifyLink").href = `mailto:?bcc=${emails.map(encodeURIComponent).join(",")}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  openDialog("#notifyDialog");
};
$("#notifyLink").addEventListener("click", () => setTimeout(() => $("#notifyDialog").close(), 300));

// ---------- Settings ----------

$("#btnSettings").addEventListener("click", () => {
  const f = $("#settingsForm");
  const s = state.settings;
  f.name.value = s.name || "";
  f.emoji.value = s.emoji || "";
  f.birthday.value = s.birthday || "";
  f.tagline.value = s.tagline || "";
  f.newestFirst.checked = !!s.newestFirst;
  f.cuteCursor.checked = s.cuteCursor !== false;
  initProfileFields(s);
  openDialog("#settingsDialog");
});

$("#settingsForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target;
  const btn = f.querySelector("button[type=submit]");
  btn.disabled = true;
  const settings = {
    ...state.settings,
    cuteCursor: f.cuteCursor.checked,
    name: f.name.value.trim(),
    emoji: f.emoji.value.trim(),
    birthday: f.birthday.value,
    tagline: f.tagline.value.trim(),
    newestFirst: f.newestFirst.checked,
  };
  try {
    Object.assign(settings, await commitProfile(state.settings));
    await state.store.saveSettings(settings);
    state.settings = { ...config.defaults, ...settings };
    $("#settingsDialog").close();
    renderAll();
    toast(t("saved"));
  } catch (ex) {
    toast(ex.message);
  } finally {
    btn.disabled = false;
  }
});
$("#btnHeroEdit").addEventListener("click", () => $("#btnSettings").click());

// ---------- Sample data (local mode) ----------

$("#btnSample").addEventListener("click", async () => {
  const birth = new Date();
  birth.setFullYear(birth.getFullYear() - 2, birth.getMonth() - 3);
  const iso = (d) => d.toISOString().slice(0, 10);
  const plus = (days) => { const d = new Date(birth); d.setDate(d.getDate() + days); return iso(d); };
  if (!state.settings.birthday) {
    state.settings = { ...state.settings, birthday: iso(birth) };
    await state.store.saveSettings(state.settings);
  }
  const samples = [
    { date: plus(-120), emoji: "🤰", color: "lavender", tags: ["family"], title: "We found out about you!", description: "Two little lines and our whole world changed." },
    { date: plus(0), emoji: "👶", color: "pink", tags: ["firsts", "family"], title: "Hello, world!", description: "You arrived at 3:42 am, tiny and perfect, with a full head of hair." },
    { date: plus(45), emoji: "😊", color: "lemon", tags: ["firsts"], title: "First real smile", description: "Right after bath time. We melted." },
    { date: plus(190), emoji: "🥕", color: "peach", tags: ["firsts", "funny"], title: "First solid food", description: "Carrot purée. Most of it ended up on your face." },
    { date: plus(365), emoji: "🎂", color: "mint", tags: ["birthday"], title: "First birthday party", description: "Strawberry cake, lots of balloons, and a very sleepy girl by 7pm." },
    { date: plus(400), emoji: "👣", color: "sky", tags: ["firsts"], title: "First steps", description: "Three wobbly steps from the sofa to Daddy's arms!" },
  ];
  for (const s of samples) await state.store.saveEvent({ ...s, media: [] });
  const growth = [[0, 49.5, 3.2], [60, 58, 5.4], [180, 66.5, 7.6], [365, 75, 9.4], [540, 81, 10.6], [730, 86.5, 12.1]];
  for (const [d, height_cm, weight_kg] of growth) await state.store.saveMeasurement({ date: plus(d), height_cm, weight_kg, note: "" });
  await loadAll();
  toast(t("sampleAdded"));
});

// ---------- Lightbox ----------

const lb = { items: [], index: 0 };

function openLightbox(items, index) {
  lb.items = items;
  lb.index = index;
  showLightboxItem();
  $("#lightbox").hidden = false;
  document.body.style.overflow = "hidden";
}

function showLightboxItem() {
  const m = lb.items[lb.index];
  const el = m.type === "video"
    ? h("video", { src: m.src, controls: true, autoplay: true, playsInline: true })
    : h("img", { src: m.src, alt: "" });
  $("#lbStage").replaceChildren(el);
  const multi = lb.items.length > 1;
  $(".lb-prev").hidden = !multi;
  $(".lb-next").hidden = !multi;
}

function closeLightbox() {
  $("#lightbox").hidden = true;
  $("#lbStage").replaceChildren();
  document.body.style.overflow = "";
}

function stepLightbox(delta) {
  lb.index = (lb.index + delta + lb.items.length) % lb.items.length;
  showLightboxItem();
}

$("#lightbox").addEventListener("click", (e) => {
  if (e.target.closest(".lb-close") || e.target === e.currentTarget) closeLightbox();
  else if (e.target.closest(".lb-prev")) stepLightbox(-1);
  else if (e.target.closest(".lb-next")) stepLightbox(1);
});
document.addEventListener("keydown", (e) => {
  if ($("#lightbox").hidden) return;
  if (e.key === "Escape") closeLightbox();
  if (e.key === "ArrowLeft") stepLightbox(-1);
  if (e.key === "ArrowRight") stepLightbox(1);
});

document.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => b.closest("dialog").close()));

// ---------- Boot ----------

/** Opened from an invite link: show the sign-up form, then load the site once they're in. */
function openInvite() {
  return handleInviteLink(async () => {
    if (await updateAuthUI()) {
      await loadAll();
      toast(t("welcomeFamily"));
    }
  });
}

async function boot() {
  setLang(lang);
  state.view = VIEWS.includes(location.hash.slice(1)) ? location.hash.slice(1) : "timeline";
  const cloud = config.supabase.url && config.supabase.anonKey;
  if (cloud) {
    const { SupabaseStore } = await import("./store-supabase.js");
    state.store = new SupabaseStore(config.supabase);
  } else {
    state.store = new LocalStore();
    $("#modeBadge").hidden = false;
  }
  await state.store.init();
  if (await updateAuthUI()) await loadAll();
  await openInvite();
}

boot().catch((ex) => {
  console.error(ex);
  toast(`Could not load the timeline: ${ex.message}`, 10000);
});
