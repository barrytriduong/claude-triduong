// Reads the "date taken" from a photo, so bulk uploads land on the right day.
// Supports JPEG EXIF (most phone and camera photos). Falls back to the file's
// modified date for anything else (HEIC, PNG, videos).

import { isoOf } from "./util.js";

export async function photoDate(file) {
  try {
    if (file.type === "image/jpeg" || /\.jpe?g$/i.test(file.name)) {
      const taken = readExifDate(await file.slice(0, 256 * 1024).arrayBuffer());
      if (taken) return taken;
    }
  } catch { /* fall through */ }
  return isoOf(new Date(file.lastModified || Date.now()));
}

/** Returns "YYYY-MM-DD" from DateTimeOriginal (or DateTime), or null. */
export function readExifDate(buffer) {
  const view = new DataView(buffer);
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return null; // not a JPEG
  let offset = 2;
  while (offset + 4 < view.byteLength) {
    const marker = view.getUint16(offset);
    const size = view.getUint16(offset + 2);
    if (marker === 0xffe1 && view.getUint32(offset + 4) === 0x45786966) { // "Exif"
      return readTiff(view, offset + 10);
    }
    if ((marker & 0xff00) !== 0xff00 || marker === 0xffda) break; // start of image data
    offset += 2 + size;
  }
  return null;
}

function readTiff(view, start) {
  const little = view.getUint16(start) === 0x4949;
  const u16 = (o) => view.getUint16(start + o, little);
  const u32 = (o) => view.getUint32(start + o, little);
  if (u16(2) !== 42) return null;

  const readIfd = (ifdOffset) => {
    const tags = {};
    const count = u16(ifdOffset);
    for (let i = 0; i < count; i++) {
      const entry = ifdOffset + 2 + i * 12;
      if (start + entry + 12 > view.byteLength) break;
      tags[u16(entry)] = { type: u16(entry + 2), count: u32(entry + 4), value: u32(entry + 8), entry };
    }
    return tags;
  };
  const ascii = (tag) => {
    if (!tag || tag.type !== 2 || tag.count < 10) return null;
    const at = tag.count > 4 ? tag.value : tag.entry + 8;
    let str = "";
    for (let i = 0; i < 10 && start + at + i < view.byteLength; i++) str += String.fromCharCode(view.getUint8(start + at + i));
    const m = str.match(/^(\d{4}):(\d{2}):(\d{2})/);
    return m && m[1] !== "0000" ? `${m[1]}-${m[2]}-${m[3]}` : null;
  };

  const ifd0 = readIfd(u32(4));
  if (ifd0[0x8769]) {
    const exif = readIfd(ifd0[0x8769].value);
    const d = ascii(exif[0x9003]) || ascii(exif[0x9004]);
    if (d) return d;
  }
  return ascii(ifd0[0x0132]);
}
