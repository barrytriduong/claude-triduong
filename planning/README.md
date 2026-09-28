# Bright Lives English — episode planning (EP05–EP100)

This folder is **not part of the website**. It lives on the `episode-plans` branch, which is never merged, so it never triggers a Netlify deploy.

| File | What it is |
|---|---|
| `BrightLivesEnglish-episode-plan.md` | The plan for all 96 episodes: person, level, working title, story angle, 5 video words, 3 lesson extras, target structure, topics, lesson slug |
| `vocabulary-log.md` | Your log (EP01–EP04) plus a **Planned (reserved)** section with every planned person, word and structure |
| `episodes/EP05-temple-grandin-B1.md` | Full sample episode, B1 (standard 18-scene format) |
| `episodes/EP06-marie-curie-A2.md` | Full sample episode, A2 (standard 18-scene format) |
| `tools/` | The plan data and the checker. `python3 tools/check.py` confirms no person, word or structure repeats, and nothing clashes with the log |

## Each episode file contains
1. Words and structure (on-screen text)
2. The voiceover script, scene by scene, each starting with `[slowly]` and estimated at 20 s or less
3. The visual prompt table (clip A / clip B per scene), following the no-face-close-up rule
4. YouTube title, description (📚 📝 🧩 ✅ 🔔), chapters placeholder, sources, tags, playlist, card and thumbnail notes
5. A fact-check table (⚠ marks anything Cowork should re-confirm in a browser before recording)
6. A **website lesson draft** (transcript, vocabulary, structure, quiz) ready to paste into `src/content/lessons/<slug>.md` once the video is published

## Workflow with Cowork
1. Upload the episode file (for example `EP05-temple-grandin-B1.md`) together with the brief.
2. Cowork re-checks the fact-check table, then builds the video in Vids from the script and prompts.
3. After publishing, send Claude the YouTube link and the captions file; Claude adds the lesson page with exact times.
4. To get the next full files, ask Claude: "Write the full episode files for EP07–EP18 from the plan."
