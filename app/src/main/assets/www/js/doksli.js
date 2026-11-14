  // ── Doksli images — defined FIRST so render() can use them safely ──
  (function() {
    var _imgs = ["./images/theme/doksli/01.jpg",
    "./images/theme/doksli/02.jpg",
    "./images/theme/doksli/03.jpg",
    "./images/theme/doksli/04.jpg",
    "./images/theme/doksli/05.jpg",
    "./images/theme/doksli/06.jpg",
    "./images/theme/doksli/07.jpg",
    "./images/theme/doksli/08.jpg",
    "./images/theme/doksli/09.jpg",
    "./images/theme/doksli/10.jpg",
    "./images/theme/doksli/11.jpg",
    "./images/theme/doksli/12.jpg",
    "./images/theme/doksli/13.jpg",
    "./images/theme/doksli/14.jpg",
    "./images/theme/doksli/15.jpg",
    "./images/theme/doksli/16.jpg",
    "./images/theme/doksli/17.jpg",
    "./images/theme/doksli/18.jpg",
    "./images/theme/doksli/19.jpg",
    "./images/theme/doksli/20.jpg",
    "./images/theme/doksli/21.jpg",
    "./images/theme/doksli/22.jpg",
    "./images/theme/doksli/23.jpg",
    "./images/theme/doksli/24.jpg",
    "./images/theme/doksli/25.jpg",
    "./images/theme/doksli/26.jpg",
    "./images/theme/doksli/27.jpg",
    "./images/theme/doksli/28.jpg",
    "./images/theme/doksli/29.jpg",
    "./images/theme/doksli/30.jpg",
    "./images/theme/doksli/31.jpg",
    "./images/theme/doksli/32.jpg",
    "./images/theme/doksli/33.jpg",
    "./images/theme/doksli/34.jpg",
    "./images/theme/doksli/35.jpg",
    "./images/theme/doksli/36.jpg",
    "./images/theme/doksli/37.jpg",
    "./images/theme/doksli/38.jpg",
    "./images/theme/doksli/39.jpg",
    "./images/theme/doksli/40.jpg"];
    var _idx = Math.floor(Math.random() * _imgs.length);
    window._dkImg = function() {
      const pool = { koceng: ["k", 123], capy: ["c", 90] };
      for (const t in pool) if (document.body.classList.contains(t)) {
        const n = pool[t][1], prev = window._kcLast;
        let i; do { i = 1 + Math.floor(Math.random() * n); } while (i === prev);
        window._kcLast = i;
        return "./images/theme/" + t + "/" + pool[t][0] + String(i).padStart(3, "0") + ".webp";
      }
      _idx = (_idx + 1) % _imgs.length;
      return _imgs[_idx];
    };
    window._dkOn = function() { return document.body.classList.contains("doksli") || document.body.classList.contains("koceng") || document.body.classList.contains("capy"); };
  })();

// ── Stiker soal yang sudah dijawab (dipindah dari main.js) ─────────────
  // Called after render() whenever in doksli mode
  // Attaches meme stickers to revealed correct/wrong options
  function doksliAttachStickers() {
    if (!window._dkOn()) return;

    // Remove existing stickers first
    document.querySelectorAll(".doksli-sticker").forEach(el => el.remove());

    // querySelectorAll, not querySelector: list-style modes can have several
    // revealed questions on screen at once, so there can be more than one
    // .option.correct/.wrong in the document at a time.
    const correctOpts = document.querySelectorAll(".option.correct");
    const wrongOpts   = document.querySelectorAll(".option.wrong");

    const attach = (opt, corner) => {
      const sticker = document.createElement("img");
      sticker.className = "doksli-sticker";
      sticker.src = window._dkImg();
      sticker.setAttribute("aria-hidden", "true");
      sticker.dataset.corner = corner;
      opt.appendChild(sticker);
    };
    // Adding these <img> elements is itself a mutation inside #app, which the
    // MutationObserver below watches — without disconnecting first, that
    // observer re-fires on our own insert and keeps re-attaching forever,
    // cycling window._dkImg() every cycle (the rapid "changing" look).
    if (typeof _doksliMutObs !== "undefined") _doksliMutObs.disconnect();
    correctOpts.forEach(opt => attach(opt, "tr"));
    wrongOpts.forEach(opt => attach(opt, "br"));
    const _dkApp = document.getElementById("app");
    if (typeof _doksliMutObs !== "undefined" && _dkApp) {
      _doksliMutObs.observe(_dkApp, { childList: true, subtree: true });
    }

    // Scroll fade: when sticker scrolls to within 56px of top of viewport, fade it
    doksliUpdateStickerOpacity();
  }

  function doksliUpdateStickerOpacity() {
    document.querySelectorAll(".doksli-sticker").forEach(sticker => {
      const rect = sticker.closest(".option")?.getBoundingClientRect();
      if (!rect) return;
      const headerH = document.querySelector(".headerZone")?.offsetHeight || 56;
      const clearance = rect.top - headerH;
      // Full opacity when option is 80px+ below header, fade to 0.08 when overlapping
      const opacity = clearance < 80
        ? Math.max(0.08, clearance / 80)
        : 1;
      sticker.style.opacity = String(opacity);
    });
  }

  // Scroll listener for fade
  document.addEventListener("scroll", doksliUpdateStickerOpacity, { passive: true, capture: true });

  const _doksliMutObs = new MutationObserver(() => {
    if (window._dkOn()) {
      // Debounce
      clearTimeout(_doksliMutObs._t);
      _doksliMutObs._t = setTimeout(doksliAttachStickers, 60);
    }
  });
  document.addEventListener("DOMContentLoaded", () => {
    const optionsContainer = document.getElementById("app");
    if (optionsContainer) {
      _doksliMutObs.observe(optionsContainer, { childList: true, subtree: true });
    }
  });
  new MutationObserver(() => {
    if (window._dkOn()) {
      clearTimeout(window._doksliThemeT);
      window._doksliThemeT = setTimeout(doksliAttachStickers, 80);
    } else {
      document.querySelectorAll(".doksli-sticker").forEach(el => el.remove());
    }
  }).observe(document.body, { attributes: true, attributeFilter: ["class"] });
