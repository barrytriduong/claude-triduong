// Site configuration.
//
// STORAGE
// -------
// Leave `supabase.url` empty to use "local mode": everything (text, photos,
// videos) is saved inside this browser only. Great for trying things out,
// but other people can't see it and clearing browser data erases it —
// use the Backup button often.
//
// Fill in your Supabase project URL and anon key to use "cloud mode":
// memories are stored online, anyone with the link can view the timeline,
// and only signed-in parents can edit. See README.md for the 5-minute setup.
export default {
  supabase: {
    url: "https://yfhecewvbuakbofvhtac.supabase.co",
    // Project Settings → API Keys → "Publishable key" (sb_publishable_…) or the
    // legacy "anon public" key. Both are safe to publish. NEVER put the secret key here.
    anonKey: "",
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
