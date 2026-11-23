"use strict";

/* ============================================================
   Бесконечный Сизиф — прототип (пиксель-арт, 80-е)
   Canvas 2D (низкое виртуальное разрешение, pixelated) + WebAudio.
   ============================================================ */

// ---------- Конфиг ----------
const CFG = {
  virtualH: 240,
  idealInterval: 0.34, mashInterval: 0.13,
  tapImpulse: 2.2, iceHoldPush: 4.1, shiftBoost: 1.72,
  gravity: 3.4, drag: 1.15, rampHeight: 900,
  graceHeight: 10,
  staminaMax: 100,
  drainWind: 18, drainIce: 22, drainSteep: 24, drainRollback: 8, errWindTap: 4, drainCareful: 12,
  rainSlipRate: 0.72, rainPushMul: 0.62,
  steepDrift: 0.72, steepSpeedMul: 0.70,
  calmMin: 4.5, calmMax: 8.0,
  rainWarnLead: 2.0, obstacleMin: 3.8, obstacleMax: 6.2,
  iceLeadDist: 0.75, iceLenMin: 108, iceLenMax: 192,
  steepLeadDist: 0.80, steepLenMin: 150, steepLenMax: 220,
  windReaction: 0.5, windExitGrace: 0.5,
  introDuration: 5.5,
  quotePause: 21, quoteFade: 0.8,
  dayLen: 90, seasonLen: 70,                                 // цикл суток и длина одного сезона (сек)
};

const OBSTACLES = {
  wind:  { label: "ВЕТЕР — НЕ ЖМИ КЛАВИШИ" },
  rain:  { label: "ДОЖДЬ — C + SPACE" },
  ice:   { label: "ЛЁД — ДЕРЖИ SPACE" },
  steep: { label: "КРУТОЙ СКЛОН — SHIFT + SPACE" },
};

const GAME_QUOTES = [
  "Если этот миф трагичен, то лишь потому, что его герой наделен сознанием",
  "Каждая крупица этого камня, каждый отблеск минерала на этой горе, окутанной ночью, составляет для него целый мир",
  "Самой борьбы к вершине достаточно, чтобы наполнить сердце человека. Сизифа нужно представлять себе счастливым",
  "Абсурд говорит «да», и его усилие отныне не знает остановки",
  "На вершине, куда он стремится, он достигает исполнения своего удела. И Сизиф видит, как камень в несколько мгновений скатывается к подножию, откуда его снова нужно поднимать к вершине",
  "Камень – его достояние. Равно как и абсурдная вселенная, в которой он живет",
  "Нет солнца без тени, и необходимо познать ночь",
  "Сизиф твёрже своего камня",
  "Нет судьбы, которую не превозмогло бы презрение",
  "Одного презрения к собственной участи оказывается достаточно, чтобы превратить её в победу, — и это, быть может, самое большое чудо, на какое способен человек",
  "Сизиф – абсурдный герой. Он абсурден настолько же благодаря своим страстям, насколько и благодаря своим мучениям",
  "Для человека без шор нет зрелища прекраснее, чем борьба интеллекта с превосходящей его реальностью",
  "Нет кары более ужасной, чем бесполезный и безнадежный труд",
  "Разве была бы его кара столь ужасной, если бы на каждом шагу его поддерживала надежда на успех?",
  "Свою ношу всегда находишь вновь",
];
const usedQuotes = new Set();

// ---------- Настройки сложности (из прототипа, без правки кода) ----------
const SET_DEF = { drainMul: 1, freqMul: 1, windDurMul: 1, rainProb: 1, steepMul: 1 };
let SET = loadSettings();
function loadSettings() { try { return { ...SET_DEF, ...JSON.parse(localStorage.getItem("sisyphus_set") || "{}") }; } catch { return { ...SET_DEF }; } }
function saveSettings() { try { localStorage.setItem("sisyphus_set", JSON.stringify(SET)); } catch {} }

// ---------- Палитра ----------
const PAL = {
  skyDayTop: [64, 100, 156], skyDayBot: [158, 196, 226],
  skyNightTop: [10, 9, 32], skyNightBot: [38, 26, 72],
  mountFar: [52, 46, 86], mountMid: [40, 34, 66], mountNear: [30, 26, 52],
  volcano: [58, 40, 52], lava: [255, 120, 40], smoke: [90, 84, 96],
  dirt1: [138, 96, 54], dirt2: [104, 72, 40], dirt3: [80, 54, 30],
  rock: [96, 90, 82], grass: [96, 140, 60],
  ice1: [196, 232, 244], ice2: [140, 196, 220], iceEdge: [235, 250, 255],
  skin: [214, 168, 120], cloth: [222, 208, 176], clothSh: [180, 162, 128],
  beard: [232, 228, 214], hair: [212, 206, 190],
  stoneLo: [92, 84, 76], stoneMid: [124, 116, 106], stoneHi: [158, 150, 138], stoneCr: [64, 58, 52],
  sun: [255, 214, 96], moon: [222, 224, 240], wood: [126, 86, 46], woodDk: [86, 58, 30],
  chasm: [10, 8, 16],
  deadTree: [70, 56, 44], shrub: [88, 74, 46],
  goat: [86, 74, 66], goatDk: [54, 46, 40], horn: [188, 176, 150],
  raven: [16, 14, 24], lizard: [122, 150, 60], flutter: [230, 184, 77],
};

// ---------- DOM ----------
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const el = {
  hud: document.getElementById("hud"), controls: document.getElementById("controls-bar"),
  btnSound: document.getElementById("btn-sound"),
  staminaFill: document.getElementById("stamina-fill"),
  height: document.getElementById("height"), best: document.getElementById("best"),
  banner: document.getElementById("banner"), gameQuote: document.getElementById("game-quote"),
  screenStart: document.getElementById("screen-start"),
  screenSettings: document.getElementById("screen-settings"),
  screenOver: document.getElementById("screen-over"),
  overReason: document.getElementById("over-reason"), overSub: document.querySelector(".over-sub"),
  overHeight: document.getElementById("over-height"), overBest: document.getElementById("over-best"),
  overRecord: document.getElementById("over-record"),
};

// ---------- Состояние ----------
let VW = 0, VH = 0;
let state = "start";           // start | settings | playing | falling | over
let best = loadBest();
let clock = 0;

const game = {
  height: 0, momentum: 0, stamina: CFG.staminaMax,
  lastTapTime: 0, pushAnim: 0,
  spaceDown: false, shiftDown: false, careful: false,
  obstacle: null, lastObstacle: null, obPhase: "calm", obTimer: 0, icePatch: null, steepPatch: null,
  intensity: { wind: 0, rain: 0, ice: 0, steep: 0 },
  rainVariant: 1, windVariant: 0, windGrace: 0, windExitGrace: 0, rainExitGrace: 0,
  slipRisk: 0, shake: 0, scroll: 0, sfxTimer: 0,
  stoneAngle: 0, stoneSpinVel: 0,
  fall: { t: 0, reason: "exhausted" },
  intro: 0,
  quote: { timer: CFG.quotePause, visible: 0, text: "", duration: 0 },
  particles: [], clouds: [], critters: [], erupt: [], ambient: [],
  nextEagle: 3, nextCritter: 1.5, nextErupt: 4, seasonTimer: 0,
};
el.best.textContent = roman(best);

