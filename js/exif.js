// Reads the "date taken" from a photo or video, so bulk uploads land on the right day.
// JPEG and HEIC photos: EXIF DateTimeOriginal. MP4/MOV videos: the recording time in
// the "mvhd" header. Anything else falls back to the file's modified date.

import { isoOf } from "./util.js";
import { mediaKind } from "./media.js";

const CHUNK = 512 * 1024;

export async function photoDate(file) {
  return (await photoDateInfo(file)).date;
}

/**
 * { date, sure }. "sure" means the date came from inside the photo/video or from a
 * dated file name; otherwise it's only the file's modified date (which is often the
 * day it was downloaded or sent through Zalo/Messenger, not the day it was taken).
 */
export async function photoDateInfo(file) {
  try {
    const head = await file.slice(0, CHUNK).arrayBuffer();
    let taken = null;
    if (mediaKind(file) === "image") taken = readExifDate(head) || findExif(head);
    else if (mediaKind(file) === "video") {
      // The header can sit at the start or the end of the file.
      taken = readMvhd(head) || (file.size > CHUNK && readMvhd(await file.slice(-CHUNK).arrayBuffer()));
    }
    if (taken) return { date: taken, sure: true };
  } catch { /* fall through */ }
  const fromName = dateFromName(file.name);
  if (fromName) return { date: fromName, sure: true };
  return { date: isoOf(new Date(file.lastModified || Date.now())), sure: false };
}

/**
 * Dates in file names: IMG_20240315_101500.jpg, PXL_20240315…, VID-20240315-WA0001.mp4,
 * Screenshot_2024-03-15…, "Photo 2024-03-15 10.15.00.jpg", 2024_03_15.jpg …
 */
export function dateFromName(name) {
  const m = name.match(/(?:^|[^0-9])(20\d{2}|19\d{2})[-_.]?(0[1-9]|1[0-2])[-_.]?(0[1-9]|[12]\d|3[01])(?![0-9]{3,})/);
  if (!m) return null;
  const iso = `${m[1]}-${m[2]}-${m[3]}`;
  const d = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.getTime() <= Date.now() + 86400000 ? iso : null;
}

/** HEIC and friends: find the "Exif\0\0" marker anywhere in the header and read the TIFF after it. */
function findExif(buffer) {
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length - 10; i++) {
    if (bytes[i] === 0x45 && bytes[i + 1] === 0x78 && bytes[i + 2] === 0x69 && bytes[i + 3] === 0x66 && bytes[i + 4] === 0 && bytes[i + 5] === 0) {
      const d = readTiff(new DataView(buffer), i + 6);
      if (d) return d;
    }
  }
  return null;
}

/** QuickTime/MP4 creation time: seconds since 1904-01-01 in the movie header. */
function readMvhd(buffer) {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  for (let i = 4; i < bytes.length - 20; i++) {
    if (bytes[i] === 0x6d && bytes[i + 1] === 0x76 && bytes[i + 2] === 0x68 && bytes[i + 3] === 0x64) { // "mvhd"
      const version = bytes[i + 4];
      const secs = version === 1 ? Number(view.getBigUint64(i + 8)) : view.getUint32(i + 8);
      const ms = (secs - 2082844800) * 1000; // 1904 → 1970
      if (secs > 2082844800 && ms < Date.now() + 86400000) return isoOf(new Date(ms));
      return null;
    }
  }
  return null;
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
  if (start + 8 > view.byteLength) return null;
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
