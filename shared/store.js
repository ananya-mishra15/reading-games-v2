/* ============================================================
   store.js — kid profiles, kept in this browser's localStorage.

   Shape:
   { activeId, profiles: [{ id, name, avatar, theme, sound, upper,
                            unlockAll, progress: { gameId: { levelId: stars } } }] }

   Storage can be blocked (private windows, previews), so every read and
   write is guarded and the app keeps working from memory.
   ============================================================ */

const Store = (function () {
    const KEY = "readingGamesV2";
    let data = load();

    function load() {
        try {
            const raw = localStorage.getItem(KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && Array.isArray(parsed.profiles)) return parsed;
            }
        } catch (e) { /* fall through to empty */ }
        return { activeId: null, profiles: [] };
    }

    function save() {
        try {
            localStorage.setItem(KEY, JSON.stringify(data));
        } catch (e) { /* memory-only this session */ }
    }

    function withDefaults(p) {
        return Object.assign({
            theme: DEFAULT_THEME,
            sound: true,
            upper: true,
            unlockAll: false,
            progress: {}
        }, p);
    }

    function profiles() {
        return data.profiles.map(withDefaults);
    }

    function active() {
        const p = data.profiles.find(function (x) { return x.id === data.activeId; });
        return p ? withDefaults(p) : null;
    }

    function setActive(id) {
        data.activeId = id;
        save();
    }

    function addProfile(name, avatar) {
        const p = withDefaults({
            id: "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            name: name,
            avatar: avatar
        });
        data.profiles.push(p);
        data.activeId = p.id;
        save();
        return p;
    }

    function removeProfile(id) {
        data.profiles = data.profiles.filter(function (p) { return p.id !== id; });
        if (data.activeId === id) {
            data.activeId = data.profiles.length ? data.profiles[0].id : null;
        }
        save();
    }

    // Mutate the active profile in place: Store.update(p => { p.sound = false; })
    function update(fn) {
        const i = data.profiles.findIndex(function (x) { return x.id === data.activeId; });
        if (i < 0) return;
        const p = withDefaults(data.profiles[i]);
        fn(p);
        data.profiles[i] = p;
        save();
    }

    function stars(game, levelId) {
        const p = active();
        return (p && p.progress[game] && p.progress[game][levelId]) || 0;
    }

    // Keeps the best result — replaying a level can never lose stars.
    function setStars(game, levelId, n) {
        update(function (p) {
            p.progress[game] = p.progress[game] || {};
            p.progress[game][levelId] = Math.max(p.progress[game][levelId] || 0, n);
        });
    }

    function totalStars(game) {
        const p = active();
        const levels = (p && p.progress[game]) || {};
        return Object.keys(levels).reduce(function (sum, k) { return sum + levels[k]; }, 0);
    }

    // A level is open if it is the first, the one before it was finished,
    // or a grown-up turned on unlock-all.
    function isUnlocked(game, levelIds, index) {
        const p = active();
        if (index === 0 || (p && p.unlockAll)) return true;
        return stars(game, levelIds[index - 1]) > 0;
    }

    return {
        profiles: profiles,
        active: active,
        setActive: setActive,
        addProfile: addProfile,
        removeProfile: removeProfile,
        update: update,
        stars: stars,
        setStars: setStars,
        totalStars: totalStars,
        isUnlocked: isUnlocked
    };
})();
