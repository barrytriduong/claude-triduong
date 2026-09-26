import config from "./config.js";
import { LocalStore } from "./store-local.js";
import { compressImage, parseVideoLink, hydrateLink } from "./media.js";

const COLORS = {
  pink: "#ff8fb1", peach: "#ffb38a", lemon: "#ffd66b", mint: "#74d6b8", sky: "#86c5ff", lavender: "#b8a2ff",
};
const COLOR_KEYS = Object.keys(COLORS);

const $ = (sel) => document.querySelector(sel);

/** Tiny DOM builder: h("div", {class: "x", onclick}, child, "text"). Text is always escaped. */
function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k in el && typeof v !== "string") el[k] = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children.flat()) if (c != null && c !== false) el.append(c);
  return el;
}

const state = {
  store: null,
  settings: { ...config.defaults },
  events: [],
  editing: false,
  user: null,
};

// ---------- Dates & ages ----------

const parseDate = (s) => new Date(`${s}T00:00:00Z`);
const fmtDate = (s) => parseDate(s).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
const ordinal = (n) => n + (["th", "st", "nd", "rd"][(n % 100 - 20) % 10] || ["th", "st", "nd", "rd"][n % 100] || "th");

function ageLabel(birthday, dateStr) {
  if (!birthday || !dateStr) return "";
  const b = parseDate(birthday);
  const d = parseDate(dateStr);
  const days = Math.round((d - b) / 86400000);
  if (days < 0) {
    const weeks = Math.ceil(-days / 7);
    return weeks <= 42 ? `${plural(weeks, "week")} before you arrived` : "Before you were born";
  }
  if (days === 0) return "The day you were born 💕";
  let months = (d.getUTCFullYear() - b.getUTCFullYear()) * 12 + (d.getUTCMonth() - b.getUTCMonth());
  if (d.getUTCDate() < b.getUTCDate()) months--;
  if (months < 1) return days < 14 ? `${plural(days, "day")} old` : `${plural(Math.floor(days / 7), "week")} old`;
  if (months < 24) return `${plural(months, "month")} old`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (d.getUTCMonth() === b.getUTCMonth() && d.getUTCDate() === b.getUTCDate()) return `${ordinal(years)} birthday 🎂`;
  return rest ? `${plural(years, "year")}, ${plural(rest, "month")} old` : `${plural(years, "year")} old`;
}

// ---------- Rendering ----------

function renderHero() {
  const s = state.settings;
  $("#heroName").textContent = s.name || config.defaults.name;
  $("#heroEmoji").textContent = s.emoji || config.defaults.emoji;
  $("#heroTagline").textContent = s.tagline || "";
  const age = s.birthday ? ageLabel(s.birthday, todayISO()) : "";
  $("#heroAge").textContent = age ? `🎈 ${age.includes("birthday") ? "Today is her " + age : "Now " + age}` : "";
  document.title = s.name ? `${s.name}'s Timeline` : "Our Little Star";
}

function sortedEvents() {
  const dir = state.settings.newestFirst ? -1 : 1;
  return [...state.events].sort((a, b) => dir * (a.date.localeCompare(b.date) || (a.updatedAt || "").localeCompare(b.updatedAt || "")));
}

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

function renderEvents() {
  const container = $("#events");
  container.replaceChildren();
  const events = sortedEvents();
  $("#emptyState").hidden = events.length > 0;
  $("#timeline").hidden = events.length === 0;
  $("#btnSample").hidden = !(state.store?.mode === "local" && state.editing);

  const perYear = {};
  for (const ev of events) perYear[ev.date.slice(0, 4)] = (perYear[ev.date.slice(0, 4)] || 0) + 1;

  let lastYear = null;
  events.forEach((ev, i) => {
    const year = ev.date.slice(0, 4);
    if (year !== lastYear) {
      container.append(h("div", { class: "year-marker" },
        h("span", {}, year, h("small", {}, `${perYear[year]} ${perYear[year] === 1 ? "memory" : "memories"}`))));
      lastYear = year;
    }
    const age = ageLabel(state.settings.birthday, ev.date);
    container.append(h("article", { class: `event ${i % 2 ? "right" : "left"}`, "data-color": ev.color || COLOR_KEYS[i % COLOR_KEYS.length] },
      h("div", { class: "event-dot" }, ev.emoji || "⭐"),
      h("div", { class: "card" },
        h("button", { class: "card-edit", type: "button", onclick: () => openEditor(ev) }, "✏️ Edit"),
        h("div", { class: "card-meta" },
          h("span", { class: "chip" }, fmtDate(ev.date)),
          age && h("span", { class: "chip age" }, age)),
        h("h3", {}, ev.title),
        ev.description && h("p", { class: "desc" }, ev.description),
        renderGallery(ev))));
  });

  observeReveal();
  updateLineFill();
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
  const tl = $("#timeline");
  const rect = tl.getBoundingClientRect();
  const progress = Math.min(Math.max(window.innerHeight * 0.6 - rect.top, 0), rect.height);
  $("#lineFill").style.height = `${progress}px`;
}
window.addEventListener("scroll", () => requestAnimationFrame(updateLineFill), { passive: true });
window.addEventListener("resize", updateLineFill);

