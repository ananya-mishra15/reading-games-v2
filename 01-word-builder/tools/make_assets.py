#!/usr/bin/env python3
"""
Asset builder for Word Builder.

Generates, from the word lists below:
  images/<word>.svg          emoji picture cards (transparent, so the theme shows through)
  sounds/letters/<t>.m4a     one clip per letter name / digraph
  sounds/words/<word>.m4a    one clip per word
  levels.js                  the level data the game reads

Usage (macOS only — uses the built-in `say` and `afconvert`):
    python3 tools/make_assets.py            # make anything missing
    python3 tools/make_assets.py --force    # regenerate every audio clip

To add words: add them to a level's "words" below, then re-run.
To replace a robotic clip with a real recording: save it with the same file
name (e.g. sounds/letters/a.m4a). Existing clips are never overwritten
unless you pass --force.
"""

import json
import os
import subprocess
import sys
import tempfile

VOICE = "Samantha"
RATE_WORD = 140
RATE_LETTER = 140

# Digraphs are a single tile.
DIGRAPHS = ["sh", "ch", "th"]

# What the voice says for each tile: the letter's name. Names are written
# as words because `say "a"` reads it as the article "uh". Digraph tiles
# spell both letters. Tweak any of these, then re-run with --force.
LETTER_NAMES = {
    "a": "ay", "b": "bee", "c": "see", "d": "dee", "e": "ee", "f": "eff",
    "g": "gee", "h": "aitch", "i": "eye", "j": "jay", "k": "kay", "l": "el",
    "m": "em", "n": "en", "o": "oh", "p": "pee", "r": "are", "s": "ess",
    "t": "tee", "u": "you", "v": "vee", "w": "double you", "x": "ex",
    "y": "why", "z": "zee",
    "sh": "ess aitch", "ch": "see aitch", "th": "tee aitch",
}

# `say` reads some spellings as other words ("ay" -> "aye", which sounds like
# "igh"). These are what the voice is actually given instead; LETTER_NAMES
# stays as-is for the browser fallback. (Samantha ignores [[inpt PHON]].)
SAY_TEXT = {
    "a": "A.",
}

