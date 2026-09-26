// "Cloud mode": events in a Supabase Postgres table, photos/videos in a private
// Supabase Storage bucket. Only invited family can view and only admins can edit —
// enforced by the row-level-security policies in supabase/setup.sql, not by this file.

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

export class SupabaseStore {
  mode = "cloud";
  needsAuth = true;
  #sb;
  #bucket;

  constructor({ url, anonKey, bucket }) {
    this.#sb = createClient(url, anonKey);
    this.#bucket = bucket || "timeline-media";
  }

  async init() {}

  async getUser() {
    const { data } = await this.#sb.auth.getSession();
    return data.session?.user || null;
  }

  async signIn(email, password) {
    const { error } = await this.#sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async signOut() {
    await this.#sb.auth.signOut();
  }

  /** What the signed-in user may do: { admin, family }. */
  async getAccess() {
    const [admin, family] = await Promise.all([this.#sb.rpc("is_admin"), this.#sb.rpc("is_family")]);
    return { admin: admin.data === true, family: family.data === true };
  }

  async getSettings() {
    const { data, error } = await this.#sb.from("settings").select("data").eq("id", 1).maybeSingle();
    if (error) throw error;
    return data?.data || null;
  }

  async saveSettings(settings) {
    const { error } = await this.#sb.from("settings").upsert({ id: 1, data: settings });
    if (error) throw error;
  }

  async listEvents() {
    const { data, error } = await this.#sb.from("events").select("*");
    if (error) throw error;
    for (const ev of data) {
      ev.media = ev.media || [];
      ev.updatedAt = ev.updated_at;
    }

    // The bucket is private: ask for temporary links (valid 12 hours) in one request.
    const paths = data.flatMap((ev) => ev.media.map((m) => m.path).filter(Boolean));
    if (paths.length) {
      const { data: signed, error: signError } = await this.#sb.storage.from(this.#bucket).createSignedUrls(paths, 60 * 60 * 12);
      if (signError) throw signError;
      const urls = new Map(signed.map((s) => [s.path, s.signedUrl]));
      for (const ev of data) for (const m of ev.media) if (m.path) m.src = urls.get(m.path) || "";
    }
    return data;
  }

  async saveEvent(event) {
    const id = event.id || crypto.randomUUID();
    let previous = null;
    if (event.id) {
      const { data } = await this.#sb.from("events").select("media").eq("id", id).maybeSingle();
      previous = data;
    }

    const media = [];
    for (const m of event.media) {
      if (m.file) {
        const ext = (m.file.name.match(/\.(\w+)$/)?.[1] || (m.type === "image" ? "jpg" : "mp4")).toLowerCase();
        const path = `${id}/${crypto.randomUUID()}.${ext}`;
        const { error } = await this.#sb.storage.from(this.#bucket).upload(path, m.file, {
          contentType: m.file.type || undefined,
          cacheControl: "31536000",
        });
        if (error) throw new Error(`Upload failed for ${m.file.name}: ${error.message}`);
        media.push({ type: m.type, path, name: m.file.name });
      } else if (m.path) {
        media.push({ type: m.type, path: m.path, name: m.name });
      } else {
        media.push({ type: "link", url: m.url });
      }
    }

    const { error } = await this.#sb.from("events").upsert({
      id,
      date: event.date,
      title: event.title,
      description: event.description,
      emoji: event.emoji,
      color: event.color,
      media,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;

    const kept = new Set(media.map((m) => m.path).filter(Boolean));
    const orphans = (previous?.media || []).map((m) => m.path).filter((p) => p && !kept.has(p));
    if (orphans.length) await this.#sb.storage.from(this.#bucket).remove(orphans);
    return id;
  }

  async deleteEvent(id) {
    const { data } = await this.#sb.from("events").select("media").eq("id", id).maybeSingle();
    const { error } = await this.#sb.from("events").delete().eq("id", id);
    if (error) throw error;
    const paths = (data?.media || []).map((m) => m.path).filter(Boolean);
    if (paths.length) await this.#sb.storage.from(this.#bucket).remove(paths);
  }
}