// ---------- Звук + музыка ----------
const Sound = (() => {
  let actx = null, master = null, muted = false, windNode = null;
  const music = { on: false, drone: [], mgain: null, step: 0, nextTime: 0, timer: null };
  const NOTE = { E2: 82.41, B2: 123.47, E3: 164.81, F3: 174.61, G3: 196.0, A3: 220.0, B3: 246.94, C4: 261.63, D4: 293.66, E4: 329.63 };
  const MELODY = [["E3", 3], ["F3", 1], ["E3", 2], [0, 2], ["G3", 2], ["F3", 1], ["E3", 3], [0, 1], ["A3", 2], ["G3", 2], ["F3", 2], ["E3", 2], [0, 2], ["D4", 1], ["C4", 1], ["B3", 2], ["A3", 2], [0, 2]];
  const BEAT = 0.62;
  function ensure() { if (actx) return; actx = new (window.AudioContext || window.webkitAudioContext)(); master = actx.createGain(); master.gain.value = muted ? 0 : 0.4; master.connect(actx.destination); }
  function noiseBuffer(dur) { const n = Math.floor(actx.sampleRate * dur), buf = actx.createBuffer(1, n, actx.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; return buf; }
  function env(node, g, peak, dur) { const t = actx.currentTime; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); node.start(t); node.stop(t + dur + 0.02); }
  function playTone(freq, when, dur) {
    const g = actx.createGain(), f = actx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 1200; g.connect(f); f.connect(music.mgain);
    const o1 = actx.createOscillator(), o2 = actx.createOscillator(); o1.type = "triangle"; o2.type = "square"; o2.detune.value = 5; o1.frequency.value = freq; o2.frequency.value = freq;
    const o2g = actx.createGain(); o2g.gain.value = 0.18; o1.connect(g); o2.connect(o2g); o2g.connect(g);
    g.gain.setValueAtTime(0.0001, when); g.gain.linearRampToValueAtTime(0.14, when + 0.04); g.gain.exponentialRampToValueAtTime(0.0001, when + dur * 0.95);
    o1.start(when); o2.start(when); o1.stop(when + dur); o2.stop(when + dur);
  }
  function scheduler() { if (!music.on) return; while (music.nextTime < actx.currentTime + 0.2) { const [n, d] = MELODY[music.step % MELODY.length], dur = d * BEAT; if (n !== 0) playTone(NOTE[n], music.nextTime, dur); music.nextTime += dur; music.step++; } }
  return {
    resume() { ensure(); if (actx.state === "suspended") actx.resume(); },
    toggleMute() { muted = !muted; if (master) master.gain.value = muted ? 0 : 0.4; return muted; },
    startMusic() {
      ensure(); if (music.on) return; music.on = true;
      music.mgain = actx.createGain(); music.mgain.gain.value = 0.55; music.mgain.connect(master);
      const dg = actx.createGain(); dg.gain.value = 0; const df = actx.createBiquadFilter(); df.type = "lowpass"; df.frequency.value = 320; dg.connect(df); df.connect(music.mgain);
      for (const f of [NOTE.E2, NOTE.B2]) { const o = actx.createOscillator(); o.type = "sawtooth"; o.frequency.value = f; o.connect(dg); o.start(); music.drone.push(o); }
      dg.gain.linearRampToValueAtTime(0.09, actx.currentTime + 2);
      music.step = 0; music.nextTime = actx.currentTime + 0.15; music.timer = setInterval(scheduler, 90);
    },
    // мягкий приглушённый толчок, настроенный на дрон (E) — частые нажатия складываются в монотонный ритм
    push(s = 1) {
      if (!actx || muted) return; const t = actx.currentTime;
      const g = actx.createGain(), f = actx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 480; f.Q.value = 0.6; g.connect(f); f.connect(master);
      const o1 = actx.createOscillator(), o2 = actx.createOscillator(); o1.type = "sine"; o2.type = "triangle";
      o1.frequency.value = NOTE.E2; o2.frequency.value = NOTE.E3;              // тоника лада — гармонирует с музыкой
      const o2g = actx.createGain(); o2g.gain.value = 0.35; o1.connect(g); o2.connect(o2g); o2g.connect(g);
      const peak = 0.12 * s + 0.05;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      o1.start(t); o2.start(t); o1.stop(t + 0.26); o2.stop(t + 0.26);
    },
    // лёд — мягкий хруст в тональности фоновой музыки, без резкого стеклянного щелчка
    ice() {
      if (!actx || muted) return; const t = actx.currentTime;
      const src = actx.createBufferSource(), g = actx.createGain(), f = actx.createBiquadFilter();
      src.buffer = noiseBuffer(0.14); f.type = "bandpass"; f.frequency.value = 920; f.Q.value = 0.9;
      src.connect(f); f.connect(g); g.connect(master);
      const tone = actx.createOscillator(), tg = actx.createGain(); tone.type = "sine"; tone.frequency.value = NOTE.E4; tone.connect(tg); tg.connect(master);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.035, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
      tg.gain.setValueAtTime(0.0001, t); tg.gain.linearRampToValueAtTime(0.018, t + 0.01); tg.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      src.start(t); src.stop(t + 0.15); tone.start(t); tone.stop(t + 0.17);
    },
    // толкание на крутом склоне — тяжёлое низкое трение
    friction() {
      if (!actx || muted) return; const t = actx.currentTime;
      const src = actx.createBufferSource(), g = actx.createGain(), f = actx.createBiquadFilter(); src.buffer = noiseBuffer(0.24); f.type = "bandpass"; f.frequency.value = 210; f.Q.value = 0.8; src.connect(f); f.connect(g); g.connect(master);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.11, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2); src.start(t); src.stop(t + 0.24);
    },
    error() { if (!actx || muted) return; const o = actx.createOscillator(), g = actx.createGain(); o.type = "square"; o.frequency.setValueAtTime(120, actx.currentTime); o.frequency.linearRampToValueAtTime(70, actx.currentTime + 0.15); o.connect(g); g.connect(master); env(o, g, 0.28, 0.16); },
    rumble() { if (!actx || muted) return; const src = actx.createBufferSource(), g = actx.createGain(), f = actx.createBiquadFilter(); src.buffer = noiseBuffer(1.3); f.type = "lowpass"; f.frequency.value = 400; src.connect(f); f.connect(g); g.connect(master); env(src, g, 0.5, 1.2); },
    gameover() {
      if (!actx || muted) return;
      const t = actx.currentTime, g = actx.createGain(), f = actx.createBiquadFilter();
      f.type = "lowpass"; f.frequency.value = 420; g.connect(f); f.connect(master);
      const e = actx.createOscillator(), b = actx.createOscillator();
      e.type = "sine"; b.type = "triangle"; e.frequency.value = NOTE.E2; b.frequency.value = NOTE.B2;
      e.connect(g); b.connect(g);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.13, t + 0.18); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
      e.start(t); b.start(t + 0.32); e.stop(t + 2.5); b.stop(t + 2.5);
    },
    windStart() { if (!actx || muted || windNode) return; const src = actx.createBufferSource(), g = actx.createGain(), f = actx.createBiquadFilter(); src.buffer = noiseBuffer(1.2); src.loop = true; f.type = "bandpass"; f.frequency.value = 520; f.Q.value = 0.7; g.gain.value = 0; src.connect(f); f.connect(g); g.connect(master); src.start(); g.gain.linearRampToValueAtTime(0.2, actx.currentTime + 0.3); windNode = { src, g }; },
    windStop() { if (!windNode) return; const { src, g } = windNode; g.gain.linearRampToValueAtTime(0, actx.currentTime + 0.3); try { src.stop(actx.currentTime + 0.35); } catch {} windNode = null; },
  };
})();

// ---------- Утилиты ----------
function loadBest() { try { return parseInt(localStorage.getItem("sisyphus_best") || "0", 10) || 0; } catch { return 0; } }
function saveBest(v) { try { localStorage.setItem("sisyphus_best", String(v)); } catch {} }
function rand(a, b) { return a + Math.random() * (b - a); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function difficulty() { return 1 + game.height / CFG.rampHeight; }
function hash(n) { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); }

// ---------- Римские цифры ----------
function roman(n) {
  n = Math.floor(n);
  if (n <= 0) return "—";
  const map = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let s = ""; for (const [v, sym] of map) while (n >= v) { s += sym; n -= v; }
  return s;
}

// ---------- Ресайз ----------
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  VH = CFG.virtualH; VW = Math.round(VH * (w / h));
  canvas.width = VW; canvas.height = VH; canvas.style.width = w + "px"; canvas.style.height = h + "px";
  ctx.imageSmoothingEnabled = false;
}
window.addEventListener("resize", resize); resize();
for (let i = 0; i < 5; i++) game.clouds.push({ x: rand(0, 1), y: rand(0.06, 0.36), s: rand(0.6, 1.4), sp: rand(1, 3) });

// ---------- Управление ----------
document.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    e.preventDefault();
    if (!game.spaceDown) onPushStart();
    game.spaceDown = true;
  }
  else if (e.key === "Shift") game.shiftDown = true;
  else if (e.key.toLowerCase() === "c" || e.key.toLowerCase() === "с") {
    e.preventDefault();
    toggleCareful();
  }
  else if (e.key === "Escape") { if (state === "settings") closeSettings(); else goMenu(); }
  else if (e.key.toLowerCase() === "r" || e.key.toLowerCase() === "к") { if (state === "playing" || state === "over" || state === "falling") startGame(); }
  else if (e.key.toLowerCase() === "m" || e.key.toLowerCase() === "ь") toggleSound();
});
document.addEventListener("keyup", (e) => {
  if (e.code === "Space") game.spaceDown = false;
  else if (e.key === "Shift") game.shiftDown = false;
});
canvas.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  if (!game.spaceDown) onPushStart();
  game.spaceDown = true;
});
canvas.addEventListener("pointerup", () => { game.spaceDown = false; });
canvas.addEventListener("pointercancel", () => { game.spaceDown = false; });

document.getElementById("btn-start").addEventListener("click", startGame);
document.getElementById("btn-restart").addEventListener("click", startGame);
document.getElementById("btn-tomenu").addEventListener("click", goMenu);
document.getElementById("btn-menu").addEventListener("click", goMenu);
document.getElementById("btn-reset").addEventListener("click", startGame);
el.btnSound.addEventListener("click", toggleSound);
document.getElementById("btn-settings").addEventListener("click", openSettings);
document.getElementById("btn-settings-back").addEventListener("click", closeSettings);
document.getElementById("btn-settings-reset").addEventListener("click", () => { SET = { ...SET_DEF }; saveSettings(); fillSettingsUI(); });

function toggleSound() { Sound.resume(); const m = Sound.toggleMute(); el.btnSound.textContent = m ? "🔇" : "♪"; el.btnSound.classList.toggle("off", m); }
function toggleCareful() {
  if (state !== "playing") return;
  game.careful = !game.careful;
  updateBanner();
}
function onPushStart() {
  if (state === "settings") return;
  Sound.resume();
  Sound.startMusic();
  if (state === "start" || state === "over") { startGame(); return; }
  if (state === "playing") registerTap();
}

