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
| 🔍 **Search** | Find any memory by a word in its title or story, a tag, a person or a place (accents optional: "da lat" finds "Đà Lạt"). |
| 🌱 **Growing tab** | 📸 *Watch her grow* (one photo a month or a year, played as a flipbook) · ✅ *Milestones* (first smile, first steps… or your own) · 📏 *Height & weight* charts · 🧸 *All about me* (a yearly card: favourite food, toy, friend…) · 🩺 *Health* (vaccines, check-ups, allergies; **parents only**). |
| 💌 **Words tab** | 💬 *Things she said*, optionally in her own recorded voice · 💌 *Letters to her*, optionally **sealed until a date** · 🎂 *Birthday wishes* from the family, collected for each birthday. |
| 🌍 **Her world tab** | 👨‍👩‍👧 *People* who love her (tap someone to see every memory with them) · 🗺️ *Places* on a map. |
| 🎙️ **Voice memories** | Record sound right on the site (or upload an audio file) for a memory or a saying. |
| 👥 **Who & where** | Tag the people in a memory and where it happened (place search by OpenStreetMap). |
| 🎂 **Birthday mode** | On her birthday: balloons, fireworks and a "write a birthday wish" button for everyone. |
| 📖 **Year book** | Turn a year into printable pages: cover, month by month, milestones, sayings, growth. Print or "Save as PDF" for a photo book. |
| 🔔 **Gentle reminders** | A small note for parents on her "month-day" if nothing was added lately, a backup reminder, and a monthly calendar reminder to download. |
| 🖼️ **Many photos** | Pick a batch of photos; they're grouped by the day they were taken (read from the photo), one memory per day or per photo. |
| 📧 **Email the family** | After you add memories, one tap opens your email app with a message to every family member. |
| 💾 **Backup** | Downloads a .zip of everything: memories, photos, videos, voices, letters, sayings, people, milestones, wishes, comments and measurements. |
| 🌐 **Tiếng Việt / English** | Switch language with the 🌐 button; everyone's choice is remembered on their device. |
| 😊 **Emoji picker** | A 😊 button next to titles, stories, letters and comments; the memory's bubble emoji is a dropdown. |
| ▶️ **Slideshow** | Pick a date range and a speed; the timeline scrolls by itself (tap to pause). Great on a TV. |
| 📁 **Folder upload & drafts** | On a computer, pick a whole folder (e.g. 100 photos and videos). They're sorted by the date taken and saved as drafts that only you see; add stories, then Publish. |
| 📬 **Family sharing** | Family members can share a memory with photos; it waits for your approval (📬 button) before it appears. |
| 🖼️ **Her photo** | Her photo at the top in a round frame, with a cute decoration (bow, crown, flowers, stars, hearts, bunny). |
| 🎵 **Music** | Soft, emotional piano pieces composed live in the browser (nothing to download), or upload your own songs. Optional during the slideshow. |
| 🎆 **Celebration tag** | Memories with this tag glow gold and burst into pastel fireworks when scrolled into view. |
| 📅 **Quick date fixes** | Change a memory's date right on its card; dates are read from photos, videos and file names. |
| 🏷️ **Delete tags** | Remove a tag made by mistake from every memory at once. |
| ✨ **Cute pointer** | A pink pointer and magic wand with a sparkle trail on computers (can be turned off). |
| 👨‍👩‍👧 **Family panel** | Invite people with a link, change who can edit or view, set a new password, or remove someone — all from the site. |

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
| Viewers with the site PIN | Everything family sees, but they can't heart, comment, write or share. Turn the PIN on, change it or turn it off in **🧰 Tools → Family**. |
| Family (in the `family` table) | The whole timeline; can heart, comment, write letters and wishes, and share photos for approval. |
| You (in the `admins` table) | Everything, plus the **Edit** button. |

- This is enforced by the database and storage rules, not just by hiding things on the page.
- Photos and videos are in a **private** bucket. Signed-in family get temporary links that expire after 12 hours, so a copied link stops working.
- Search engines are told not to index the site.
- **About the PIN:** a 4-digit PIN is a light lock, made for convenience. The database allows only 5 wrong tries per 15 minutes for the whole site, and the Family panel warns you about repeated wrong tries. The PIN is stored hashed, never in the site's code. Changing it signs out everyone who used the old one. Setting it needs "Allow new users to sign up" ON and "Confirm email" OFF, the same as invite links.

### Updating the database after a site update

When a new version needs database changes, the admin sees a reminder on the site. Paste the latest [`supabase/setup.sql`](supabase/setup.sql) into **SQL Editor** and click **Run**. Running it again is safe and never deletes memories.

### Adding or removing family

Use **Edit → 👨‍👩‍👧 Family** on the site:

- **Create a login yourself:** name, email and password; the account works right away (needs the same two Supabase settings as invites).
- **Invite:** type their name, choose *Family (can view)* or *Admin (can edit)*, and send them the link (Zalo, Messenger, email…). They open it and choose their own email and password. Links work once and expire after 14 days.
- **Change access, set a new password, or remove someone** from the same panel.

One-time Supabase setting for invite links, in **Authentication → Sign In / Providers**: turn **"Allow new users to sign up" ON** and **"Confirm email" OFF**. Anyone can technically create an account then, but it has no access unless it came from your invite link.

You can still add people by hand: create them in **Authentication → Users → Add user**, then give them access in the Family panel (they appear with "No access").

**Moving from local mode:** memories you added in local mode stay in that browser. Re-add them after switching, or ask me to add a "move backup to cloud" button.

### Videos

- Short clips (under 50 MB) can be uploaded directly.
- For longer videos, upload to **YouTube as "Unlisted"** (or Vimeo) and paste the link. It will be embedded in the card. This also saves your storage.

### Good to know

- **Costs.** Netlify only serves the site's code (a few hundred KB per visit). Photos and videos come straight from Supabase, so viewers use Supabase bandwidth, not Netlify's. The free plans include about 1 GB of photo/video storage and 10 GB of downloads per month on Supabase, and 300 credits a month on Netlify (each live update of the site uses 15). Photos are resized to roughly 300–600 KB, so viewing photos is cheap. Videos are what add up: for anything longer than a short clip, use a YouTube (unlisted) or Google Drive link.

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
js/growth.js            height & weight: tiles, charts, measurements table
js/letters.js           letters (with sealed letters)
js/growing.js           flipbook, milestones, "All about me" cards, health
js/words.js             things she said, birthday wishes
js/world.js             people, place search, places map
js/yearbook.js          printable year book
js/nudges.js            reminders, calendar file, birthday mode
js/voice.js             voice recorder & player
js/form.js              the small pop-up forms
js/collections.js       loads sayings, people, milestones…
vendor/leaflet/         map library (Leaflet, BSD-2 licence)
js/bulk.js              "Many photos" bulk upload
js/exif.js              reads the date a photo was taken
js/backup.js            .zip / .json backup
js/i18n.js              English & Vietnamese text, age wording
js/store-local.js       local-mode storage (IndexedDB in the browser)
js/store-supabase.js    cloud-mode storage (Supabase DB + Storage)
js/media.js             photo resizing, YouTube/Vimeo link parsing
supabase/setup.sql      one-time database setup
```
