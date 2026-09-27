# Reading Games v2

Reading games for TK–Kindergarten. Plain HTML/CSS/JS with no build step; each game is its own folder.

| Folder | What it is |
| --- | --- |
| `index.html`, `hub.js` | Hub: players, theme picker, ⚙️ settings |
| `shared/` | Themes (`themes.js` holds all 12 palettes), player storage, sound, confetti |
| `01-word-builder/` | Hear a word, build it from letter tiles. 15 levels on 3 islands |

## Run locally

```sh
python3 -m http.server 8765
# open http://localhost:8765
```

(Opening `index.html` directly works too, but sounds load best from a server.)

## Word Builder: adding words or fixing sounds

All words, emoji and letter sounds live in `01-word-builder/tools/make_assets.py`.
After editing it:

```sh
cd 01-word-builder
python3 tools/make_assets.py          # makes missing pictures/sounds, rewrites levels.js
python3 tools/make_assets.py --force  # re-records every clip (after changing LETTER_NAMES)
```

To use a real recording instead of the Mac voice, save it over the clip with the
same name, e.g. `sounds/letters/a.m4a` or `sounds/words/cat.m4a`.

## Adding a theme

Add an entry to `THEMES` in `shared/themes.js`. The picker and every game pick it up automatically.
