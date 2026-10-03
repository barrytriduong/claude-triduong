// "Many photos": pick a batch of photos/videos, group them by the day they were
// taken, and turn each day (or each photo) into its own memory.

import config from "./config.js";
import { state, hooks, COLOR_KEYS } from "./state.js";
import { $, h, openDialog, toast } from "./util.js";
import { t, fmtDate } from "./i18n.js";
import { compressImage, mediaKind } from "./media.js";
import { photoDateInfo } from "./exif.js";

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

// Folder picking needs a desktop browser; phones only offer single files.
$("#bulkFolderBtn").hidden = !("webkitdirectory" in document.createElement("input")) || /Android|iPhone|iPad/i.test(navigator.userAgent);

async function addFiles(e) {
  const files = [...e.target.files].filter((f) => !f.name.startsWith("."));
  e.target.value = "";
  const skipped = [];
  const status = $("#bulkGroups");
  let read = 0;
  for (const file of files) {
    status.replaceChildren(h("p", { class: "muted" }, `${t("bulkReading")} ${++read}/${files.length}`));
    const type = mediaKind(file);
    if (!type) continue;
    if (type === "video" && file.size > config.maxVideoMB * 1024 * 1024) { skipped.push(file.name); continue; }
    const { date, sure } = await photoDateInfo(file);
    items.push({ file, type, date, sure, preview: URL.createObjectURL(file) });
  }
  if (skipped.length) toast(t("bulkSkipped", { n: skipped.length, mb: config.maxVideoMB }), 8000);
  regroup();
}
$("#bulkInput").addEventListener("change", addFiles);
$("#bulkFolder").addEventListener("change", addFiles);

$("#bulkMode").addEventListener("change", regroup);

function regroup() {
  const perPhoto = $("#bulkForm").bulkMode.value === "photo";
  const titles = new Map(groups.map((g) => [g.key, g.title]));
  const map = new Map();
  items.forEach((it, i) => {
    const key = perPhoto ? `${it.date}#${i}` : it.date;
    if (!map.has(key)) map.set(key, { key, date: it.date, title: titles.get(key) || "", items: [], unsure: false });
    map.get(key).items.push(it);
    if (!it.sure) map.get(key).unsure = true;
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
        ? h("img", { src: it.preview, alt: "", onerror: (e) => e.target.replaceWith(h("span", { class: "thumb-ph" }, "🖼️")) })
        : h("video", { src: `${it.preview}#t=0.1`, muted: true, preload: "metadata" })),
      g.items.length > 4 && h("span", { class: "more" }, `+${g.items.length - 4}`)),
    h("div", { class: "bulk-fields" },
      h("input", {
        type: "date", value: g.date, required: true, class: g.unsure ? "unsure" : null,
        onchange: (e) => { g.date = e.target.value; g.unsure = false; e.target.classList.remove("unsure"); e.target.nextElementSibling?.classList.contains("date-warn") && e.target.nextElementSibling.remove(); },
      }),
      g.unsure && h("small", { class: "date-warn" }, t("bulkDateUnsure")),
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
  const asDraft = e.target.asDraft.checked;
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
        status: asDraft ? "draft" : "published",
      };
      await state.store.saveEvent(ev);
      added.push(ev);
      done++;
    }
    $("#bulkDialog").close();
    releasePreviews();
    items = [];
    groups = [];
    toast(t(asDraft ? "bulkDoneDrafts" : "bulkDone", { n: done }), 6000);
    if (asDraft && state.access.admin) state.filterTag = "__draft";
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
