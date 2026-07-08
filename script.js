/* ============================================================
   ANVIL DIGITAL — motion system
   GSAP + ScrollTrigger + Lenis (Lenis feeds ScrollTrigger.update).
   Scroll-DRIVEN, pinned + scrubbed sections. One shared easing
   (power3.inOut) and duration scale (0.3 / 0.6 / 1.1s).
   Mobile / slow → simplified reveals. Reduced-motion → content shown, no motion.
   ============================================================ */

(() => {
  "use strict";

  /* ---------- shared motion constants (one place) ---------- */
  const EASE = "power3.inOut";
  const D = { fast: 0.3, base: 0.6, slow: 1.1 };

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // Videos play on every screen — the <source media="(max-width:768px)"> tags
  // serve small mobile-optimised files under 768px. `isMobile` only controls the
  // simplified (no pin/scrub) animation path.
  const isMobile = window.innerWidth < 768;
  const simple = isMobile;

  /* ---------- year in footer ---------- */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ============================================================
     0. PRELOADER — logo draws in + counter 0→100, waits for the hero's first
     frame (min 2s, max 2.5s), then a violet→teal panel wipes up to reveal.
     ============================================================ */
  (function initPreloader() {
    const pre = document.getElementById("preloader");
    if (!pre) return;
    const numEl = document.getElementById("pl-num");
    const path = pre.querySelector(".preloader__logo path");
    const hero = document.querySelector(".hero__video");
    const t0 = performance.now();
    const MIN = 2000, MAX = 2500;
    let heroReadyAt = null, done = false;
    const markReady = () => { if (heroReadyAt == null) heroReadyAt = performance.now(); };

    if (!hero) {
      markReady();
    } else if (hero.readyState >= 2) {
      markReady();                                    // first frame already decoded
    } else {
      hero.addEventListener("loadeddata", markReady, { once: true }); // wait for it
    }
    const cap = setTimeout(markReady, MAX);

    function reveal() {
      if (done) return; done = true;
      clearTimeout(cap);
      document.documentElement.classList.remove("is-loading");
      document.documentElement.classList.add("page-revealed");
      document.dispatchEvent(new Event("preloader:done"));
      pre.classList.add("is-filling");
      setTimeout(() => pre.classList.add("is-revealing"), 640);
      setTimeout(() => { if (pre.parentNode) pre.parentNode.removeChild(pre); }, 640 + 1200);
    }
    setTimeout(reveal, MAX + 500); // backstop

    const easeOut = (t) => 1 - Math.pow(1 - t, 3);
    function tick(now) {
      const p = Math.min((now - t0) / MIN, 1);
      const e = easeOut(p);
      if (numEl) numEl.textContent = Math.round(e * 100);
      if (path) path.style.strokeDashoffset = (1 - e).toFixed(4);
      if (p < 1) { requestAnimationFrame(tick); return; }
      if (numEl) numEl.textContent = "100";
      if (path) path.style.strokeDashoffset = "0";
      (function waitReady() {
        if (done) return;
        if (heroReadyAt != null || performance.now() - t0 >= MAX) reveal();
        else requestAnimationFrame(waitReady);
      })();
    }
    requestAnimationFrame(tick);
  })();

  /* ============================================================
     1. WORD-BY-WORD SPLITTING (headlines) — GSAP animates .word > span
     ============================================================ */
  document.querySelectorAll("[data-splitwords]").forEach((el) => {
    const text = el.textContent.trim();
    el.textContent = "";
    const frag = document.createDocumentFragment();
    text.split(/\s+/).forEach((word) => {
      const outer = document.createElement("span");
      outer.className = "word";
      const inner = document.createElement("span");
      inner.textContent = word;
      outer.appendChild(inner);
      frag.appendChild(outer);
      frag.appendChild(document.createTextNode(" "));
    });
    el.appendChild(frag);
  });

  /* ============================================================
     FORM — custom dropdown, auto-growing textarea, submit success.
     ============================================================ */
  (function initForm() {
    const form = document.getElementById("lead-form");
    if (!form) return;
    const wrap = form.closest(".form-wrap");

    document.querySelectorAll("[data-select]").forEach((sel) => {
      const trigger = sel.querySelector(".select__trigger");
      const valueEl = sel.querySelector(".select__value");
      const hidden = sel.querySelector('input[type="hidden"]');
      const options = Array.from(sel.querySelectorAll(".select__option"));
      const field = sel.closest(".field");
      const open = () => { sel.classList.add("is-open"); if (field) field.classList.add("select-open"); trigger.setAttribute("aria-expanded", "true"); };
      const close = () => { sel.classList.remove("is-open"); if (field) field.classList.remove("select-open"); trigger.setAttribute("aria-expanded", "false"); };

      trigger.addEventListener("click", (e) => {
        e.stopPropagation();
        sel.classList.contains("is-open") ? close() : open();
      });
      trigger.addEventListener("keydown", (e) => {
        if (e.key === "Escape") close();
        else if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") { e.preventDefault(); open(); }
      });
      options.forEach((opt) => {
        opt.addEventListener("click", () => {
          options.forEach((o) => o.setAttribute("aria-selected", "false"));
          opt.setAttribute("aria-selected", "true");
          valueEl.textContent = opt.textContent;
          valueEl.classList.remove("is-placeholder");
          if (hidden) hidden.value = opt.getAttribute("data-value") || opt.textContent;
          close();
          trigger.focus();
        });
      });
      document.addEventListener("click", (e) => { if (!sel.contains(e.target)) close(); });
    });

    const ta = form.querySelector("textarea");
    if (ta) {
      const grow = () => { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 320) + "px"; };
      ta.addEventListener("input", grow);
      requestAnimationFrame(grow);
    }

    const status = document.getElementById("form-status");
    const btn = form.querySelector(".btn--send");
    const successName = wrap ? wrap.querySelector("[data-success-name]") : null;

    // Endpoint comes from the <form action="…"> in index.html (one place to edit).
    // Paste your Formspree endpoint there — it looks like https://formspree.io/f/abcdwxyz
    const FORMSPREE_ENDPOINT = form.getAttribute("action") || "";

    const showError = (msg) => {
      if (btn) btn.disabled = false;
      if (status) { status.classList.add("is-error"); status.textContent = msg || "Something went wrong — please email anvildigitalsupport@gmail.com."; }
    };
    const finishSuccess = (name) => {
      if (status) { status.classList.remove("is-error"); status.textContent = ""; }
      if (btn) btn.classList.add("is-sent");                 // button shows the checkmark
      if (successName) successName.textContent = " " + name;
      setTimeout(() => { if (wrap) wrap.classList.add("is-sent"); }, 650); // then crossfade
    };

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const name = (data.get("name") || "").toString().trim();
      const email = (data.get("email") || "").toString().trim();
      if (!name || !email) {
        if (status) { status.classList.add("is-error"); status.textContent = "Please add your name and email so I can reach you."; }
        return;
      }
      if (status) { status.classList.remove("is-error"); status.textContent = "Sending…"; }
      if (btn) btn.disabled = true;

      // Endpoint not pasted in yet → keep the site working locally (no send).
      if (FORMSPREE_ENDPOINT.indexOf("YOUR_FORM_ID") !== -1) {
        console.warn("[Anvil] Formspree isn't configured yet — paste your endpoint into FORMSPREE_ENDPOINT in script.js.");
        finishSuccess(name);
        return;
      }

      try {
        const res = await fetch(FORMSPREE_ENDPOINT, {
          method: "POST", body: data, headers: { Accept: "application/json" },
        });
        if (res.ok) {
          finishSuccess(name);
        } else {
          const j = await res.json().catch(() => ({}));
          showError(j.errors ? j.errors.map((x) => x.message).join(", ") : "Couldn't send — please try again.");
        }
      } catch (err) {
        showError("Network error — please check your connection and try again.");
      }
    });
  })();

  /* ============================================================
     VIDEO PLAYBACK MANAGER — play only the on-screen clip, lazy-load, retry.
     ============================================================ */
  (function initVideos() {
    // Each <video> has autoplay + <source> tags (mobile file under 768px), so the
    // browser loads/plays on its own. JS just reinforces it: set the muted PROPERTY
    // (not only the attribute — the real iOS unlock) and retry .play() in a
    // try/catch, since iOS often defers muted autoplay until a user gesture.
    const play = (v) => {
      v.muted = true;
      v.playsInline = true;
      try { const p = v.play(); if (p && typeof p.catch === "function") p.catch(function () {}); } catch (e) {}
    };
    const playAll = () => { document.querySelectorAll("video").forEach(play); };

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", playAll);
    else playAll();

    ["touchstart", "pointerdown", "keydown"].forEach((ev) =>
      window.addEventListener(ev, playAll, { once: true, passive: true }));
    document.addEventListener("visibilitychange", () => { if (!document.hidden) playAll(); });

    // Keep decoder use low: pause section videos that scroll off-screen, resume on return.
    const sectionVids = Array.from(document.querySelectorAll("video"))
      .filter((v) => !v.classList.contains("site-bg__video"));
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => { en.isIntersecting ? play(en.target) : en.target.pause(); });
      }, { threshold: 0.1 });
      sectionVids.forEach((v) => io.observe(v));
    }
  })();

  /* ============================================================
     SITE-BG loader (fixed ambient video) — used by the motion module.
     ============================================================ */
  const siteBgEl = document.querySelector(".site-bg");
  const siteBgVideo = document.querySelector(".site-bg__video");
  let siteBgLoaded = false;
  function loadSiteBg() {
    if (siteBgLoaded || !siteBgVideo) return;
    siteBgLoaded = true;
    siteBgVideo.muted = true;
    const p = siteBgVideo.play();
    if (p && typeof p.catch === "function") p.catch(function () {});
  }

  /* ============================================================
     BASIC FALLBACK — reduced-motion / no-GSAP: show content, keep the
     progress bar + sticky nav alive, settle counters to final value.
     ============================================================ */
  function startBasic() {
    const bar = document.querySelector(".scroll-progress__bar");
    const nav = document.getElementById("nav");
    document.querySelectorAll(".count").forEach((el) => {
      el.textContent = (el.dataset.prefix || "") + (parseFloat(el.dataset.to) || 0).toLocaleString("en-US") + (el.dataset.suffix || "");
    });
    let ticking = false;
    const onScroll = () => {
      if (ticking) return; ticking = true;
      requestAnimationFrame(() => {
        const max = (document.documentElement.scrollHeight - window.innerHeight) || 1;
        if (bar) bar.style.transform = "scaleX(" + Math.min(window.scrollY / max, 1) + ")";
        if (nav) nav.classList.toggle("is-stuck", window.scrollY > 24);
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ============================================================
     MOTION — GSAP + ScrollTrigger + Lenis
     ============================================================ */
  function initMotion() {
    const gsap = window.gsap, ScrollTrigger = window.ScrollTrigger, Lenis = window.Lenis;
    gsap.registerPlugin(ScrollTrigger);
    gsap.defaults({ ease: EASE });

    // ---- Lenis <-> ScrollTrigger wiring ----
    const lenis = new Lenis({ duration: 1.1, smoothWheel: true, wheelMultiplier: 1, touchMultiplier: 1.6 });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    document.documentElement.classList.add("lenis");

    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener("click", (e) => {
        const id = a.getAttribute("href");
        if (id === "#" || id === "#top") { e.preventDefault(); lenis.scrollTo(0); return; }
        const t = document.querySelector(id);
        if (t) { e.preventDefault(); lenis.scrollTo(t, { offset: -70 }); }
      });
    });

    // ---- progress bar + sticky nav (one ScrollTrigger) ----
    const bar = document.querySelector(".scroll-progress__bar");
    const nav = document.getElementById("nav");
    ScrollTrigger.create({
      start: 0, end: "max",
      onUpdate: (self) => {
        if (bar) bar.style.transform = "scaleX(" + self.progress + ")";
        if (nav) nav.classList.toggle("is-stuck", self.scroll() > 24);
      },
    });

    const wordsIn = (sel) => gsap.utils.toArray(sel + " .word > span");

    // ---- HERO intro (after preloader) ----
    function heroIntro() {
      const tl = gsap.timeline();
      const hw = wordsIn(".hero__title");
      if (hw.length) tl.from(hw, { yPercent: 115, opacity: 0, duration: D.base, stagger: 0.05 });
      tl.from(".hero .eyebrow, .hero__sub, .hero__cta, .hero__meta, .hero__scroll",
        { y: 22, opacity: 0, duration: D.base, stagger: 0.08 }, 0.15);
    }
    if (document.documentElement.classList.contains("page-revealed")) heroIntro();
    else document.addEventListener("preloader:done", heroIntro, { once: true });

    // ---- COUNT-UP tied to scroll progress (all modes) ----
    gsap.utils.toArray(".count").forEach((el) => {
      const to = parseFloat(el.dataset.to) || 0;
      const fmt = (v) => (el.dataset.prefix || "") + Math.round(v).toLocaleString("en-US") + (el.dataset.suffix || "");
      el.textContent = fmt(0);
      const obj = { v: 0 };
      gsap.to(obj, {
        v: to, ease: "none", onUpdate: () => { el.textContent = fmt(obj.v); },
        scrollTrigger: { trigger: el, start: "top 88%", end: "top 45%", scrub: true },
      });
    });

    /* ---------- MOBILE / LITE: simplified reveals, no pin/scrub ---------- */
    if (simple) {
      gsap.utils.toArray(".section").forEach((sec) => {
        if (sec.classList.contains("hero")) return;
        const items = sec.querySelectorAll(
          ".section__kicker, .section__lead, .word, .step, .feature, .price-card, " +
          ".path-stage, .path__arrow, .about__body, .about__stat, .about__visual, " +
          ".grow__budget-note, .field, .btn--send"
        );
        if (!items.length) return;
        gsap.from(items, {
          y: 24, opacity: 0, duration: D.base, stagger: 0.06,
          scrollTrigger: { trigger: sec, start: "top 82%", once: true },
        });
      });
      if (siteBgEl) {
        gsap.fromTo(siteBgEl, { opacity: 0 }, {
          opacity: 1, ease: "none",
          scrollTrigger: { trigger: ".how", start: "top 90%", end: "top 40%", scrub: true, onEnter: loadSiteBg },
        });
      }
      ScrollTrigger.refresh();
      return;
    }

    /* ================= DESKTOP: scroll-DRIVEN, pinned + scrubbed ================= */

    // ===== HERO — pin ~1500px; headline scales down + drifts up, video zooms, release
    gsap.timeline({
      scrollTrigger: { trigger: ".hero", start: "top top", end: "+=1500", pin: true, scrub: true, anticipatePin: 1 },
    })
      .to(".hero__title", { scale: 0.9, yPercent: -22 }, 0)
      .to(".hero__video", { scale: 1.14 }, 0)
      .to(".hero__scroll", { opacity: 0, duration: 0.2 }, 0)
      .to(".hero__inner", { opacity: 0, y: -30, duration: 0.5 }, 0.5);

    // ===== SITE-BG — fade the ambient video in as the hero releases
    if (siteBgEl) {
      gsap.fromTo(siteBgEl, { opacity: 0 }, {
        opacity: 1, ease: "none",
        scrollTrigger: { trigger: ".hero", start: "bottom 85%", end: "bottom 30%", scrub: true, onEnter: loadSiteBg, onEnterBack: loadSiteBg },
      });
    }

    // ===== HOW IT WORKS — pin; scrub 3 cards in one at a time; teal line draws 01→02→03
    const howTl = gsap.timeline({
      scrollTrigger: { trigger: ".how", start: "top top", end: "+=1700", pin: true, scrub: true },
    });
    howTl.from(wordsIn(".how"), { yPercent: 115, opacity: 0, stagger: 0.04 }, 0);
    const lineFill = document.querySelector(".steps__line-fill");
    if (lineFill) howTl.fromTo(lineFill, { scaleX: 0 }, { scaleX: 1, ease: "none" }, 0.4);
    gsap.utils.toArray(".how .step").forEach((card, i) => {
      howTl.from(card, { y: 60, opacity: 0, duration: 0.6 }, 0.4 + i * 0.55);
    });

    // ===== WHAT'S INCLUDED — price card slides from left; feature cards staggered scrub
    gsap.timeline({
      scrollTrigger: { trigger: ".included", start: "top 72%", end: "bottom 65%", scrub: true },
    })
      .from(".included .section__kicker", { y: 20, opacity: 0 }, 0)
      .from(wordsIn(".included"), { yPercent: 115, opacity: 0, stagger: 0.04 }, 0.05)
      .from(".included .price-card", { x: -90, opacity: 0 }, 0.1)
      .from(".included .feature", { y: 50, opacity: 0, stagger: 0.12 }, 0.25);

    // ===== GROW — price + stat cards scrub in (numbers count via the count triggers)
    gsap.timeline({
      scrollTrigger: { trigger: ".grow", start: "top 72%", end: "center 55%", scrub: true },
    })
      .from(".grow .section__kicker, .grow .section__lead", { y: 20, opacity: 0, stagger: 0.1 }, 0)
      .from(wordsIn(".grow"), { yPercent: 115, opacity: 0, stagger: 0.04 }, 0.05)
      .from(".grow .price-card", { y: 60, opacity: 0 }, 0.15)
      .from(".grow .feature", { y: 50, opacity: 0, stagger: 0.12 }, 0.25)
      .from(".grow__budget-note", { y: 20, opacity: 0 }, 0.5);

    // ===== THE PATH — two cards converge inward; arrow draws between them
    gsap.timeline({
      scrollTrigger: { trigger: ".path", start: "top 75%", end: "center 55%", scrub: true },
    })
      .from(wordsIn(".path"), { yPercent: 115, opacity: 0, stagger: 0.04 }, 0)
      .from(".path-stage:not(.path-stage--grow)", { x: -90, opacity: 0 }, 0.15)
      .from(".path-stage--grow", { x: 90, opacity: 0 }, 0.15)
      .fromTo(".path__arrow", { scaleX: 0, opacity: 0, transformOrigin: "left center" }, { scaleX: 1, opacity: 1 }, 0.5);

    // ===== ABOUT — text lines scrub-stagger; anvil video parallaxes slower than text
    gsap.timeline({
      scrollTrigger: { trigger: ".about", start: "top 72%", end: "bottom 72%", scrub: true },
    })
      .from(".about .section__kicker", { y: 20, opacity: 0 }, 0)
      .from(wordsIn(".about"), { yPercent: 115, opacity: 0, stagger: 0.04 }, 0.05)
      .from(".about__body", { y: 34, opacity: 0, stagger: 0.15 }, 0.2)
      .from(".about__stat", { y: 26, opacity: 0, stagger: 0.1 }, 0.45);
    gsap.to(".about__visual", {
      yPercent: -14, ease: "none",
      scrollTrigger: { trigger: ".about", start: "top bottom", end: "bottom top", scrub: true },
    });

    // ===== FORM — fields stagger in tied to scroll
    gsap.timeline({
      scrollTrigger: { trigger: ".start", start: "top 72%", end: "center 58%", scrub: true },
    })
      .from(".start .section__kicker, .start .section__lead", { y: 20, opacity: 0, stagger: 0.1 }, 0)
      .from(wordsIn(".start"), { yPercent: 115, opacity: 0, stagger: 0.04 }, 0.05)
      .from(".form .field, .form .btn--send", { y: 30, opacity: 0, stagger: 0.08 }, 0.2);

    // Recalculate once fonts/layout settle.
    ScrollTrigger.refresh();
    window.addEventListener("load", () => ScrollTrigger.refresh());
  }

  /* ============================================================
     BOOT — reduced-motion uses the basic fallback; otherwise load the
     GSAP stack (gsap → ScrollTrigger → Lenis) then wire up the motion.
     ============================================================ */
  if (prefersReduced) { startBasic(); return; }

  function loadScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = src; s.async = false;
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  loadScript("https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js")
    .then(() => loadScript("https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"))
    .then(() => loadScript("https://unpkg.com/lenis@1.1.13/dist/lenis.min.js"))
    .then(() => {
      if (window.gsap && window.ScrollTrigger && window.Lenis) initMotion();
      else startBasic();
    })
    .catch(startBasic);
})();
