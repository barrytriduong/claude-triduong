// "Local mode": everything lives in this browser's IndexedDB.
// Media files are stored as Blobs, separate from the event records.

const DB_NAME = "little-timeline";
const DB_VERSION = 2;
const COLLECTIONS = ["measurements", "letters", "comments", "reactions"];
const LOCAL_USER = { id: "local", email: "local" };

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
      for (const name of ["events", ...COLLECTIONS]) {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: "id" });
      }
      for (const name of ["media", "settings"]) {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name);
      }
    };
    this.#db = await promisify(req);
    // Ask the browser not to evict our data under storage pressure.
    navigator.storage?.persist?.().catch(() => {});
  }

  #store(name, mode = "readonly") {
    return this.#db.transaction(name, mode).objectStore(name);
  }
  #all(name) { return promisify(this.#store(name).getAll()); }
  #get(name, key) { return promisify(this.#store(name).get(key)); }
  #put(name, value, key) { return promisify(this.#store(name, "readwrite").put(value, key)); }
  #del(name, key) { return promisify(this.#store(name, "readwrite").delete(key)); }

  async getUser() { return LOCAL_USER; }
  async getAccess() { return { admin: true, family: true }; }

  async getMyName() { return (await this.#get("settings", "myName")) || ""; }
  async setMyName(name) { await this.#put("settings", name, "myName"); }

  async getSettings() { return (await this.#get("settings", "site")) || null; }
  async saveSettings(settings) { await this.#put("settings", settings, "site"); }

  async #mediaUrl(id) {
    if (this.#urls.has(id)) return this.#urls.get(id);
    const blob = await this.#get("media", id);
    if (!blob) return "";
    const url = URL.createObjectURL(blob);
    this.#urls.set(id, url);
    return url;
  }

  // ---------- Memories ----------

  async listEvents() {
    const events = await this.#all("events");
    for (const ev of events) {
      ev.tags = ev.tags || [];
      for (const m of ev.media || []) {
        if (m.mediaId) m.src = await this.#mediaUrl(m.mediaId);
      }
    }
    return events;
  }

  /** `event.media` items are either stored refs ({type, mediaId}), links ({type:'link', url}) or new uploads ({type, file}). */
  async saveEvent(event) {
    const id = event.id || crypto.randomUUID();
    const previous = event.id ? await this.#get("events", id) : null;

    const media = [];
    for (const m of event.media) {
      if (m.file) {
        const mediaId = crypto.randomUUID();
        await this.#put("media", m.file, mediaId);
        media.push({ type: m.type, mediaId, name: m.file.name });
      } else if (m.mediaId) {
        media.push({ type: m.type, mediaId: m.mediaId, name: m.name });
      } else {
        media.push({ type: "link", url: m.url });
      }
    }

    await this.#put("events", {
      id,
      date: event.date,
      title: event.title,
      description: event.description,
      emoji: event.emoji,
      color: event.color,
      tags: event.tags || [],
      status: event.status || "published",
      submitted_name: previous?.submitted_name || "",
      media,
      updatedAt: new Date().toISOString(),
    });

    const kept = new Set(media.map((m) => m.mediaId).filter(Boolean));
    await this.#deleteMedia((previous?.media || []).filter((m) => m.mediaId && !kept.has(m.mediaId)));
    return id;
  }

  async submitEvent(event, submittedName) {
    const id = await this.saveEvent({ ...event, status: "pending" });
    const rec = await this.#get("events", id);
    await this.#put("events", { ...rec, submitted_name: submittedName || "", submitted_by: LOCAL_USER.id });
    return id;
  }

  async updateEvent(id, fields) {
    const rec = await this.#get("events", id);
    if (rec) await this.#put("events", { ...rec, ...fields, updatedAt: new Date().toISOString() });
  }

  // Other files (profile photo, songs) live in the media store under their path.
  async uploadFile(folder, file) {
    const path = `${folder}/${crypto.randomUUID()}`;
    await this.#put("media", file, path);
    return path;
  }
  async fileUrl(path) { return this.#mediaUrl(path); }
  async deleteFile(path) { await this.#deleteMedia([{ mediaId: path }]); }

  async setEventStatus(id, status) {
    const rec = await this.#get("events", id);
    if (rec) await this.#put("events", { ...rec, status });
  }

  async deleteEvent(id) {
    const previous = await this.#get("events", id);
    await this.#del("events", id);
    await this.#deleteMedia(previous?.media || []);
    for (const c of await this.#all("comments")) if (c.event_id === id) await this.#del("comments", c.id);
    for (const r of await this.#all("reactions")) if (r.event_id === id) await this.#del("reactions", r.id);
  }

  async #deleteMedia(items) {
    for (const m of items) {
      if (!m.mediaId) continue;
      await this.#del("media", m.mediaId);
      const url = this.#urls.get(m.mediaId);
      if (url) URL.revokeObjectURL(url);
      this.#urls.delete(m.mediaId);
    }
  }

  // ---------- Growth ----------

  listMeasurements() { return this.#all("measurements"); }
  async saveMeasurement(m) { await this.#put("measurements", { ...m, id: m.id || crypto.randomUUID() }); }
  deleteMeasurement(id) { return this.#del("measurements", id); }

  // ---------- Letters ----------

  listLetters() { return this.#all("letters"); }
  async saveLetter(l) {
    const existing = l.id ? await this.#get("letters", l.id) : null;
    await this.#put("letters", {
      ...existing,
      ...l,
      id: l.id || crypto.randomUUID(),
      user_id: LOCAL_USER.id,
      written_on: existing?.written_on || l.written_on,
    });
  }
  deleteLetter(id) { return this.#del("letters", id); }

  // ---------- Hearts & comments ----------

  listComments() { return this.#all("comments"); }
  async addComment({ event_id, body, author_name }) {
    await this.#put("comments", { id: crypto.randomUUID(), event_id, body, author_name, user_id: LOCAL_USER.id, created_at: new Date().toISOString() });
  }
  deleteComment(id) { return this.#del("comments", id); }

  listReactions() { return this.#all("reactions"); }
  async addReaction(event_id, author_name) {
    await this.#put("reactions", { id: `${event_id}:${LOCAL_USER.id}`, event_id, user_id: LOCAL_USER.id, author_name });
  }
  removeReaction(event_id) { return this.#del("reactions", `${event_id}:${LOCAL_USER.id}`); }

  async familyEmails() { return []; }

  // ---------- Backup ----------

  async exportAll() {
    const events = await this.#all("events");
    const media = {};
    for (const ev of events) {
      for (const m of ev.media || []) {
        if (!m.mediaId) continue;
        const blob = await this.#get("media", m.mediaId);
        if (blob) media[m.mediaId] = await blobToDataURL(blob);
      }
    }
    const data = { app: "little-timeline", version: 2, exportedAt: new Date().toISOString(), settings: await this.getSettings(), events, media };
    for (const name of COLLECTIONS) data[name] = await this.#all(name);
    return data;
  }

  async importAll(data) {
    if (data?.app !== "little-timeline") throw new Error("This doesn't look like a timeline backup file.");
    for (const [id, dataUrl] of Object.entries(data.media || {})) {
      await this.#put("media", await (await fetch(dataUrl)).blob(), id);
    }
    for (const ev of data.events || []) await this.#put("events", ev);
    for (const name of COLLECTIONS) for (const row of data[name] || []) await this.#put(name, row);
    if (data.settings) await this.saveSettings(data.settings);
  }
}
