# Bright Lives English — New Lesson Guide

Upload this file with each new episode. It tells Claude exactly what to build, so no time is spent re-reading the whole site.

- Site: https://brightlivesenglish.com (Astro, hosted on Netlify; domain on Cloudflare)
- YouTube: https://www.youtube.com/@brightlivesenglish
- Repo: `barrytriduong/claude-triduong`, work branch `claude/busy-feynman-qjimmf`

---

## 1. What I send (copy this template)

```
Lesson NN: <Person>
URL: https://youtu.be/<VIDEO_ID>
Exact length: m:ss
Subtitle: attached (.sbv)
Script: attached (optional)
Action: build only (stack)   OR   build and publish
```

---

## 2. What Claude builds

**One new file:** `src/content/lessons/<person-slug>-<short-idea>.md`, for example `frida-kahlo-painted-herself.md`.
Use `src/content/lessons/frida-kahlo-painted-herself.md` as the model to copy. Nothing else in the site needs to change.

### Frontmatter fields

| Field | Rule |
|---|---|
| `title` | `"<Person>: <Short hook>"` |
| `person` | Full name |
| `summary` | 1–2 sentences about the story + "Learn five <LEVEL> words with the true story of <Person>." |
| `level` | A1, A2, B1, B2, C1 or C2 (from the episode plan) |
| `topics` | 2–3 tags, e.g. `[Art, Women, Courage]` |
| `publishDate` | One week after the previous lesson |
| `youtubeId` | The part after `youtu.be/` |
| `duration` | Exact length from me. If I didn't send it, estimate from the last caption and say so |
| `transcript` | See 3 |
| `vocabulary` | 8 words: the 5 video words + 3 extra words from the story |
| `structure` | Grammar in the story (see 4) |
| `quiz` | 9 questions (see 5) |
| Body text | Three lines: **Before you watch**, **After you watch** (use the grammar), **Think about it** |

### Vocabulary entries

`{ word, pos, meaning, example, t }`

- **5 video words:** `t` is the time the word is introduced. `example` is the example sentence from the video.
- **3 extra words:** useful words from the story. `t` is the line where each one appears.
- Add `forms: [...]` when the transcript uses another form, e.g. `paintings` or `gave up`.
- Meanings use simple words at the lesson's level.

---

## 3. Transcript from the `.sbv` captions

- Each caption cue becomes one line: `{ t: <start in seconds, rounded>, text: "..." }`.
- If a cue has 2 words or fewer and doesn't end with "!", join it to the next cue.
- Keep the words exactly as spoken. Fix only spelling and punctuation, using British spelling as in the video (`colourful`).
- Keep the comment `# Line times (t) come from the YouTube captions.` above `transcript:`.
- If a lesson already exists and only the times need fixing: `node scripts/sync-captions.mjs <lesson.md> <captions.sbv>`.

---

## 4. Structure ("Grammar in the story")

```yaml
structure:
  pattern: "was / were + -ing … when + past simple"
  use: "a short action that happens in the middle of a longer one"   # no brackets inside
  forms: ["...", "..."]            # 2–3 short rule chips
  highlight: ["was riding", ...]   # exact words from the transcript to mark in bold
  examples: ["...", "..."]         # 2 sentences taken from the story
  practice:                        # 3 gap-fills, gap written as ___
    - { sentence: "...___...", options: ["a","b","c"], answer: "a", explain: "optional" }
```

- The grammar comes from the video's "Now, one pattern" section, or from the episode plan.
- Every phrase in `highlight` must appear word for word in the transcript. The page counts how many times it appears ("Find it in the story").

---

## 5. Quiz: 9 questions in this mix

| # | Type | Notes |
|---|---|---|
| 1 | `choice` | Story fact, `t` set to that line |
| 2 | `truefalse` | Story fact, `t`, with `explain` |
| 3 | `choice` | Story fact, `t` |
| 4 | `gap` | Tests the grammar, 4 options, with `explain` |
| 5 | `choice` | Story fact, `t` |
| 6 | `match` | 4 of the video words with short meanings |
| 7 | `truefalse` | Story fact, `t` |
| 8 | `choice` | Story fact, `t`, with `explain` |
| 9 | `order` | The grammar example sentence, without the final full stop |

- `answer` for `choice` is the index of the correct option, starting at 0. Vary its position.
- Ask only about things the recorded video actually says.

---