// ---------- Edit mode ----------

function setEditing(on) {
  state.editing = on;
  document.body.classList.toggle("editing", on);
  $("#btnEditMode").innerHTML = on ? "✅ <span>Done</span>" : "✏️ <span>Edit</span>";
  $("#fabAdd").hidden = !on;
  $("#btnSettings").hidden = !on;
  $("#btnBackup").hidden = !(on && state.store.mode === "local");
  $("#btnSignOut").hidden = !(on && state.store.needsAuth);
  renderEvents();
}

// In cloud mode viewers never see the Edit button — only a faint 🔒 in the footer.
async function updateAuthUI() {
  if (!state.store.needsAuth) return;
  const signedIn = !!(await state.store.getUser());
  $("#btnEditMode").hidden = !signedIn;
  $("#btnLogin").hidden = signedIn;
}

$("#btnLogin").addEventListener("click", () => openDialog("#loginDialog"));

$("#btnEditMode").addEventListener("click", async () => {
  if (state.editing) return setEditing(false);
  if (state.store.needsAuth && !(await state.store.getUser())) return openDialog("#loginDialog");
  setEditing(true);
});

$("#btnSignOut").addEventListener("click", async () => {
  await state.store.signOut();
  setEditing(false);
  await updateAuthUI();
  toast("Signed out 👋");
});

$("#loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target;
  const err = $("#loginError");
  err.hidden = true;
  try {
    await state.store.signIn(f.email.value.trim(), f.password.value);
    f.reset();
    $("#loginDialog").close();
    await updateAuthUI();
    setEditing(true);
    toast("Welcome back! 💕");
  } catch (ex) {
    err.textContent = ex.message || "Could not sign in.";
    err.hidden = false;
  }
});

// ---------- Event editor ----------

let draft = null; // { id, media: [...] }

function openEditor(ev = null) {
  const f = $("#eventForm");
  f.reset();
  $("#eventError").hidden = true;
  $("#eventDialogTitle").textContent = ev ? "Edit memory" : "New memory";
  $("#btnDelete").hidden = !ev;
  f.title.value = ev?.title || "";
  f.emoji.value = ev?.emoji || "";
  f.date.value = ev?.date || todayISO();
  f.description.value = ev?.description || "";
  draft = {
    id: ev?.id || null,
    color: ev?.color || COLOR_KEYS[Math.floor(Math.random() * COLOR_KEYS.length)],
    media: (ev?.media || []).map((m) => ({ ...m })),
  };
  renderSwatches();
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

function renderMediaEdit() {
  $("#mediaEdit").replaceChildren(...draft.media.map((m, i) => {
    const src = m.src || m.preview;
    let body;
    if (m.type === "image") body = h("img", { src, alt: "" });
    else if (m.type === "video") body = h("video", { src: `${src}#t=0.1`, muted: true, preload: "metadata" });
    else body = h("span", {}, "🔗 ", hydrateLink(m).type === "embed" ? "Video link" : "Link");
    return h("div", { class: "media-thumb" }, body,
      h("span", { class: "tag" }, m.file ? "new" : m.type === "link" ? "link" : m.type),
      i > 0 && h("button", { type: "button", class: "move", title: "Move earlier", onclick: () => {
        [draft.media[i - 1], draft.media[i]] = [draft.media[i], draft.media[i - 1]];
        renderMediaEdit();
      } }, "◀"),
      h("button", { type: "button", class: "remove", title: "Remove", onclick: () => {
        if (m.preview) URL.revokeObjectURL(m.preview);
        draft.media.splice(i, 1);
        renderMediaEdit();
      } }, "✕"));
  }));
}

$("#fileInput").addEventListener("change", (e) => {
  for (const file of e.target.files) {
    const type = file.type.startsWith("video/") ? "video" : file.type.startsWith("image/") ? "image" : null;
    if (!type) continue;
    if (type === "video" && file.size > config.maxVideoMB * 1024 * 1024) {
      toast(`"${file.name}" is over ${config.maxVideoMB} MB — upload it to YouTube (unlisted) and paste the link instead.`, 6000);
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
  if (!parsed) return toast("That doesn't look like a link 🤔");
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
  btn.textContent = "Saving…";
  try {
    const media = [];
    for (const m of draft.media) {
      if (m.file && m.type === "image") media.push({ ...m, file: await compressImage(m.file, config.maxImageSize) });
      else media.push(m);
    }
    await state.store.saveEvent({
      id: draft.id,
      title: f.title.value.trim(),
      emoji: f.emoji.value.trim(),
      date: f.date.value,
      description: f.description.value.trim(),
      color: draft.color,
      media,
    });
    draft.media.forEach((m) => m.preview && URL.revokeObjectURL(m.preview));
    $("#eventDialog").close();
    await reload();
    toast(draft.id ? "Memory updated ✨" : "Memory added 🎉");
  } catch (ex) {
    console.error(ex);
    err.textContent = ex.message || "Something went wrong while saving.";
    err.hidden = false;
  } finally {
    btn.disabled = false;
    btn.textContent = "Save memory";
  }
});

$("#btnDelete").addEventListener("click", async () => {
  if (!draft?.id || !confirm("Delete this memory and its photos/videos? This can't be undone.")) return;
  try {
    await state.store.deleteEvent(draft.id);
    $("#eventDialog").close();
    await reload();
    toast("Memory deleted");
  } catch (ex) {
    $("#eventError").textContent = ex.message;
    $("#eventError").hidden = false;
  }
});

$("#fabAdd").addEventListener("click", () => openEditor());

// ---------- Settings ----------

$("#btnSettings").addEventListener("click", () => {
  const f = $("#settingsForm");
  const s = state.settings;
  f.name.value = s.name || "";
  f.emoji.value = s.emoji || "";
  f.birthday.value = s.birthday || "";
  f.tagline.value = s.tagline || "";
  f.newestFirst.checked = !!s.newestFirst;
  openDialog("#settingsDialog");
});

$("#settingsForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target;
  const settings = {
    name: f.name.value.trim(),
    emoji: f.emoji.value.trim(),
    birthday: f.birthday.value,
    tagline: f.tagline.value.trim(),
    newestFirst: f.newestFirst.checked,
  };
  try {
    await state.store.saveSettings(settings);
    state.settings = { ...config.defaults, ...settings };
    $("#settingsDialog").close();
    renderHero();
    renderEvents();
    toast("Saved 💾");
  } catch (ex) {
    toast(ex.message || "Could not save settings");
  }
});

// ---------- Backup (local mode) ----------

$("#btnBackup").addEventListener("click", () => openDialog("#backupDialog"));

$("#btnExport").addEventListener("click", async () => {
  const data = await state.store.exportAll();
  const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
  const a = h("a", { href: URL.createObjectURL(blob), download: `timeline-backup-${todayISO()}.json` });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
});

$("#importInput").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;
  try {
    await state.store.importAll(JSON.parse(await file.text()));
    await reload();
    $("#backupDialog").close();
    toast("Backup restored 🎉");
  } catch (ex) {
    toast(ex.message || "Could not read that backup file");
  }
});

