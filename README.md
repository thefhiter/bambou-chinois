# Bambou 竹 — learn Chinese (lesson « 你是哪国人? »)

A phone + PC web app to **read, write, pronounce and speak** beginner Chinese, built around
lesson 2 of the Tunisian 3rd-year secondary Chinese textbook (pages 20–27) and its pinyin
charts (pages 173–175). Interface in **Français · العربية · English**.

**Open it:** https://thefhiter.github.io/bambou-chinois/ — on a phone, use *Add to Home screen* to install it. After the first visit it also works offline.

![Lesson flow on a phone](docs/screenshots/phone-learn.png)
![Stroke steps, tone trainer, pinyin chart, dialogue, Arabic dark mode](docs/screenshots/phone-tools.png)
![Character studio on desktop](docs/screenshots/desktop-studio.png)

## The learning method

Every character and word goes through the same six moves:

| # | Move | In the app |
|---|------|-----------|
| 1 | **See** | The character draws itself stroke by stroke, with a memory picture (what its parts mean). |
| 2 | **Hear** | Recorded audio for every word and sentence, at normal and slow speed. |
| 3 | **Trace** | Write over the model with a finger or mouse; wrong strokes are rejected. |
| 4 | **Write from memory** | The model disappears. Too many slips and the character comes back later in the session. |
| 5 | **Say** | Speak into the microphone: the app compares your syllables and tones with the model. |
| 6 | **Review** | Spaced repetition — each item returns after 1, 2, 4, 8, 16, 32 days. |

## What is inside

- **Path** — 12 steps: tones → 我你她是 → sounds → countries → 你是哪国人 → 她是谁 → 叫什么名字 → tone changes → 请问/不/也/吗 → more countries → full dialogue → pinyin chart.
- **Lessons** — discover, trace, multiple choice, listen-and-pick, tone picking, grammar notes, sentence building, speaking, writing from memory. Mistakes are asked again before the session ends.
- **Characters** — 27 characters to write (animation, stroke-by-stroke steps, trace, from memory) and 21 to recognise.
- **Pinyin lab** — the 4 tones, a tone trainer that draws the pitch of your voice, an ear game, the sounds of the lesson, tone changes (bú shì, half third tone, neutral tone), and the full pinyin chart with sound for every syllable.
- **Dialogue** — listen, repeat each line, or role-play as 萨米, 小美 or 玛丽.
- **AI tutor (竹老师)** — a built-in coach that answers from the lesson offline, or Claude when an Anthropic API key is added in Settings.

## Microphone notes

- Speech checking uses the browser's speech recognition (Chrome, Edge, Android Chrome, Safari) and needs Internet. On other browsers the app records you and plays your voice next to the model so you can compare.
- The tone trainer works everywhere there is a microphone, offline too.
- The microphone only works on `https://` or `localhost`.

## AI tutor

Settings → *AI tutor* → paste an Anthropic API key. The key is stored only in that browser and
sent only to `api.anthropic.com`. *Copy a link for my friends* creates a link that turns the tutor
on for whoever opens it — it contains the key, so share it only with people you trust.

## Run locally

```bash
python -m http.server 9116      # then open http://localhost:9116
```

No build step: plain HTML, CSS and ES modules.

## Project layout

```
index.html, sw.js, manifest.webmanifest
css/app.css          design tokens, light + dark, RTL
js/data.js           lesson content (fr / ar / en)
js/pinyin-table.js   the three pinyin charts
js/session.js        lesson + review engine
js/views.js          home, characters, pinyin lab, review, dialogue
js/tutor.js          AI tutor + offline coach
js/speech.js         speech scoring and pitch tracking
js/hanzi.js          stroke-order rendering
data/chars.json      stroke data for the lesson's characters
audio/               recorded clips (words, sentences, 1 196 pinyin syllables)
tools/               asset scripts (stroke data, audio, icons)
```

## Rebuilding assets

```bash
npm i hanzi-writer hanzi-writer-data pinyin-pro   # anywhere
node tools/build-assets.mjs path/to/node_modules  # vendor libs + data/chars.json + audio list
pip install edge-tts pypinyin
python tools/gen_audio.py                         # audio/ (keeps existing files)
python tools/make_icons.py
```

## Credits

Stroke data: [Hanzi Writer](https://hanziwriter.org) / Make Me a Hanzi (Arphic Public License).
Pinyin conversion: [pinyin-pro](https://github.com/zh-lx/pinyin-pro). Audio: Microsoft Edge neural voices.
