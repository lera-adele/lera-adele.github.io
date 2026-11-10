/* ============================================================
   Lera Adele — portfolio: TV interactions
   ============================================================ */
(() => {
  "use strict";

  // ---- Settings ------------------------------------------------
  const CYCLE_MS = 2500;          // Play: time per project
  const KNOB_MIN_ANGLE = 135;     // degrees, screen coords (0 = right, clockwise): 7:30
  const KNOB_SWEEP = 270;         // 7:30 → 4:30
  const MOBILE = window.matchMedia("(max-width: 1023px)");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const music = window.TVMusic;

  // ---- Elements ------------------------------------------------
  const home = document.querySelector(".home");
  const stage = document.querySelector(".stage");
  const svg = document.querySelector(".tv-svg");
  const screen = document.getElementById("screen");
  const inner = screen.querySelector(".screen-inner");
  const previews = [...screen.querySelectorAll(".preview")];
  const noise = screen.querySelector(".noise");
  const dimmer = screen.querySelector(".dimmer");
  const osdStatus = screen.querySelector(".osd-status");
  const osdLevel = screen.querySelector(".osd-level");
  const osdChannel = screen.querySelector(".osd-channel");
  const projects = [...document.querySelectorAll(".project")];
  const btnPlay = document.getElementById("btn-play");
  const btnStop = document.getElementById("btn-stop");
  const btnPause = document.getElementById("btn-pause");

  // ---- State ---------------------------------------------------
  let index = 0;
  let state = "idle";             // idle | playing | paused | stopped
  let timer = null;
  let musicUnlocked = false;      // the easter egg: set by the first turn of a knob

  // ============================================================
  // Channel switching
  // ============================================================
  function show(i, { flash = true } = {}) {
    index = (i + previews.length) % previews.length;
    previews.forEach((img, k) => img.classList.toggle("is-active", k === index));
    highlightProject();
    // preload the next image so the switch is instant
    const next = previews[(index + 1) % previews.length];
    if (next.loading === "lazy") next.loading = "eager";

    osdChannel.textContent = "CH " + String(index + 1).padStart(2, "0");
    flashOsd(osdChannel, 900);

    if (flash && !reduceMotion && screen.dataset.power === "on") {
      screen.classList.remove("is-switching");
      void screen.offsetWidth; // restart the animation
      screen.classList.add("is-switching");
      staticBurst(280);
    }
  }

  // the list mirrors the TV: the project on screen is highlighted; TV off → nothing is
  function highlightProject() {
    const lit = state !== "stopped";
    projects.forEach((p, k) => {
      const on = lit && k === index;
      p.classList.toggle("is-active", on);
      if (on) p.setAttribute("aria-current", "true"); else p.removeAttribute("aria-current");
    });
  }

  const osdTimers = new WeakMap();
  function flashOsd(el, ms) {
    el.classList.add("is-visible");
    clearTimeout(osdTimers.get(el));
    osdTimers.set(el, setTimeout(() => el.classList.remove("is-visible"), ms));
  }

  // ---- TV static ---------------------------------------------
  const nctx = noise.getContext("2d");
  noise.width = 160;
  noise.height = 122;
  const noiseImg = nctx.createImageData(noise.width, noise.height);
  let noiseUntil = 0, noiseRaf = 0;
  function drawNoise(now) {
    const d = noiseImg.data;
    for (let p = 0; p < d.length; p += 4) {
      const v = Math.random() * 255;
      d[p] = d[p + 1] = d[p + 2] = v;
      d[p + 3] = 255;
    }
    nctx.putImageData(noiseImg, 0, 0);
    noiseRaf = now < noiseUntil ? requestAnimationFrame(drawNoise) : 0;
  }
  function staticBurst(ms) {
    noiseUntil = performance.now() + ms;
    if (!noiseRaf) noiseRaf = requestAnimationFrame(drawNoise);
  }

  // ============================================================
  // Power (CRT off / on)
  // ============================================================
  // animationend bubbles up from children — react only to the element's own animation
  // (with a timeout fallback: background tabs may pause animations and never fire the event)
  function onOwnAnimationEnd(el, cb, fallbackMs = 800) {
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      el.removeEventListener("animationend", handler);
      clearTimeout(fallback);
      cb();
    };
    const handler = (e) => { if (e.target === el) finish(); };
    const fallback = setTimeout(finish, fallbackMs);
    el.addEventListener("animationend", handler);
  }

  function powerOff() {
    if (screen.dataset.power === "off") return Promise.resolve();
    return new Promise((resolve) => {
      screen.classList.remove("is-powering-on", "is-switching");
      screen.classList.add("is-powering-off");
      const done = () => {
        screen.classList.remove("is-powering-off");
        screen.dataset.power = "off";
        resolve();
      };
      reduceMotion ? done() : onOwnAnimationEnd(inner, done);
    });
  }

  function powerOn() {
    if (screen.dataset.power === "on") return Promise.resolve();
    return new Promise((resolve) => {
      screen.classList.remove("is-powering-off");
      screen.dataset.power = "on";
      screen.classList.add("is-powering-on");
      const done = () => { screen.classList.remove("is-powering-on"); resolve(); };
      reduceMotion ? done() : onOwnAnimationEnd(inner, done);
    });
  }

  // ============================================================
  // Transport: Play / Pause / Stop
  // ============================================================
  function setState(next) {
    state = next;
    screen.dataset.state = next;
    btnPlay.classList.toggle("is-latched", next === "playing");
    btnPause.classList.toggle("is-latched", next === "paused");
    btnPlay.setAttribute("aria-pressed", String(next === "playing"));
    btnPause.setAttribute("aria-pressed", String(next === "paused"));
    osdStatus.classList.remove("is-blinking");
    osdStatus.textContent = "";
    highlightProject();
  }

  function startCycle() {
    clearInterval(timer);
    timer = setInterval(() => show(index + 1), CYCLE_MS);
  }

  async function play() {
    // Play is a toggle: pressing it again stops the auto switching on the current project
    if (state === "playing") {
      clearInterval(timer);
      setState("idle");
      return;
    }
    const fromStop = state === "stopped";
    const fromPause = state === "paused";
    if (fromStop) show(0, { flash: false });
    setState("playing");
    if (musicUnlocked) music.start();
    await powerOn();
    if (state !== "playing") return;
    osdStatus.textContent = "▶ PLAY";
    flashOsd(osdStatus, 1200);
    // resume from pause stays on the same channel; from idle jump straight to the next one
    if (!fromStop && !fromPause) show(index + 1);
    startCycle();
  }

  function pause() {
    if (state === "paused") return play();       // Pause again = resume
    if (state !== "playing") return;
    clearInterval(timer);
    setState("paused");
    osdStatus.textContent = "❚❚ PAUSE";
    osdStatus.classList.add("is-visible", "is-blinking");
    clearTimeout(osdTimers.get(osdStatus));
    if (music.isPlaying) music.muffle(true);
  }

  async function stop() {
    clearInterval(timer);
    // Stop is a power switch: pressed again, the TV comes back on (first project, no autoplay)
    if (state === "stopped") {
      setState("idle");
      show(index, { flash: false });
      await powerOn();
      flashOsd(osdChannel, 1200);
      return;
    }
    setState("stopped");
    music.stop();
    await powerOff();
    if (state === "stopped") show(0, { flash: false });
  }

  function bindButton(el, fn) {
    el.addEventListener("click", fn);
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); }
    });
  }
  bindButton(btnPlay, play);
  bindButton(btnPause, pause);
  bindButton(btnStop, stop);

  // ============================================================
  // Project list ↔ TV
  // ============================================================
  async function selectFromList(i) {
    if (i === index && state !== "stopped") return;
    if (state === "stopped") { setState("idle"); await powerOn(); }
    show(i);
    if (state === "playing") startCycle(); // restart the countdown from this project
  }

  projects.forEach((p, i) => {
    p.addEventListener("mouseenter", () => { if (!MOBILE.matches) selectFromList(i); });
    p.addEventListener("focus", () => selectFromList(i));
    p.addEventListener("click", (e) => {
      // case-study pages come in the next step
      if (p.getAttribute("href") === "#") { e.preventDefault(); selectFromList(i); }
    });
  });

  // ---- Mobile: the project under the sticky TV becomes the active channel
  // At the end of the page the last 3 projects sit under the TV (END_GAP below it, the
  // row above them hidden under the white fade) and the contacts close the screen.
  const END_ROWS = 3;
  const END_GAP = 24;
  const projectList = document.querySelector(".projects");
  const contacts = document.querySelector(".contacts");
  let spyRaf = 0;
  function updateStickyHeight() {
    document.documentElement.style.setProperty("--sticky-h", stage.offsetHeight + "px");
    if (!MOBILE.matches) { projectList.style.removeProperty("--list-tail"); return; }
    const firstEnd = projects[projects.length - END_ROWS].getBoundingClientRect();
    const last = projects[projects.length - 1].getBoundingClientRect();
    const rows = last.bottom - firstEnd.top;
    const tail = window.innerHeight - stage.offsetHeight - END_GAP - rows - contacts.offsetHeight;
    projectList.style.setProperty("--list-tail", Math.max(32, Math.round(tail)) + "px");
  }
  // The list scrolls under the sticky TV; the project on a reading line just below the TV
  // is the active one. The last projects never reach that line (the page ends first), so
  // the line slides down the list as the page scrolls: at the very bottom it is on the
  // last project. It moves continuously, so the projects light up one after another.
  function scrollSpy() {
    spyRaf = 0;
    // playing: the TV drives the list; stopped: scrolling must not switch the TV back on
    if (!MOBILE.matches || home.dataset.view !== "projects" || state === "playing" || state === "stopped") return;
    const START = 24;
    const y = window.scrollY;
    if (y < START) return; // keep the current channel at the very top of the page
    const maxY = document.documentElement.scrollHeight - window.innerHeight;
    const centre = (p) => { const r = p.getBoundingClientRect(); return r.top + r.height / 2; };
    const rowH = projects[0].offsetHeight;
    const travel = centre(projects[projects.length - 1]) - centre(projects[projects.length - END_ROWS]);
    const t = Math.min(1, Math.max(0, (y - START) / Math.max(1, maxY - START)));
    const line = stage.getBoundingClientRect().bottom + END_GAP + rowH / 2 + travel * t;
    let best = 0, bestDist = Infinity;
    projects.forEach((p, k) => {
      const d = Math.abs(centre(p) - line);
      if (d < bestDist) { best = k; bestDist = d; }
    });
    stepTowards(best);
  }
  // A fast flick can move the line past several projects between two frames. Instead of
  // jumping there, the highlight walks one project at a time and stays on each one long
  // enough for its Play badge to visibly pop in (mobile badge timing in style.css).
  const STEP_MS = 260;
  let spyTarget = -1, stepTimer = 0;
  function stepTowards(target) {
    spyTarget = target;
    if (stepTimer) return;
    const step = () => {
      stepTimer = 0;
      if (state === "playing" || state === "stopped" || spyTarget === index) return;
      selectFromList(index + Math.sign(spyTarget - index));
      if (spyTarget !== index) stepTimer = setTimeout(step, STEP_MS);
    };
    step();
  }
  window.addEventListener("scroll", () => { if (!spyRaf) spyRaf = requestAnimationFrame(scrollSpy); }, { passive: true });
  let lastW = window.innerWidth;
  window.addEventListener("resize", () => {
    // phones resize the window as the browser bars show and hide: keep the end of the page put
    // unless the width changed or the height changed a lot (rotation, split view)
    if (window.innerWidth !== lastW || Math.abs(window.innerHeight - (updateStickyHeight.h || 0)) > 120) {
      lastW = window.innerWidth; updateStickyHeight.h = window.innerHeight; updateStickyHeight();
    } else document.documentElement.style.setProperty("--sticky-h", stage.offsetHeight + "px");
  });
  updateStickyHeight.h = window.innerHeight;
  updateStickyHeight();

  // ============================================================
  // Knobs: Volume (top) and Brightness (bottom)
  // ============================================================
  function unlockMusic() {
    if (musicUnlocked || !music.supported) return;
    musicUnlocked = true;
    if (state === "stopped") return;          // it will start with the next Play
    music.start().then(() => { if (state === "paused") music.muffle(true); });
  }

  function makeKnob(el, { onChange, label, value, startsMusic = false }) {
    const pointer = el.querySelector(".knob-pointer");
    const cx = +pointer.dataset.cx, cy = +pointer.dataset.cy;
    const baseAngle = +pointer.dataset.base;   // where the pointer is drawn in the design
    // start at `value`, or exactly where the design has it
    let v = value ?? (((baseAngle - KNOB_MIN_ANGLE) % 360) + 360) % 360 / KNOB_SWEEP;
    v = Math.max(0, Math.min(1, v));

    function render() {
      const angle = KNOB_MIN_ANGLE + v * KNOB_SWEEP;
      pointer.setAttribute("transform", `rotate(${angle - baseAngle} ${cx} ${cy})`);
      el.setAttribute("aria-valuenow", Math.round(v * 100));
    }
    function set(nv, { silent = false } = {}) {
      v = Math.max(0, Math.min(1, nv));
      render();
      onChange(v);
      if (!silent) { showLevel(label, v); if (startsMusic) unlockMusic(); }
    }

    // --- drag (mouse + touch) ---
    let last = null;
    const centerOnScreen = () => {
      const pt = svg.createSVGPoint(); pt.x = cx; pt.y = cy;
      return pt.matrixTransform(svg.getScreenCTM());
    };
    const angleAt = (e) => {
      const c = centerOnScreen();
      return Math.atan2(e.clientY - c.y, e.clientX - c.x) * 180 / Math.PI;
    };
    el.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      el.classList.add("is-dragging");
      last = angleAt(e);
      el.focus({ preventScroll: true });
    });
    el.addEventListener("pointermove", (e) => {
      if (last === null) return;
      const a = angleAt(e);
      let d = a - last;
      if (d > 180) d -= 360;
      if (d < -180) d += 360;
      last = a;
      if (d) set(v + d / KNOB_SWEEP);
    });
    const end = () => { last = null; el.classList.remove("is-dragging"); };
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);

    // --- wheel ---
    el.addEventListener("wheel", (e) => {
      e.preventDefault();
      set(v - Math.sign(e.deltaY) * 0.04);
    }, { passive: false });

    // --- keyboard ---
    el.addEventListener("keydown", (e) => {
      const step = { ArrowUp: .05, ArrowRight: .05, ArrowDown: -.05, ArrowLeft: -.05, PageUp: .2, PageDown: -.2 }[e.key];
      if (step !== undefined) { e.preventDefault(); set(v + step); }
      if (e.key === "Home") { e.preventDefault(); set(0); }
      if (e.key === "End") { e.preventDefault(); set(1); }
    });

    set(v, { silent: true });
  }

  function showLevel(label, v) {
    if (screen.dataset.power === "off") return;
    const bars = 16, on = Math.round(v * bars);
    osdLevel.textContent = `${label} ${"▮".repeat(on)}${"▯".repeat(bars - on)}`;
    flashOsd(osdLevel, 1300);
  }

  makeKnob(document.getElementById("knob-volume"), {
    label: "VOLUME",
    startsMusic: true, // the easter egg lives only on the volume knob
    onChange: (v) => music.setVolume(v),
  });

  makeKnob(document.getElementById("knob-brightness"), {
    label: "BRIGHTNESS",
    value: 1, // full brightness by default: the previews look exactly as designed
    onChange: (v) => {
      // 0 → very dark … 1 → normal (the original look)
      const b = 0.15 + v * 0.85;
      screen.style.setProperty("--brightness", b.toFixed(3));
      dimmer.style.opacity = v < 0.2 ? ((0.2 - v) / 0.2 * 0.55).toFixed(3) : 0;
    },
  });

  // ============================================================
  // More / Less (About)
  // ============================================================
  const about = document.getElementById("about");
  const aboutText = document.getElementById("about-text");
  const moreBtn = document.querySelector(".more-toggle");
  const lessBtn = document.querySelector(".less-toggle");
  const LEAVE_MS = 300;   // keep in sync with --leave-ms in style.css
  const ENTER_MS = 1000;
  const OPEN_MS = 750;    // More: text unfold + background fade-in
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  // About background (TV photo on desktop, grey page on mobile) — same timing as the text
  function setAboutBg(on, ms) {
    home.style.setProperty("--bg-ms", (reduceMotion ? 0 : ms) + "ms");
    home.classList.toggle("bg-about", on);
  }

  // Grow (or shrink) a block's height so its lines are revealed from the top down;
  // whatever sits below it is pushed down smoothly instead of jumping.
  function unfold(el, open, ms) {
    const h = el.scrollHeight;
    // the box grows downward and the text itself slides down into place,
    // so the movement clearly reads top → bottom
    const closed = { height: "0px", opacity: 0, transform: "translateY(-24px)" };
    const shown = { height: h + "px", opacity: 1, transform: "translateY(0)" };
    el.style.overflow = "hidden";
    const anim = el.animate(open ? [closed, shown] : [shown, closed], {
      duration: ms,
      easing: "cubic-bezier(.65, 0, .35, 1)",
      fill: open ? "none" : "forwards",
    });
    anim.onfinish = () => { el.style.overflow = ""; if (!open) anim.cancel(); };
  }
  let switching = false;

  async function setView(view) {
    if (switching || home.dataset.view === view) return;
    switching = true;
    // phones & tablets have their own choreography (grey sheet, TV fade, text line by line)
    if (MOBILE.matches && !reduceMotion) {
      try { await (view === "about" ? mobileOpen() : mobileClose()); }
      finally { switching = false; }
      return;
    }
    if (!reduceMotion) {
      home.classList.remove("is-entering");
      home.classList.add("is-leaving");
      if (view === "projects") {               // Less: text and background close together
        unfold(aboutText, false, LEAVE_MS);
        setAboutBg(false, LEAVE_MS);
      }
      await wait(LEAVE_MS);
      home.classList.remove("is-leaving");
    }
    home.dataset.view = view;
    about.hidden = view !== "about";
    aboutText.hidden = view !== "about";
    if (view === "about") {                    // More: text and background open together
      if (!reduceMotion) unfold(aboutText, true, OPEN_MS);
      setAboutBg(true, OPEN_MS);
    } else if (reduceMotion) {
      setAboutBg(false, 0);
    }
    // desktop: the photo appears on the TV — make sure the TV is on and holds still
    if (view === "about" && !MOBILE.matches) {
      if (state === "playing") { clearInterval(timer); setState("idle"); }
      if (state === "stopped") { setState("idle"); powerOn(); }
    }
    moreBtn.setAttribute("aria-expanded", String(view === "about"));
    if (MOBILE.matches) window.scrollTo({ top: 0 });
    (view === "about" ? lessBtn : moreBtn).focus({ preventScroll: true });
    updateStickyHeight();
    // the photo starts turning only once the block has fully opened (avatar-in = 0.9s)
    if (view === "about" && MOBILE.matches) spinner.start({ delay: reduceMotion ? 0 : 900 }); else spinner.stop();
    if (!reduceMotion) {
      home.classList.add("is-entering");
      setTimeout(() => home.classList.remove("is-entering"), ENTER_MS);
    }
    switching = false;
  }
  moreBtn.addEventListener("click", () => setView("about"));
  lessBtn.addEventListener("click", () => setView("projects"));

  // ============================================================
  // More / Less on phones & tablets
  //   More: the grey background stretches down, the TV and the list fade out,
  //         the text appears line by line, then the photo, then "Less".
  //   Less: the exact mirror.
  // ============================================================
  const EASE = "cubic-bezier(.65, 0, .35, 1)";
  const LINE_MS = 420, LINE_STEP = 90;            // per line: fade time and delay between lines
  const SHEET_MS = 520;
  const sheet = document.createElement("div");
  sheet.className = "bg-sheet";
  sheet.setAttribute("aria-hidden", "true");
  home.prepend(sheet);
  const contactsEl = contacts;
  const avatarEl = about.querySelector(".avatar");

  const tween = (el, frames, opts) => el.animate(frames, { easing: EASE, fill: "both", ...opts }).finished;
  const clearAnims = (els) => els.forEach((el) => el.getAnimations().forEach((a) => a.cancel()));
  const headerBottom = () => stage.getBoundingClientRect().bottom + window.scrollY;
  const escapeHtml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

  // wrap every visual line of the paragraph in its own block, so lines can fade in one by one
  function splitLines(p) {
    if (!p.dataset.html) p.dataset.html = p.innerHTML;
    p.innerHTML = p.dataset.html;
    const words = p.textContent.replace(/\s+/g, " ").trim().split(" ");
    p.innerHTML = words.map((w) => `<span class="w">${escapeHtml(w)}</span>`).join(" ");
    const lines = [];
    let top = null, cur = [];
    p.querySelectorAll(".w").forEach((w) => {
      if (top === null || Math.abs(w.offsetTop - top) > 2) {
        if (cur.length) lines.push(cur);
        cur = [];
        top = w.offsetTop;
      }
      cur.push(escapeHtml(w.textContent));
    });
    if (cur.length) lines.push(cur);
    p.innerHTML = lines.map((l) => `<span class="line">${l.join(" ")}</span>`).join("");
    return [...p.querySelectorAll(".line")];
  }
  function restoreLines(p) { if (p.dataset.html) p.innerHTML = p.dataset.html; }

  async function mobileOpen() {
    window.scrollTo({ top: 0 });
    const fading = [stage, projectList, contactsEl, moreBtn];
    sheet.style.display = "block";
    // 1. grey stretches from under the TV to the bottom of the screen, TV + list fade away
    await Promise.all([
      tween(sheet, [{ height: headerBottom() + "px" }, { height: window.innerHeight + "px" }], { duration: SHEET_MS }),
      ...fading.map((el) => tween(el, [{ opacity: 1 }, { opacity: 0 }], { duration: 400 })),
    ]);
    // 2. swap the layout while everything that moves is invisible
    setAboutBg(true, 0);
    home.dataset.view = "about";
    about.hidden = false;
    aboutText.hidden = false;
    moreBtn.setAttribute("aria-expanded", "true");
    clearAnims([sheet, ...fading]);
    sheet.style.display = "none";
    updateStickyHeight();
    // 3. text line by line, then the photo, then "Less"
    const lines = splitLines(aboutText);
    lines.forEach((l, i) => tween(l, [{ opacity: 0 }, { opacity: 1 }], { duration: LINE_MS, delay: i * LINE_STEP }));
    const textDone = (lines.length - 1) * LINE_STEP + LINE_MS;
    tween(avatarEl, [{ opacity: 0, transform: "scale(.88)" }, { opacity: 1, transform: "none" }], { duration: 700, delay: textDone });
    tween(lessBtn, [{ opacity: 0 }, { opacity: 1 }], { duration: 400, delay: textDone + 450 });
    spinner.start({ delay: textDone + 700 });
    lessBtn.focus({ preventScroll: true });
  }

  async function mobileClose() {
    window.scrollTo({ top: 0 });
    const lines = [...aboutText.querySelectorAll(".line")];
    const last = lines.length - 1;
    // 1. mirror: "Less" and the photo go first, then the lines from the last one up
    await Promise.all([
      tween(lessBtn, [{ opacity: 1 }, { opacity: 0 }], { duration: 250 }),
      tween(avatarEl, [{ opacity: 1, transform: "none" }, { opacity: 0, transform: "scale(.88)" }], { duration: 400 }),
      ...lines.map((l, i) => tween(l, [{ opacity: 1 }, { opacity: 0 }], { duration: 300, delay: 200 + (last - i) * 50 })),
    ]);
    spinner.stop();
    // 2. grey covers the screen while the layout goes back to the list
    sheet.style.display = "block";
    sheet.style.height = window.innerHeight + "px";
    setAboutBg(false, 0);
    home.dataset.view = "projects";
    about.hidden = true;
    aboutText.hidden = true;
    restoreLines(aboutText);
    clearAnims([lessBtn, avatarEl]);
    moreBtn.setAttribute("aria-expanded", "false");
    updateStickyHeight();
    // 3. grey pulls back up under the TV, TV + list fade in
    const showing = [stage, projectList, contactsEl, moreBtn];
    await Promise.all([
      tween(sheet, [{ height: window.innerHeight + "px" }, { height: headerBottom() + "px" }], { duration: SHEET_MS }),
      ...showing.map((el) => tween(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 450, delay: el === stage ? 0 : 120 })),
    ]);
    clearAnims([sheet, ...showing]);
    sheet.style.display = "none";
    moreBtn.focus({ preventScroll: true });
  }

  // keep the line breaks right if the phone is rotated while About is open
  let relineTimer = 0;
  window.addEventListener("resize", () => {
    clearTimeout(relineTimer);
    relineTimer = setTimeout(() => {
      if (home.dataset.view !== "about") return;
      if (MOBILE.matches) splitLines(aboutText); else restoreLines(aboutText);
    }, 150);
  });

  // ============================================================
  // Spinning photo (About): slowly turns on its own, can be spun by hand
  // ============================================================
  const spinner = (() => {
    const el = about.querySelector(".avatar");
    const photo = el.querySelector(".avatar-photo");
    const IDLE = reduceMotion ? 0 : 14;   // deg / s
    let angle = 0, vel = 0, raf = 0, lastT = 0, holdUntil = 0;
    let drag = null;                      // { a: last pointer angle, t: last time }

    const center = () => {
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    };
    const angleAt = (e) => {
      const c = center();
      return Math.atan2(e.clientY - c.y, e.clientX - c.x) * 180 / Math.PI;
    };
    const delta = (d) => (d > 180 ? d - 360 : d < -180 ? d + 360 : d);

    function frame(t) {
      const dt = Math.min(0.05, (t - (lastT || t)) / 1000);
      lastT = t;
      if (!drag && t >= holdUntil) {
        vel += (IDLE * Math.sign(vel || 1) - vel) * Math.min(1, dt * 1.2); // ease in / back to the idle speed
        angle += vel * dt;
      }
      photo.style.setProperty("--spin", (angle % 360).toFixed(2) + "deg");
      raf = requestAnimationFrame(frame);
    }

    el.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      el.classList.add("is-dragging");
      drag = { a: angleAt(e), t: performance.now() };
      vel = 0;
    });
    el.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const a = angleAt(e), now = performance.now();
      const d = delta(a - drag.a);
      const dt = Math.max(0.008, (now - drag.t) / 1000);
      angle += d;
      vel = Math.max(-1500, Math.min(1500, vel * 0.4 + (d / dt) * 0.6)); // throw speed on release
      drag = { a, t: now };
    });
    const release = () => {
      if (!drag) return;
      if (performance.now() - drag.t > 120) vel = 0; // held still before letting go — no throw
      drag = null;
      el.classList.remove("is-dragging");
    };
    el.addEventListener("pointerup", release);
    el.addEventListener("pointercancel", release);

    return {
      start({ delay = 0 } = {}) {
        vel = 0;                                   // start from rest, then ease into the slow turn
        holdUntil = performance.now() + delay;
        if (!raf) { lastT = 0; raf = requestAnimationFrame(frame); }
      },
      stop() { cancelAnimationFrame(raf); raf = 0; },
    };
  })();

  // ============================================================
  // Email: copy the address instead of opening a mail app
  // ============================================================
  const emailLink = document.querySelector(".copy-email");
  const emailHint = emailLink.querySelector(".copy-hint");
  let hintTimer = 0;

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      // older browsers / non-secure pages
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.cssText = "position:fixed;opacity:0;pointer-events:none";
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand("copy"); } catch (err) { ok = false; }
      ta.remove();
      return ok;
    }
  }

  emailLink.addEventListener("click", async (e) => {
    e.preventDefault();
    const email = emailLink.dataset.email;
    const ok = await copyText(email);
    emailHint.textContent = ok ? "Email copied" : email; // if copying is blocked, at least show the address
    emailHint.classList.add("is-visible");
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => emailHint.classList.remove("is-visible"), ok ? 1600 : 4000);
  });

  // ---- initial: TV on, first project on screen -----------------
  setState("idle");
  show(0, { flash: false });
  osdChannel.classList.remove("is-visible");

  // ---- page entrance: TV and blocks fade in -------------------
  // on first load, and also when the page is restored from the back/forward cache
  // (the first run starts straight from the HTML: <main class="home page-in">)
  function pageIn() {
    if (reduceMotion) return;
    home.classList.remove("page-in");
    void home.offsetWidth; // restart the animation
    home.classList.add("page-in");
    clearTimeout(pageIn.t);
    pageIn.t = setTimeout(() => home.classList.remove("page-in"), 1800);
  }
  pageIn.t = setTimeout(() => home.classList.remove("page-in"), 1800);
  window.addEventListener("pageshow", (e) => { if (e.persisted) pageIn(); });
})();
