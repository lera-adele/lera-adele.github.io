/* ============================================================
   TV music — easter egg
   A placeholder lo-fi loop generated with Web Audio (no file needed).
   To use a real track later: put it in assets/audio/ and set TRACK_SRC.
   ============================================================ */
window.TVMusic = (() => {
  "use strict";

  const TRACK_SRC = "";      // e.g. "assets/audio/theme.mp3" — leave empty for the generated loop
  const MAX_GAIN = 0.32;     // overall loudness at volume = 1
  const BPM = 78;

  const AC = window.AudioContext || window.webkitAudioContext;
  let ctx = null, master = null, lowpass = null, bus = null;
  let playing = false;
  let level = 1;
  let muffled = false;

  // generated loop
  let schedTimer = null, nextTime = 0, step = 0, crackle = null;
  // file track
  let audioEl = null;

  function init() {
    if (ctx || !AC) return !!ctx;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0;
    lowpass = ctx.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 18000;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 3;
    bus = ctx.createGain();
    bus.connect(lowpass).connect(comp).connect(master).connect(ctx.destination);

    if (TRACK_SRC && location.protocol !== "file:") {
      audioEl = new Audio(TRACK_SRC);
      audioEl.loop = true;
      audioEl.crossOrigin = "anonymous";
      ctx.createMediaElementSource(audioEl).connect(bus);
    }
    return true;
  }

  // ---------- synth voices -------------------------------------
  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

  // Fmaj7 – Em7 – Dm7 – Cmaj7, one chord per bar
  const CHORDS = [
    [53, 57, 60, 64],
    [52, 55, 59, 62],
    [50, 53, 57, 60],
    [48, 52, 55, 59],
  ];
  const BASS = [41, 40, 38, 36];
  const SCALE = [64, 67, 69, 72, 74, 76, 79]; // C major pentatonic-ish, upper register

  function pad(notes, t, dur) {
    notes.forEach((n, i) => {
      [-6, 6].forEach((detune) => {
        const o = ctx.createOscillator();
        o.type = "triangle";
        o.frequency.value = midi(n);
        o.detune.value = detune + (i % 2 ? 3 : -3);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.035, t + 0.6);
        g.gain.setValueAtTime(0.035, t + dur - 0.5);
        g.gain.linearRampToValueAtTime(0, t + dur);
        o.connect(g).connect(bus);
        o.start(t);
        o.stop(t + dur + 0.05);
      });
    });
  }

  function bass(n, t, dur) {
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = midi(n);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.22, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(bus);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  function pluck(n, t) {
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = midi(n);
    const o2 = ctx.createOscillator();
    o2.type = "triangle";
    o2.frequency.value = midi(n + 12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.07, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
    const g2 = ctx.createGain();
    g2.gain.value = 0.15;
    o.connect(g);
    o2.connect(g2).connect(g);
    g.connect(bus);
    o.start(t); o2.start(t);
    o.stop(t + 1); o2.stop(t + 1);
  }

  let noiseBuf = null;
  function noise() {
    if (noiseBuf) return noiseBuf;
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return noiseBuf;
  }

  function kick(t) {
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.18);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    o.connect(g).connect(bus);
    o.start(t);
    o.stop(t + 0.4);
  }

  function hit(t, { freq, q = 1, type = "bandpass", gain, decay }) {
    const s = ctx.createBufferSource();
    s.buffer = noise();
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + decay);
    s.connect(f).connect(g).connect(bus);
    s.start(t, Math.random() * 0.5);
    s.stop(t + decay + 0.02);
  }

  // vinyl crackle — fits the old-TV mood
  function startCrackle() {
    const len = ctx.sampleRate * 4;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * 0.006;
      if (Math.random() < 0.0004) d[i] += (Math.random() * 2 - 1) * 0.5;
    }
    crackle = ctx.createBufferSource();
    crackle.buffer = buf;
    crackle.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = 900;
    const g = ctx.createGain();
    g.gain.value = 0.5;
    crackle.connect(f).connect(g).connect(bus);
    crackle.start();
  }

  // ---------- sequencer (8th notes) ------------------------------
  const EIGHTH = 60 / BPM / 2;

  function scheduleStep(s, t) {
    const bar = Math.floor(s / 8) % CHORDS.length;
    const pos = s % 8;
    if (pos === 0) { pad(CHORDS[bar], t, EIGHTH * 8); bass(BASS[bar], t, EIGHTH * 3.5); }
    if (pos === 4) bass(BASS[bar] + (bar % 2 ? 7 : 12), t, EIGHTH * 3);
    if (pos === 0 || pos === 5) kick(t);
    if (pos === 2 || pos === 6) hit(t, { freq: 1800, q: 0.8, gain: 0.12, decay: 0.18 });
    hit(t + (pos % 2 ? EIGHTH * 0.12 : 0), { freq: 8000, type: "highpass", gain: pos % 2 ? 0.025 : 0.04, decay: 0.05 });
    if (Math.random() < (pos % 2 ? 0.22 : 0.4)) {
      const chordTones = SCALE.filter((n) => CHORDS[bar].some((c) => (n - c) % 12 === 0) || Math.random() < 0.3);
      pluck(chordTones[Math.floor(Math.random() * chordTones.length)] || 72, t);
    }
  }

  function scheduler() {
    while (nextTime < ctx.currentTime + 0.15) {
      scheduleStep(step, nextTime);
      step++;
      nextTime += EIGHTH;
    }
  }

  // ---------- public API ----------------------------------------
  function ramp(param, value, seconds, exp = false) {
    const t = ctx.currentTime;
    param.cancelScheduledValues(t);
    param.setValueAtTime(param.value, t);
    exp ? param.exponentialRampToValueAtTime(value, t + seconds) : param.linearRampToValueAtTime(value, t + seconds);
  }

  function applyLevel(fade = 0.3) {
    if (!ctx) return;
    const target = playing ? MAX_GAIN * level * level * (muffled ? 0.7 : 1) : 0;
    ramp(master.gain, target, fade);
    ramp(lowpass.frequency, muffled ? 420 : 18000, fade, true);
  }

  async function start() {
    if (!init()) return;
    if (ctx.state === "suspended") await ctx.resume();
    muffled = false;
    if (!playing) {
      playing = true;
      if (audioEl) {
        try { await audioEl.play(); } catch (e) { /* missing file — stay silent */ }
      } else {
        step = 0;
        nextTime = ctx.currentTime + 0.08;
        clearInterval(schedTimer);
        schedTimer = setInterval(scheduler, 25);
        if (!crackle) startCrackle();
      }
    }
    applyLevel(0.9);
  }

  function stop(fade = 0.6) {
    if (!ctx || !playing) return;
    playing = false;
    applyLevel(fade);
    setTimeout(() => {
      if (playing) return;
      clearInterval(schedTimer);
      if (crackle) { crackle.stop(); crackle = null; }
      if (audioEl) { audioEl.pause(); audioEl.currentTime = 0; }
    }, fade * 1000 + 50);
  }

  function muffle(on) { muffled = on; applyLevel(0.35); }
  function setVolume(v) { level = Math.max(0, Math.min(1, v)); applyLevel(0.05); }

  return {
    start, stop, muffle, setVolume,
    get isPlaying() { return playing; },
    get supported() { return !!AC; },
  };
})();
