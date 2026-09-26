// Backup: local mode keeps the original JSON export/import; cloud mode downloads
// a .zip with data.json plus every photo and video, so nothing depends on Supabase.

import { state } from "./state.js";
import { $, h, openDialog, toast, todayISO, download, loadScript } from "./util.js";
import { t } from "./i18n.js";

const JSZIP = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";

export function openBackup() {
  const local = state.store.mode === "local";
  $("#backupText").textContent = t(local ? "backupLocalText" : "backupCloudText");
  $("#restoreLabel").hidden = !local;
  openDialog("#backupDialog");
}

$("#btnExport").addEventListener("click", async (e) => {
  const btn = e.currentTarget;
  btn.disabled = true;
  try {
    if (state.store.mode === "local") {
      const data = await state.store.exportAll();
      download(new Blob([JSON.stringify(data)], { type: "application/json" }), `timeline-backup-${todayISO()}.json`);
    } else {
      await cloudZip();
    }
    toast(t("backupDone"));
  } catch (ex) {
    console.error(ex);
    toast(ex.message, 6000);
  } finally {
    btn.disabled = false;
  }
});

async function cloudZip() {
  await loadScript(JSZIP);
  const zip = new window.JSZip();
  const s = state.store;
  const [settings, events, measurements, letters, comments, reactions] = await Promise.all([
    s.getSettings(), s.listEvents(), s.listMeasurements(), s.listLetters(), s.listComments(), s.listReactions(),
  ]);

  const files = events.flatMap((ev) => ev.media.filter((m) => m.path && m.src));
  let done = 0;
  for (const m of files) {
    toast(t("backupPreparing", { done, total: files.length }), 60000);
    const res = await fetch(m.src);
    if (res.ok) zip.file(`media/${m.path}`, await res.blob());
    done++;
  }
  const clean = events.map(({ updatedAt, ...ev }) => ({ ...ev, media: ev.media.map(({ src, ...m }) => m) }));
  zip.file("data.json", JSON.stringify({
    app: "little-timeline", version: 2, exportedAt: new Date().toISOString(),
    settings, events: clean, measurements, letters, comments, reactions,
  }, null, 2));
  zip.file("README.txt", "Backup of the family timeline.\n\ndata.json  - every memory, letter, comment, heart and measurement\nmedia/     - the photos and videos, in folders named after each memory's id\n");
  download(await zip.generateAsync({ type: "blob" }), `timeline-backup-${todayISO()}.zip`);
}

$("#importInput").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;
  try {
    await state.store.importAll(JSON.parse(await file.text()));
    $("#backupDialog").close();
    toast(t("restored"));
    setTimeout(() => location.reload(), 800);
  } catch (ex) {
    toast(ex.message || t("badBackup"));
  }
});
