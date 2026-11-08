/* ============================================================
   Case-study pages: "to top" button (desktop only, hidden by CSS on small screens)
   Shows up once the reader has scrolled through half of the page,
   scrolls smoothly back up.
   ============================================================ */
/* Videos in a case: muted loops that load only when they come close to the
   screen and pause while off-screen (saves data on phones). */
(() => {
  "use strict";
  const videos = document.querySelectorAll("video[data-src]");
  if (!videos.length) return;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const io = new IntersectionObserver((entries) => {
    entries.forEach(({ target: v, isIntersecting }) => {
      if (isIntersecting) {
        if (!v.src) { v.src = v.dataset.src; v.load(); }
        if (!reduceMotion) v.play().catch(() => {});
      } else if (!v.paused) {
        v.pause();
      }
    });
  }, { rootMargin: "300px 0px" });
  videos.forEach((v) => io.observe(v));
})();

(() => {
  "use strict";
  const btn = document.querySelector(".to-top");
  if (!btn) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function update() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    btn.classList.toggle("is-visible", max > 0 && window.scrollY >= max / 2);
  }
  const onScroll = update; // a cheap check — no need to batch it

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  update();

  btn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    btn.blur();
  });
})();
