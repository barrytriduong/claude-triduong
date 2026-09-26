# Bright Lives English

*Real stories. Real English.* A website that teaches English through short, inspiring videos about real people.

Built with [Astro](https://astro.build): a fast, static site with good SEO and no server to maintain.

## What's inside

| Page | What it does |
| --- | --- |
| `/` | Home: hero, how it works, level picker, latest lessons, blog |
| `/lessons/` | All video lessons, filterable by level (A1–C2) |
| `/lessons/<slug>/` | A lesson: YouTube video, synced transcript, flashcards, Story Challenge quiz |
| `/blog/` and `/blog/<slug>/` | Articles, filterable by level |
| `/levels/` | CEFR guide and a 1-minute self-check |
| `/about/`, `/thanks/`, `404` | About, newsletter thank-you, not found |

### Lesson features

- **Video**: loads YouTube only when the learner presses play, which keeps the page fast. Includes speed controls (0.75×, 1×, 1.25×) and **Repeat sentence**, which replays the current line for shadowing practice.
- **Transcript**: hidden until the learner opens it. The current line lights up while the video plays. Tapping a time jumps to that moment. Vocabulary words are highlighted, and tapping one shows its meaning and says it aloud. With no video yet, each line can be read aloud by the browser instead.
- **Flashcards**: flip cards with audio, the example sentence from the video, and **Hear it in the video**. Learners sort cards into *I know this* and *Still learning*, and can practise the "still learning" ones again.
- **Story Challenge**: five question types (multiple choice, true/false, fill the gap, build the sentence, match the pairs). It has points, streak bonuses, stars, a personal best, "watch that part again" links, a review of missed answers, and a share button.
- **Progress**: the four lesson steps are ticked off and saved in the learner's browser, and lesson cards show "Done" or "2/4 steps". No accounts needed.

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

## Add a blog post

Create a file in `src/content/blog/` like the existing ones. Set `levels` to the levels the post suits. That list drives the level filter. Put the cover image in `public/images/blog/`.

## Social preview images

Social networks don't show SVG images, so each cover also has a `.png` copy. After adding or changing an SVG cover, regenerate them:

```sh
npm i -D playwright && npx playwright install chromium
node scripts/make-og-images.mjs
```

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

- [ ] Add real YouTube IDs and transcripts
- [ ] Write your story on `/about/` (replace the `[ADD YOUR STORY HERE]` and `[YOUR EMAIL]` placeholders)
- [ ] Set `SITE_URL` and `robots.txt` to your domain
- [ ] Add a privacy policy (needed for the newsletter and affiliate programmes)