# island: 0 = CVC, 1 = Blends, 2 = Digraphs
# "pool" pulls words from other levels instead of listing its own.
LEVELS = [
    {"id": "at-an", "name": "-at -an -ap", "island": 0, "extra": 0, "words": {
        "cat": "🐱", "hat": "👒", "bat": "🦇", "rat": "🐀", "can": "🥫", "fan": "🪭",
        "man": "👨", "pan": "🍳", "van": "🚐", "cap": "🧢", "map": "🗺️", "nap": "😴"}},
    {"id": "short-a", "name": "Short a", "island": 0, "extra": 0, "words": {
        "bag": "🎒", "ham": "🍖", "yam": "🍠", "ram": "🐏", "cab": "🚕", "tag": "🏷️",
        "gas": "⛽", "sad": "😢", "mad": "😠", "dad": "👨‍👧", "jam": "🍓"}},
    {"id": "short-i", "name": "Short i", "island": 0, "extra": 0, "words": {
        "pig": "🐷", "pin": "📌", "kid": "🧒", "six": "6️⃣", "zip": "🤐", "dig": "⛏️",
        "lip": "👄", "bin": "🗑️", "sit": "🪑", "hit": "🏏", "win": "🏆", "fin": "🦈"}},
    {"id": "short-o", "name": "Short o", "island": 0, "extra": 0, "words": {
        "dog": "🐕", "log": "🪵", "box": "📦", "fox": "🦊", "pot": "🍲", "mop": "🧹",
        "hop": "🐇", "hot": "🥵", "dot": "🔵", "rod": "🎣", "cob": "🌽", "pop": "🍿"}},
    {"id": "short-u", "name": "Short u", "island": 0, "extra": 2, "words": {
        "bus": "🚌", "bug": "🐛", "cup": "🥤", "sun": "☀️", "mug": "☕", "nut": "🥜",
        "pup": "🐶", "hut": "🛖", "tub": "🛁", "hug": "🤗", "run": "🏃", "bun": "🍔"}},
    {"id": "short-e", "name": "Short e", "island": 0, "extra": 2, "words": {
        "bed": "🛏️", "hen": "🐔", "pen": "🖊️", "net": "🥅", "jet": "✈️", "web": "🕸️",
        "leg": "🦵", "ten": "🔟", "wet": "💦", "red": "🔴", "gem": "💎", "pet": "🐾"}},
    {"id": "mixed", "name": "Mixed vowels", "island": 0, "extra": 2,
     "pool": ["at-an", "short-a", "short-i", "short-o", "short-u", "short-e"]},
    {"id": "tricky", "name": "Tricky tiles", "island": 0, "extra": 3, "trick": "vowels",
     "pool": ["at-an", "short-a", "short-i", "short-o", "short-u", "short-e"]},

    {"id": "s-blends", "name": "s blends", "island": 1, "extra": 2, "words": {
        "stop": "🛑", "swim": "🏊", "sled": "🛷", "slug": "🐌", "spin": "🌀",
        "step": "👣", "skunk": "🦨", "snip": "✂️", "spud": "🥔"}},
    {"id": "l-blends", "name": "l blends", "island": 1, "extra": 2, "words": {
        "flag": "🚩", "clap": "👏", "flip": "🤸", "clam": "🦪", "glad": "😊",
        "plug": "🔌", "clip": "📎", "flex": "💪", "glum": "😞"}},
    {"id": "r-blends", "name": "r blends", "island": 1, "extra": 3, "words": {
        "frog": "🐸", "crab": "🦀", "drum": "🥁", "trap": "🪤", "grin": "😁",
        "drip": "💧", "trip": "🧳", "crop": "🌾", "trot": "🐴", "grub": "🐛"}},
    {"id": "end-blends", "name": "End blends", "island": 1, "extra": 3, "words": {
        "milk": "🥛", "tent": "⛺", "hand": "✋", "nest": "🪺", "lamp": "💡",
        "mask": "😷", "gift": "🎁", "list": "📝", "wind": "🌬️", "vest": "🦺",
        "ant": "🐜", "melt": "🫠", "sand": "🏖️", "fist": "✊"}},

    {"id": "sh", "name": "sh", "island": 2, "extra": 3, "trick": "digraphs", "words": {
        "ship": "🚢", "fish": "🐟", "dish": "🍽️", "shop": "🛍️", "wish": "🌠",
        "cash": "💵", "brush": "🪥", "shush": "🤫", "crash": "💥", "splash": "🌊"}},
    {"id": "ch", "name": "ch", "island": 2, "extra": 3, "trick": "digraphs", "words": {
        "chip": "🍟", "lunch": "🍱", "chest": "🧰", "rich": "🤑", "chop": "🪓",
        "chat": "💬", "pinch": "🤏", "chimp": "🐒", "inch": "📏", "punch": "👊"}},
    {"id": "th", "name": "th + review", "island": 2, "extra": 4, "trick": "digraphs", "words": {
        "bath": "🛁", "math": "🧮", "path": "🛤️", "sloth": "🦥", "cloth": "🧣",
        "broth": "🍵"},
     "pool": ["sh", "ch"]},
]

ISLANDS = [
    {"name": "CVC Island", "emoji": "🏝️"},
    {"name": "Blend Bay", "emoji": "⛵"},
    {"name": "Digraph Peak", "emoji": "🏔️"},
]

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMAGES_DIR = os.path.join(HERE, "images")
LETTER_DIR = os.path.join(HERE, "sounds", "letters")
WORD_DIR = os.path.join(HERE, "sounds", "words")
LEVELS_JS = os.path.join(HERE, "levels.js")


def split_tiles(word):
    tiles, i = [], 0
    while i < len(word):
        pair = word[i:i + 2]
        if pair in DIGRAPHS:
            tiles.append(pair)
            i += 2
        else:
            tiles.append(word[i])
            i += 1
    return tiles


