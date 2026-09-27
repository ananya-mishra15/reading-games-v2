// Game configuration
const GAME_ID = "word-builder";
const WORDS_PER_LEVEL = 8;
const MISSES_BEFORE_GLOW = 2;
const DRAG_THRESHOLD_PX = 8;
const MIN_CELEBRATE_MS = 2200; // picture stays up at least this long, even with sound off
const NODE_SPACING_PX = 124;
const TRAIL_X = [50, 78, 50, 22]; // % across the island, repeating: makes the path wind

// Look-alike or sound-alike tiles offered as tricks. c and k are left out
// on purpose — they make the same sound, so hearing alone can't tell them apart.
const CONFUSABLES = {
    a: ["e", "o", "u", "i"], e: ["a", "i", "u"], i: ["e", "a", "l"], o: ["a", "u", "e"], u: ["o", "a", "n"],
    b: ["d", "p"], d: ["b", "p"], p: ["b", "d"], m: ["n", "w"], n: ["m", "h", "u"],
    f: ["v", "t"], v: ["f", "w"], s: ["z", "x"], z: ["s"], g: ["j", "y"], j: ["g", "y"],
    t: ["d", "f", "l"], h: ["n", "b"], l: ["i", "t"], r: ["n", "w"], w: ["v", "m"],
    x: ["z", "s"], y: ["j", "v"], c: ["s", "g"], k: ["g", "h"],
    sh: ["ch", "th", "s"], ch: ["sh", "th", "j"], th: ["sh", "ch", "f"]
};
const VOWELS = ["a", "e", "i", "o", "u"];
const DIGRAPHS = ["sh", "ch", "th"];
const FILLER = "abdefghijlmnoprstuvwyz".split("");

// Game state
let levelIndex = 0;
let words = [];
let wordIndex = 0;
let current = null;         // { word, tiles }
let filled = [];            // per slot: true once the right tile is in
let slotMisses = [];
let mistakes = 0;
let accepting = false;
let drag = null;
// Bumped whenever the word changes or the player leaves, so a spelling
// sequence still running from an old word knows to stop.
let playToken = 0;

// DOM elements
const mapScreen = document.getElementById("map-screen");
const playScreen = document.getElementById("play-screen");
const endScreen = document.getElementById("end-screen");
const islandsEl = document.getElementById("islands");
const whoAvatar = document.getElementById("who-avatar");
const whoName = document.getElementById("who-name");
const whoStars = document.getElementById("who-stars");
const progressEl = document.getElementById("progress");
const cardEl = document.getElementById("card");
const cardImg = document.getElementById("card-img");
const cardWord = document.getElementById("card-word");
const hearBtn = document.getElementById("hear-btn");
const slotsEl = document.getElementById("slots");
const trayEl = document.getElementById("tray");
const quitBtn = document.getElementById("quit-btn");
const endStars = document.getElementById("end-stars");
const endTitle = document.getElementById("end-title");
const endSub = document.getElementById("end-sub");
const nextBtn = document.getElementById("next-btn");
const againBtn = document.getElementById("again-btn");
const mapBtn = document.getElementById("map-btn");

const LEVEL_IDS = LEVELS.map(function (l) { return l.id; });

// ---------- Sounds ----------

function wordUrl(w) { return "sounds/words/" + w + ".m4a"; }
function letterUrl(t) { return "sounds/letters/" + t + ".m4a"; }

function sayWord() {
    if (current) UI.play(wordUrl(current.word), current.word);
}

function sayTile(t) {
    UI.play(letterUrl(t), LETTER_TEXT[t] || t);
}

// ---------- Letter case ----------

function applyCase() {
    const p = Store.active();
    document.body.classList.toggle("upper", !p || p.upper);
}

document.querySelectorAll(".case-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
        Store.update(function (p) { p.upper = !p.upper; });
        applyCase();
    });
});

// ---------- Screens ----------

function showScreen(screen) {
    [mapScreen, playScreen].forEach(function (s) {
        s.classList.toggle("hidden", s !== screen);
    });
    endScreen.classList.add("hidden");
    window.scrollTo(0, 0);
}

