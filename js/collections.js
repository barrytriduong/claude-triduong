// Loads the extra collections (sayings, people, portraits, cards, milestones,
// wishes, health) and the temporary links for their photos and recordings.

import { state } from "./state.js";
import { compressImage } from "./media.js";

const FILE_FIELD = { people: "photo", portraits: "path", sayings: "audio" };

export async function loadRows() {
  const names = ["sayings", "people", "portraits", "about_cards", "milestones", "wishes"];
  if (state.access.admin) names.push("health");
  const lists = await Promise.all(names.map((n) => state.store.listRows(n).catch((ex) => { console.warn(n, ex); return []; })));
  const rows = Object.fromEntries(names.map((n, i) => [n, lists[i]]));
  rows.health ||= [];

  const paths = Object.entries(FILE_FIELD).flatMap(([n, f]) => rows[n].map((r) => r[f]));
  const urls = await state.store.fileUrls(paths).catch(() => new Map());
  for (const [n, f] of Object.entries(FILE_FIELD)) for (const r of rows[n]) r._url = r[f] ? urls.get(r[f]) || "" : "";

  const byDate = (a, b) => (a.date || "").localeCompare(b.date || "");
  rows.sayings.sort((a, b) => byDate(b, a));
  rows.people.sort((a, b) => (a.sort - b.sort) || a.name.localeCompare(b.name));
  rows.portraits.sort(byDate);
  rows.about_cards.sort(byDate);
  rows.wishes.sort((a, b) => (a.created_at || "").localeCompare(b.created_at || ""));
  rows.health.sort((a, b) => byDate(b, a));
  state.rows = rows;
}

/** Strips helper fields before saving a row. */
export const clean = (row) => Object.fromEntries(Object.entries(row).filter(([k]) => !k.startsWith("_")));

/** A square, centered, smaller copy of a photo (for people and portraits). */
export async function squarePhoto(file, size = 600) {
  const usable = await compressImage(file, 1600);
  const bmp = await createImageBitmap(usable, { imageOrientation: "from-image" });
  const side = Math.min(bmp.width, bmp.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  // Keep a bit more of the top, where faces usually are.
  canvas.getContext("2d").drawImage(bmp, (bmp.width - side) / 2, Math.max(0, (bmp.height - side) * 0.3), side, side, 0, 0, size, size);
  bmp.close();
  const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", 0.86));
  return new File([blob], "photo.jpg", { type: "image/jpeg" });
}
