# 🌷 Little Timeline

A bright, cute website that keeps your daughter's most memorable moments on a timeline.
Scroll down and the memories pop in along a rainbow line down the middle. Each memory can have a date, an emoji, a story, photos, videos and YouTube/Vimeo links.

- **No build step.** Plain HTML/CSS/JS. Host it anywhere for free (GitHub Pages, Netlify, Cloudflare Pages).
- **Editing happens on the site itself.** Tap **Edit**, then **＋ Add a memory**, or tap **✏️ Edit** on any card.
- **Her age is added automatically** to every memory ("3 months old", "2nd birthday 🎂", "12 weeks before you arrived") once you set her birthday in ⚙️ Settings.
- Photos are resized before upload, so they load fast and use less storage.

### Features

| | |
|---|---|
| 🏷️ **Tags & filters** | Tag memories (Firsts, Birthdays, Trips… or your own) and filter the timeline by tag. |
| 🗓️ **On this day** | A banner shows what happened on today's date in earlier years. |
| 🧭 **Jump bar** | A sticky bar to jump to any year, with her age that year. |
| ❤️ **Hearts & comments** | Family can heart and comment on memories. People can delete their own comments; you can delete any. |
| 📏 **Growth** | Height & weight over time: latest values, a chart for each, and a full table. Only you can add measurements. |
| 💌 **Letters to her** | Anyone in the family can write her a letter, optionally **sealed until a date**. Before then, others only see the envelope. |
| 🖼️ **Many photos** | Pick a batch of photos; they're grouped by the day they were taken (read from the photo), one memory per day or per photo. |
| 📧 **Email the family** | After you add memories, one tap opens your email app with a message to every family member. |
| 💾 **Backup** | Downloads a .zip of everything: memories, photos, videos, letters, comments and measurements. |
| 🌐 **Tiếng Việt / English** | Switch language with the 🌐 button; everyone's choice is remembered on their device. |

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
2. **Authentication → Sign In / Providers**: turn **off** "Allow new users to sign up".
3. **Authentication → Users → Add user → Create new user**: create *your* login and one for each family member (email + password, tick "Auto confirm").
4. **SQL Editor → New query**: paste [`supabase/setup.sql`](supabase/setup.sql), replace `YOUR_EMAIL_HERE` and `FAMILY_EMAIL_HERE` at the bottom, and click **Run**. The result lists everyone with access and their role.
5. **Project Settings → API Keys**: copy the *Project URL* and the *Publishable key* (or the legacy *anon public* key) into [`js/config.js`](js/config.js). The publishable key is meant to be public; the database rules decide what it can see.

### Who can do what

The site is **private**:

| Who | Sees |
|---|---|
| Not signed in | Only a "private family page, please sign in" screen. No stories, no photos. |
| Family (in the `family` table) | The whole timeline, read-only. |
| You (in the `admins` table) | Everything, plus the **Edit** button. |

- This is enforced by the database and storage rules, not just by hiding things on the page.
- Photos and videos are in a **private** bucket. Signed-in family get temporary links that expire after 12 hours, so a copied link stops working.
- Search engines are told not to index the site.

### Updating the database after a site update

When a new version needs database changes, the admin sees a reminder on the site. Paste the latest [`supabase/setup.sql`](supabase/setup.sql) into **SQL Editor** and click **Run**. Running it again is safe and never deletes memories.

### Adding or removing family

- **Add:** create their login in **Authentication → Users → Add user**. Then run this in the SQL Editor:
  ```sql
  insert into public.family (user_id) select id from auth.users where email = 'their@email.com';
  ```
- **Remove:** delete the user in **Authentication → Users**. Their access ends immediately.
- **Change a password:** open the user in **Authentication → Users** and use the menu there.

**Moving from local mode:** memories you added in local mode stay in that browser. Re-add them after switching, or ask me to add a "move backup to cloud" button.

### Videos

- Short clips (under 50 MB) can be uploaded directly.
- For longer videos, upload to **YouTube as "Unlisted"** (or Vimeo) and paste the link. It will be embedded in the card. This also saves your storage.

### Good to know

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
js/app.js               timeline, filters, jump bar, editor, settings, lightbox
js/social.js            hearts, comments, "what should we call you?"
js/growth.js            growth tab: tiles, charts, measurements table
js/letters.js           letters tab (with sealed letters)
js/bulk.js              "Many photos" bulk upload
js/exif.js              reads the date a photo was taken
js/backup.js            .zip / .json backup
js/i18n.js              English & Vietnamese text, age wording
js/store-local.js       local-mode storage (IndexedDB in the browser)
js/store-supabase.js    cloud-mode storage (Supabase DB + Storage)
js/media.js             photo resizing, YouTube/Vimeo link parsing
supabase/setup.sql      one-time database setup
```
