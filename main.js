/**
 * Calmaria Website — Minimal Atlas-Style Interactive Controller
 */
(function () {
    "use strict";

    const THEME_DATA = {
        dots: {
            name: "Dots.",
            desc: "A calm grid of dots. It swells into a sphere as you breathe in, glimmers as you hold, and settles flat as you let go.",
            iosVideo: "videos/ios_dots.mp4",
            iosPoster: "images/poster_ios_dots.png",
            androidVideo: "videos/android_dots.mp4",
            androidPoster: "images/poster_android_dots.png"
        },
        glass: {
            name: "Glass.",
            desc: "A warm sun over frosted glass. It rises as you breathe in and melts into the blur as you let go.",
            iosVideo: "videos/ios_glass.mp4",
            iosPoster: "images/poster_ios_glass.png",
            androidVideo: "videos/android_glass.mp4",
            androidPoster: "images/poster_android_glass.png"
        },
        "80s": {
            name: "80s.",
            desc: "Where Calmaria began. A setting sun, cut by horizon lines. It grows as you breathe in and shrinks as you breathe out.",
            iosVideo: "videos/ios_80s.mp4",
            iosPoster: "images/poster_ios_80s.png",
            androidVideo: "videos/android_80s.mp4",
            androidPoster: "images/poster_android_80s.png"
        },
        circles: {
            name: "Circles.",
            desc: "Rings that widen like ripples in still water as you breathe in, and draw back as you let go.",
            iosVideo: "videos/ios_circles.mp4",
            iosPoster: "images/poster_ios_circles.png",
            androidVideo: "videos/android_circles.mp4",
            androidPoster: "images/poster_android_circles.png"
        },
        angular: {
            name: "Angular.",
            desc: "Two circles of light, turning in opposite directions. One full turn for every breath.",
            iosVideo: "videos/ios_angular.mp4",
            iosPoster: "images/poster_ios_angular.png",
            androidVideo: "videos/android_angular.mp4",
            androidPoster: "images/poster_android_angular.png"
        }
    };

    const duoVideo = document.getElementById("duoRotateVideo");

    // Device videos exist in a light and a dark appearance (name_dark.mp4 / poster_name_dark.png).
    // `themed` remembers each video's light paths; the dark variant is derived from the site theme.
    const themed = new Map();
    const isDarkMode = () => document.documentElement.getAttribute("data-theme") === "dark";
    const withMode = (path) => (path && isDarkMode() ? path.replace(/(\.[a-z0-9]+)$/i, "_dark$1") : path);

    function applyThemed(videoEl, keepTime) {
        const base = themed.get(videoEl);
        if (!base) return;
        const src = withMode(base.src);
        if (base.poster) videoEl.setAttribute("poster", withMode(base.poster));
        if (videoEl.getAttribute("src") !== src) {
            const t = keepTime ? videoEl.currentTime : 0;
            videoEl.setAttribute("src", src);
            videoEl.load();
            if (t) videoEl.addEventListener("loadedmetadata", () => { try { videoEl.currentTime = t; } catch (_) {} }, { once: true });
        }
        const p = videoEl.play();
        if (p && typeof p.catch === "function") p.catch(() => {});
    }

    function registerThemed(videoEl) {
        if (!videoEl) return;
        themed.set(videoEl, { src: videoEl.getAttribute("src"), poster: videoEl.getAttribute("poster") });
    }

    function switchVideo(videoEl, src, poster) {
        if (!videoEl) return;
        themed.set(videoEl, { src, poster });
        applyThemed(videoEl, false);
    }

    // 1. Light / Dark Mode Toggle
    const siteThemeBtn = document.getElementById("siteThemeBtn");
    const siteThemeLabel = document.getElementById("siteThemeLabel");
    const siteThemeColor = document.getElementById("siteThemeColor");

    function setSiteTheme(mode, remember = true) {
        document.documentElement.setAttribute("data-theme", mode);
        if (remember) {
            try { localStorage.setItem("calmaria_site_theme", mode); } catch (_) {}
        }
        if (siteThemeLabel) siteThemeLabel.textContent = mode === "light" ? "Dark" : "Light";
        if (siteThemeColor) siteThemeColor.setAttribute("content", mode === "dark" ? "#0b0b0c" : "#ffffff");
        themed.forEach((_, el) => applyThemed(el, true));
        updateDuoVideo();
    }

    // The rotation loop: VP9 alpha everywhere except Safari, which gets HEVC alpha.
    const DUO_HAS_DARK = true;
    function updateDuoVideo() {
        if (!duoVideo) return;
        const safari = /^((?!chrome|chromium|android|crios|fxios).)*safari/i.test(navigator.userAgent);
        const name = "videos/duo_rotate" + (DUO_HAS_DARK && isDarkMode() ? "_dark" : "") + (safari ? ".mov" : ".webm");
        if (duoVideo.getAttribute("src") === name) return;
        const t = duoVideo.currentTime;
        duoVideo.querySelectorAll("source").forEach((n) => n.remove());
        duoVideo.setAttribute("src", name);
        duoVideo.load();
        if (t) duoVideo.addEventListener("loadedmetadata", () => { try { duoVideo.currentTime = t; } catch (_) {} }, { once: true });
        const p = duoVideo.play();
        if (p && typeof p.catch === "function") p.catch(() => {});
    }

    ["heroIosVideo", "heroAndroidVideo", "showcaseIosVideo", "showcaseAndroidVideo"].forEach((id) => registerThemed(document.getElementById(id)));

    // Follow the device until the visitor picks a side
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)");
    let stored = null;
    try { stored = localStorage.getItem("calmaria_site_theme"); } catch (_) {}
    setSiteTheme(stored || (systemDark.matches ? "dark" : "light"), false);
    if (systemDark.addEventListener) {
        systemDark.addEventListener("change", (e) => {
            let pick = null;
            try { pick = localStorage.getItem("calmaria_site_theme"); } catch (_) {}
            if (!pick) setSiteTheme(e.matches ? "dark" : "light", false);
        });
    }

    if (siteThemeBtn) {
        siteThemeBtn.addEventListener("click", () => {
            const current = document.documentElement.getAttribute("data-theme") || "light";
            setSiteTheme(current === "light" ? "dark" : "light");
        });
    }

    // 2. Interactive 5-Theme Video Switcher
    const showcaseIosVideo = document.getElementById("showcaseIosVideo");
    const showcaseAndroidVideo = document.getElementById("showcaseAndroidVideo");
    const showcaseCaption = document.getElementById("showcaseCaption");

    document.querySelectorAll(".atlas-pill[data-theme]").forEach(pill => {
        pill.addEventListener("click", () => {
            const key = pill.dataset.theme;
            const info = THEME_DATA[key];
            if (!info) return;

            document.querySelectorAll(".atlas-pill[data-theme]").forEach(btn => {
                const active = btn === pill;
                btn.classList.toggle("active", active);
                btn.setAttribute("aria-selected", String(active));
            });

            switchVideo(showcaseIosVideo, info.iosVideo, info.iosPoster);
            switchVideo(showcaseAndroidVideo, info.androidVideo, info.androidPoster);
            if (showcaseCaption) {
                showcaseCaption.innerHTML = `<span class="t-primary">${info.name} </span>${info.desc}`;
            }
        });
    });

    // 3. Cuelume Synthesized Audio Preview
    let audioCtx = null;
    function playTone(freq, start, dur, peak = 0.07, type = "sine", endFreq = null) {
        if (!audioCtx) {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (Ctx) audioCtx = new Ctx();
        }
        if (!audioCtx) return;
        if (audioCtx.state === "suspended") audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, start);
        if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, start + dur);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.linearRampToValueAtTime(peak, start + Math.min(0.015, dur * 0.25));
        gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(start);
        osc.stop(start + dur + 0.01);
    }

    document.querySelectorAll("[data-play-cue]").forEach(btn => {
        btn.addEventListener("click", () => {
            if (!audioCtx) {
                const Ctx = window.AudioContext || window.webkitAudioContext;
                if (Ctx) audioCtx = new Ctx();
            }
            if (!audioCtx) return;
            if (audioCtx.state === "suspended") audioCtx.resume();
            const now = audioCtx.currentTime;
            const cue = btn.dataset.playCue;

            btn.classList.add("playing");
            setTimeout(() => btn.classList.remove("playing"), 380);

            if (cue === "tick") {
                playTone(1800, now, 0.08, 0.045, "sine", 1650);
            } else if (cue === "transition") {
                playTone(880, now, 0.28, 0.065, "sine");
                playTone(1174.66, now + 0.09, 0.42, 0.075, "sine");
                playTone(2349.32, now + 0.09, 0.25, 0.02, "triangle");
            } else if (cue === "success") {
                playTone(880.0, now, 0.35, 0.065, "sine");
                playTone(1108.73, now + 0.11, 0.40, 0.065, "sine");
                playTone(1318.51, now + 0.22, 0.65, 0.075, "sine");
            } else if (cue === "stop") {
                playTone(660, now, 0.26, 0.065, "sine", 440);
            }
        });
    });

    // 4. 'Start breathing now' CTA highlight pulse on download buttons
    const headerDownloadCta = document.getElementById("headerDownloadCta");
    const downloadRow = document.getElementById("download");
    if (headerDownloadCta && downloadRow) {
        headerDownloadCta.addEventListener("click", () => {
            downloadRow.classList.add("highlight-pulse");
            setTimeout(() => downloadRow.classList.remove("highlight-pulse"), 850);
        });
    }
})();