## 6. Checks before committing

1. Check the key facts and numbers from the script with a quick web search. Tell me about any that are wrong.
2. Run `npm run build`. It must pass the schema check.
3. Open the lesson page in the preview and play the quiz and practice once.

Never use `pkill -f` in a shell command: it kills its own shell. Stop the preview another way.

---

## 7. Stack or publish (save Netlify credits)

Each production deploy costs **15 credits**. Stack 2–3 lessons, then publish them in one deploy.

- **Build only (stack):** commit to `claude/busy-feynman-qjimmf` and push. Don't merge.
- **Build and publish:**
  1. Open a PR from the branch to `main` and merge it. The merge needs the full 40-character SHA.
  2. Check that the Netlify deploy for the merge commit is "ready".
  3. Restart the branch with `git checkout -B claude/busy-feynman-qjimmf origin/main`.
- Small fixes, such as exact video lengths, ride along with the next publish.

---

## 8. What Claude replies with (always)

1. What was built: words, grammar, the number of quiz questions, and any fact-check notes.
2. The lesson link: `https://brightlivesenglish.com/lessons/<slug>/`
3. **The ready-to-paste YouTube description with chapters**, in this format:

```
<Hook: 2–3 sentences. End with: Learn five English words with the true story of <Person>.>

📚 Level: <LEVEL> (<Beginner/Elementary/Intermediate/Upper-intermediate/Advanced/Proficient>)
📝 New words: w1 · w2 · w3 · w4 · w5
🧩 Structure: <pattern> — "<example sentence>"

✅ Free lesson with flashcards, a worksheet and a quiz: https://brightlivesenglish.com/lessons/<slug>/

🔔 Subscribe for a new true story every week.

Chapters:
0:00 The story in 10 seconds
m:ss Five new words
m:ss The story of <Person>
m:ss Word review
m:ss What we can learn

Sources:
- <Source name> — <title>: <url>
- ...

Illustrations are artistic interpretations, not real photos of <Person>. This video uses an AI voice and AI-generated visuals.

#LearnEnglish #EnglishStories #BrightLivesEnglish
```

Chapter times come from the captions:

| Chapter | Starts at |
|---|---|
| The story in 10 seconds | 0:00 |
| Five new words | the first vocabulary word |
| The story of <Person> | the first story line after "Ready? Let's begin." |
| Word review | "Let's review" |
| What we can learn | the "<Person>'s story teaches us" line |

4. A reminder to pin a comment with the lesson link on the video.

---

## 9. Episode log (update after each lesson)

| EP | Person | Level | Slug | Video ID | Length |
|---|---|---|---|---|---|
| 01 | Wilma Rudolph | A2 | wilma-rudolph-fastest-woman | Z63AI0Tt4sk | 5:20 |
| 02 | Wangari Maathai | B1 | wangari-maathai-trees | ccXTt6RFJu0 | 5:09 |
| 03 | Terry Fox | A2 | terry-fox-marathon-of-hope | MIZ4XQbgI4U | 5:11 |
| 04 | Helen Keller | A1 | helen-keller-everything-had-a-name | TMlw1i7oimU | 4:30 (est.) |
| 05 | Temple Grandin | B1 | temple-grandin-thinks-in-pictures | R_Is9LMa0Yk | 3:31 (est.) |
| 06 | Marie Curie | A2 | marie-curie-two-nobel-prizes | ZmzQ02dYSaY | 3:45 |
| 07 | Louis Braille | A1 | louis-braille-letters-you-can-feel | tqKooYToV2M | 3:10 (est.) |
| 08 | Fridtjof Nansen | B2 | fridtjof-nansen-passport-for-refugees | IQ-3X6a9Uyg | 6:09 (est.) |
| 09 | Frida Kahlo | A2 | frida-kahlo-painted-herself | ZMyN88-L3ik | 3:48 (est.) |
| 10 | Ludwig van Beethoven | B1 | ludwig-van-beethoven-ninth-symphony | wLJo2Vo3h1E | 4:32 |
| 11 | Hans Christian Andersen | A1 | hans-christian-andersen-ugly-duckling | _eKTUoVXeVg | 3:39 (est.) |

The full episode plan (EP05–EP100) and the vocabulary log, including the words already reserved for later episodes, are on the `episode-plans` branch. Never merge that branch. Check the log so an episode doesn't reuse words from earlier ones.
