// Site configuration.
//
// STORAGE
// -------
// Leave `supabase.url` empty to use "local mode": everything (text, photos,
// videos) is saved inside this browser only. Great for trying things out,
// but other people can't see it and clearing browser data erases it —
// use the Backup button often.
//
// With the Supabase project URL and publishable key filled in ("cloud mode"),
// memories are stored online and the site is private: only invited family can
// sign in and view, and only admins can edit. See README.md for the setup.
export default {
  supabase: {
    url: "https://yfhecewvbuakbofvhtac.supabase.co",
    // Project Settings → API Keys → "Publishable key" (sb_publishable_…) or the
    // legacy "anon public" key. Both are safe to publish. NEVER put the secret key here.
    anonKey: "sb_publishable_yqYBl0R9uGe79CwIk_aicg_RZaDg6Bz",
    bucket: "timeline-media",
  },

  // Photos are resized before upload to save space (longest side, in pixels).
  maxImageSize: 2000,
  // Largest video file accepted for upload, in MB. Supabase's free plan caps
  // uploads at 50 MB — for longer clips, upload to YouTube (unlisted) and
  // paste the link instead.
  maxVideoMB: 50,

  // Defaults shown until you edit them in Settings.
  defaults: {
    name: "Our Little Star",
    emoji: "🌷",
    birthday: "",
    tagline: "Every little moment, kept forever",
    newestFirst: false,
  },
};