// ---------- Настройки: UI ----------
const SLIDERS = [
  { id: "drain", key: "drainMul", fmt: (v) => "×" + v.toFixed(1) },
  { id: "freq", key: "freqMul", fmt: (v) => "×" + v.toFixed(1) },
  { id: "wind", key: "windDurMul", fmt: (v) => "×" + v.toFixed(1) },
  { id: "rain", key: "rainProb", fmt: (v) => v === 0 ? "выкл" : v < 0.75 ? "редко" : v <= 1.25 ? "обычная" : v <= 2 ? "часто" : "очень часто" },
  { id: "steep", key: "steepMul", fmt: (v) => "×" + v.toFixed(1) },
];
for (const s of SLIDERS) {
  const inp = document.getElementById("s-" + s.id), lab = document.getElementById("v-" + s.id);
  inp.addEventListener("input", () => { SET[s.key] = parseFloat(inp.value); lab.textContent = s.fmt(SET[s.key]); saveSettings(); });
}
function fillSettingsUI() {
  for (const s of SLIDERS) { const inp = document.getElementById("s-" + s.id), lab = document.getElementById("v-" + s.id); inp.value = SET[s.key]; lab.textContent = s.fmt(SET[s.key]); }
}
function openSettings() { state = "settings"; fillSettingsUI(); el.screenStart.classList.add("hidden"); el.screenSettings.classList.remove("hidden"); }
function closeSettings() { state = "start"; el.screenSettings.classList.add("hidden"); el.screenStart.classList.remove("hidden"); }

// ---------- Экраны ----------
function startGame() {
  Sound.resume(); Sound.startMusic(); Sound.windStop();
  state = "intro";
  Object.assign(game, {
    height: 0, momentum: 0, stamina: CFG.staminaMax, lastTapTime: performance.now() / 1000, pushAnim: 0,
    spaceDown: false, shiftDown: false, careful: false,
    obstacle: null, lastObstacle: null, obPhase: "calm", obTimer: rand(3.5, 5), icePatch: null, steepPatch: null,
    slipRisk: 0, scroll: 0, shake: 0, sfxTimer: 0, intro: 0,
    windGrace: 0, windExitGrace: 0, rainExitGrace: 0,
    stoneAngle: 0, stoneSpinVel: 0,
  });
  game.intensity = { wind: 0, rain: 0, ice: 0, steep: 0 };
  game.quote = { timer: CFG.quotePause, visible: 0, text: "", duration: 0 };
  game.particles.length = 0;
  el.screenStart.classList.add("hidden"); el.screenSettings.classList.add("hidden"); el.screenOver.classList.add("hidden");
  el.hud.classList.remove("hidden"); el.controls.classList.remove("hidden"); hideBanner(); hideQuote();
  syncHUD();
}
function goMenu() {
  state = "start";
  game.spaceDown = false;
  Sound.windStop();
  el.hud.classList.add("hidden"); el.controls.classList.add("hidden"); el.screenOver.classList.add("hidden");
  el.screenSettings.classList.add("hidden"); el.screenStart.classList.remove("hidden"); hideQuote();
}

function registerTap() {
  const now = performance.now() / 1000;
  const interval = now - game.lastTapTime;
  game.lastTapTime = now;
  game.pushAnim = 1;
  let factor = 1;
  if (interval < CFG.mashInterval) factor = 0.28;
  else factor = clamp(1 - Math.abs(interval - CFG.idealInterval) * 1.55, 0.35, 1);

  const I = game.intensity;
  let impulse = CFG.tapImpulse * factor;
  if (I.wind > 0.5) {
    if (game.windGrace <= 0) {
      game.stamina = Math.max(0, game.stamina - CFG.errWindTap * SET.drainMul);
      Sound.error();
    }
    return;
  }
  if (I.steep > 0.5) {
    if (!game.shiftDown) {
      game.stamina = Math.max(0, game.stamina - 2.2 * SET.drainMul);
      Sound.error();
      return;
    }
    impulse *= CFG.shiftBoost * CFG.steepSpeedMul;
    Sound.friction();
  } else {
    if (game.shiftDown) impulse *= 0.72;
    Sound.push(factor);
  }
  if (I.rain > 0.5) impulse *= game.careful ? CFG.rainPushMul : 0.22;
  game.momentum += impulse;
}

// ---------- Планировщик препятствий ----------
function updateObstacles(dt) {
  if (game.windGrace > 0) game.windGrace -= dt;
  if (game.windExitGrace > 0) game.windExitGrace -= dt;
  if (game.rainExitGrace > 0) game.rainExitGrace -= dt;
  game.obTimer -= dt;
  if (game.obstacle !== "ice" && game.obstacle !== "steep" && game.obTimer <= 0) {
    if (game.obPhase === "calm") {
      game.obstacle = pickObstacle();
      game.lastObstacle = game.obstacle;
      if (game.obstacle === "ice") startIce();
      else if (game.obstacle === "steep") startSteep();
      else if (game.obstacle === "rain") {
        game.rainVariant = Math.floor(rand(0, 3));
        game.obPhase = "warn";
        game.obTimer = CFG.rainWarnLead;
        updateBanner();
      } else {
        game.windVariant = Math.floor(rand(0, 3));
        game.obPhase = "active";
        game.obTimer = obstacleDuration();
        game.windGrace = CFG.windReaction;
        Sound.windStart();
        updateBanner();
      }
    } else if (game.obPhase === "warn") {
      game.obPhase = "active";
      game.obTimer = obstacleDuration();
      updateBanner();
    } else {
      const ended = game.obstacle;
      if (ended === "wind") {
        Sound.windStop();
        game.windExitGrace = CFG.windExitGrace;
      }
      if (ended === "rain") game.rainExitGrace = 0.75;
      game.obstacle = null;
      game.obPhase = "calm";
      game.obTimer = rand(CFG.calmMin, CFG.calmMax) / Math.sqrt(difficulty()) / SET.freqMul;
      updateBanner();
    }
  }
  for (const k of ["wind", "rain"]) {
    const target = game.obstacle === k && game.obPhase === "active" ? 1 : 0;
    game.intensity[k] += (target - game.intensity[k]) * clamp(5 * dt, 0, 1);
  }
  updateTerrainPatches(dt);
}

function startIce() {
  const sisX = game.scroll + VW * 0.40;
  game.icePatch = { s: sisX + VW * CFG.iceLeadDist, len: rand(CFG.iceLenMin, CFG.iceLenMax) };
  game.obPhase = "active"; game.obTimer = 28;
}
function startSteep() {
  const sisX = game.scroll + VW * 0.40;
  game.steepPatch = { s: sisX + VW * CFG.steepLeadDist, len: rand(CFG.steepLenMin, CFG.steepLenMax) };
  game.obPhase = "active"; game.obTimer = 32;
}
function updateTerrainPatches(dt) {
  const sisX = game.scroll + VW * 0.40;
  const ice = game.icePatch;
  const steep = game.steepPatch;
  const onIce = !!ice && sisX >= ice.s && sisX <= ice.s + ice.len;
  const onSteep = !!steep && sisX >= steep.s && sisX <= steep.s + steep.len;
  game.intensity.ice = onIce ? 1 : 0;
  game.intensity.steep = onSteep ? 1 : 0;

  if (game.obstacle === "ice" && ((ice && sisX > ice.s + ice.len + 6) || game.obTimer <= 0)) {
    game.obstacle = null; game.obPhase = "calm"; game.icePatch = null;
    game.obTimer = rand(CFG.calmMin, CFG.calmMax) / Math.sqrt(difficulty()) / SET.freqMul;
  }
  if (game.obstacle === "steep" && ((steep && sisX > steep.s + steep.len + 6) || game.obTimer <= 0)) {
    game.obstacle = null; game.obPhase = "calm";
    game.obTimer = rand(CFG.calmMin, CFG.calmMax) / Math.sqrt(difficulty()) / SET.freqMul;
  }
  if (game.obstacle !== "steep" && steep && steep.s + steep.len < game.scroll - 40) game.steepPatch = null;
  updateBanner();
}
function obstacleDuration() { let d = rand(CFG.obstacleMin, CFG.obstacleMax); if (game.obstacle === "wind") d *= SET.windDurMul; return d; }
function pickObstacle() {
  const keys = ["wind", "rain", "ice", "steep"].filter(k => k !== game.lastObstacle);
  const w = { wind: 1, rain: SET.rainProb, ice: 1, steep: 0.8 + game.height / CFG.rampHeight };
  let total = 0; for (const k of keys) total += w[k]; if (total <= 0) return "wind";
  let r = Math.random() * total; for (const k of keys) { r -= w[k]; if (r <= 0) return k; } return "wind";
}
function updateBanner() {
  let text = "";
  const sisX = game.scroll + VW * 0.40;
  if (game.windExitGrace > 0) text = "ВЕТЕР СТИХ — ТОЛКАЙ SPACE";
  else if (game.obstacle === "wind") {
    text = ["ВЕТЕР", "ПОРЫВЫ", "ТУРБУЛЕНТНЫЙ ВЕТЕР"][game.windVariant] + " — НЕ ЖМИ КЛАВИШИ";
  } else if (game.obstacle === "rain") {
    text = ["МОРОСЬ", "ДОЖДЬ", "ЛИВЕНЬ"][game.rainVariant] + " — C + SPACE";
  } else if (game.icePatch && game.icePatch.s - sisX <= VW * 0.28 && sisX <= game.icePatch.s + game.icePatch.len) {
    text = OBSTACLES.ice.label;
  } else if (game.steepPatch && game.steepPatch.s - sisX <= VW * 0.30 && sisX <= game.steepPatch.s + game.steepPatch.len) {
    text = OBSTACLES.steep.label;
  } else if (game.careful && game.rainExitGrace > 0) text = "ДОЖДЬ ПРОШЁЛ — ОТКЛЮЧИ C";
  else if (game.careful && game.intensity.rain < 0.5) text = "ОТКЛЮЧИ C — НЕТ ДОЖДЯ";
  if (text) { el.banner.textContent = text; el.banner.classList.remove("hidden"); }
  else hideBanner();
}
function hideBanner() { el.banner.classList.add("hidden"); }

