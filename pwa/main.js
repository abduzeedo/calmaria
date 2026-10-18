/**
 * Calmaria Web App (2026) — Full Feature Parity with Native iOS & Android Apps
 * Includes:
 * - 5 Visual Themes: Circles (parallax), Glass, 80s, Dots (3D inflating sphere), Angle Gradient
 * - Built-in & Custom Breathing Presets (478, 5555, 505, 711 + Custom Preset Editor)
 * - Cuelume Real-time Web Audio Synthesized Sound Engine + Haptics
 * - Post-Session Confetti & Mood Tracking + Session History & Statistics
 */
(function () {
    "use strict";

    const BUILTIN_PRESETS = [
        { id: "478", name: "478", subtitle: "Relaxing Breath", inhale: 4, hold1: 7, exhale: 8, hold2: 0, reps: 4, builtin: true },
        { id: "5555", name: "5555", subtitle: "Box Breathing", inhale: 5, hold1: 5, exhale: 5, hold2: 5, reps: 5, builtin: true },
        { id: "505", name: "505", subtitle: "Coherent Breath", inhale: 5, hold1: 0, exhale: 5, hold2: 0, reps: 9, builtin: true },
        { id: "711", name: "711", subtitle: "Deep Tranquility", inhale: 7, hold1: 0, exhale: 11, hold2: 0, reps: 7, builtin: true }
    ];

    // State persisted in localStorage
    const state = {
        themeIdx: Number(localStorage.getItem("calmaria_theme_idx") ?? 0),
        colorMode: "light",
        platform: /Android/i.test(navigator.userAgent) ? "android" : "ios",
        soundEnabled: localStorage.getItem("calmaria_sound") !== "false",
        vibrateEnabled: localStorage.getItem("calmaria_vibrate") !== "false",
        selectedPresetId: localStorage.getItem("calmaria_preset_id") || "478",
        customPresets: JSON.parse(localStorage.getItem("calmaria_custom_presets") || "[]"),
        history: JSON.parse(localStorage.getItem("calmaria_history") || "[]"),

        // Runtime exercise state
        isRunning: false,
        phase: "idle", // "idle" | "inhale" | "hold1" | "exhale" | "hold2"
        phaseDuration: 0,
        phaseRemainingSec: 0,
        phaseStartTime: 0,
        repsRemaining: 4,
        breathProgress: 0, // 0.0 (exhaled) .. 1.0 (inhaled)
        parallaxX: 0,
        parallaxY: 0,
        lastCompletedSessionIdx: -1
    };

    // =========================================================================
    // Cuelume Synthesized Sound Engine (Matches SoundManager.swift)
    // =========================================================================
    class CuelumeAudioEngine {
        constructor() {
            this.ctx = null;
        }
        ensureContext() {
            if (!this.ctx) {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (AudioCtx) this.ctx = new AudioCtx();
            }
            if (this.ctx && this.ctx.state === "suspended") {
                this.ctx.resume();
            }
            return this.ctx;
        }
        playTone(freq, startTime, duration, peakGain = 0.08, type = "sine", endFreq = null) {
            const ctx = this.ensureContext();
            if (!ctx) return;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, startTime);
            if (endFreq) {
                osc.frequency.exponentialRampToValueAtTime(endFreq, startTime + duration);
            }
            gain.gain.setValueAtTime(0.0001, startTime);
            gain.gain.linearRampToValueAtTime(peakGain, startTime + Math.min(0.015, duration * 0.25));
            gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(startTime);
            osc.stop(startTime + duration + 0.01);
        }
        playCue(cueName, force = false) {
            if (!force && !state.soundEnabled) return;
            const ctx = this.ensureContext();
            if (!ctx) return;
            const now = ctx.currentTime;
            switch (cueName) {
                case "tick":
                    // Subtle organic 1800Hz ping (80ms)
                    this.playTone(1800, now, 0.08, 0.035, "sine", 1650);
                    break;
                case "transition":
                    // 2-note meditation chime (880Hz + 1174.66Hz D6 with harmonic shimmer)
                    this.playTone(880, now, 0.28, 0.06, "sine");
                    this.playTone(1174.66, now + 0.09, 0.42, 0.07, "sine");
                    this.playTone(2349.32, now + 0.09, 0.25, 0.018, "triangle");
                    break;
                case "start":
                    // Gentle ascending sweep
                    this.playTone(587.33, now, 0.22, 0.055, "sine");
                    this.playTone(880.0, now + 0.08, 0.36, 0.065, "sine");
                    break;
                case "stop":
                    // Downward resolving glide (660Hz -> 440Hz)
                    this.playTone(660, now, 0.26, 0.06, "sine", 440);
                    break;
                case "success":
                    // Warm 3-note ascending major triad (A5, C#6, E6)
                    this.playTone(880.0, now, 0.35, 0.065, "sine");
                    this.playTone(1108.73, now + 0.11, 0.40, 0.065, "sine");
                    this.playTone(1318.51, now + 0.22, 0.65, 0.075, "sine");
                    break;
                case "sparkle":
                    // Playful high chime for mood selection
                    this.playTone(1318.51, now, 0.15, 0.05, "sine");
                    this.playTone(1760.0, now + 0.06, 0.28, 0.06, "sine");
                    break;
            }
        }
    }

    const audio = new CuelumeAudioEngine();

    function triggerHaptic(pattern = 18) {
        if (state.vibrateEnabled && navigator.vibrate) {
            try { navigator.vibrate(pattern); } catch (_) {}
        }
    }

    // =========================================================================
    // DOM Elements
    // =========================================================================
    const el = {
        optionsOrStopBtn: document.getElementById("optionsOrStopBtn"),
        iconOptions: document.getElementById("iconOptions"),
        iconStop: document.getElementById("iconStop"),
        settingsTitle: document.getElementById("settingsTitle"),
        themeStage: document.getElementById("themeStage"),
        stageCircles: document.getElementById("stageCircles"),
        stageGlass: document.getElementById("stageGlass"),
        stage80s: document.getElementById("stage80s"),
        stageDots: document.getElementById("stageDots"),
        stageAngular: document.getElementById("stageAngular"),
        glassSun: document.getElementById("glassSun"),
        retroSun: document.getElementById("retroSun"),
        lines80sContainer: document.getElementById("lines80sContainer"),
        dotsCanvas: document.getElementById("dotsCanvas"),
        angularTop: document.getElementById("angularTop"),
        angularBottom: document.getElementById("angularBottom"),
        phaseTopLabel: document.getElementById("phaseTopLabel"),
        phaseBottomLabel: document.getElementById("phaseBottomLabel"),
        timerDisplay: document.getElementById("timerDisplay"),
        repsDisplay: document.getElementById("repsDisplay"),
        settingsSheet: document.getElementById("settingsSheet"),
        congratsSheet: document.getElementById("congratsSheet"),
        statsSheet: document.getElementById("statsSheet"),
        aboutSheet: document.getElementById("aboutSheet"),
        presetsList: document.getElementById("presetsList"),
        customPresetForm: document.getElementById("customPresetForm"),
        soundToggle: document.getElementById("soundToggle"),
        vibrateToggle: document.getElementById("vibrateToggle"),
        settingsStatsCount: document.getElementById("settingsStatsCount"),
        congratsExercise: document.getElementById("congratsExercise"),
        congratsReps: document.getElementById("congratsReps"),
        congratsTotal: document.getElementById("congratsTotal"),
        moodPicker: document.getElementById("moodPicker"),
        statsMostUsed: document.getElementById("statsMostUsed"),
        statsTotal: document.getElementById("statsTotal"),
        statsFeel: document.getElementById("statsFeel"),
        historyList: document.getElementById("historyList")
    };

    const rings = Array.from(document.querySelectorAll(".concentric-ring"));

    // Per-platform artwork geometry, measured from the shipping apps.
    // Sizes are fractions of the artwork width unless noted.
    const ART = {
        ios: {
            ringBase: (w, h) => Math.min(w - 57.6, h),
            ringIdle: [1, 0.91, 0.76, 0.59, 0.41],
            ringMax: [1, 0.97, 0.87, 0.75, 0.64],
            glass: { idle: 0.70, max: 0.96 },
            retro: { idle: 0.706, max: 0.96, dy: 24, start: 0.06, pitch: 0.0363 },
            angular: 0.577
        },
        android: {
            ringBase: (w, h) => Math.min(w, h),
            ringIdle: [0.90, 0.80, 0.70, 0.60, 0.50],
            ringMax: [0.98, 0.90, 0.82, 0.74, 0.64],
            glass: { idle: 0.76, max: 0.88 },
            retro: { idle: 0.72, max: 0.84, dy: 0, start: 0.0, pitch: 0.036 },
            angular: 0.58
        }
    };
    const RETRO_GAPS = 8;

    // 80s: bg-coloured gaps cut across the lower half of the disc. Gap k starts
    // at start + k * pitch (in disc diameters from the centre) and grows with k.
    function init80sLines() {
        const geo = ART[state.platform].retro;
        el.lines80sContainer.innerHTML = "";
        for (let i = 0; i < RETRO_GAPS; i++) {
            const gap = document.createElement("div");
            gap.className = "line-80s-gap";
            const gapPx = 0.0035 + i * 0.0046;           // in disc diameters
            gap.style.top = `${(0.5 + geo.start + i * geo.pitch) * 100}%`;
            gap.style.height = `${gapPx * 100}%`;
            el.lines80sContainer.appendChild(gap);
        }
        // Everything below the last bar is hidden
        const cutAt = 0.5 + geo.start + (RETRO_GAPS - 0.15) * geo.pitch;
        el.retroSun.querySelector(".sun-disc").style.clipPath = `inset(0 0 ${(1 - cutAt) * 100}% 0)`;
    }

    function getAllPresets() {
        return [...BUILTIN_PRESETS, ...state.customPresets];
    }

    function getActivePreset() {
        const all = getAllPresets();
        return all.find(p => p.id === state.selectedPresetId) || BUILTIN_PRESETS[0];
    }

    function pad2(n) {
        return String(Math.max(0, Math.floor(n))).padStart(2, "0");
    }

    // =========================================================================
    // Theme & Appearance Management
    // =========================================================================
    function applyColorMode(mode) {
        state.colorMode = mode;
        document.documentElement.setAttribute("data-theme", mode);
        const bg = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim();
        const metaTheme = document.getElementById("metaThemeColor");
        if (metaTheme && bg) metaTheme.setAttribute("content", bg);
    }

    function applyPlatform(platform) {
        state.platform = platform;
        document.documentElement.setAttribute("data-platform", platform);
        if (el.settingsTitle) el.settingsTitle.textContent = platform === "android" ? "Options" : "Settings";
    }

    function applyThemeIdx(idx) {
        state.themeIdx = Math.max(0, Math.min(4, Number(idx)));
        localStorage.setItem("calmaria_theme_idx", String(state.themeIdx));

        const layers = [el.stageCircles, el.stageGlass, el.stage80s, el.stageDots, el.stageAngular];
        layers.forEach((layer, i) => layer.classList.toggle("hidden", i !== state.themeIdx));

        document.querySelectorAll(".theme-option-card").forEach(btn => {
            btn.classList.toggle("active", Number(btn.dataset.themeIdx) === state.themeIdx);
        });
    }

    // =========================================================================
    // Breathing Exercise State Machine
    // =========================================================================
    let tickInterval = null;

    function updateTrackerUI() {
        const preset = getActivePreset();
        if (!state.isRunning) {
            el.phaseTopLabel.textContent = "TAP TO";
            el.phaseBottomLabel.textContent = "START";
            el.timerDisplay.textContent = "00";
            el.repsDisplay.textContent = pad2(preset.reps);
            el.iconOptions.classList.remove("hidden");
            el.iconStop.classList.add("hidden");
            return;
        }

        el.iconOptions.classList.add("hidden");
        el.iconStop.classList.remove("hidden");

        if (state.phase === "inhale") {
            el.phaseTopLabel.textContent = "INHALE FROM";
            el.phaseBottomLabel.textContent = "NOSE";
        } else if (state.phase === "hold1") {
            el.phaseTopLabel.textContent = "NOW JUST";
            el.phaseBottomLabel.textContent = "HOLD";
        } else if (state.phase === "exhale") {
            el.phaseTopLabel.textContent = "EXHALE FROM";
            el.phaseBottomLabel.textContent = "MOUTH";
        } else if (state.phase === "hold2") {
            el.phaseTopLabel.textContent = "AGAIN JUST";
            el.phaseBottomLabel.textContent = "HOLD";
        }

        el.timerDisplay.textContent = pad2(state.phaseRemainingSec);
        el.repsDisplay.textContent = pad2(state.repsRemaining);
    }

    function enterPhase(phaseName) {
        const preset = getActivePreset();
        state.phase = phaseName;
        state.phaseStartTime = performance.now();

        if (phaseName === "inhale") {
            state.phaseDuration = preset.inhale;
        } else if (phaseName === "hold1") {
            state.phaseDuration = preset.hold1;
        } else if (phaseName === "exhale") {
            state.phaseDuration = preset.exhale;
        } else if (phaseName === "hold2") {
            state.phaseDuration = preset.hold2;
        }

        state.phaseRemainingSec = state.phaseDuration;
        updateTrackerUI();
    }

    function advancePhase() {
        const preset = getActivePreset();
        if (state.phase === "inhale") {
            if (preset.hold1 > 0) {
                audio.playCue("transition");
                triggerHaptic(22);
                enterPhase("hold1");
            } else {
                audio.playCue("transition");
                triggerHaptic(22);
                enterPhase("exhale");
            }
        } else if (state.phase === "hold1") {
            audio.playCue("transition");
            triggerHaptic(22);
            enterPhase("exhale");
        } else if (state.phase === "exhale") {
            if (preset.hold2 > 0) {
                audio.playCue("transition");
                triggerHaptic(22);
                enterPhase("hold2");
            } else {
                completeRepetition();
            }
        } else if (state.phase === "hold2") {
            completeRepetition();
        }
    }

    function completeRepetition() {
        state.repsRemaining -= 1;
        if (state.repsRemaining > 0) {
            audio.playCue("transition");
            triggerHaptic([18, 40, 18]);
            enterPhase("inhale");
        } else {
            finishSession();
        }
    }

    function startSession() {
        const preset = getActivePreset();
        state.isRunning = true;
        state.repsRemaining = preset.reps;
        state.breathProgress = 0;
        audio.playCue("start");
        triggerHaptic(25);
        enterPhase("inhale");

        if (tickInterval) clearInterval(tickInterval);
        tickInterval = setInterval(() => {
            if (!state.isRunning) return;
            state.phaseRemainingSec -= 1;
            if (state.phaseRemainingSec > 0) {
                audio.playCue("tick");
                updateTrackerUI();
            } else {
                advancePhase();
            }
        }, 1000);
    }

    function stopSession(playSound = true) {
        state.isRunning = false;
        state.phase = "idle";
        if (tickInterval) {
            clearInterval(tickInterval);
            tickInterval = null;
        }
        if (playSound) {
            audio.playCue("stop");
            triggerHaptic(15);
        }
        updateTrackerUI();
    }

    function finishSession() {
        const preset = getActivePreset();
        stopSession(false);
        audio.playCue("success");
        triggerHaptic([30, 60, 40]);

        // Record session in history
        const entry = {
            preset: preset.name,
            reps: preset.reps,
            timestamp: Date.now(),
            feel: "😀",
            device: "🌐"
        };
        state.history.unshift(entry);
        state.lastCompletedSessionIdx = 0;
        saveHistory();

        // Populate & show Congratulations Sheet
        el.congratsExercise.textContent = preset.name;
        el.congratsReps.textContent = String(preset.reps);
        el.congratsTotal.textContent = String(state.history.length);
        el.moodPicker.querySelectorAll(".ios-mood-emoji").forEach((btn, i) => {
            btn.classList.toggle("selected", i === 0);
        });
        openSheet(el.congratsSheet);
        triggerConfettiBounce();
    }

    // =========================================================================
    // Native iOS ConfettiView(q: 200) Canvas Simulation (Matches Congratulations.swift)
    // =========================================================================
    const confettiCanvas = document.getElementById("iosConfettiCanvas");
    const CONFETTI_COLORS = ["#007AFF", "#34C759", "#FFCC00", "#FF3B30", "#FF2D55", "#FF9500", "#AF52DE"];
    const confettiParticles = Array.from({ length: 180 }, () => ({
        x: Math.random(),
        y: Math.random(),
        size: 3 + Math.random() * 5.5,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        circle: Math.random() > 0.5,
        vy: 0.08 + Math.random() * 0.14,
        vx: (Math.random() - 0.5) * 0.08,
        phase: Math.random() * Math.PI * 2,
        bounceAmp: 12 + Math.random() * 26
    }));
    let confettiBounceTime = 0;

    function triggerConfettiBounce() {
        confettiBounceTime = performance.now();
    }

    function drawIosConfetti(now) {
        if (!confettiCanvas || !el.congratsSheet.classList.contains("active")) return;
        const rect = confettiCanvas.parentElement.getBoundingClientRect();
        if (rect.width < 10 || rect.height < 10) return;
        const dpr = window.devicePixelRatio || 1;
        if (confettiCanvas.width !== Math.floor(rect.width * dpr) || confettiCanvas.height !== Math.floor(rect.height * dpr)) {
            confettiCanvas.width = Math.floor(rect.width * dpr);
            confettiCanvas.height = Math.floor(rect.height * dpr);
        }
        const ctx = confettiCanvas.getContext("2d");
        ctx.save();
        ctx.scale(dpr, dpr);
        const W = rect.width;
        const H = rect.height;
        ctx.clearRect(0, 0, W, H);

        const dtBounce = (now - confettiBounceTime) / 1000;
        const bounceOffset = dtBounce >= 0 && dtBounce < 1.8
            ? -Math.exp(-3.2 * dtBounce) * Math.sin(10 * dtBounce)
            : 0;

        const tSec = now * 0.001;
        for (const p of confettiParticles) {
            const px = ((p.x + Math.sin(tSec * 1.4 + p.phase) * 0.03 + 1) % 1) * (W - 24) + 12;
            let py = ((p.y + tSec * p.vy) % 1) * (H - 16) + 8;
            py += bounceOffset * p.bounceAmp;
            ctx.fillStyle = p.color;
            if (p.circle) {
                ctx.beginPath();
                ctx.arc(px, py, p.size / 2, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.fillRect(px - p.size / 2, py - p.size / 2, p.size, p.size);
            }
        }
        ctx.restore();
    }

    // =========================================================================
    // 60FPS Visual Theme Animation Loop (Circles, Glass, 80s, Dots 3D, Angular)
    // =========================================================================
    function easeInOutSine(t) {
        return 0.5 - 0.5 * Math.cos(Math.PI * Math.max(0, Math.min(1, t)));
    }

    function lerp(a, b, t) { return a + (b - a) * t; }

    // Stage geometry: every artwork is sized from the stage like the native layouts
    const stageSize = { w: 402, h: 520 };
    let dotsColor = "#1c1c1e";

    function refreshColors() {
        dotsColor = getComputedStyle(document.documentElement).getPropertyValue("--dots").trim() || dotsColor;
    }

    // Artwork width: portrait layouts size artwork against the full screen width
    // (the stage itself is inset by the page padding); wide layouts use the stage.
    let artW = 402;

    function measureStage() {
        const r = el.themeStage.getBoundingClientRect();
        if (r.width < 1) return;
        stageSize.w = r.width;
        stageSize.h = r.height;
        const wide = window.matchMedia("(min-width: 768px)").matches;
        const pad = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--platform-pad")) || 24;
        artW = wide ? stageSize.w : stageSize.w + pad * 2;
        const art = ART[state.platform];
        const refW = Math.min(artW, stageSize.h);
        el.themeStage.style.setProperty("--ring-base", `${Math.max(120, art.ringBase(artW, stageSize.h))}px`);
        el.glassSun.style.setProperty("--sun-max", `${refW * art.glass.max}px`);
        el.retroSun.style.setProperty("--sun-max", `${refW * art.retro.max}px`);
        el.stageAngular.style.setProperty("--ang-d", `${Math.min(artW * art.angular, stageSize.h / 2)}px`);
    }

    function renderLoop(now) {
        drawIosConfetti(now);

        // Compute smooth breathProgress in [0, 1]
        if (state.isRunning && state.phaseDuration > 0) {
            const elapsed = (now - state.phaseStartTime) / 1000;
            const p = Math.max(0, Math.min(1, elapsed / state.phaseDuration));
            if (state.phase === "inhale") {
                state.breathProgress = easeInOutSine(p);
            } else if (state.phase === "hold1") {
                state.breathProgress = 1.0;
            } else if (state.phase === "exhale") {
                state.breathProgress = 1.0 - easeInOutSine(p);
            } else if (state.phase === "hold2") {
                state.breathProgress = 0.0;
            }
        } else {
            // Idle: the artwork rests at its smallest size, like the native apps
            state.breathProgress += (0 - state.breathProgress) * 0.12;
        }

        const b = state.breathProgress;
        const art = ART[state.platform];

        if (state.themeIdx === 0) {
            for (let i = 0; i < rings.length; i++) {
                const f = lerp(art.ringIdle[i], art.ringMax[i], b);
                const depth = 4 - i;
                const ox = state.parallaxX * depth * 2;
                const oy = state.parallaxY * depth * 2;
                rings[i].style.transform = `translate3d(${ox.toFixed(1)}px, ${oy.toFixed(1)}px, 0) scale(${f.toFixed(4)})`;
            }
        } else if (state.themeIdx === 1) {
            const d = lerp(art.glass.idle, art.glass.max, b) / art.glass.max;
            el.glassSun.style.transform = `scale(${d.toFixed(4)})`;
        } else if (state.themeIdx === 2) {
            const d = lerp(art.retro.idle, art.retro.max, b) / art.retro.max;
            el.retroSun.style.transform = `translateY(${art.retro.dy}px) scale(${d.toFixed(4)})`;
        } else if (state.themeIdx === 3) {
            drawDotsSphere(now, b);
        } else if (state.themeIdx === 4) {
            const deg = b * 360;
            el.angularTop.style.transform = `rotate(${deg.toFixed(1)}deg)`;
            el.angularBottom.style.transform = `rotate(${(-deg).toFixed(1)}deg)`;
        }

        requestAnimationFrame(renderLoop);
    }

    function drawDotsSphere(now, breath) {
        const canvas = el.dotsCanvas;
        const rect = canvas.parentElement.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const targetW = Math.floor(rect.width * dpr);
        const targetH = Math.floor(rect.height * dpr);
        if (canvas.width !== targetW || canvas.height !== targetH) {
            canvas.width = targetW;
            canvas.height = targetH;
        }
        const ctx = canvas.getContext("2d");
        ctx.save();
        ctx.scale(dpr, dpr);
        const W = rect.width;
        const H = rect.height;
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = dotsColor;

        // Grid fills the stage: ~21 pt columns, ~20 pt rows, inset 33 pt / 18 pt
        const wideLayout = window.matchMedia("(min-width: 768px)").matches;
        const insetX = (state.platform === "android" ? 25 : 33) - (wideLayout ? 0 : (state.platform === "android" ? 16 : 24));
        const insetY = 18;
        const cols = Math.max(9, Math.round((W - insetX * 2) / 21) + 1);
        const rows = Math.max(9, Math.round((H - insetY * 2) / 20.1) + 1);
        const sx = (W - insetX * 2) / (cols - 1);
        const sy = (H - insetY * 2) / (rows - 1);
        const cx = W / 2;
        const cy = H / 2;
        const sphereR = Math.min(W - 24, H) * 0.44;
        const shimmer = now * 0.0025;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const px = insetX + c * sx;
                const py = insetY + r * sy;
                const dx = px - cx;
                const dy = py - cy;
                const dist = Math.hypot(dx, dy);

                let drawX = px;
                let drawY = py;
                let radius = 3;

                if (dist < sphereR && breath > 0.001) {
                    const normD = dist / sphereR;
                    const z = Math.sqrt(Math.max(0, 1 - normD * normD));
                    const push = 1 + 0.2 * breath * z * (1 + 0.05 * Math.sin(shimmer + r * 0.35));
                    drawX = cx + dx * push;
                    drawY = cy + dy * push;
                    radius = 3 + 5.2 * breath * Math.pow(z, 1.15);
                }

                ctx.beginPath();
                ctx.arc(drawX, drawY, radius, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.restore();
    }

    // =========================================================================
    // Presets, Statistics & Modals UI (Inset Grouped Native iOS/Android Style)
    // =========================================================================
    function renderPresetsList() {
        const all = getAllPresets();
        el.presetsList.innerHTML = "";
        all.forEach(preset => {
            const row = document.createElement("div");
            row.className = `ios-row ios-row-btn preset-item ${preset.id === state.selectedPresetId ? "active" : ""}`;
            row.innerHTML = `
                <div class="ios-row-stack">
                    <span class="ios-row-title">${preset.name}</span>
                    <span class="ios-row-sub">${preset.inhale}-${preset.hold1}-${preset.exhale}${preset.hold2 > 0 ? `-${preset.hold2}` : ""} • ${preset.reps} reps</span>
                </div>
                <div class="ios-row-right">
                    ${!preset.builtin ? `<button type="button" class="delete-preset-btn" data-del-id="${preset.id}">Delete</button>` : ""}
                    <span class="ios-check-icon">✓</span>
                </div>
            `;
            row.addEventListener("click", (e) => {
                const delBtn = e.target.closest("[data-del-id]");
                if (delBtn) {
                    e.stopPropagation();
                    deleteCustomPreset(delBtn.dataset.delId);
                    return;
                }
                state.selectedPresetId = preset.id;
                localStorage.setItem("calmaria_preset_id", preset.id);
                if (state.isRunning) stopSession(false);
                updateTrackerUI();
                renderPresetsList();
            });
            el.presetsList.appendChild(row);
        });
    }

    function deleteCustomPreset(id) {
        state.customPresets = state.customPresets.filter(p => p.id !== id);
        localStorage.setItem("calmaria_custom_presets", JSON.stringify(state.customPresets));
        if (state.selectedPresetId === id) {
            state.selectedPresetId = "478";
            localStorage.setItem("calmaria_preset_id", "478");
        }
        updateTrackerUI();
        renderPresetsList();
    }

    function saveHistory() {
        localStorage.setItem("calmaria_history", JSON.stringify(state.history));
        updateStatsUI();
    }

    function formatRelativeTime(ts) {
        const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
        if (diffSec < 60) return "just now";
        const mins = Math.floor(diffSec / 60);
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        return `${days}d ago`;
    }

    function mostFrequent(arr, fallback) {
        if (!arr.length) return fallback;
        const counts = {};
        let best = arr[0], max = 0;
        for (const item of arr) {
            counts[item] = (counts[item] || 0) + 1;
            if (counts[item] > max) {
                max = counts[item];
                best = item;
            }
        }
        return best;
    }

    function updateStatsUI() {
        const total = state.history.length;
        el.settingsStatsCount.textContent = `${total} session${total === 1 ? "" : "s"}`;
        el.statsTotal.textContent = pad2(total);
        el.statsMostUsed.textContent = mostFrequent(state.history.map(h => h.preset), "478");
        el.statsFeel.textContent = mostFrequent(state.history.map(h => h.feel), "😀");

        if (!total) {
            el.historyList.innerHTML = `<div class="empty-history">Complete your first breathing exercise to see your session history here.</div>`;
            return;
        }

        el.historyList.innerHTML = state.history.map((item, idx) => `
            <div class="history-row">
                <span class="history-idx tabular">${pad2(total - idx)}</span>
                <span class="history-preset">${item.preset} (${item.reps} reps)</span>
                <span class="history-time">${formatRelativeTime(item.timestamp)}</span>
                <span>${item.device || "🌐"}</span>
                <span>${item.feel || "😀"}</span>
            </div>
        `).join("");
    }

    function openSheet(sheetEl) {
        [el.settingsSheet, el.congratsSheet, el.statsSheet, el.aboutSheet].forEach(s => {
            if (s !== sheetEl) {
                s.classList.remove("active");
                s.setAttribute("aria-hidden", "true");
            }
        });
        sheetEl.classList.add("active");
        sheetEl.setAttribute("aria-hidden", "false");
    }

    function closeAllSheets() {
        [el.settingsSheet, el.congratsSheet, el.statsSheet, el.aboutSheet].forEach(s => {
            s.classList.remove("active");
            s.setAttribute("aria-hidden", "true");
        });
    }

    // =========================================================================
    // Event Listeners & Initialization
    // =========================================================================
    function initEvents() {
        const toggleExercise = () => {
            if (state.isRunning) {
                stopSession(true);
            } else {
                startSession();
            }
        };
        el.themeStage.addEventListener("click", toggleExercise);
        document.getElementById("trackerBar").addEventListener("click", toggleExercise);
        el.themeStage.addEventListener("keydown", (e) => {
            if (e.key === " " || e.key === "Enter") {
                e.preventDefault();
                toggleExercise();
            }
        });

        el.optionsOrStopBtn.addEventListener("click", () => {
            // iOS swaps the settings button for stop while running; Android keeps "options"
            if (state.isRunning && state.platform !== "android") {
                stopSession(true);
            } else {
                updateStatsUI();
                openSheet(el.settingsSheet);
            }
        });

        document.querySelectorAll("[data-theme-idx]").forEach(btn => {
            btn.addEventListener("click", () => applyThemeIdx(btn.dataset.themeIdx));
        });

        document.getElementById("closeSettingsBtn").addEventListener("click", closeAllSheets);
        document.getElementById("closeCongratsBtn").addEventListener("click", closeAllSheets);
        document.getElementById("closeStatsBtn").addEventListener("click", closeAllSheets);
        document.getElementById("closeAboutBtn").addEventListener("click", closeAllSheets);

        [el.settingsSheet, el.congratsSheet, el.statsSheet, el.aboutSheet].forEach(sheet => {
            sheet.addEventListener("click", (e) => {
                if (e.target === sheet) closeAllSheets();
            });
        });

        document.getElementById("openStatsFromSettings").addEventListener("click", () => {
            updateStatsUI();
            openSheet(el.statsSheet);
        });
        document.getElementById("openAboutFromSettings").addEventListener("click", () => {
            openSheet(el.aboutSheet);
        });

        document.getElementById("showCustomPresetFormBtn").addEventListener("click", () => {
            el.customPresetForm.classList.remove("hidden");
            document.getElementById("cpName").focus();
        });
        document.getElementById("cancelCustomPresetBtn").addEventListener("click", () => {
            el.customPresetForm.classList.add("hidden");
        });
        el.customPresetForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const name = document.getElementById("cpName").value.trim() || "Custom";
            const custom = {
                id: "custom_" + Date.now(),
                name,
                subtitle: "Custom Exercise",
                inhale: Math.max(1, Math.min(20, Number(document.getElementById("cpInhale").value) || 4)),
                hold1: Math.max(0, Math.min(20, Number(document.getElementById("cpHold1").value) || 0)),
                exhale: Math.max(1, Math.min(20, Number(document.getElementById("cpExhale").value) || 4)),
                hold2: Math.max(0, Math.min(20, Number(document.getElementById("cpHold2").value) || 0)),
                reps: Math.max(1, Math.min(20, Number(document.getElementById("cpReps").value) || 4)),
                builtin: false
            };
            state.customPresets.push(custom);
            localStorage.setItem("calmaria_custom_presets", JSON.stringify(state.customPresets));
            state.selectedPresetId = custom.id;
            localStorage.setItem("calmaria_preset_id", custom.id);
            el.customPresetForm.reset();
            el.customPresetForm.classList.add("hidden");
            updateTrackerUI();
            renderPresetsList();
        });

        el.soundToggle.checked = state.soundEnabled;
        el.soundToggle.addEventListener("change", () => {
            state.soundEnabled = el.soundToggle.checked;
            localStorage.setItem("calmaria_sound", String(state.soundEnabled));
            if (state.soundEnabled) audio.playCue("tick", true);
        });
        el.vibrateToggle.checked = state.vibrateEnabled;
        el.vibrateToggle.addEventListener("change", () => {
            state.vibrateEnabled = el.vibrateToggle.checked;
            localStorage.setItem("calmaria_vibrate", String(state.vibrateEnabled));
            if (state.vibrateEnabled) triggerHaptic(25);
        });

        document.querySelectorAll(".sound-cue-btn").forEach(btn => {
            btn.addEventListener("click", () => audio.playCue(btn.dataset.cue, true));
        });

        // Congratulations Mood Picker (Matches Congratulations.swift)
        el.moodPicker.querySelectorAll(".ios-mood-emoji").forEach(btn => {
            btn.addEventListener("click", () => {
                el.moodPicker.querySelectorAll(".ios-mood-emoji").forEach(b => b.classList.remove("selected"));
                btn.classList.add("selected");
                if (btn.dataset.mood === "😀") {
                    audio.playCue("sparkle", true);
                    triggerConfettiBounce();
                } else {
                    audio.playCue("tick", true);
                }
                triggerHaptic(15);
                if (state.history.length > 0) {
                    state.history[0].feel = btn.dataset.mood;
                    saveHistory();
                }
            });
        });

        document.getElementById("clearHistoryBtn").addEventListener("click", () => {
            state.history = [];
            saveHistory();
        });

        window.addEventListener("mousemove", (e) => {
            const nx = (e.clientX / window.innerWidth - 0.5) * 2;
            const ny = (e.clientY / window.innerHeight - 0.5) * 2;
            state.parallaxX = nx;
            state.parallaxY = ny;
        }, { passive: true });

        window.addEventListener("deviceorientation", (e) => {
            if (e.gamma != null && e.beta != null) {
                state.parallaxX = Math.max(-1, Math.min(1, e.gamma / 30));
                state.parallaxY = Math.max(-1, Math.min(1, (e.beta - 45) / 30));
            }
        }, { passive: true });

        window.addEventListener("keydown", (e) => {
            if (e.target.tagName === "INPUT") return;
            if (e.key === "Escape") {
                closeAllSheets();
            }
        });
    }

    // Boot — the web app follows the device: platform from the user agent, colours from the system.
    // ?platform=ios|android and ?mode=light|dark override this for testing.
    const params = new URLSearchParams(location.search);
    const colorQuery = window.matchMedia("(prefers-color-scheme: dark)");
    function syncColors() {
        applyColorMode(params.get("mode") || (colorQuery.matches ? "dark" : "light"));
        refreshColors();
    }
    if (params.has("safe")) {
        const [top, bottom] = params.get("safe").split(",");
        document.documentElement.style.setProperty("--safe-top", `${top}px`);
        document.documentElement.style.setProperty("--safe-bottom", `${bottom || 0}px`);
    }
    applyPlatform(params.get("platform") === "android" || params.get("platform") === "ios" ? params.get("platform") : state.platform);
    syncColors();
    if (colorQuery.addEventListener) colorQuery.addEventListener("change", syncColors);
    init80sLines();
    applyThemeIdx(params.has("theme") ? Number(params.get("theme")) : state.themeIdx);
    renderPresetsList();
    updateTrackerUI();
    updateStatsUI();
    initEvents();
    measureStage();
    if (window.ResizeObserver) new ResizeObserver(measureStage).observe(el.themeStage);
    window.addEventListener("resize", measureStage);
    requestAnimationFrame(renderLoop);
})();
