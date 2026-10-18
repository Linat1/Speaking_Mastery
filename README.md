# Miftah Arabic — Speaking Mastery Studio

Interactive Arabic speaking practice for Cambridge IGCSE Arabic (0544): one page per lesson, plus a hub page.
It is the website companion to the Miftah Arabic PowerPoint lessons (in the `Miftah_arabic` repository).

## What is in this repository

| Folder | What it is |
|---|---|
| `site/` | **The website.** Upload this folder’s contents to your web host. |
| `site/index.html` | The hub: every unit and lesson, with each student’s progress |
| `site/f2/` | F2-L01 … F2-L11, and F2-L12 (the unit speaking mock) — Foundation: greetings and introductions |
| `site/topic-a/` | AT-A-L01 … AT-A-L12 (from the Topic A Speaking Workshops) |
| `site/d1/` | D1-L01 … D1-L11, and D1-L12 (the unit speaking mock) |
| `site/d2/` | D2-L01 … D2-L11, and D2-L12 (the unit speaking mock) |
| `src/` | The build kit that makes the website (templates, build script, lesson content) |

## Each lesson page has five stations

1. **Key language** — hear · say · record · compare, with he / she / they and m. / f. / pl. forms
2. **Role plays** — exam-style cards A–D, the unexpected “!” task, help frames, and a timed “Run as exam” mode
3. **Conversation** — Core / Develop / Stretch questions, think and speak timers, and model answers with a *Range spotter*
4. **Mock exam** — timed and recorded, self-assessed out of 12, with a downloadable recording
5. **My progress** — badges, a “practise next” list and mock scores

## Uploading to Hostinger

1. hPanel › **Files** › **File Manager** › `public_html`
2. Create a folder called `speaking`
3. Upload **everything inside `site/`** into it, keeping the sub-folders
4. Visit `https://miftaharabiclessons.inkandpixels.uk/speaking/`
5. Link to it from your `#mastery` section: `/speaking/` for the hub, or a single lesson such as `/speaking/topic-a/at-a-l05.html`

**Good to know**
- The pages must be opened over **https** (your website) for the microphone to work.
- Voices come from the device’s Arabic voice. Microsoft Edge has the most natural ones; on iPad or Windows an Arabic voice may need installing (each page explains how).
- Progress is saved in each student’s own browser on that device. Nothing is uploaded.
- The pronunciation check (beta) works in Chrome and Edge only.

## Adding your own recordings (optional)

Each lesson has an `audio/<CODE>/ids.txt` file listing every line.
Record a line as `<id>.mp3` (use `_` instead of `:`, e.g. `rpm_AT-A-L05-rpA-1.mp3`), put it in that folder, then rebuild.
The page plays your recording instead of the device voice.

## Rebuilding the website

You need [Node.js](https://nodejs.org). From the repository root, run:

```
node src/build.js
```

- **D1 / D2 content:** `src/data/d1/` and `src/data/d2/`, one JSON file per lesson (role plays, conversation questions, model answers).
- **Key language:** comes from `src/data/d1-content.json` and `d2-content.json`, copied from the Miftah Arabic lesson data.
- **F2 key language:** extracted from the KEY WORDS slides of the F2 decks:
  `python3 src/extract_keywords.py <path to Miftah_arabic>/Foundation_F2 F2` (works for any unit folder, e.g. F3, P1).
- **Topic A:** extracted from the Speaking Workshop decks in the Miftah_arabic repository:
  `python3 src/extract_topic_a.py <path to Miftah_arabic>/Topic_A/Exam_Practice`
  This needs Python with `python-pptx`.
- **Page design:** `src/template.html` (lesson page) and `src/hub.html` (hub).