function nextQuote() {
  const available = GAME_QUOTES.filter(q => !usedQuotes.has(q));
  if (!available.length) return null;
  const text = available[Math.floor(Math.random() * available.length)];
  usedQuotes.add(text);
  return text;
}
function updateQuotes(dt) {
  const q = game.quote;
  if (q.visible > 0) {
    q.visible -= dt;
    if (q.visible <= 0) { hideQuote(); q.timer = CFG.quotePause; }
    return;
  }
  q.timer -= dt;
  if (q.timer > 0) return;
  const text = nextQuote();
  if (!text) { q.timer = 99999; return; }
  q.text = text;
  q.duration = text.length < 90 ? 10 : text.length < 165 ? 15 : 20;
  q.visible = q.duration;
  el.gameQuote.textContent = text;
  el.gameQuote.classList.remove("hidden");
}
function hideQuote() { el.gameQuote.classList.add("hidden"); }

// ---------- Обновление ----------
function update(dt) {
  if (state === "intro") {
    game.intro += dt;
    game.pushAnim = 0;
    if (game.intro >= CFG.introDuration) {
      state = "playing";
      game.lastTapTime = performance.now() / 1000;
    }
    syncHUD();
    return;
  }
  if (state === "falling") { updateFall(dt); return; }
  if (state !== "playing") return;
  const I = game.intensity;

  updateObstacles(dt);
  updateQuotes(dt);

  let gravity = CFG.gravity * (1 + (difficulty() - 1) * 0.35);
  if (I.steep > 0.5) gravity *= 1.42 * SET.steepMul;
  game.momentum -= gravity * dt;
  game.momentum -= game.momentum * CFG.drag * dt;
  if (I.steep > 0.5) game.momentum -= CFG.steepDrift * I.steep * SET.steepMul * dt;
  if (I.ice > 0.5 && game.spaceDown) game.momentum += CFG.iceHoldPush * dt;
  if (I.rain > 0.5 && game.careful && game.spaceDown) game.momentum += 1.1 * dt;
  if (I.wind > 0.5) game.momentum -= 1.5 * I.wind * dt;
  if (I.steep > 0.5) game.momentum = Math.min(game.momentum, 2.05);

  game.height += game.momentum * dt;
  if (game.height < 0) { game.height = 0; if (game.momentum < 0) game.momentum = 0; }

  let drain = 0;
  if (I.wind > 0.5 && game.windGrace <= 0 && game.spaceDown) drain += CFG.drainWind;
  if (I.ice > 0.5 && !game.spaceDown) drain += CFG.drainIce;
  if (I.steep > 0.5 && game.spaceDown && !game.shiftDown) drain += CFG.drainSteep;
  if (I.rain > 0.5 && !game.careful) drain += CFG.drainCareful;
  if (game.careful && I.rain < 0.5 && game.rainExitGrace <= 0) drain += CFG.drainCareful;
  if (I.wind < 0.5 && I.steep < 0.5 && game.windExitGrace <= 0 &&
      game.height > CFG.graceHeight && game.momentum < -0.05) drain += CFG.drainRollback;
  game.stamina = clamp(game.stamina - drain * dt * SET.drainMul, 0, CFG.staminaMax);
  if (game.stamina <= 0) { startFall("exhausted"); return; }

  game.sfxTimer -= dt;
  if (game.sfxTimer <= 0) {
    if (I.ice > 0.5 && game.spaceDown && Math.abs(game.momentum) > 0.15) { Sound.ice(); game.sfxTimer = rand(0.12, 0.20); }
    else if (I.steep > 0.5 && game.spaceDown && game.shiftDown) { Sound.friction(); game.sfxTimer = rand(0.19, 0.29); }
    else game.sfxTimer = 0.1;
  }

  if (I.rain > 0.5 && !game.careful) {
    game.slipRisk += CFG.rainSlipRate * dt;
    if (game.slipRisk >= 1) { startFall("slip"); return; }
  } else game.slipRisk = Math.max(0, game.slipRisk - dt);

  const targetSpin = game.momentum * 0.05;
  game.stoneSpinVel += (targetSpin - game.stoneSpinVel) * clamp(0.9 * dt, 0, 1);
  game.stoneAngle += game.stoneSpinVel * dt;

  game.pushAnim = Math.max(0, game.pushAnim - dt * 5);
  game.shake = Math.max(0, game.shake - dt * 2.5);
  game.scroll += game.momentum * dt * 26;
  updateParticles(dt); syncHUD();
}

function startFall(reason) {
  state = "falling";
  game.fall = { t: 0, reason };
  game.spaceDown = false;
  game.shake = 0.55;
  game.stoneSpinVel = -0.55;
  Sound.windStop(); Sound.rumble(); hideBanner(); hideQuote();
}
function updateFall(dt) {
  game.fall.t += dt;
  game.shake = Math.max(0, game.shake - dt * 1.2);
  if (game.fall.t < 1.8) {
    game.stoneSpinVel -= 1.15 * dt;
    game.stoneAngle += game.stoneSpinVel * dt;
  }
  if (game.fall.t > 9.2) endGame(game.fall.reason);
}
function endGame(reason) {
  state = "over"; Sound.gameover();
  const h = Math.floor(game.height), isRecord = h > best;
  if (isRecord) { best = h; saveBest(best); el.best.textContent = roman(best); }
  el.overReason.textContent = reason === "slip" ? "СИЗИФ ПОСКОЛЬЗНУЛСЯ" : "СИЛЫ ИССЯКЛИ";
  el.overSub.textContent = reason === "slip" ? "Камень вырвался — и покатился вниз." : "Руки опустились — камень скатился к подножию.";
  el.overHeight.textContent = roman(h); el.overBest.textContent = roman(best);
  el.overRecord.classList.toggle("hidden", !isRecord);
  el.hud.classList.add("hidden"); el.screenOver.classList.remove("hidden");
}
function syncHUD() {
  el.height.textContent = roman(game.height);
  const pct = (game.stamina / CFG.staminaMax) * 100; el.staminaFill.style.width = pct + "%";
  el.staminaFill.style.background = pct > 50 ? "#ad9150" : pct > 22 ? "#d4a943" : "#a84d43";
}

// ---------- Атмосфера: облака, извержения, живность (на склонах гор) ----------
function updateAmbience(dt) {
  for (const c of game.clouds) { c.x += (c.sp / VW) * dt; if (c.x > 1.2) { c.x = -0.2; c.y = rand(0.06, 0.36); } }

  game.nextErupt -= dt;
  if (game.nextErupt <= 0) { game.nextErupt = rand(4, 9); const vx = VW * 0.72, vy = VH * 0.30; for (let i = 0; i < 5; i++) game.erupt.push({ x: vx + rand(-3, 3), y: vy, vx: rand(-8, 8), vy: rand(-30, -18), life: rand(1.2, 2.2), lava: Math.random() < 0.5 }); }
  for (const p of game.erupt) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 14 * dt; p.life -= dt; }
  game.erupt = game.erupt.filter(p => p.life > 0);

  game.nextEagle -= dt;
  if (game.nextEagle <= 0) { game.nextEagle = rand(8, 16); const dir = Math.random() < 0.5 ? 1 : -1; game.critters.push({ t: "eagle", x: dir > 0 ? -20 : VW + 20, y: rand(VH * 0.10, VH * 0.38), dir, sp: rand(14, 24), w: 0 }); }

  game.nextCritter -= dt;
  if (game.nextCritter <= 0) { game.nextCritter = rand(3, 6); spawnCritter(["goat", "goat", "raven", "lizard", "butterfly"][Math.floor(rand(0, 5))]); }
  for (const c of game.critters) updateCritter(c, dt);
  game.critters = game.critters.filter(c => !c.dead);

  // сезонные частицы: весна — лепестки, лето — редкая пыльца, осень — листья, зима — снег
  game.seasonTimer -= dt;
  if (game.seasonTimer <= 0) { spawnSeasonParticle(); game.seasonTimer = seasonSpawnInterval(); }
  for (const p of game.ambient) {
    p.sw += dt * 2.2;
    const sway = p.t === "leaf" ? 16 : p.t === "snow" ? 9 : p.t === "petal" ? 8 : 4;
    p.x += (p.vx + Math.sin(p.sw) * sway) * dt; p.y += p.vy * dt; if (p.life !== undefined) p.life -= dt;
  }
  game.ambient = game.ambient.filter(p => p.y < VH + 8 && p.x > -24 && p.x < VW + 24 && (p.life === undefined || p.life > 0));
}

