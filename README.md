# Bright Lives English

*Real stories. Real English.* A website that teaches English through short, inspiring videos about real people.

Built with [Astro](https://astro.build): a fast, static site with good SEO and no server to maintain. Fonts are self-hosted, so the site makes no requests to Google Fonts.

## What's inside

| Page | What it does |
| --- | --- |
| `/` | Home: hero, how it works, level picker, latest lessons, blog |
| `/lessons/` | All video lessons, filterable by level (A1–C2) |
| `/lessons/<slug>/` | A lesson: YouTube video, synced transcript, flashcards, Story Challenge quiz |
| `/blog/` and `/blog/<slug>/` | Articles, filterable by level |
| `/lessons/<slug>/worksheet/` | Printable worksheet with answer key (print or save as PDF) |
| `/levels/` | CEFR guide and a 1-minute self-check |
| `/about/`, `/privacy/`, `/disclosure/` | About, privacy policy, affiliate disclosure |
| `/thanks/`, `404` | Newsletter thank-you, not found |
| `/youtube/<slug>.txt` | Ready-to-paste YouTube description for each lesson (not listed in search) |

### Lesson features

- **Video**: loads YouTube only when the learner presses play, which keeps the page fast. Includes speed controls (0.75×, 1×, 1.25×) and **Repeat sentence**, which replays the current line for shadowing practice.
- **Transcript**: hidden until the learner opens it. The current line lights up while the video plays. Tapping a time jumps to that moment. Vocabulary words are highlighted, and tapping one shows its meaning and says it aloud. With no video yet, each line can be read aloud by the browser instead.
- **Flashcards**: flip cards with audio, the example sentence from the video, and **Hear it in the video**. Learners sort cards into *I know this* and *Still learning*, and can practise the "still learning" ones again.
- **Story Challenge**: five question types (multiple choice, true/false, fill the gap, build the sentence, match the pairs). It has points, streak bonuses, stars, a personal best, "watch that part again" links, a review of missed answers, and a share button.
- **Say it**: on flashcards, learners say the word and the browser's speech recognition checks it (Chrome, Edge and Safari; the button is hidden where it isn't supported). It checks whether the word was recognised, so treat it as friendly practice, not a pronunciation score.
- **Weekly leaderboard**: after the quiz, learners can add a nickname to that lesson's top 10 for the week (resets every Monday). See [Leaderboard](#leaderboard) below.
- **Progress and streak**: the four lesson steps are ticked off and saved in the learner's browser, lesson cards show "Done" or "2/4 steps", and the header shows a daily streak (e.g. "3-day streak"). No accounts needed.
- **Newsletter sign-up** at the end of every lesson and blog post, as well as in the footer.

### Translation

The **Language** button translates the site into 12 languages using Google's free website translator. It loads only when a learner picks a language. Transcripts, vocabulary words and quiz questions are marked `translate="no"`, so they stay in English and learners still practise. Word meanings and explanations are translated.

## Add a new lesson

1. Copy `src/content/lessons/terry-fox-marathon-of-hope.md` to a new file, e.g. `src/content/lessons/malala-yousafzai.md`. The file name becomes the URL.
2. Fill in the details at the top:
   - `youtubeId`: the part after `watch?v=` in your YouTube link (e.g. `dQw4w9WgXcQ`).
   - `level`: one of `A1 A2 B1 B2 C1 C2`.
   - `transcript`: one line per sentence. `t` is the start time in **seconds** (1:05 = 65).
     Tip: in YouTube Studio open *Subtitles* and download the `.srt` file, or copy "Show transcript" from the video page.
   - `vocabulary`: 6–10 words. `t` is when the word is said. Add `forms` for irregular forms that should also be highlighted (e.g. `forms: ["gave up"]` for "give up").
   - `quiz`: mix the five types. See the two sample lessons for examples of each.
3. Write "before/after you watch" activities below the `---`.
4. Run `npm run dev` and open the lesson to check it.