// ---------- Map ----------

function starsHtml(n) {
    let html = "";
    for (let i = 1; i <= 3; i++) html += '<span class="star' + (i <= n ? " on" : "") + '">★</span>';
    return html;
}

function renderMap() {
    const p = Store.active();
    whoAvatar.textContent = p.avatar;
    whoName.textContent = p.name;
    whoStars.textContent = "⭐ " + Store.totalStars(GAME_ID);

    // The first open level without stars is where the player is "up to".
    let currentIdx = -1;
    LEVELS.forEach(function (lv, i) {
        if (currentIdx < 0 && Store.isUnlocked(GAME_ID, LEVEL_IDS, i) && !Store.stars(GAME_ID, lv.id)) {
            currentIdx = i;
        }
    });

    islandsEl.innerHTML = "";
    ISLANDS.forEach(function (island, islandNo) {
        const section = document.createElement("section");
        section.className = "island";
        section.innerHTML = '<h2>' + island.emoji + " " + UI.esc(island.name) + "</h2>" +
            '<span class="island-emoji" aria-hidden="true">' + island.emoji + "</span>";

        const trail = document.createElement("div");
        trail.className = "trail";
        const levelsHere = [];
        LEVELS.forEach(function (lv, i) { if (lv.island === islandNo) levelsHere.push(i); });
        trail.style.height = (levelsHere.length * NODE_SPACING_PX + 10) + "px";

        levelsHere.forEach(function (i, k) {
            const lv = LEVELS[i];
            const unlocked = Store.isUnlocked(GAME_ID, LEVEL_IDS, i);
            const stars = Store.stars(GAME_ID, lv.id);
            const node = document.createElement("button");
            node.className = "node" + (unlocked ? "" : " locked") + (stars ? " done" : "") +
                (i === currentIdx ? " current" : "");
            node.style.left = TRAIL_X[k % TRAIL_X.length] + "%";
            node.style.top = (k * NODE_SPACING_PX + 14) + "px";
            node.dataset.level = String(i);
            node.setAttribute("aria-label", "Level " + (i + 1) + ", " + lv.name +
                (unlocked ? ", " + stars + " stars" : ", locked"));
            node.innerHTML = '<span class="circle">' + (unlocked ? i + 1 : "🔒") + "</span>" +
                '<span class="label">' + UI.esc(lv.name) + "</span>" +
                '<span class="stars">' + (unlocked ? starsHtml(stars) : "") + "</span>";
            if (unlocked) {
                node.addEventListener("click", function () {
                    UI.unlockAudio(); // a real tap: lets sound play on iPhone/iPad
                    startLevel(i);
                });
            }
            trail.appendChild(node);
        });

        section.appendChild(trail);
        islandsEl.appendChild(section);
        drawTrail(trail, levelsHere);
    });

    const cur = islandsEl.querySelector(".node.current");
    if (cur) cur.scrollIntoView({ block: "center" });
}

// Curvy dotted path joining the level circles; open stretches turn solid.
function drawTrail(trail, levelsHere) {
    const w = trail.clientWidth;
    const pts = levelsHere.map(function (i, k) {
        return {
            x: TRAIL_X[k % TRAIL_X.length] / 100 * w,
            y: k * NODE_SPACING_PX + 14 + 38,
            open: Store.isUnlocked(GAME_ID, LEVEL_IDS, i)
        };
    });
    let paths = "";
    for (let k = 1; k < pts.length; k++) {
        const a = pts[k - 1], b = pts[k];
        const my = (a.y + b.y) / 2;
        paths += '<path class="' + (b.open ? "open" : "") + '" d="M' + a.x + " " + a.y +
            " C" + a.x + " " + my + " " + b.x + " " + my + " " + b.x + " " + b.y + '"/>';
    }
    const svg = '<svg aria-hidden="true">' + paths + "</svg>";
    const old = trail.querySelector("svg");
    if (old) old.outerHTML = svg;
    else trail.insertAdjacentHTML("afterbegin", svg);
}

