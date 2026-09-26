// "Cloud mode": events in a Supabase Postgres table, photos/videos in a private
// Supabase Storage bucket. Only invited family can view and only admins can edit —
// enforced by the row-level-security policies in supabase/setup.sql, not by this file.

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// Bump together with public.schema_version() in supabase/setup.sql.
const SCHEMA_VERSION = 2;

/** Throw Supabase errors instead of returning them. */
function check({ data, error }) {
  if (error) throw error;
  return data;
}

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

  /** What the signed-in user may do: { admin, family, setupNeeded }. */
  async getAccess() {
    const [admin, family, version] = await Promise.all([
      this.#sb.rpc("is_admin"), this.#sb.rpc("is_family"), this.#sb.rpc("schema_version"),
    ]);
    // Missing access functions: the private-site setup was never run, so nobody gets in.
    const setupNeeded = !!(admin.error || family.error);
    // Older schema: the timeline still works, the newer features wait for the latest supabase/setup.sql.
    const outdated = !setupNeeded && !!(version.error || version.data < SCHEMA_VERSION);
    return { admin: admin.data === true && !setupNeeded, family: family.data === true && !setupNeeded, setupNeeded, outdated };
  }

  async getMyName() {
    return (await this.getUser())?.user_metadata?.name || "";
  }

  async setMyName(name) {
    check(await this.#sb.auth.updateUser({ data: { name } }));
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
      ev.tags = ev.tags || [];
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
      tags: event.tags || [],
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

  // ---------- Growth ----------

  async listMeasurements() {
    return check(await this.#sb.from("measurements").select("id, date, height_cm, weight_kg, note"));
  }

  async saveMeasurement(m) {
    const row = { date: m.date, height_cm: m.height_cm, weight_kg: m.weight_kg, note: m.note || "" };
    if (m.id) row.id = m.id;
    check(await this.#sb.from("measurements").upsert(row));
  }

  async deleteMeasurement(id) {
    check(await this.#sb.from("measurements").delete().eq("id", id));
  }

  // ---------- Letters ----------

  /** Readable letters, plus envelopes (no body) for letters still sealed. */
  async listLetters() {
    const [open, sealed] = await Promise.all([
      this.#sb.from("letters").select("id, user_id, author_name, title, body, written_on, unlock_on"),
      this.#sb.rpc("sealed_letters"),
    ]);
    const letters = check(open);
    const known = new Set(letters.map((l) => l.id));
    for (const env of check(sealed) || []) if (!known.has(env.id)) letters.push({ ...env, body: null });
    return letters;
  }

  async saveLetter(l) {
    const row = { title: l.title, body: l.body, author_name: l.author_name, unlock_on: l.unlock_on || null };
    if (l.id) check(await this.#sb.from("letters").update(row).eq("id", l.id));
    else check(await this.#sb.from("letters").insert({ ...row, written_on: l.written_on }));
  }

  async deleteLetter(id) {
    check(await this.#sb.from("letters").delete().eq("id", id));
  }

  // ---------- Hearts & comments ----------

  async listComments() {
    return check(await this.#sb.from("comments").select("id, event_id, user_id, author_name, body, created_at"));
  }

  async addComment({ event_id, body, author_name }) {
    check(await this.#sb.from("comments").insert({ event_id, body, author_name }));
  }

  async deleteComment(id) {
    check(await this.#sb.from("comments").delete().eq("id", id));
  }

  async listReactions() {
    return check(await this.#sb.from("reactions").select("event_id, user_id, author_name"));
  }

  async addReaction(event_id, author_name) {
    const { error } = await this.#sb.from("reactions").insert({ event_id, author_name });
    if (error && error.code !== "23505") throw error; // 23505 = already hearted
  }

  async removeReaction(event_id) {
    const user = await this.getUser();
    check(await this.#sb.from("reactions").delete().eq("event_id", event_id).eq("user_id", user.id));
  }

  /** Admin only: the email address of every family member (for "email the family"). */
  async familyEmails() {
    return (check(await this.#sb.rpc("family_emails")) || []).map((r) => r.email);
  }
}
