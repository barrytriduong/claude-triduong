// Helpers for photos, videos and video links.

import { loadScript } from "./util.js";

const HEIC2ANY = "https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js";

export const isHeic = (file) => /image\/hei[cf]/.test(file.type) || /\.hei[cf]$/i.test(file.name);

/** What kind of media a picked file is, using the extension when the browser gives no type. */
export function mediaKind(file) {
  if (file.type.startsWith("video/") || /\.(mp4|mov|m4v|webm|3gp)$/i.test(file.name)) return "video";
  if (file.type.startsWith("image/") || /\.(jpe?g|png|gif|webp|hei[cf]|avif)$/i.test(file.name)) return "image";
  return null;
}

/** iPhone photos (HEIC) only display in Safari, so convert them to JPEG when this browser can't read them. */
async function decodable(file) {
  if (!isHeic(file)) return file;
  try {
    (await createImageBitmap(file)).close();
    return file; // this browser reads HEIC itself (Safari); the canvas step below makes a JPEG
  } catch {
    await loadScript(HEIC2ANY);
    const blob = await window.heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
    return new File([Array.isArray(blob) ? blob[0] : blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  }
}

/** Downscale a photo so uploads stay small. Returns the original file for GIFs or on failure. */
export async function compressImage(original, maxSize) {
  if (mediaKind(original) !== "image" || original.type === "image/gif" || original.type === "image/svg+xml") return original;
  let file = original;
  try {
    file = await decodable(original);
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 1.5 * 1024 * 1024 && !isHeic(file)) { bitmap.close(); return file; }
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.86));
    if (!blob || (blob.size >= file.size && !isHeic(file))) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

/** Turn a pasted link into something we can show: a YouTube/Vimeo embed, a direct video, or a plain link. */
export function parseVideoLink(raw) {
  let url;
  try { url = new URL(raw.trim()); } catch { return null; }
  if (!/^https?:$/.test(url.protocol)) return null;
  const host = url.hostname.replace(/^www\.|^m\./, "");

  let yt = null;
  if (host === "youtu.be") yt = url.pathname.slice(1);
  else if (host.endsWith("youtube.com")) {
    yt = url.searchParams.get("v") || url.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]+)/)?.[1];
  }
  if (yt) return { type: "embed", url: url.href, embed: `https://www.youtube-nocookie.com/embed/${yt}` };

  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const id = url.pathname.match(/(\d+)/)?.[1];
    if (id) return { type: "embed", url: url.href, embed: `https://player.vimeo.com/video/${id}` };
  }

  // Google Drive: the file must be shared as "Anyone with the link".
  if (host === "drive.google.com") {
    const id = url.pathname.match(/\/file\/d\/([\w-]+)/)?.[1] || url.searchParams.get("id");
    if (id) return { type: "embed", url: url.href, embed: `https://drive.google.com/file/d/${id}/preview` };
  }

  if (/\.(mp4|webm|mov|m4v|ogg)$/i.test(url.pathname)) return { type: "video", url: url.href, src: url.href };

  return { type: "link", url: url.href };
}

/** Re-derive embed info for a stored link item. */
export function hydrateLink(item) {
  const parsed = parseVideoLink(item.url) || { type: "link", url: item.url };
  return { ...item, ...parsed };
}