let resizeTimer = 0;
window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
        if (!mapScreen.classList.contains("hidden")) {
            document.querySelectorAll(".trail").forEach(function (trail, islandNo) {
                const levelsHere = [];
                LEVELS.forEach(function (lv, i) { if (lv.island === islandNo) levelsHere.push(i); });
                drawTrail(trail, levelsHere);
            });
        } else if (current) {
            sizeTiles();
        }
    }, 150);
});

// ---------- Level flow ----------

function startLevel(i) {
    levelIndex = i;
    const level = LEVELS[i];
    // A level's own words come first; words pooled from other levels
    // only top it up (so "th + review" is mostly th words).
    const own = UI.shuffle(level.words.slice(0, level.core));
    const pooled = UI.shuffle(level.words.slice(level.core));
    words = UI.shuffle(own.concat(pooled).slice(0, WORDS_PER_LEVEL));
    wordIndex = 0;
    mistakes = 0;

    // Warm up every clip this level needs so taps sound instant.
    const urls = ["sounds/celebration.wav"];
    words.forEach(function (w) {
        urls.push(wordUrl(w.word));
        w.tiles.forEach(function (t) { urls.push(letterUrl(t)); });
    });
    UI.preload(urls);

    showScreen(playScreen);
    startWord();
}

function distractors(level, tiles) {
    const want = level.extra;
    if (!want) return [];

    const inWord = new Set(tiles);
    const hasK = inWord.has("c") || inWord.has("k");
    const ok = function (t) {
        return !inWord.has(t) && !(hasK && (t === "c" || t === "k"));
    };

    let picks = [];
    if (level.trick === "vowels") picks = picks.concat(UI.shuffle(VOWELS));
    if (level.trick === "digraphs") picks = picks.concat(UI.shuffle(DIGRAPHS));
    UI.shuffle(tiles).forEach(function (t) {
        picks = picks.concat(UI.shuffle(CONFUSABLES[t] || []));
    });
    picks = picks.concat(UI.shuffle(FILLER));

    const out = [];
    picks.forEach(function (t) {
        if (out.length < want && ok(t) && out.indexOf(t) < 0) out.push(t);
    });
    return out;
}

function startWord() {
    playToken++;
    current = words[wordIndex];
    filled = current.tiles.map(function () { return false; });
    slotMisses = current.tiles.map(function () { return 0; });

    // Picture stays hidden (on the back of the card) until the word is built.
    cardEl.classList.remove("flipped");
    cardImg.src = "images/" + current.word + ".svg";
    cardWord.textContent = current.word;

    slotsEl.innerHTML = "";
    current.tiles.forEach(function (t, i) {
        const slot = document.createElement("div");
        slot.className = "slot";
        slot.dataset.i = String(i);
        slotsEl.appendChild(slot);
    });

    trayEl.innerHTML = "";
    const pieces = UI.shuffle(current.tiles.concat(distractors(LEVELS[levelIndex], current.tiles)));
    pieces.forEach(function (t, i) {
        trayEl.appendChild(makeTile(t, i));
    });

    sizeTiles();
    renderProgress();
    accepting = true;
    setTimeout(sayWord, 350);
}

// Tiles shrink to fit long words on a phone, and grow on a tablet.
function sizeTiles() {
    const n = Math.max(current.tiles.length, 4);
    const avail = Math.min(playScreen.clientWidth, 760) - 32;
    const size = Math.max(50, Math.min(92, Math.floor((avail - (n - 1) * 10) / n)));
    playScreen.style.setProperty("--t", size + "px");
}

function renderProgress() {
    progressEl.innerHTML = words.map(function (w, i) {
        return '<span class="dot' + (i < wordIndex ? " done" : "") + (i === wordIndex ? " now" : "") + '"></span>';
    }).join("");
}

// ---------- Tiles: tap or drag ----------