// ---------- Времена года (0 весна · 1 лето · 2 осень · 3 зима) ----------
function seasonData() { const sp = clock / CFG.seasonLen, i = ((Math.floor(sp) % 4) + 4) % 4, t = sp - Math.floor(sp); return { i, t, next: (i + 1) % 4 }; }
function seasonWeight(idx) { const s = seasonData(); return (s.i === idx ? 1 - s.t : 0) + (s.next === idx ? s.t : 0); }
function grassTone() { const cols = [[110, 170, 70], [96, 140, 60], [176, 132, 52], [200, 214, 224]], s = seasonData(); return mix(cols[s.i], cols[s.next], s.t); }
function spawnSeasonParticle() {
  const s = seasonData(), pick = Math.random() < (1 - s.t) ? s.i : s.next;
  if (pick === 0) game.ambient.push({ t: "petal", x: rand(0, VW), y: -4, vy: rand(14, 26), vx: rand(-6, 6), sw: rand(0, 6.28), col: Math.random() < 0.5 ? [248, 196, 214] : [236, 240, 220] });
  else if (pick === 1) game.ambient.push({ t: "pollen", x: rand(0, VW), y: rand(0, VH * 0.7), vy: rand(-3, 4), vx: rand(-4, 4), sw: rand(0, 6.28), life: rand(3, 6) });
  else if (pick === 2) game.ambient.push({ t: "leaf", x: rand(0, VW), y: -4, vy: rand(18, 30), vx: rand(-10, 2), sw: rand(0, 6.28), col: [[200, 110, 40], [176, 84, 40], [150, 120, 50], [190, 140, 50]][Math.floor(rand(0, 4))] });
  else game.ambient.push({ t: "snow", x: rand(0, VW), y: -4, vy: rand(22, 40), vx: rand(-8, 6), sw: rand(0, 6.28) });
}
function seasonSpawnInterval() { const s = seasonData(), dom = (1 - s.t) > 0.5 ? s.i : s.next; return dom === 1 ? rand(0.45, 0.95) : dom === 3 ? rand(0.05, 0.12) : rand(0.1, 0.22); }
function drawAmbient() {
  for (const p of game.ambient) {
    const x = Math.round(p.x), y = Math.round(p.y);
    if (p.t === "snow") { ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.fillRect(x, y, 1, 1); if (Math.sin(p.sw) > 0.6) ctx.fillRect(x + 1, y, 1, 1); }
    else if (p.t === "petal") { ctx.fillStyle = rgb(p.col); ctx.fillRect(x, y, Math.sin(p.sw) > 0 ? 2 : 1, 1); }
    else if (p.t === "leaf") { ctx.fillStyle = rgb(p.col); const o = Math.sin(p.sw) > 0; ctx.fillRect(x, y, o ? 2 : 1, o ? 1 : 2); }
    else if (p.t === "pollen") { ctx.fillStyle = "rgba(244,228,150,0.7)"; ctx.fillRect(x, y, 1, 1); }
  }
}
function drawSeasonTint() {
  const s = seasonData(), tints = [[120, 200, 120, 0.05], [255, 208, 120, 0.035], [205, 120, 45, 0.06], [200, 222, 255, 0.09]];
  const a = tints[s.i], b = tints[s.next];
  const r = Math.round(lerp(a[0], b[0], s.t)), g = Math.round(lerp(a[1], b[1], s.t)), bl = Math.round(lerp(a[2], b[2], s.t)), al = lerp(a[3], b[3], s.t);
  ctx.fillStyle = `rgba(${r},${g},${bl},${al.toFixed(3)})`; ctx.fillRect(0, 0, VW, VH);
}
function drawSnowCover(slopeY) {
  const w = seasonWeight(3); if (w < 0.04) return;
  ctx.save(); traceSlope(slopeY); ctx.clip();
  ctx.fillStyle = `rgba(236,244,255,${clamp(0.65 * w, 0, 0.65).toFixed(3)})`;
  const cell = 10, off = ((game.scroll % cell) + cell) % cell;
  for (let sx = -cell; sx < VW + cell; sx += cell) {
    const wx = sx - off, cx = Math.round((game.scroll + sx) / cell), y = slopeY(wx), th = 2 + Math.round(hash(cx * 3.1) * 2);
    ctx.fillRect(wx, y, cell + 1, th); if (hash(cx * 1.9 + 2) > 0.6) ctx.fillRect(wx, y + th, cell + 1, 1);
  }
  ctx.restore();
}

// животные — на склонах гор (фон), НЕ на тропе Сизифа. Каждому — своё покачивание/повороты.
function mountY(f) { return VH * (0.40 + 0.14 * f); }   // полоса склонов гор
function spawnCritter(t) {
  const x = rand(VW * 0.12, VW * 0.9), dir = Math.random() < 0.5 ? 1 : -1;
  if (t === "goat") game.critters.push({ t, x, y: mountY(hash(x)), dir, sp: rand(1.5, 3.5), w: rand(0, 6), head: 0, headT: rand(1, 2), life: rand(10, 16) });
  else if (t === "raven") game.critters.push({ t, x, y: -6, ty: mountY(hash(x)), phase: "in", w: 0, head: 0, headT: rand(0.8, 1.6), sit: rand(3, 6) });
  else if (t === "lizard") game.critters.push({ t, x: dir > 0 ? VW * 0.1 : VW * 0.9, y: mountY(hash(x)) + 3, dir, sp: rand(24, 40), pause: 0, life: rand(6, 10) });
  else if (t === "butterfly") game.critters.push({ t, x, y: mountY(hash(x)) - 6, w: rand(0, 6), bx: rand(0, 6), life: rand(6, 10) });
}
function updateCritter(c, dt) {
  if (c.t === "eagle") { c.x += c.dir * c.sp * dt; c.w += dt * 6; if (c.x < -30 || c.x > VW + 30) c.dead = true; return; }
  c.life -= dt; if (c.life !== undefined && c.life <= 0 && c.t !== "raven") c.dead = true;
  if (c.t === "goat") {
    c.headT -= dt; if (c.headT <= 0) { c.headT = rand(1.2, 2.6); c.head = c.head ? 0 : (Math.random() < 0.5 ? 1 : -1); }  // повороты головы
    if (c.head === 0) c.x += c.dir * c.sp * dt; c.w += dt * 3;                                                          // идёт, когда не смотрит по сторонам
    if (c.x < VW * 0.05 || c.x > VW * 0.95) c.dir *= -1;
  } else if (c.t === "raven") {
    c.w += dt * 8;
    if (c.phase === "in") { c.y += (c.ty - c.y) * clamp(3 * dt, 0, 1); if (Math.abs(c.y - c.ty) < 1) c.phase = "sit"; }
    else if (c.phase === "sit") { c.sit -= dt; c.headT -= dt; if (c.headT <= 0) { c.headT = rand(0.7, 1.5); c.head = c.head ? 0 : (Math.random() < 0.5 ? 1 : -1); } if (c.sit <= 0) c.phase = "out"; }
    else { c.y -= 34 * dt; c.x += 22 * dt; if (c.y < -8) c.dead = true; }
  } else if (c.t === "lizard") {
    c.pause -= dt; if (c.pause <= 0) { c.x += c.dir * c.sp * dt; if (Math.random() < 0.02) c.pause = rand(0.4, 1.1); }  // перебежки с паузами
    if (c.x < -6 || c.x > VW + 6) c.dead = true;
  } else if (c.t === "butterfly") { c.w += dt * 5; c.bx += dt; c.x += Math.sin(c.bx * 2) * 10 * dt; c.y += Math.cos(c.bx * 3) * 7 * dt; }
}

function updateParticles(dt) {
  const I = game.intensity;
  if (I.rain > 0.3) {
    const count = [1, 2, 4][game.rainVariant];
    for (let i = 0; i < count; i++) game.particles.push({
      t: "rain", x: rand(0, VW), y: -4,
      vy: game.rainVariant === 0 ? rand(120, 180) : game.rainVariant === 1 ? rand(220, 300) : rand(320, 410),
      vx: game.rainVariant === 2 ? -68 : -40
    });
  }
  if (I.wind > 0.3) {
    const count = [1, 2, 3][game.windVariant];
    for (let i = 0; i < count; i++) game.particles.push({
      t: "wind", x: VW + 6, y: rand(0, VH * 0.7),
      vx: rand(-220 - game.windVariant * 45, -170 - game.windVariant * 30),
      vy: game.windVariant === 2 ? rand(-26, 26) : rand(-8, 8), life: rand(0.65, 1.05)
    });
  }
  for (const p of game.particles) { p.x += p.vx * dt; p.y += p.vy * dt; if (p.life !== undefined) p.life -= dt; }
  game.particles = game.particles.filter(p => p.y < VH + 6 && p.x > -20 && (p.life === undefined || p.life > 0));
}

