// "Many photos": pick a batch of photos/videos, group them by the day they were
// taken, and turn each day (or each photo) into its own memory.

import config from "./config.js";
import { state, hooks, COLOR_KEYS } from "./state.js";
import { $, h, openDialog, toast } from "./util.js";
import { t, fmtDate } from "./i18n.js";
import { compressImage } from "./media.js";
import { photoDate } from "./exif.js";

let items = []; // { file, type, date, preview }
let groups = []; // { key, date, title, items }

export function openBulk() {
  releasePreviews();
  items = [];
  groups = [];
  $("#bulkForm").reset();
  $("#bulkError").hidden = true;
  renderGroups();
  openDialog("#bulkDialog");
}

function releasePreviews() {
  items.forEach((it) => URL.revokeObjectURL(it.preview));
}

$("#bulkInput").addEventListener("change", async (e) => {
  const files = [...e.target.files];
  e.target.value = "";
  const skipped = [];
  $("#bulkGroups").replaceChildren(h("p", { class: "muted" }, t("bulkReading")));
  for (const file of files) {
    const type = file.type.startsWith("video/") ? "video" : file.type.startsWith("image/") ? "image" : null;
    if (!type) continue;
    if (type === "video" && file.size > config.maxVideoMB * 1024 * 1024) { skipped.push(file.name); continue; }
    items.push({ file, type, date: await photoDate(file), preview: URL.createObjectURL(file) });
  }
  for (const name of skipped) toast(t("videoTooBig", { name, mb: config.maxVideoMB }), 6000);
  regroup();
});

$("#bulkMode").addEventListener("change", regroup);

function regroup() {
  const perPhoto = $("#bulkForm").bulkMode.value === "photo";
  const titles = new Map(groups.map((g) => [g.key, g.title]));
  const map = new Map();
  items.forEach((it, i) => {
    const key = perPhoto ? `${it.date}#${i}` : it.date;
    if (!map.has(key)) map.set(key, { key, date: it.date, title: titles.get(key) || "", items: [] });
    map.get(key).items.push(it);
  });
  groups = [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
  renderGroups();
}

function renderGroups() {
  const btn = $("#btnBulkSave");
  btn.disabled = groups.length === 0;
  btn.textContent = t("bulkSave", { n: groups.length });
  $("#bulkGroups").replaceChildren(...groups.map((g) => h("div", { class: "bulk-group" },
    h("div", { class: "bulk-thumbs" },
      g.items.slice(0, 4).map((it) => it.type === "image"
        ? h("img", { src: it.preview, alt: "" })
        : h("video", { src: `${it.preview}#t=0.1`, muted: true, preload: "metadata" })),
      g.items.length > 4 && h("span", { class: "more" }, `+${g.items.length - 4}`)),
    h("div", { class: "bulk-fields" },
      h("input", { type: "date", value: g.date, required: true, onchange: (e) => { g.date = e.target.value; } }),
      h("input", {
        value: g.title, maxlength: "120", placeholder: t("bulkDefaultTitle", { date: fmtDate(g.date) }),
        oninput: (e) => { g.title = e.target.value; },
      }),
      h("small", { class: "muted" }, t("bulkFiles", { n: g.items.length }))))));
}

$("#bulkForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = $("#btnBulkSave");
  const err = $("#bulkError");
  err.hidden = true;
  btn.disabled = true;
  let done = 0;
  const added = [];
  try {
    for (const g of groups) {
      btn.textContent = t("bulkProgress", { done, total: groups.length });
      const media = [];
      for (const it of g.items) {
        media.push({ type: it.type, file: it.type === "image" ? await compressImage(it.file, config.maxImageSize) : it.file });
      }
      const ev = {
        title: g.title.trim() || t("bulkDefaultTitle", { date: fmtDate(g.date) }),
        date: g.date,
        emoji: "📸",
        color: COLOR_KEYS[(done + 2) % COLOR_KEYS.length],
        description: "",
        tags: [],
        media,
      };
      await state.store.saveEvent(ev);
      added.push(ev);
      done++;
    }
    $("#bulkDialog").close();
    releasePreviews();
    items = [];
    groups = [];
    toast(t("bulkDone", { n: done }));
    await hooks.memoriesAdded(added);
  } catch (ex) {
    console.error(ex);
    err.textContent = ex.message;
    err.hidden = false;
    btn.disabled = false;
    btn.textContent = t("bulkSave", { n: groups.length });
    // Groups already saved shouldn't be uploaded twice if they retry.
    groups = groups.slice(done);
    if (done) { renderGroups(); await hooks.memoriesAdded(added, { quiet: true }); }
  }
});