def make_svg(emoji):
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">\n'
        f'  <text x="100" y="112" font-size="140" text-anchor="middle" '
        f'dominant-baseline="middle">{emoji}</text>\n'
        '</svg>\n'
    )


def make_clip(text, rate, out_path, force):
    if os.path.exists(out_path) and not force:
        return False
    with tempfile.TemporaryDirectory() as tmp:
        aiff = os.path.join(tmp, "clip.aiff")
        subprocess.run(["say", "-v", VOICE, "-r", str(rate), "-o", aiff, text], check=True)
        subprocess.run(["afconvert", "-f", "m4af", "-d", "aac", aiff, out_path], check=True)
    return True


def main():
    force = "--force" in sys.argv
    for d in (IMAGES_DIR, LETTER_DIR, WORD_DIR):
        os.makedirs(d, exist_ok=True)

    by_id = {lv["id"]: lv for lv in LEVELS}
    all_words = {}
    for lv in LEVELS:
        all_words.update(lv.get("words", {}))

    problems = []
    made = 0

    for tile, text in LETTER_NAMES.items():
        made += make_clip(SAY_TEXT.get(tile, text), RATE_LETTER, os.path.join(LETTER_DIR, tile + ".m4a"), force)

    for word, emoji in all_words.items():
        with open(os.path.join(IMAGES_DIR, word + ".svg"), "w", encoding="utf-8") as f:
            f.write(make_svg(emoji))
        made += make_clip(word, RATE_WORD, os.path.join(WORD_DIR, word + ".m4a"), force)
        tiles = split_tiles(word)
        if any(a == b for a, b in zip(word, word[1:])):
            problems.append(f"'{word}' has a double letter")
        for t in tiles:
            if t not in LETTER_NAMES:
                problems.append(f"'{word}' uses tile '{t}' with no letter name")

    out_levels = []
    for lv in LEVELS:
        names = list(lv.get("words", {}).keys())
        for pid in lv.get("pool", []):
            names += [w for w in by_id[pid]["words"] if w not in names]
        if len(names) < 8:
            problems.append(f"level '{lv['id']}' has only {len(names)} words (needs 8)")
        out_levels.append({
            "id": lv["id"],
            "name": lv["name"],
            "island": lv["island"],
            "extra": lv["extra"],
            "trick": lv.get("trick", ""),
            "core": len(lv.get("words", {})),  # own words come first; pool words fill the rest
            "words": [{"word": w, "tiles": split_tiles(w)} for w in names],
        })

    for word in all_words:
        for path in (os.path.join(IMAGES_DIR, word + ".svg"), os.path.join(WORD_DIR, word + ".m4a")):
            if not os.path.exists(path):
                problems.append("missing " + os.path.relpath(path, HERE))
    for tile in LETTER_NAMES:
        if not os.path.exists(os.path.join(LETTER_DIR, tile + ".m4a")):
            problems.append(f"missing sounds/letters/{tile}.m4a")

    with open(LEVELS_JS, "w", encoding="utf-8") as f:
        f.write("// Auto-generated by tools/make_assets.py — edit the lists there, not here.\n\n")
        f.write("const ISLANDS = " + json.dumps(ISLANDS, ensure_ascii=False) + ";\n\n")
        f.write("// Spoken if a sound file fails to load.\n")
        f.write("const LETTER_TEXT = " + json.dumps(LETTER_NAMES) + ";\n\n")
        f.write("const LEVELS = [\n")
        for lv in out_levels:
            head = {k: v for k, v in lv.items() if k != "words"}
            f.write("  " + json.dumps(head, ensure_ascii=False)[:-1] + ', "words": [\n')
            f.write(",\n".join("    " + json.dumps(w) for w in lv["words"]))
            f.write("\n  ]},\n")
        f.write("];\n")

    print(f"{len(all_words)} words, {len(LETTER_NAMES)} letters, {len(LEVELS)} levels; {made} new clips")
    if problems:
        print("PROBLEMS:")
        for p in problems:
            print("  - " + p)
        sys.exit(1)
    print("All assets present.")


if __name__ == "__main__":
    main()
