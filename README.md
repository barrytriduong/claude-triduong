# 🌷 Little Timeline

A bright, cute website that keeps your daughter's most memorable moments on a timeline.
Scroll down and the memories pop in along a rainbow line down the middle. Each memory can have a date, an emoji, a story, photos, videos and YouTube/Vimeo links.

- **No build step.** Plain HTML/CSS/JS. Host it anywhere for free (GitHub Pages, Netlify, Cloudflare Pages).
- **Editing happens on the site itself.** Tap **Edit**, then **＋ Add a memory**, or tap **✏️ Edit** on any card.
- **Her age is added automatically** to every memory ("3 months old", "2nd birthday 🎂", "12 weeks before you arrived") once you set her birthday in ⚙️ Settings.
- Photos are resized before upload, so they load fast and use less storage.

## Try it locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

Out of the box it runs in **local mode**: everything is saved in *your browser only*. That's good for trying it out.
Use **💾 Backup** to download a backup file. Clearing browser data erases local memories.

## Storage: set up the cloud (recommended)

To keep memories safe and let family view the site from any device, connect **[Supabase](https://supabase.com)**. It's free and gives you:

| What | Where it lives | Free plan |
|---|---|---|
| Titles, dates, stories | Postgres table `events` | 500 MB |
| Photos & videos | Storage bucket `timeline-media` | 1 GB, max 50 MB per file |
| Your parent login | Supabase Auth | ✓ |

Setup takes about 5 minutes:

1. Create a free account and a new project at [supabase.com](https://supabase.com).
2. **Authentication → Users → Add user**: create *your* login (email + password, tick "Auto confirm").
3. **Authentication → Sign In / Providers**: turn **off** "Allow new users to sign up".
4. **SQL Editor → New query**: paste [`supabase/setup.sql`](supabase/setup.sql), replace `YOUR_EMAIL_HERE` at the bottom with the email from step 2, and click **Run**. The last result row should show your email: you are now the only admin.
5. **Project Settings → API Keys**: copy the *Project URL* and the *Publishable key* (or the legacy *anon public* key) into [`js/config.js`](js/config.js):
   ```js
   supabase: {
     url: "https://YOUR-PROJECT.supabase.co",
     anonKey: "eyJhbGciOi...",
   ```
   The anon key is meant to be public. The database only accepts changes from accounts in the `admins` table.

### Who can do what (cloud mode)

- **Viewers** see the timeline only. There is no Edit button for them.
- **You (admin):** click the faint **🔒** at the very bottom of the page and sign in. The Edit button appears.
- The permission is enforced by the database, not just by hiding buttons. Even someone who got a login couldn't change anything unless their account is in `admins`.

**Moving from local mode:** memories you added in local mode stay in that browser. Re-add them after switching, or ask me to add a "move backup to cloud" button.

### Videos

- Short clips (under 50 MB) can be uploaded directly.
- For longer videos, upload to **YouTube as "Unlisted"** (or Vimeo) and paste the link. It will be embedded in the card. This also saves your storage.

### Good to know

- **Privacy:** in cloud mode, anyone who has the site link can view it (only you can edit). If you want it to be fully private (family must log in to view), that can be added.
- **Supabase pauses free projects after 7 days without any visits.** Your data is kept and you can resume the project from the dashboard with one click. Regular visits prevent this.

## Put it online

**Netlify** (recommended, free, HTTPS included): connect the repo; there is no build command, and the publish directory is `/`.
Then **Domain management → Add a domain** and follow the DNS instructions for your registrar.

**GitHub Pages:** repo **Settings → Pages → Deploy from a branch →** pick your branch and `/ (root)`.
**Cloudflare Pages:** same as Netlify: no build command, output directory `/`.

## Files

```
index.html              page layout & dialogs
css/styles.css          the bright & cute theme
js/config.js            ← your settings (Supabase keys, upload limits)
js/app.js               timeline rendering, editor, lightbox
js/store-local.js       local-mode storage (IndexedDB in the browser)
js/store-supabase.js    cloud-mode storage (Supabase DB + Storage)
js/media.js             photo resizing, YouTube/Vimeo link parsing
supabase/setup.sql      one-time database setup
```