// ============================================================ РЕНДЕР
function render() {
  ctx.save();
  if (game.shake > 0) { const s = game.shake * 3; ctx.translate(Math.round(rand(-s, s)), Math.round(rand(-s, s))); }
  const night = nightness();
  drawSky(night); drawCelestial(night); drawStars(night); drawClouds();
  drawFarRanges(); drawVolcano();
  drawMountainCritters();     // животные на склонах гор (за тропой)
  drawEagles();
  drawSlope();                // тропа с текстурой, лёд, деревья/кусты/камни, ущелья и МОСТЫ маршрута
  drawActor();                // Сизиф и валун — идут по тропе/мостам
  drawAmbient();              // сезонные частицы: снег / листья / лепестки / пыльца
  drawWeather();
  drawFog();
  drawSeasonTint();           // лёгкий сезонный оттенок поверх сцены
  ctx.restore();
}
function nightness() { return (1 - Math.cos((clock / CFG.dayLen) * Math.PI * 2)) / 2; }
function drawSky(night) { const top = mix(PAL.skyDayTop, PAL.skyNightTop, night), bot = mix(PAL.skyDayBot, PAL.skyNightBot, night), b = 12; for (let i = 0; i < b; i++) { ctx.fillStyle = rgb(mix(top, bot, i / (b - 1))); ctx.fillRect(0, Math.floor(i * VH / b), VW, Math.ceil(VH / b) + 1); } }
function drawCelestial(night) {
  const ph = (clock / CFG.dayLen) % 1, ang = ph * Math.PI * 2 - Math.PI / 2;
  const cx = VW * 0.5 + Math.cos(ang) * VW * 0.42, cy = VH * 0.55 + Math.sin(ang) * VH * 0.5, isMoon = night > 0.5;
  if (!isMoon) { ctx.fillStyle = "rgba(255,230,140,0.25)"; fillCircle(cx, cy, 13); }
  ctx.fillStyle = rgb(isMoon ? PAL.moon : PAL.sun); const r = isMoon ? 7 : 9; fillCircle(cx, cy, r);
  if (isMoon) { ctx.fillStyle = rgb(mix(PAL.skyNightTop, PAL.skyNightBot, 0.3)); fillCircle(cx + 3, cy - 2, r - 1); }
}
function drawStars(night) { if (night < 0.15) return; ctx.globalAlpha = clamp((night - 0.15) * 1.3, 0, 1); ctx.fillStyle = "#fff"; for (let i = 0; i < 55; i++) { const x = (i * 71.3) % VW, y = (i * 47.9) % (VH * 0.55); if ((i * 13 + Math.floor(clock * 2)) % 19 !== 0) ctx.fillRect(Math.floor(x), Math.floor(y), 1, 1); } ctx.globalAlpha = 1; }
function drawClouds() { ctx.fillStyle = "rgba(230,230,245,0.16)"; for (const c of game.clouds) { const cx = Math.floor(c.x * VW), cy = Math.floor(c.y * VH), r = 6 * c.s; fillCircle(cx, cy, r); fillCircle(cx + r, cy + 2, r * 0.8); fillCircle(cx - r, cy + 2, r * 0.7); } }
function drawFarRanges() {
  const layers = [{ col: PAL.mountFar, h: 0.40, amp: 0.10, w: 90, sp: 0.10 }, { col: PAL.mountMid, h: 0.48, amp: 0.13, w: 70, sp: 0.16 }];
  for (const L of layers) { const off = (game.scroll * L.sp) % L.w; ctx.fillStyle = rgb(L.col); ctx.beginPath(); ctx.moveTo(0, VH); for (let x = -L.w; x <= VW + L.w; x += L.w) { ctx.lineTo(x - off + L.w / 2, VH * (L.h - L.amp)); ctx.lineTo(x - off + L.w, VH * (L.h + L.amp * 0.4)); } ctx.lineTo(VW, VH); ctx.closePath(); ctx.fill(); }
}
function drawVolcano() {
  const vx = VW * 0.72, base = VH * 0.5, peak = VH * 0.28;
  ctx.fillStyle = rgb(PAL.volcano); ctx.beginPath(); ctx.moveTo(vx - 26, base); ctx.lineTo(vx - 6, peak); ctx.lineTo(vx + 6, peak); ctx.lineTo(vx + 26, base); ctx.closePath(); ctx.fill();
  ctx.fillStyle = rgb(PAL.lava); ctx.fillRect(vx - 5, peak, 10, 2);
  ctx.fillStyle = "rgba(255,120,40,0.5)"; ctx.fillRect(vx - 2, peak, 3, Math.round(base - peak) - 4);
  for (const p of game.erupt) { ctx.fillStyle = p.lava ? rgb(PAL.lava) : `rgba(120,114,126,${clamp(p.life, 0, 1)})`; ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2); }
}
function drawEagles() { ctx.fillStyle = "rgba(20,16,30,0.85)"; for (const c of game.critters) { if (c.t !== "eagle") continue; const flap = Math.round(Math.sin(c.w) * 3), x = Math.round(c.x), y = Math.round(c.y); ctx.fillRect(x - 1, y, 2, 2); ctx.fillRect(x - 5, y - flap - 1, 4, 2); ctx.fillRect(x + 1, y - flap - 1, 4, 2); } }

function drawMountainCritters() {
  for (const c of game.critters) {
    if (c.t === "eagle") continue;
    const x = Math.round(c.x), y = Math.round(c.y);
    if (c.t === "goat") {
      // горный козёл: тело, голова, изогнутые рога, борода, ноги
      ctx.fillStyle = rgb(PAL.goat); ctx.fillRect(x - 3, y, 6, 3);
      ctx.fillStyle = rgb(PAL.goatDk); ctx.fillRect(x - 3, y + 2, 6, 1);
      const hd = c.dir + (c.head || 0), hx = c.dir > 0 ? x + 3 : x - 4;      // голова + поворот
      ctx.fillStyle = rgb(PAL.goat); ctx.fillRect(hx, y - 2, 2, 3);
      ctx.fillStyle = rgb(PAL.horn); ctx.fillRect(hx + (c.dir > 0 ? 0 : 1), y - 4, 1, 2); ctx.fillRect(hx + (c.dir > 0 ? -1 : 2), y - 5, 1, 2); // рог назад
      ctx.fillStyle = rgb(PAL.goatDk); ctx.fillRect(hx, y + 1, 1, 1);          // бородка
      const leg = Math.round(Math.sin(c.w) * 1);
      ctx.fillStyle = rgb(PAL.goatDk); ctx.fillRect(x - 2, y + 3, 1, 2 + leg); ctx.fillRect(x + 1, y + 3, 1, 2 - leg);
    } else if (c.t === "raven") {
      const flap = Math.round(Math.sin(c.w) * 2); ctx.fillStyle = rgb(PAL.raven); ctx.fillRect(x, y - 3, 2, 4);
      if (c.phase !== "sit") { ctx.fillRect(x - 3, y - 3 - flap, 3, 2); ctx.fillRect(x + 2, y - 3 - flap, 3, 2); }
      else { const hx = (c.head || 0) >= 0 ? x + 2 : x - 1; ctx.fillRect(hx, y - 4, 1, 1); }                         // повороты головы сидя
      ctx.fillStyle = "#e0a020"; ctx.fillRect(x + ((c.head || 0) < 0 ? -1 : 2), y - 3, 1, 1);
    } else if (c.t === "lizard") {
      ctx.fillStyle = rgb(PAL.lizard); ctx.fillRect(x, y, 4, 1); ctx.fillRect(x + (c.dir > 0 ? 4 : -3), y, 3, 1); ctx.fillRect(x + 1, y - 1, 1, 1);
    } else if (c.t === "butterfly") {
      const open = Math.sin(c.w) > 0 ? 2 : 1; ctx.fillStyle = rgb(PAL.flutter); ctx.fillRect(x - open, y - 1, open, 2); ctx.fillRect(x + 1, y - 1, open, 2); ctx.fillStyle = "#3a2a10"; ctx.fillRect(x, y - 1, 1, 2);
    }
  }
}

function slopeAngle() { return Math.min(0.30 + (difficulty() - 1) * 0.05, 0.48); }
function steepLift(worldX) {
  const p = game.steepPatch;
  if (!p || worldX <= p.s) return 0;
  const progress = Math.min(worldX - p.s, p.len);
  const edge = Math.min(1, progress / 16, (p.len - progress) / 16);
  return -progress * 0.28 * SET.steepMul - Math.max(0, edge) * 2;
}
function hillWave(worldX) {
  return Math.sin(worldX / 31) * 4.8 + Math.sin(worldX / 73 + 1.2) * 3.6 + Math.sin(worldX / 16) * 1.3;
}
function traceSlope(slopeY) {
  ctx.beginPath();
  ctx.moveTo(0, slopeY(0));
  for (let x = 3; x <= VW; x += 3) ctx.lineTo(x, slopeY(x));
  ctx.lineTo(VW, VH); ctx.lineTo(0, VH); ctx.closePath();
}

function drawSlope() {
  const ang = slopeAngle(), baseY = VH * 0.80;
  const cameraWave = hillWave(game.scroll), cameraSteep = steepLift(game.scroll);
  const slopeY = (x) => {
    const worldX = game.scroll + x;
    return baseY - x * ang + hillWave(worldX) - cameraWave + steepLift(worldX) - cameraSteep;
  };
  const actorX = VW * 0.40;
  const localAng = clamp((slopeY(actorX - 2) - slopeY(actorX + 2)) / 4, 0.16, 0.92);
  game._slope = { ang: localAng, baseY: slopeY(0), slopeY };

  // тело склона
  traceSlope(slopeY); ctx.fillStyle = rgb(PAL.dirt2); ctx.fill();

  // текстура тропы
  ctx.save(); traceSlope(slopeY); ctx.clip();
  const cell = 8, off = game.scroll % cell;
  for (let sx = -cell; sx < VW + cell; sx += cell) {
    const wx = sx - off, wi = Math.floor((game.scroll + sx) / cell), sy = slopeY(wx), h1 = hash(wi), h2 = hash(wi * 1.7 + 3);
    ctx.fillStyle = rgb(h1 < 0.33 ? PAL.dirt1 : h1 < 0.66 ? PAL.dirt2 : PAL.dirt3); ctx.fillRect(wx, sy, cell + 1, VH - sy);
    ctx.fillStyle = rgb(PAL.dirt1); ctx.fillRect(wx, sy, cell + 1, 2);
    if (h2 < 0.25) { ctx.fillStyle = rgb(PAL.rock); ctx.fillRect(wx + Math.floor(h1 * 4), sy + 3 + Math.floor(h2 * 8), 2, 2); }
    if (h2 > 0.85) { ctx.fillStyle = rgb(PAL.stoneCr); ctx.fillRect(wx + 2, sy + 6, 3, 2); }
    if (h1 > 0.92) { ctx.fillStyle = rgb(grassTone()); ctx.fillRect(wx + 1, sy - 2, 1, 2); ctx.fillRect(wx + 3, sy - 3, 1, 3); }
  }
  ctx.restore();

  drawSnowCover(slopeY);      // снежный покров зимой (плавно по сезону)

  drawProps(slopeY);          // сухие деревья, кусты, выступающие камни
  drawIce(slopeY);            // лёд-участок с границей
  drawBridges(slopeY);        // ущелья + мосты как часть маршрута
}