If a required field is missing or wrong, the build stops with a clear error.

**The two sample lessons** (Terry Fox, Wangari Maathai) are original scripts written for this site. They have no `youtubeId` yet, so they show "Video coming soon". Record them as videos, or replace them with your own.

### Set exact transcript times from YouTube captions

Write the transcript lines with rough times (or all `t: 0`), then download the video's captions in **YouTube Studio → Subtitles → the video → ⋮ → Download** (.sbv, .srt or .vtt; auto-captions are fine) and run:

```sh
node scripts/sync-captions.mjs src/content/lessons/<lesson>.md captions.sbv
```

It matches each transcript line to the captions and updates all the times, including the vocabulary and quiz "watch that part" times.

### What to say at the end of each video

Point viewers to what the lesson page really has, for example: *"Want more practice? Go to brightlivesenglish.com for the transcript, flashcards, a printable worksheet and the Story Challenge quiz."*

### Link the YouTube video to the lesson

After publishing a lesson, open `https://yourdomain.com/youtube/<slug>.txt`. It's a ready-made YouTube description with the lesson link, the words from the story and hashtags. Paste it into the video's description, and pin a comment with the lesson link too. Every video then sends viewers to the site.

## Add a blog post

Create a file in `src/content/blog/` like the existing ones. Set `levels` to the levels the post suits. That list drives the level filter. Put the cover image in `public/images/blog/`. If the post contains affiliate links, add `affiliate: true` to show a short disclosure at the top.

**Topics that bring search traffic:** write about what learners type into Google, e.g. "IELTS speaking part 2 topics", "phrasal verbs for travel", "how to improve English listening", "difference between say and tell". Put the main phrase in the title and the first paragraph, and link to one or two lessons from each post.

## Social preview images

Social networks don't show SVG images, so each cover also has a `.png` copy. After adding or changing an SVG cover, regenerate them:

```sh
npm i -D playwright && npx playwright install chromium
node scripts/make-og-images.mjs
```

## Leaderboard

The weekly leaderboard is a small Netlify Function (`netlify/functions/leaderboard.mjs`) that stores scores in **Netlify Blobs**. Both are included in Netlify's free plan, and there's nothing to set up: it works as soon as the site is deployed on Netlify. On your own computer (`npm run dev`) the leaderboard simply stays hidden.

- The server rejects impossible scores (it knows the maximum for each lesson), invalid nicknames and a list of rude words. It's a fun, anonymous board, though, so someone determined could still add a fake score.
- To remove an entry: Netlify dashboard → your site → **Blobs** → store `leaderboard` → open this week's key (e.g. `2026-W39/terry-fox-marathon-of-hope`) and delete it or edit the list.
- The scoring logic has tests: `npm test`.

## Run it locally

```sh
npm install
npm run dev      # http://localhost:4321
npm run build    # production build into dist/
```

## Deploy (Netlify, free)

`netlify.toml` is already set up. In Netlify: **Add new site → Import from Git**, pick this repo, and deploy. Then:

1. Set your domain and add the environment variable `SITE_URL=https://yourdomain.com`. Also update the sitemap line in `public/robots.txt`.
2. The newsletter form in the footer uses **Netlify Forms**, so sign-ups appear under *Forms* in the Netlify dashboard (free up to 100 a month). You can connect it to Mailchimp, ConvertKit and others later.
3. Submit `https://yourdomain.com/sitemap-index.xml` in Google Search Console.

## Before launch

- [x] First real lesson (Wilma Rudolph)
- [x] Contact email and owner name in `src/lib/site.ts`
- [x] Your story on `/about/`
- [x] Domain `brightlivesenglish.com` (already the default in `astro.config.mjs` and `robots.txt`)
- [ ] Read the privacy policy and affiliate disclosure and adjust them to your situation. They are a plain-language starting point, not legal advice.
- [ ] Paste each lesson's `/youtube/<slug>.txt` into its YouTube description