// ---------- Sample data ----------

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
    { date: plus(-120), emoji: "🤰", color: "lavender", title: "We found out about you!", description: "Two little lines and our whole world changed." },
    { date: plus(0), emoji: "👶", color: "pink", title: "Hello, world!", description: "You arrived at 3:42 am, tiny and perfect, with a full head of hair." },
    { date: plus(45), emoji: "😊", color: "lemon", title: "First real smile", description: "Right after bath time. We melted." },
    { date: plus(190), emoji: "🥕", color: "peach", title: "First solid food", description: "Carrot purée. Most of it ended up on your face." },
    { date: plus(365), emoji: "🎂", color: "mint", title: "First birthday party", description: "Strawberry cake, lots of balloons, and a very sleepy girl by 7pm." },
    { date: plus(400), emoji: "👣", color: "sky", title: "First steps", description: "Three wobbly steps from the sofa to Daddy's arms!" },
  ];
  for (const s of samples) await state.store.saveEvent({ ...s, media: [] });
  await reload();
  renderHero();
  toast("Sample memories added — edit or delete them anytime");
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
  document.querySelector(".lb-prev").hidden = !multi;
  document.querySelector(".lb-next").hidden = !multi;
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

// ---------- Utilities ----------

function openDialog(sel) {
  $(sel).showModal();
}
document.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => b.closest("dialog").close()));

let toastTimer;
function toast(msg, ms = 2600) {
  const t = $("#toast");
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, ms);
}

async function reload() {
  state.events = await state.store.listEvents();
  renderEvents();
}

// ---------- Boot ----------

async function boot() {
  const cloud = config.supabase.url && config.supabase.anonKey;
  if (cloud) {
    const { SupabaseStore } = await import("./store-supabase.js");
    state.store = new SupabaseStore(config.supabase);
  } else {
    state.store = new LocalStore();
    $("#btnEditMode").hidden = false;
    const badge = $("#modeBadge");
    badge.textContent = "💻 saved in this browser only";
    badge.hidden = false;
  }
  await state.store.init();
  await updateAuthUI();
  state.settings = { ...config.defaults, ...((await state.store.getSettings()) || {}) };
  renderHero();
  await reload();
}

boot().catch((ex) => {
  console.error(ex);
  toast(`Could not load the timeline: ${ex.message}`, 10000);
});