function makeTile(t, i) {
    const tile = document.createElement("button");
    tile.className = "tile";
    tile.textContent = t;
    tile.dataset.t = t;
    tile.dataset.c = String(i % 6);
    tile.setAttribute("aria-label", "Letter " + t);
    tile.addEventListener("pointerdown", onPointerDown);
    tile.addEventListener("pointermove", onPointerMove);
    tile.addEventListener("pointerup", onPointerUp);
    tile.addEventListener("pointercancel", function () {
        if (drag) { returnTile(drag.tile); drag = null; }
    });
    // Keyboard: Enter/Space on a focused tile acts like a tap.
    tile.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            tapTile(tile);
        }
    });
    return tile;
}

function isPlaced(tile) {
    return tile.parentElement && tile.parentElement.classList.contains("slot");
}

function onPointerDown(e) {
    const tile = e.currentTarget;
    if (!accepting || isPlaced(tile) || drag) return;
    e.preventDefault();
    tile.setPointerCapture(e.pointerId);
    drag = { tile: tile, x: e.clientX, y: e.clientY, moved: false };
}

function onPointerMove(e) {
    if (!drag || drag.tile !== e.currentTarget) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) {
        drag.moved = true;
        drag.tile.classList.add("dragging");
        drag.tile.style.transition = "none";
    }
    if (drag.moved) {
        drag.tile.style.transform = "translate(" + dx + "px," + dy + "px) scale(1.08)";
    }
}

function onPointerUp(e) {
    if (!drag || drag.tile !== e.currentTarget) return;
    const d = drag;
    drag = null;
    if (!d.moved) {
        tapTile(d.tile);
        return;
    }
    const slot = document.elementsFromPoint(e.clientX, e.clientY)
        .find(function (el) { return el.classList && el.classList.contains("slot"); });
    const i = slot ? parseInt(slot.dataset.i, 10) : -1;
    if (i >= 0 && !filled[i] && accepting) {
        tryPlace(d.tile, i);
    } else {
        returnTile(d.tile);
    }
}

function tapTile(tile) {
    if (!accepting || isPlaced(tile)) return;
    const i = filled.indexOf(false);
    if (i >= 0) tryPlace(tile, i);
}

function returnTile(tile) {
    tile.classList.remove("dragging");
    tile.style.transition = "transform 0.25s ease";
    tile.style.transform = "";
}

// Slide a tile from where it is now into a slot (FLIP animation).
// A hidden ghost holds its old spot so the other tray tiles don't jump.
function moveIntoSlot(tile, slot) {
    const first = tile.getBoundingClientRect();
    const ghost = document.createElement("span");
    ghost.className = "ghost";
    tile.replaceWith(ghost);
    tile.classList.remove("dragging", "glow");
    tile.style.transition = "none";
    tile.style.transform = "";
    slot.appendChild(tile);
    const last = tile.getBoundingClientRect();
    tile.style.transform = "translate(" + (first.left - last.left) + "px," + (first.top - last.top) + "px)";
    void tile.offsetWidth; // commit the start position before animating
    tile.style.transition = "transform 0.25s ease";
    tile.style.transform = "";
}

function tryPlace(tile, i) {
    const slot = slotsEl.children[i];
    const need = current.tiles[i];

    if (tile.dataset.t === need) {
        filled[i] = true;
        moveIntoSlot(tile, slot);
        slot.classList.add("filled");
        tile.tabIndex = -1;
        sayTile(need);
        trayEl.querySelectorAll(".glow").forEach(function (t) { t.classList.remove("glow"); });
        if (filled.indexOf(false) < 0) wordBuilt();
        return;
    }

    // Gentle miss: tile wiggles home, a soft boop, then the sound that
    // belongs in this slot. Two misses on a slot and the right tile glows.
    mistakes++;
    slotMisses[i]++;
    returnTile(tile);
    tile.classList.remove("wiggle");
    void tile.offsetWidth; // restart the wiggle if it is already applied
    tile.classList.add("wiggle");
    slot.classList.remove("miss");
    void slot.offsetWidth;
    slot.classList.add("miss");
    UI.boop();
    setTimeout(function () { sayTile(need); }, 380);

    if (slotMisses[i] >= MISSES_BEFORE_GLOW) {
        const hint = Array.prototype.find.call(trayEl.querySelectorAll(".tile"), function (t) {
            return t.dataset.t === need;
        });
        if (hint) hint.classList.add("glow");
    }
}

