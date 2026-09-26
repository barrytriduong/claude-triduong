// "Local mode": everything lives in this browser's IndexedDB.
// Media files are stored as Blobs, separate from the event records.

const DB_NAME = "little-timeline";
const DB_VERSION = 1;

function promisify(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

export class LocalStore {
  mode = "local";
  needsAuth = false;
  #db;
  #urls = new Map(); // mediaId -> object URL

  async init() {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      db.createObjectStore("events", { keyPath: "id" });
      db.createObjectStore("media");
      db.createObjectStore("settings");
    };
    this.#db = await promisify(req);
    // Ask the browser not to evict our data under storage pressure.
    navigator.storage?.persist?.().catch(() => {});
  }

  #tx(stores, mode = "readonly") {
    return this.#db.transaction(stores, mode);
  }

  async getUser() { return { email: "local" }; }

  async getSettings() {
    return (await promisify(this.#tx("settings").objectStore("settings").get("site"))) || null;
  }

  async saveSettings(settings) {
    await promisify(this.#tx("settings", "readwrite").objectStore("settings").put(settings, "site"));
  }

  async #mediaUrl(id) {
    if (this.#urls.has(id)) return this.#urls.get(id);
    const blob = await promisify(this.#tx("media").objectStore("media").get(id));
    if (!blob) return "";
    const url = URL.createObjectURL(blob);
    this.#urls.set(id, url);
    return url;
  }

  async listEvents() {
    const events = await promisify(this.#tx("events").objectStore("events").getAll());
    for (const ev of events) {
      for (const m of ev.media || []) {
        if (m.mediaId) m.src = await this.#mediaUrl(m.mediaId);
      }
    }
    return events;
  }

  /** `event.media` items are either stored refs ({type, mediaId}), links ({type:'link', url}) or new uploads ({type, file}). */
  async saveEvent(event) {
    const id = event.id || crypto.randomUUID();
    const previous = event.id ? await promisify(this.#tx("events").objectStore("events").get(id)) : null;

    const media = [];
    for (const m of event.media) {
      if (m.file) {
        const mediaId = crypto.randomUUID();
        await promisify(this.#tx("media", "readwrite").objectStore("media").put(m.file, mediaId));
        media.push({ type: m.type, mediaId, name: m.file.name });
      } else if (m.mediaId) {
        media.push({ type: m.type, mediaId: m.mediaId, name: m.name });
      } else {
        media.push({ type: "link", url: m.url });
      }
    }

    const record = {
      id,
      date: event.date,
      title: event.title,
      description: event.description,
      emoji: event.emoji,
      color: event.color,
      media,
      updatedAt: new Date().toISOString(),
    };
    await promisify(this.#tx("events", "readwrite").objectStore("events").put(record));

    const kept = new Set(media.map((m) => m.mediaId).filter(Boolean));
    await this.#deleteMedia((previous?.media || []).filter((m) => m.mediaId && !kept.has(m.mediaId)));
    return id;
  }

  async deleteEvent(id) {
    const store = this.#tx("events", "readwrite").objectStore("events");
    const previous = await promisify(store.get(id));
    await promisify(this.#tx("events", "readwrite").objectStore("events").delete(id));
    await this.#deleteMedia(previous?.media || []);
  }

  async #deleteMedia(items) {
    for (const m of items) {
      if (!m.mediaId) continue;
      await promisify(this.#tx("media", "readwrite").objectStore("media").delete(m.mediaId));
      const url = this.#urls.get(m.mediaId);
      if (url) URL.revokeObjectURL(url);
      this.#urls.delete(m.mediaId);
    }
  }

  // ---------- Backup ----------

  async exportAll() {
    const events = await promisify(this.#tx("events").objectStore("events").getAll());
    const media = {};
    for (const ev of events) {
      for (const m of ev.media || []) {
        if (!m.mediaId) continue;
        const blob = await promisify(this.#tx("media").objectStore("media").get(m.mediaId));
        if (blob) media[m.mediaId] = await blobToDataURL(blob);
      }
    }
    return { app: "little-timeline", version: 1, exportedAt: new Date().toISOString(), settings: await this.getSettings(), events, media };
  }

  async importAll(data) {
    if (data?.app !== "little-timeline") throw new Error("This doesn't look like a timeline backup file.");
    for (const [id, dataUrl] of Object.entries(data.media || {})) {
      const blob = await (await fetch(dataUrl)).blob();
      await promisify(this.#tx("media", "readwrite").objectStore("media").put(blob, id));
    }
    for (const ev of data.events || []) {
      await promisify(this.#tx("events", "readwrite").objectStore("events").put(ev));
    }
    if (data.settings) await this.saveSettings(data.settings);
  }
}
