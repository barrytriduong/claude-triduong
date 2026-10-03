// Her profile photo at the top: pick a photo, drag/zoom it into a circle, choose a
// cute decoration. Without a photo, her emoji sits in the same frame.

import { state } from "./state.js";
import { $, h, openDialog, toast } from "./util.js";
import { t } from "./i18n.js";
import { compressImage } from "./media.js";

export const FRAMES = {
  none: [],
  bow: [["🎀", "bow"]],
  crown: [["👑", "crown"]],
  flowers: [["🌸", "fl1"], ["🌼", "fl2"], ["🌷", "fl3"], ["🌸", "fl4"]],
  stars: [["✨", "st1"], ["⭐", "st2"], ["✨", "st3"], ["🌟", "st4"]],
  hearts: [["💕", "ht1"], ["💖", "ht2"], ["💗", "ht3"]],
  bunny: [["🐰", "bunny"]],
};

let photoUrl = { path: null, url: null };

async function urlFor(path) {
  if (!path) return null;
  if (photoUrl.path !== path) photoUrl = { path, url: await state.store.fileUrl(path) };
  return photoUrl.url;
}

/** Builds the round avatar (photo or emoji) with its decoration. */
export function avatar({ photo, emoji, frame }) {
  const deco = (FRAMES[frame] || []).map(([em, cls]) => h("span", { class: `deco ${cls}`, "aria-hidden": "true" }, em));
  return h("div", { class: `avatar frame-${frame || "none"}` },
    h("div", { class: "avatar-ring" }),
    h("div", { class: "avatar-inner" }, photo ? h("img", { src: photo, alt: "" }) : h("span", { class: "avatar-emoji" }, emoji)),
    deco);
}

export async function renderAvatar(target, settings, draftPhotoUrl) {
  const photo = draftPhotoUrl !== undefined ? draftPhotoUrl : await urlFor(settings.photo).catch(() => null);
  target.replaceChildren(avatar({ photo, emoji: settings.emoji || "🌷", frame: settings.frame || "bow" }));
}

// ---------- Settings: photo + decoration ----------

const draft = { file: null, url: undefined, removed: false, frame: "bow" };

export function initProfileFields(settings) {
  draft.file = null;
  draft.url = undefined;
  draft.removed = false;
  draft.frame = settings.frame || "bow";
  renderProfileFields(settings);
}

function renderProfileFields(settings) {
  const preview = { ...settings, frame: draft.frame, emoji: $("#settingsForm").emoji.value || settings.emoji };
  renderAvatar($("#avatarPreview"), preview, draft.removed ? null : draft.url);
  $("#btnRemovePhoto").hidden = draft.removed || (!settings.photo && !draft.file);
  $("#framePicker").replaceChildren(...Object.keys(FRAMES).map((key) => h("button", {
    type: "button", class: `filter-chip${draft.frame === key ? " on" : ""}`, "aria-pressed": String(draft.frame === key),
    onclick: () => { draft.frame = key; renderProfileFields(settings); },
  }, t(`frame_${key}`))));
}

/** Called when settings are saved: uploads a new photo if one was chosen. Returns the fields to store. */
export async function commitProfile(settings) {
  let photo = settings.photo || "";
  if (draft.removed && photo) {
    await state.store.deleteFile(photo).catch(() => {});
    photo = "";
  }
  if (draft.file) {
    const path = await state.store.uploadFile("profile", draft.file);
    if (settings.photo) await state.store.deleteFile(settings.photo).catch(() => {});
    photo = path;
  }
  return { photo, frame: draft.frame };
}

$("#btnRemovePhoto").addEventListener("click", () => {
  draft.removed = true;
  draft.file = null;
  draft.url = null;
  renderProfileFields(state.settings);
});
$("#settingsForm").emoji.addEventListener("change", () => renderProfileFields(state.settings));

// ---------- Crop: drag to move, slider to zoom ----------

const crop = { img: null, x: 0, y: 0, zoom: 1, base: 1, drag: null };
const VIEW = 260;

$("#photoInput").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;
  try {
    const usable = await compressImage(file, 1600); // also converts iPhone HEIC photos
    const url = URL.createObjectURL(usable);
    const img = new Image();
    img.src = url;
    await img.decode();
    crop.img = img;
    crop.base = Math.max(VIEW / img.naturalWidth, VIEW / img.naturalHeight);
    crop.zoom = 1;
    crop.x = (VIEW - img.naturalWidth * crop.base) / 2;
    crop.y = (VIEW - img.naturalHeight * crop.base) / 2;
    $("#cropZoom").value = "1";
    const stage = $("#cropStage");
    stage.replaceChildren(img);
    drawCrop();
    openDialog("#cropDialog");
  } catch (ex) {
    toast(ex.message || "Could not open that photo", 5000);
  }
});

function clampCrop() {
  const s = crop.base * crop.zoom;
  const w = crop.img.naturalWidth * s, hgt = crop.img.naturalHeight * s;
  crop.x = Math.min(0, Math.max(VIEW - w, crop.x));
  crop.y = Math.min(0, Math.max(VIEW - hgt, crop.y));
}

function drawCrop() {
  clampCrop();
  const s = crop.base * crop.zoom;
  Object.assign(crop.img.style, {
    width: `${crop.img.naturalWidth * s}px`, height: `${crop.img.naturalHeight * s}px`,
    transform: `translate(${crop.x}px, ${crop.y}px)`,
  });
}

$("#cropZoom").addEventListener("input", (e) => {
  // Zoom around the middle of the circle.
  const before = crop.base * crop.zoom;
  crop.zoom = Number(e.target.value);
  const after = crop.base * crop.zoom;
  crop.x = VIEW / 2 - ((VIEW / 2 - crop.x) * after) / before;
  crop.y = VIEW / 2 - ((VIEW / 2 - crop.y) * after) / before;
  drawCrop();
});
$("#cropStage").addEventListener("pointerdown", (e) => {
  crop.drag = { x: e.clientX - crop.x, y: e.clientY - crop.y };
  e.currentTarget.setPointerCapture(e.pointerId);
});
$("#cropStage").addEventListener("pointermove", (e) => {
  if (!crop.drag) return;
  crop.x = e.clientX - crop.drag.x;
  crop.y = e.clientY - crop.drag.y;
  drawCrop();
});
$("#cropStage").addEventListener("pointerup", () => { crop.drag = null; });

$("#btnCropDone").addEventListener("click", async () => {
  const OUT = 600;
  const s = crop.base * crop.zoom;
  const canvas = h("canvas", { width: OUT, height: OUT });
  const k = OUT / VIEW;
  canvas.getContext("2d").drawImage(crop.img, crop.x * k, crop.y * k, crop.img.naturalWidth * s * k, crop.img.naturalHeight * s * k);
  const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", 0.88));
  draft.file = new File([blob], "profile.jpg", { type: "image/jpeg" });
  if (draft.url) URL.revokeObjectURL(draft.url);
  draft.url = URL.createObjectURL(blob);
  draft.removed = false;
  $("#cropDialog").close();
  renderProfileFields(state.settings);
});
