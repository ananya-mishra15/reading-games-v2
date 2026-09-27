// Hub page: players, theme picker, settings.

const AVATARS = ["🐶", "🐱", "🦊", "🐼", "🐨", "🐯", "🦁", "🐸",
                 "🐵", "🐰", "🐻", "🐷", "🦄", "🐙", "🐢", "🐧"];

// Word Builder has 15 levels × 3 stars.
const WORD_BUILDER_MAX_STARS = 45;

// DOM elements
const chipAvatar = document.getElementById("chip-avatar");
const chipName = document.getElementById("chip-name");
const profileChip = document.getElementById("profile-chip");
const settingsBtn = document.getElementById("settings-btn");
const wbStars = document.getElementById("wb-stars");
const themesEl = document.getElementById("themes");

const profileModal = document.getElementById("profile-modal");
const profileList = document.getElementById("profile-list");
const newForm = document.getElementById("new-form");
const newName = document.getElementById("new-name");
const avatarGrid = document.getElementById("avatar-grid");
const addBtn = document.getElementById("add-btn");
const createBtn = document.getElementById("create-btn");
const profileClose = document.getElementById("profile-close");

const settingsModal = document.getElementById("settings-modal");
const settingsTitle = document.getElementById("settings-title");
const soundToggle = document.getElementById("sound-toggle");
const caseToggle = document.getElementById("case-toggle");
const unlockBtn = document.getElementById("unlock-btn");
const unlockText = document.getElementById("unlock-text");
const unlockLabel = document.getElementById("unlock-label");
const deleteBtn = document.getElementById("delete-btn");
const settingsClose = document.getElementById("settings-close");

let chosenAvatar = AVATARS[0];

// ---------- Main page ----------

function render() {
    const p = Store.active();
    UI.applyTheme();
    if (p) {
        chipAvatar.textContent = p.avatar;
        chipName.textContent = p.name;
    }
    wbStars.textContent = "⭐ " + Store.totalStars("word-builder") + " / " + WORD_BUILDER_MAX_STARS;
    renderThemes();
}

function renderThemes() {
    const current = UI.currentTheme().id;
    themesEl.innerHTML = THEMES.map(function (t) {
        const stripes = themeSwatch(t).map(function (c) {
            return '<i style="background:' + c + '"></i>';
        }).join("");
        return '<button class="theme-card' + (t.id === current ? " selected" : "") +
            '" data-theme="' + t.id + '" aria-pressed="' + (t.id === current) + '">' +
            '<div class="theme-swatch">' + stripes + "</div>" +
            '<div class="theme-name">' + UI.esc(t.name) + "</div>" +
            '<div class="theme-decor">' + t.decor.slice(0, 3).join("") + "</div>" +
            "</button>";
    }).join("");
}

themesEl.addEventListener("click", function (e) {
    const card = e.target.closest(".theme-card");
    if (!card) return;
    Store.update(function (p) { p.theme = card.dataset.theme; });
    render();
});

// ---------- Players ----------

function openProfiles(mustChoose) {
    const list = Store.profiles();
    const active = Store.active();
    profileList.innerHTML = list.map(function (p) {
        return '<button class="profile-btn' + (active && p.id === active.id ? " selected" : "") +
            '" data-id="' + p.id + '"><span class="av">' + p.avatar + '</span>' +
            '<span class="nm">' + UI.esc(p.name) + "</span></button>";
    }).join("");

    const firstTime = list.length === 0;
    showNewForm(firstTime);
    profileClose.classList.toggle("hidden", mustChoose || firstTime);
    profileModal.classList.remove("hidden");
}

function showNewForm(show) {
    newForm.classList.toggle("hidden", !show);
    createBtn.classList.toggle("hidden", !show);
    addBtn.classList.toggle("hidden", show);
    if (show) {
        newName.value = "";
        chosenAvatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
        renderAvatars();
        setTimeout(function () { newName.focus(); }, 50);
    }
}

function renderAvatars() {
    avatarGrid.innerHTML = AVATARS.map(function (a) {
        return '<button class="avatar-opt' + (a === chosenAvatar ? " selected" : "") +
            '" data-av="' + a + '" aria-label="' + a + '">' + a + "</button>";
    }).join("");
}

profileList.addEventListener("click", function (e) {
    const btn = e.target.closest(".profile-btn");
    if (!btn) return;
    Store.setActive(btn.dataset.id);
    profileModal.classList.add("hidden");
    render();
});

avatarGrid.addEventListener("click", function (e) {
    const btn = e.target.closest(".avatar-opt");
    if (!btn) return;
    chosenAvatar = btn.dataset.av;
    renderAvatars();
});

addBtn.addEventListener("click", function () { showNewForm(true); });

function createProfile() {
    const name = newName.value.trim();
    if (!name) {
        newName.focus();
        newName.placeholder = "Type your name first!";
        return;
    }
    Store.addProfile(name, chosenAvatar);
    profileModal.classList.add("hidden");
    render();
}

createBtn.addEventListener("click", createProfile);
newName.addEventListener("keydown", function (e) {
    if (e.key === "Enter") createProfile();
});

profileChip.addEventListener("click", function () { openProfiles(false); });
profileClose.addEventListener("click", function () { profileModal.classList.add("hidden"); });

// ---------- Settings ----------

function renderSettings() {
    const p = Store.active();
    if (!p) return;
    settingsTitle.textContent = "⚙️ Settings for " + p.name;
    soundToggle.setAttribute("aria-pressed", String(p.sound));
    soundToggle.textContent = p.sound ? "On" : "Off";
    caseToggle.setAttribute("aria-pressed", String(p.upper));
    caseToggle.textContent = p.upper ? "ABC" : "abc";
    unlockLabel.textContent = p.unlockAll ? "All levels are open 🔓" : "Unlock all levels";
    unlockText.textContent = p.unlockAll ? "Hold to lock again" : "Hold to unlock";
}

settingsBtn.addEventListener("click", function () {
    if (!Store.active()) return openProfiles(true);
    renderSettings();
    settingsModal.classList.remove("hidden");
});

soundToggle.addEventListener("click", function () {
    Store.update(function (p) { p.sound = !p.sound; });
    renderSettings();
});

caseToggle.addEventListener("click", function () {
    Store.update(function (p) { p.upper = !p.upper; });
    renderSettings();
});

UI.holdButton(unlockBtn, 3000, function () {
    Store.update(function (p) { p.unlockAll = !p.unlockAll; });
    renderSettings();
});

UI.holdButton(deleteBtn, 3000, function () {
    const p = Store.active();
    if (!p) return;
    Store.removeProfile(p.id);
    settingsModal.classList.add("hidden");
    render();
    openProfiles(true);
});

settingsClose.addEventListener("click", function () { settingsModal.classList.add("hidden"); });

// Initialize
render();
if (!Store.active()) openProfiles(true);