function wordBuilt() {
    accepting = false;
    Array.prototype.forEach.call(slotsEl.children, function (slot, k) {
        slot.style.animationDelay = (k * 0.08) + "s";
        slot.classList.add("done");
    });

    const token = ++playToken;
    const live = function () { return token === playToken; };
    const word = current;
    const started = Date.now();

    wait(450).then(function () {
        if (!live()) return;
        cardEl.classList.add("flipped");
        UI.confetti();
        UI.play("sounds/celebration.wav", "", { overlap: true, volume: 0.6 });
        return wait(500);
    }).then(function () {
        // Spell it: each slot pulses as its letter name is said...
        return word.tiles.reduce(function (chain, t, k) {
            return chain.then(function () {
                if (!live()) return;
                pulseSlot(k);
                return UI.play(letterUrl(t), LETTER_TEXT[t] || t, { overlap: true }).then(function () {
                    return wait(120);
                });
            });
        }, Promise.resolve());
    }).then(function () {
        // ...then say the whole word.
        if (!live()) return;
        return wait(200).then(function () {
            if (live()) return UI.play(wordUrl(word.word), word.word, { overlap: true });
        });
    }).then(function () {
        return wait(Math.max(1200, MIN_CELEBRATE_MS - (Date.now() - started)));
    }).then(function () {
        if (!live()) return;
        wordIndex++;
        if (wordIndex >= words.length) endLevel();
        else startWord();
    });
}

function wait(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

function pulseSlot(k) {
    const slot = slotsEl.children[k];
    if (!slot) return;
    slot.classList.remove("say");
    void slot.offsetWidth; // restart the pulse
    slot.classList.add("say");
}

// ---------- Level end ----------

function starsFor(m) {
    if (m <= 1) return 3;
    if (m <= 4) return 2;
    return 1;
}

function endLevel() {
    current = null;
    const level = LEVELS[levelIndex];
    const stars = starsFor(mistakes);
    Store.setStars(GAME_ID, level.id, stars);

    endStars.innerHTML = [1, 2, 3].map(function (n) {
        return '<span class="star' + (n <= stars ? " on" : "") + '" style="animation-delay:' +
            (n * 0.25) + 's">★</span>';
    }).join("");
    endTitle.textContent = ["", "You did it! 👏", "Great job! 🌟", "Amazing! 🎉"][stars];
    endSub.textContent = "Level " + (levelIndex + 1) + " · " + level.name + " · " +
        (mistakes === 0 ? "no mistakes!" : mistakes + (mistakes === 1 ? " oops" : " oopses"));

    const last = levelIndex >= LEVELS.length - 1;
    nextBtn.classList.toggle("hidden", last);
    endScreen.classList.remove("hidden");

    UI.fanfare();
    UI.confetti(220);
    setTimeout(function () { UI.confetti(160); }, 700);
}

// ---------- Event listeners ----------

cardEl.addEventListener("click", sayWord);
hearBtn.addEventListener("click", sayWord);

document.addEventListener("keydown", function (e) {
    if (e.code === "Space" && current && document.activeElement === document.body) {
        e.preventDefault();
        sayWord();
    }
});

quitBtn.addEventListener("click", function () {
    playToken++;
    accepting = false;
    current = null;
    UI.stop();
    showScreen(mapScreen);
    renderMap();
});

nextBtn.addEventListener("click", function () {
    UI.unlockAudio();
    startLevel(Math.min(levelIndex + 1, LEVELS.length - 1));
});

againBtn.addEventListener("click", function () {
    UI.unlockAudio();
    startLevel(levelIndex);
});

mapBtn.addEventListener("click", function () {
    showScreen(mapScreen);
    renderMap();
});

// Initialize (the page is already redirecting to the hub if there's no player)
if (Store.active()) {
    applyCase();
    renderMap();
}
