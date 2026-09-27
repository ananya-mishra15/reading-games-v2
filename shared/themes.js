/* ============================================================
   themes.js — the 12 themes, and the single source of their colours.

   applyTheme() copies a theme's colours onto <html> as CSS custom
   properties, so every page and game restyles from one attribute.
   `swatch` is the four stripes shown on the picker card.
   ============================================================ */

const THEMES = [
    {
        id: "sunshine", name: "Sunshine", decor: ["☀️", "🌼", "🐝", "🌻"],
        colors: {
            bg: "#fff8e1", bg2: "#ffe9a8", panel: "#ffffff", ink: "#3e2c00", inkDim: "#8a6d1f",
            accent: "#ffa000", accent2: "#ff7043", tile: "#ffd54f", tileInk: "#3e2c00",
            slot: "#fff3cd", line: "#f0d27a"
        }
    },
    {
        id: "ocean", name: "Ocean", decor: ["🐟", "🐠", "🫧", "🐚"],
        colors: {
            bg: "#e0f7fa", bg2: "#aee7f0", panel: "#ffffff", ink: "#053b4a", inkDim: "#3f7885",
            accent: "#00838f", accent2: "#ff8a65", tile: "#4dd0e1", tileInk: "#053b4a",
            slot: "#d2f3f7", line: "#9ad9e2"
        }
    },
    {
        id: "jungle", name: "Jungle", decor: ["🍃", "🐒", "🌴", "🦜"],
        colors: {
            bg: "#e8f5e9", bg2: "#c3e3c5", panel: "#fffdf5", ink: "#1b3d1f", inkDim: "#4f7453",
            accent: "#2e7d32", accent2: "#ffb300", tile: "#81c784", tileInk: "#1b3d1f",
            slot: "#dcefdc", line: "#a5d6a7"
        }
    },
    {
        id: "candy", name: "Candy", decor: ["🍬", "🍭", "🧁", "🍩"],
        colors: {
            bg: "#fff0f6", bg2: "#ffd1e5", panel: "#ffffff", ink: "#4a1942", inkDim: "#8a5a82",
            accent: "#d6336c", accent2: "#7950f2", tile: "#faa2c1", tileInk: "#4a1942",
            slot: "#ffe3ef", line: "#f5b8d2"
        }
    },
    {
        id: "dino", name: "Dino", decor: ["🦕", "🦖", "🌿", "🥚"],
        colors: {
            bg: "#f1f8e9", bg2: "#d6ebbf", panel: "#fffef7", ink: "#33301f", inkDim: "#6b6647",
            accent: "#558b2f", accent2: "#f4511e", tile: "#aed581", tileInk: "#33301f",
            slot: "#e6f2d6", line: "#c5e1a5"
        }
    },
    {
        id: "unicorn", name: "Unicorn", decor: ["🦄", "✨", "🌈", "💜"],
        colors: {
            bg: "#f8f0ff", bg2: "#e3d0ff", panel: "#ffffff", ink: "#3c1f5c", inkDim: "#7a5f99",
            accent: "#9c4dff", accent2: "#ff7ab8", tile: "#d0b3ff", tileInk: "#3c1f5c",
            slot: "#efe3ff", line: "#d6c1f5"
        }
    },
    {
        id: "rainbow", name: "Rainbow", decor: ["🌈", "☁️", "⭐", "🎈"],
        colors: {
            bg: "#fffdf7", bg2: "#e3f2fd", panel: "#ffffff", ink: "#2d2a32", inkDim: "#6b6672",
            accent: "#f03e3e", accent2: "#1c7ed6", tile: "#ffe066", tileInk: "#2d2a32",
            slot: "#f1f3f5", line: "#dee2e6"
        }
    },
    {
        id: "arctic", name: "Arctic", decor: ["❄️", "🐧", "🐻‍❄️", "⛄"],
        colors: {
            bg: "#eef6ff", bg2: "#d2e5fa", panel: "#ffffff", ink: "#16324f", inkDim: "#55718f",
            accent: "#2f7fd8", accent2: "#35b6d6", tile: "#bde0fe", tileInk: "#16324f",
            slot: "#e1eefc", line: "#b9d3ef"
        }
    },
    {
        id: "forest", name: "Forest", decor: ["🍄", "🌲", "🦔", "🍂"],
        colors: {
            bg: "#f3efe6", bg2: "#e0d5bb", panel: "#fffdf8", ink: "#2f2a1e", inkDim: "#6d6450",
            accent: "#5d8a3a", accent2: "#c0562f", tile: "#d7c49e", tileInk: "#2f2a1e",
            slot: "#ece5d5", line: "#d3c6a6"
        }
    },
    {
        id: "space", name: "Space", dark: true, decor: ["🪐", "⭐", "🚀", "👽"],
        colors: {
            bg: "#0b0d2b", bg2: "#1f1650", panel: "#231d5c", ink: "#f1efff", inkDim: "#aaa4e0",
            accent: "#ffd166", accent2: "#8f7bff", tile: "#3d3490", tileInk: "#ffffff",
            slot: "#16123d", line: "#3a3280"
        }
    },
    {
        id: "midnight", name: "Midnight", dark: true, decor: ["🌙", "✨", "⭐", "🦉"],
        colors: {
            bg: "#0f1226", bg2: "#1b1f40", panel: "#1d2145", ink: "#eef0ff", inkDim: "#a4a9d4",
            accent: "#7c8cff", accent2: "#56e0c8", tile: "#2f3670", tileInk: "#ffffff",
            slot: "#151936", line: "#333a6d"
        }
    },
    {
        id: "sunset", name: "Sunset", dark: true, decor: ["🌅", "🌴", "🦩", "🌺"],
        colors: {
            bg: "#2b1030", bg2: "#5b2a4c", panel: "#48203f", ink: "#fff0f6", inkDim: "#e0b3c9",
            accent: "#ff9f68", accent2: "#ffd6a5", tile: "#7a3560", tileInk: "#ffffff",
            slot: "#3a1638", line: "#6d3357"
        }
    }
];

const DEFAULT_THEME = "sunshine";

function findTheme(id) {
    return THEMES.find(function (t) { return t.id === id; }) || THEMES[0];
}

function themeSwatch(theme) {
    const c = theme.colors;
    return [c.bg, c.panel, c.accent, c.accent2];
}
