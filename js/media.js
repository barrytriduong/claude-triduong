// Helpers for photos, videos and video links.

/** Downscale a photo so uploads stay small. Returns the original file for GIFs or on failure. */
export async function compressImage(file, maxSize) {
  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.type === "image/svg+xml") return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 1.5 * 1024 * 1024) { bitmap.close(); return file; }
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.86));
    if (!blob || blob.size >= file.size) return file;
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

  if (/\.(mp4|webm|mov|m4v|ogg)$/i.test(url.pathname)) return { type: "video", url: url.href, src: url.href };

  return { type: "link", url: url.href };
}

/** Re-derive embed info for a stored link item. */
export function hydrateLink(item) {
  const parsed = parseVideoLink(item.url) || { type: "link", url: item.url };
  return { ...item, ...parsed };
}