// сухие деревья, засохшие кустарники, выступающие камни на склоне
function drawProps(slopeY) {
  const period = 46, kS = Math.floor((game.scroll - 20) / period), kE = Math.ceil((game.scroll + VW + 20) / period);
  for (let k = kS; k <= kE; k++) {
    const h = hash(k * 5.1); if (h > 0.62) continue;               // не в каждой ячейке
    const x = Math.round(k * period - game.scroll), y = Math.round(slopeY(x));
    if (x < -10 || x > VW + 10) continue;
    if (isOverGorge(k * period)) continue;                          // не висим над пропастью
    if (h < 0.22) {                                                 // сухое дерево без листвы
      ctx.fillStyle = rgb(PAL.deadTree); ctx.fillRect(x, y - 12, 2, 12);
      ctx.fillRect(x - 3, y - 9, 3, 1); ctx.fillRect(x + 2, y - 11, 3, 1); ctx.fillRect(x - 2, y - 6, 2, 1); ctx.fillRect(x + 2, y - 5, 2, 1);
      ctx.fillRect(x - 4, y - 10, 1, 2); ctx.fillRect(x + 4, y - 12, 1, 2);
    } else if (h < 0.44) {                                          // засохший кустарник
      ctx.fillStyle = rgb(PAL.shrub); ctx.fillRect(x - 2, y - 4, 6, 4); ctx.fillRect(x - 1, y - 6, 4, 2);
      ctx.fillStyle = rgb(PAL.dirt3); ctx.fillRect(x, y - 3, 1, 3); ctx.fillRect(x + 2, y - 2, 1, 2);
    } else {                                                        // выступающий камень
      ctx.fillStyle = rgb(PAL.rock); ctx.fillRect(x - 2, y - 4, 7, 5); ctx.fillStyle = rgb(PAL.stoneHi); ctx.fillRect(x - 1, y - 4, 3, 2); ctx.fillStyle = rgb(PAL.stoneCr); ctx.fillRect(x + 3, y - 1, 2, 2);
    }
  }
}

function drawIce(slopeY) {
  const p = game.icePatch; if (!p) return;
  const x0 = p.s - game.scroll, x1 = p.s + p.len - game.scroll;   // левая (задняя) и правая (передняя) границы участка
  if (x1 < -6 || x0 > VW + 6) return;
  const xa = Math.max(-6, Math.floor(x0)), xb = Math.min(VW + 6, Math.ceil(x1));
  ctx.save(); traceSlope(slopeY); ctx.clip();
  // ледяное полотно вдоль поверхности участка
  ctx.beginPath(); ctx.moveTo(xa, slopeY(xa)); for (let x = xa; x <= xb; x += 4) ctx.lineTo(x, slopeY(x)); ctx.lineTo(xb, VH); ctx.lineTo(xa, VH); ctx.closePath();
  ctx.fillStyle = rgb(PAL.ice1); ctx.fill();
  ctx.fillStyle = rgb(PAL.ice2); for (let x = xa; x < xb; x += 10) { const y = slopeY(x); if (Math.floor((x + game.scroll) / 10) % 2) ctx.fillRect(x, y + 4, 6, 3); }
  ctx.fillStyle = "rgba(255,255,255,0.6)"; for (let x = xa + 6; x < xb; x += 20) ctx.fillRect(x, slopeY(x) + 2, 3, 1);
  // яркие границы: передняя (приближается) и задняя
  ctx.strokeStyle = rgb(PAL.iceEdge); ctx.lineWidth = 2;
  if (x1 <= VW + 6) { ctx.beginPath(); ctx.moveTo(x1, slopeY(x1) - 3); ctx.lineTo(x1, VH); ctx.stroke(); }
  if (x0 >= -6) { ctx.beginPath(); ctx.moveTo(x0, slopeY(x0) - 2); ctx.lineTo(x0, VH); ctx.stroke(); }
  ctx.restore();
}

// ---------- Ущелья и мосты (часть маршрута) ----------
const GORGE_PERIOD = 300;
function gorgeAt(k) { return hash(k * 1.3) < 0.42; }              // есть ли ущелье в слоте k
function gorgeWidth(k) { return 40 + Math.floor(hash(k * 2.1) * 26); }
function isOverGorge(worldX) {
  const k = Math.round(worldX / GORGE_PERIOD);
  for (let d = -1; d <= 1; d++) { const kk = k + d; if (!gorgeAt(kk)) continue; const gx0 = kk * GORGE_PERIOD, gw = gorgeWidth(kk); if (worldX > gx0 - 6 && worldX < gx0 + gw + 6) return true; }
  return false;
}
function drawBridges(slopeY) {
  const kS = Math.floor((game.scroll - 40) / GORGE_PERIOD), kE = Math.ceil((game.scroll + VW + 40) / GORGE_PERIOD);
  for (let k = kS; k <= kE; k++) {
    if (!gorgeAt(k)) continue;
    const gw = gorgeWidth(k), gx = Math.round(k * GORGE_PERIOD - game.scroll);
    if (gx + gw < -10 || gx > VW + 10) continue;
    const yL = slopeY(gx), yR = slopeY(gx + gw);
    // пропасть/обрыв — тёмная расщелина вниз
    ctx.save(); ctx.beginPath(); ctx.moveTo(gx, yL); ctx.lineTo(gx + gw, yR); ctx.lineTo(gx + gw, VH); ctx.lineTo(gx, VH); ctx.closePath(); ctx.clip();
    const bands = 8; for (let i = 0; i < bands; i++) { ctx.fillStyle = rgb(mix(PAL.dirt3, PAL.chasm, i / (bands - 1))); ctx.fillRect(gx, yL + i * (VH - yL) / bands, gw, (VH - yL) / bands + 1); }
    // рваные края скал
    ctx.fillStyle = rgb(PAL.rock); ctx.fillRect(gx, yL, 2, 3); ctx.fillRect(gx + gw - 2, yR, 2, 3);
    ctx.restore();

    // МОСТ по линии тропы — Сизиф идёт по нему. Тип варьируется, чтобы маршрут не был однообразным.
    const type = ["wood", "stone", "rope"][Math.floor(hash(k * 7.7) * 3) % 3];
    drawBridge(type, gx, gw, slopeY);
  }
}
function drawBridge(type, gx, gw, slopeY) {
  const yAt = (x) => slopeY(x);
  if (type === "stone") {
    // каменный арочный мост: сплошная арка с кладкой
    const midX = gx + gw / 2, yL = yAt(gx - 3), yR = yAt(gx + gw + 3), yM = yAt(midX), rise = 7;
    ctx.fillStyle = rgb(PAL.rock);
    ctx.beginPath(); ctx.moveTo(gx - 3, yL + 2); ctx.quadraticCurveTo(midX, yM - rise + 2, gx + gw + 3, yR + 2);
    ctx.lineTo(gx + gw + 3, yR + 6); ctx.quadraticCurveTo(midX, yM - rise + 8, gx - 3, yL + 6); ctx.closePath(); ctx.fill();
    // настил поверху
    ctx.strokeStyle = rgb(PAL.stoneHi); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(gx - 3, yL); ctx.quadraticCurveTo(midX, yM - rise, gx + gw + 3, yR); ctx.stroke();
    // швы кладки
    ctx.strokeStyle = rgb(PAL.stoneCr); ctx.lineWidth = 1;
    for (let x = gx; x <= gx + gw; x += 6) { const t = (x - gx) / gw, y = yAt(x) - Math.sin(t * Math.PI) * rise; ctx.beginPath(); ctx.moveTo(x, y + 1); ctx.lineTo(x, y + 6); ctx.stroke(); }
    // устои
    ctx.fillStyle = rgb(PAL.stoneCr); ctx.fillRect(gx - 4, yL, 3, 8); ctx.fillRect(gx + gw + 1, yR, 3, 8);
  } else if (type === "rope") {
    // подвесной мост: провисающие канаты, редкие доски, башенки-опоры
    const sag = 6, yL = yAt(gx - 2), yR = yAt(gx + gw + 2);
    const cableY = (x) => { const t = (x - (gx - 2)) / (gw + 4); return yAt(x) + Math.sin(t * Math.PI) * sag; };
    // опорные столбы
    ctx.fillStyle = rgb(PAL.woodDk); ctx.fillRect(gx - 3, yL - 10, 2, 11); ctx.fillRect(gx + gw + 1, yR - 10, 2, 11);
    // верхний несущий канат (провисает)
    ctx.strokeStyle = rgb(PAL.wood); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(gx - 3, yL - 9); for (let x = gx - 2; x <= gx + gw + 2; x += 3) ctx.lineTo(x, cableY(x) - 8); ctx.lineTo(gx + gw + 1, yR - 9); ctx.stroke();
    // настил из досок по нижнему канату
    ctx.beginPath(); ctx.moveTo(gx - 2, yL); for (let x = gx - 2; x <= gx + gw + 2; x += 3) ctx.lineTo(x, cableY(x)); ctx.stroke();
    ctx.fillStyle = rgb(PAL.wood); for (let x = gx; x <= gx + gw; x += 4) { const y = cableY(x); ctx.fillRect(x, y - 1, 3, 2); }
    // вертикальные подвесы
    ctx.strokeStyle = rgb(PAL.woodDk); for (let x = gx + 2; x < gx + gw; x += 8) { const y = cableY(x); ctx.beginPath(); ctx.moveTo(x, y - 8); ctx.lineTo(x, y); ctx.stroke(); }
  } else {
    // деревянный дощатый мост
    ctx.strokeStyle = rgb(PAL.wood); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(gx - 3, yAt(gx - 3)); ctx.lineTo(gx + gw + 3, yAt(gx + gw + 3)); ctx.stroke();
    ctx.strokeStyle = rgb(PAL.woodDk); ctx.lineWidth = 1;
    for (let x = gx; x <= gx + gw; x += 4) { const y = yAt(x); ctx.beginPath(); ctx.moveTo(x, y - 1); ctx.lineTo(x, y + 2); ctx.stroke(); }
    ctx.strokeStyle = rgb(PAL.woodDk); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(gx - 2, yAt(gx - 2) - 6); ctx.lineTo(gx + gw + 2, yAt(gx + gw + 2) - 6); ctx.stroke();
    for (let x = gx + 4; x < gx + gw; x += 12) { const y = yAt(x); ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.lineTo(x, y); ctx.stroke(); }  // стойки перил
    ctx.fillStyle = rgb(PAL.woodDk); ctx.fillRect(gx - 2, yAt(gx) - 6, 2, 7); ctx.fillRect(gx + gw, yAt(gx + gw) - 6, 2, 7);
  }
}

