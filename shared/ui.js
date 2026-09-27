/* ============================================================
   ui.js — pieces every page shares: theme + floating decor,
   confetti, sound playback, and hold-to-confirm buttons.
   Load after themes.js and store.js.
   ============================================================ */

const UI = (function () {

    // ---------- Helpers ----------

    // Fisher-Yates shuffle
    function shuffle(arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    function esc(s) {
        return String(s).replace(/[&<>"']/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
        });
    }

    const reducedMotion = window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ---------- Theme ----------

    const CSS_VARS = {
        bg: "--bg", bg2: "--bg2", panel: "--panel", ink: "--ink", inkDim: "--ink-dim",
        accent: "--accent", accent2: "--accent-2", tile: "--tile", tileInk: "--tile-ink",
        slot: "--slot", line: "--line"
    };

    function currentTheme() {
        const p = Store.active();
        return findTheme(p ? p.theme : DEFAULT_THEME);
    }

    function applyTheme(id) {
        const theme = findTheme(id || currentTheme().id);
        const root = document.documentElement;
        Object.keys(CSS_VARS).forEach(function (k) {
            root.style.setProperty(CSS_VARS[k], theme.colors[k]);
        });
        root.setAttribute("data-theme", theme.id);
        root.style.colorScheme = theme.dark ? "dark" : "light";
        root.classList.toggle("dark", !!theme.dark);
        if (document.body) buildDecor(theme);
        else document.addEventListener("DOMContentLoaded", function () { buildDecor(theme); });
    }

    // A layer of big, faint emoji drifting behind everything.
    function buildDecor(theme) {
        let layer = document.getElementById("decor");
        if (!layer) {
            layer = document.createElement("div");
            layer.id = "decor";
            layer.setAttribute("aria-hidden", "true");
            document.body.prepend(layer);
        }
        layer.innerHTML = "";
        const count = 14;
        for (let i = 0; i < count; i++) {
            const span = document.createElement("span");
            span.textContent = theme.decor[i % theme.decor.length];
            // Spread across a loose grid so they never clump in one corner.
            const col = i % 4, row = Math.floor(i / 4);
            span.style.left = (col * 25 + Math.random() * 18) + "%";
            span.style.top = (row * 26 + Math.random() * 16) + "%";
            span.style.fontSize = (28 + Math.random() * 34).toFixed(0) + "px";
            span.style.animationDuration = (14 + Math.random() * 12).toFixed(1) + "s";
            span.style.animationDelay = (-Math.random() * 20).toFixed(1) + "s";
            layer.appendChild(span);
        }
    }

    // ---------- Confetti ----------

    function confetti(amount) {
        const n = reducedMotion ? 30 : (amount || 120);
        const c = currentTheme().colors;
        const colors = [c.accent, c.accent2, c.tile, "#ffd43b", "#51cf66"];

        const canvas = document.createElement("canvas");
        canvas.className = "confetti";
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        document.body.appendChild(canvas);
        const ctx = canvas.getContext("2d");

        const parts = [];
        for (let i = 0; i < n; i++) {
            parts.push({
                x: canvas.width / 2 + (Math.random() - 0.5) * canvas.width * 0.3,
                y: canvas.height * 0.45,
                vx: (Math.random() - 0.5) * 14,
                vy: -6 - Math.random() * 12,
                size: 6 + Math.random() * 8,
                rot: Math.random() * Math.PI,
                vr: (Math.random() - 0.5) * 0.3,
                color: colors[i % colors.length]
            });
        }

        const start = performance.now();
        function frame(now) {
            const t = now - start;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            parts.forEach(function (p) {
                p.vy += 0.35;
                p.vx *= 0.99;
                p.x += p.vx;
                p.y += p.vy;
                p.rot += p.vr;
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rot);
                ctx.globalAlpha = Math.max(0, 1 - t / 2600);
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
                ctx.restore();
            });
            if (t < 2600) requestAnimationFrame(frame);
            else canvas.remove();
        }
        requestAnimationFrame(frame);
    }

    // ---------- Sound ----------
    // Clips go through Web Audio where possible: once the context is
    // unlocked by a tap, later clips play from timers too (iOS blocks
    // plain <audio> started outside a tap). Falls back to <audio>, then
    // to the browser's speech voice if the file cannot load at all.

    let audioCtx = null;
    const buffers = new Map();
    let playing = [];

    function soundOn() {
        const p = Store.active();
        return !p || p.sound !== false;
    }

    function ctx() {
        if (!audioCtx) {
            try {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
                audioCtx = null;
            }
        }
        return audioCtx;
    }

    // Call from a tap handler.
    function unlockAudio() {
        const c = ctx();
        if (c && c.state === "suspended") c.resume();
    }

    function load(url) {
        if (!buffers.has(url)) {
            const c = ctx();
            const p = (c && window.fetch)
                ? fetch(url)
                    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
                    .then(function (b) {
                        return new Promise(function (res, rej) { c.decodeAudioData(b, res, rej); });
                    })
                    .catch(function () { return null; })
                : Promise.resolve(null);
            buffers.set(url, p);
        }
        return buffers.get(url);
    }

    function preload(urls) {
        urls.forEach(load);
    }

    function stop() {
        playing.forEach(function (s) { try { s.stop(); } catch (e) { /* already done */ } });
        playing = [];
        if (window.speechSynthesis) window.speechSynthesis.cancel();
    }

    function speak(text) {
        return new Promise(function (resolve) {
            if (!text || !("speechSynthesis" in window)) return resolve();
            const u = new SpeechSynthesisUtterance(text);
            u.rate = 0.85;
            u.pitch = 1.1;
            const safety = setTimeout(resolve, 2500);
            u.onend = u.onerror = function () { clearTimeout(safety); resolve(); };
            window.speechSynthesis.speak(u);
        });
    }

    // Resolves when the clip finishes, so callers can chain sounds.
    function play(url, fallbackText, opts) {
        const o = opts || {};
        if (!soundOn()) return Promise.resolve();
        if (!o.overlap) stop();
        return load(url).then(function (buf) {
            const c = ctx();
            if (buf && c) {
                return new Promise(function (resolve) {
                    const src = c.createBufferSource();
                    const gain = c.createGain();
                    gain.gain.value = o.volume || 1;
                    src.buffer = buf;
                    src.connect(gain).connect(c.destination);
                    src.onended = function () {
                        playing = playing.filter(function (s) { return s !== src; });
                        resolve();
                    };
                    playing.push(src);
                    src.start();
                });
            }
            return new Promise(function (resolve) {
                const a = new Audio(url);
                a.onended = resolve;
                a.onerror = function () { speak(fallbackText).then(resolve); };
                a.play().catch(function () { speak(fallbackText).then(resolve); });
            });
        });
    }

    function tone(steps, type, volume) {
        if (!soundOn()) return;
        const c = ctx();
        if (!c) return;
        try {
            let t = c.currentTime;
            steps.forEach(function (s) {
                const osc = c.createOscillator();
                const gain = c.createGain();
                osc.type = type || "sine";
                osc.frequency.setValueAtTime(s.from, t);
                osc.frequency.linearRampToValueAtTime(s.to || s.from, t + s.dur);
                gain.gain.setValueAtTime(volume || 0.18, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + s.dur);
                osc.connect(gain).connect(c.destination);
                osc.start(t);
                osc.stop(t + s.dur);
                t += s.gap != null ? s.gap : s.dur;
            });
        } catch (e) {
            // Audio is a nice-to-have; never let it break gameplay.
        }
    }

    // Soft descending "boop" for a wrong tile.
    function boop() {
        tone([{ from: 320, to: 180, dur: 0.25 }], "sine", 0.18);
    }

    // Rising arpeggio for finishing a level.
    function fanfare() {
        tone([
            { from: 523, dur: 0.16, gap: 0.14 },
            { from: 659, dur: 0.16, gap: 0.14 },
            { from: 784, dur: 0.16, gap: 0.14 },
            { from: 1047, dur: 0.5 }
        ], "triangle", 0.2);
    }

    // ---------- Hold-to-confirm ----------
    // Grown-up gates: the action runs only after a steady press of `ms`.
    // The button's --hold custom property (0..1) drives a fill bar in CSS.
    function holdButton(el, ms, onDone) {
        let raf = 0, start = 0;

        function reset() {
            cancelAnimationFrame(raf);
            el.style.setProperty("--hold", "0");
            el.classList.remove("holding");
        }
        function tick(now) {
            const f = Math.min(1, (now - start) / ms);
            el.style.setProperty("--hold", f.toFixed(3));
            if (f >= 1) {
                reset();
                onDone();
            } else {
                raf = requestAnimationFrame(tick);
            }
        }
        el.addEventListener("pointerdown", function (e) {
            e.preventDefault();
            start = performance.now();
            el.classList.add("holding");
            raf = requestAnimationFrame(tick);
        });
        ["pointerup", "pointerleave", "pointercancel"].forEach(function (ev) {
            el.addEventListener(ev, reset);
        });
        el.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    }

    return {
        shuffle: shuffle,
        esc: esc,
        reducedMotion: reducedMotion,
        currentTheme: currentTheme,
        applyTheme: applyTheme,
        confetti: confetti,
        unlockAudio: unlockAudio,
        preload: preload,
        play: play,
        stop: stop,
        speak: speak,
        boop: boop,
        fanfare: fanfare,
        holdButton: holdButton
    };
})();