// ---------- Сизиф и валун ----------
const BOULDER = (() => { const pts = []; for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; pts.push({ a, r: 0.82 + hash(i * 3.3) * 0.36 }); } return pts; })();
function drawActor() {
  const S = game._slope, falling = state === "falling";
  const px = VW * 0.40, figH = 22, R = 16;
  let sisX = px, stoneX = px + 22, bodyTurn = 0, fallenPose = false, headTurn = 0, walking = false;
  if (state === "intro") {
    const p = clamp(game.intro / CFG.introDuration, 0, 1);
    const ease = p * p * (3 - 2 * p);
    sisX = lerp(-34, px, ease);
    walking = true;
  } else if (falling) {
    const t = game.fall.t;
    const stoneP = clamp(t / 1.8, 0, 1);
    stoneX -= stoneP * stoneP * (VW * 0.72 + 40);
    if (t < 0.7) {
      sisX -= (t / 0.7) * 9;
      bodyTurn = (t / 0.7) * 1.15;
      fallenPose = true;
    } else if (t < 1.8) {
      sisX -= 9;
      bodyTurn = 1.15;
      fallenPose = true;
    } else if (t < 3.0) {
      const stand = (t - 1.8) / 1.2;
      sisX -= 9;
      bodyTurn = lerp(1.15, 0, stand);
      fallenPose = stand < 0.7;
    } else if (t < 4.5) {
      sisX -= 9;
      headTurn = Math.sin((t - 3.0) / 1.5 * Math.PI) * -1;
    } else {
      const down = clamp((t - 4.5) / 4.7, 0, 1);
      sisX -= 9 + down * (VW * 0.62 + 52);
      walking = true;
      headTurn = -0.25;
    }
  }

  if (stoneX > -R * 3 && stoneX < VW + R * 3) {
    const sy = S.slopeY(stoneX) - 22 * S.ang - R + 2;
    ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.ellipse(stoneX, S.slopeY(stoneX) + 1, R * 0.9, 3, 0, 0, Math.PI * 2); ctx.fill();
    drawBoulder(stoneX, sy, R, game.stoneAngle);
  }
  if (sisX > -45) {
    ctx.save();
    ctx.translate(sisX, S.slopeY(sisX));
    ctx.rotate(-S.ang + bodyTurn);
    drawSisyphus(figH, game.pushAnim, fallenPose, game.intensity.rain, headTurn, walking);
    ctx.restore();
  }
}
function drawBoulder(x, y, R, ang) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
  ctx.beginPath(); BOULDER.forEach((p, i) => { const rx = Math.cos(p.a) * p.r * R, ry = Math.sin(p.a) * p.r * R; i ? ctx.lineTo(rx, ry) : ctx.moveTo(rx, ry); }); ctx.closePath(); ctx.fillStyle = rgb(PAL.stoneMid); ctx.fill();
  ctx.save(); ctx.clip();
  ctx.fillStyle = rgb(PAL.stoneHi); fillCircle(-R * 0.3, -R * 0.35, R * 0.7);
  ctx.fillStyle = rgb(PAL.stoneLo); fillCircle(R * 0.4, R * 0.45, R * 0.7);
  ctx.strokeStyle = rgb(PAL.stoneCr); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-R * 0.62, -R * 0.48); ctx.lineTo(-R * 0.34, -R * 0.25); ctx.lineTo(-R * 0.16, R * 0.05); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-R * 0.34, -R * 0.25); ctx.lineTo(-R * 0.43, R * 0.02); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(R * 0.24, R * 0.16); ctx.lineTo(R * 0.52, R * 0.39); ctx.lineTo(R * 0.36, R * 0.68); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(R * 0.52, R * 0.39); ctx.lineTo(R * 0.72, R * 0.30); ctx.stroke();
  ctx.fillStyle = rgb(PAL.stoneCr); for (let i = 0; i < 8; i++) { const a = i * 2.399; ctx.fillRect(Math.round(Math.cos(a) * R * 0.5), Math.round(Math.sin(a) * R * 0.5), 1, 1); }
  ctx.restore(); ctx.restore();
}
function drawSisyphus(H, push, falling, rain = 0, headTurn = 0, walking = false) {
  const S = PAL, bend = falling ? 0 : Math.round(push * 4);
  const strideAmp = 2 * (1 - 0.6 * rain);
  const walkClock = walking ? clock * 7 : game.scroll * 0.12;
  const stride = falling ? 3 : Math.round(Math.sin(walkClock) * strideAmp);
  ctx.fillStyle = rgb(S.skin); ctx.fillRect(-4 + stride, -6, 2, 6); ctx.fillRect(1 - stride, -6, 2, 6);
  ctx.fillStyle = rgb(S.cloth); ctx.fillRect(-4 + bend, -16, 9, 11);
  ctx.fillStyle = rgb(S.clothSh); ctx.fillRect(2 + bend, -16, 3, 11);
  ctx.fillStyle = rgb(S.cloth); ctx.fillRect(-5 + bend, -8, 11, 3);
  ctx.fillStyle = rgb(S.skin); ctx.fillRect(3 + bend, -15, 9, 2); ctx.fillRect(3 + bend, -11, 9, 2);
  const headShift = Math.round(headTurn * 2);
  ctx.fillStyle = rgb(S.skin); ctx.fillRect(2 + bend + headShift, -22, 5, 5);
  ctx.fillStyle = rgb(S.hair); ctx.fillRect(2 + bend + headShift, -23, 6, 2); ctx.fillRect(1 + bend + headShift, -21, 2, 3);
  ctx.fillStyle = rgb(S.beard); ctx.fillRect(6 + bend + Math.max(0, headShift), -19, 3, 6); ctx.fillRect(5 + bend + headShift, -15, 3, 3);
  ctx.fillStyle = "#3b3130"; ctx.fillRect(5 + bend + headShift, -20, 1, 1);
  if (!falling && push > 0.4 && rain < 0.5) { ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.fillRect(9 + bend, -24, 1, 2); }
}

function drawWeather() {
  for (const p of game.particles) {
    if (p.t === "rain") { ctx.strokeStyle = "rgba(150,180,255,0.6)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - 1, p.y + 5); ctx.stroke(); }
    else { ctx.strokeStyle = `rgba(210,235,255,${0.3 * (p.life || 1)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + 14, p.y); ctx.stroke(); }
  }
  if (game.intensity.rain > 0.2) { ctx.fillStyle = `rgba(20,30,60,${0.18 * game.intensity.rain})`; ctx.fillRect(0, 0, VW, VH); }
}
function drawFog() {
  const heightFog = clamp((game.height - 55) / 360, 0, 0.24);
  const pulse = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(clock * 0.08));
  const alpha = heightFog * pulse;
  if (alpha < 0.012) return;
  const g = ctx.createLinearGradient(0, VH * 0.2, 0, VH);
  g.addColorStop(0, `rgba(185,190,210,${(alpha * 0.22).toFixed(3)})`);
  g.addColorStop(0.55, `rgba(164,169,191,${(alpha * 0.72).toFixed(3)})`);
  g.addColorStop(1, `rgba(130,135,157,${(alpha * 0.38).toFixed(3)})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  ctx.fillStyle = `rgba(200,204,218,${(alpha * 0.22).toFixed(3)})`;
  for (let i = 0; i < 5; i++) {
    const x = ((clock * (2 + i * 0.4) + i * 91) % (VW + 90)) - 45;
    ctx.fillRect(x, VH * (0.32 + i * 0.1), 70 + i * 12, 4 + i);
  }
}

// ---------- Хелперы ----------
function fillCircle(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
function mix(a, b, t) { return [Math.round(lerp(a[0], b[0], t)), Math.round(lerp(a[1], b[1], t)), Math.round(lerp(a[2], b[2], t))]; }
function rgb(c) { return `rgb(${c[0]},${c[1]},${c[2]})`; }

// ---------- Цикл ----------
let last = performance.now();
function loop(now) { let dt = (now - last) / 1000; last = now; dt = Math.min(dt, 0.05); clock += dt; update(dt); updateAmbience(dt); render(); requestAnimationFrame(loop); }
requestAnimationFrame(loop);
