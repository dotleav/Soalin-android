// ── Render utama ───────────────────────────────────────────────────────────
function render() {
  syncThemeClass();

  if (mpScreen) {
    app.innerHTML = renderMultiplayerScreen();
    attachMultiplayerHandlers();
    return;
  }

  if (pickerOpen || !allQuestions || allQuestions.length === 0) {
    app.innerHTML = renderPickerScreen();
    attachPickerHandlers();
    if (theme === "p5") requestAnimationFrame(p5ApplyRansom);
    return;
  }

  let html = renderHeaderZone();
  html += `<main class="wrap">`;

  if (quizMode === "biasa") {
    html += biasaLoaded ? renderBiasaMode() : `<div class="empty">Memuat soal\u2026</div>`;
  } else {
    if (tentamenState === "setup") html += renderTentamenSetup();
    else if (tentamenState === "running") html += renderTentamenRunning();
    else html += renderTentamenResults();
  }

  html += `</main>`;
  // Simpen posisi scroll sebelum innerHTML diganti — app.innerHTML = html
  // ngganti seluruh subtree, dan browser bisa "lompat" balik ke atas
  // sesaat. Ini salah satu sumber "blink" paling kerasa di Mode Latihan
  // (daftar soal panjang, tiba-tiba serasa nge-jump tiap jawab).
  const prevScrollY = window.scrollY;
  app.innerHTML = html;
  window.scrollTo(0, prevScrollY);
  attachHandlers();
  if (theme === "p5") requestAnimationFrame(p5ApplyRansom);
}

// ── Pasang semua event listener setelah tiap render ───────────────────────
function attachHandlers() {
  // Soal rusak — tap untuk toggle reveal
  app.querySelectorAll(".brokenCard[data-broken-id]").forEach(card => {
    card.addEventListener("click", () => {
      const id = card.dataset.brokenId;
      if (brokenRevealed.has(id)) {
        brokenRevealed.delete(id);
      } else {
        brokenRevealed.add(id);
      }
      render();
    });
  });

  app.querySelectorAll("[data-broken-nav]").forEach(btn => {
    btn.addEventListener("click", () => {
      brokenIdx += Number(btn.dataset.brokenNav);
      render();
    });
  });

  app.querySelectorAll(".option[data-letter]").forEach(btn => {
    btn.addEventListener("click", () => onOptionClick(btn.dataset.qid, btn.dataset.letter, btn));
  });

  // Soal isian — tombol segitiga atau Enter (tanpa Shift) di textarea buat submit
  app.querySelectorAll(".isianSubmitBtn[data-qid]").forEach(btn => {
    btn.addEventListener("click", () => {
      const wrap = btn.closest(".isianInputRow");
      const ta = wrap ? wrap.querySelector("textarea.isianInput") : null;
      onIsianSubmit(btn.dataset.qid, ta ? ta.value : "");
    });
  });
  app.querySelectorAll("textarea.isianInput[data-qid]").forEach(ta => {
    ta.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" || e.shiftKey) return;
      e.preventDefault();
      onIsianSubmit(ta.dataset.qid, ta.value);
    });
  });

  const hideBtn = document.getElementById("hideHeaderBtn");
  if (hideBtn) hideBtn.addEventListener("click", () => { headerHidden = !headerHidden; render(); });

  const muteBtn = document.getElementById("muteBtn");
  if (muteBtn) muteBtn.addEventListener("click", toggleMute);

  app.querySelectorAll(".pillBtn[data-mode]").forEach(btn => {
    btn.addEventListener("click", () => handleModeChange(btn.dataset.mode));
  });

  const resetBtn = document.getElementById("resetBtn");
  if (resetBtn) resetBtn.addEventListener("click", () => {
    if (quizMode === "biasa") handleResetBiasa();
    else handleResetTentamen();
  });

  const shuffleBtnEl = document.getElementById("shuffleBtn");
  if (shuffleBtnEl) shuffleBtnEl.addEventListener("click", () => {
    if (quizMode === "biasa") handleBiasaShuffleToggle();
    else { tentamenShuffleOn = !tentamenShuffleOn; render(); }
  });

  const loadMoreBtn = document.getElementById("loadMoreBtn");
  if (loadMoreBtn) loadMoreBtn.addEventListener("click", handleBiasaLoadMore);

  app.querySelectorAll(".diffCard[data-diff]").forEach(btn => {
    btn.addEventListener("click", () => { tentamenDifficulty = btn.dataset.diff; render(); });
  });

  const startBtn = document.getElementById("startTentamenBtn");
  if (startBtn) startBtn.addEventListener("click", handleStartTentamen);

  const nextBtn = document.getElementById("nextTentamenBtn");
  if (nextBtn) nextBtn.addEventListener("click", advanceOrFinish);

  const restartTentamenBtn = document.getElementById("restartTentamenBtn");
  if (restartTentamenBtn) restartTentamenBtn.addEventListener("click", handleResetTentamen);

  const pkgSwitchBtn = document.getElementById("pkgSwitchBtn");
  if (pkgSwitchBtn) pkgSwitchBtn.addEventListener("click", () => { pickerOpen = true; dropMsg = ""; render(); });
}

// ── Boot ───────────────────────────────────────────────────────────────────
async function boot() {
  await Promise.all([loadManifest(), loadCustom()]);

  let savedId;
  try { savedId = localStorage.getItem(ACTIVE_PKG_KEY); } catch { savedId = null; }
  const saved = isCustomId(savedId) ? customPkg(customRec(savedId.slice(CUSTOM_PREFIX.length))) : packageManifest.find((p) => p.id === savedId);
  if (saved) {
    await selectPackage(saved);
  } else {
    pickerOpen = true; // belum pilih paket (atau bank belum termuat) — tampilkan pemilih
  }

  render();
}
boot();

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
  window.addEventListener("scroll", doksliUpdateStickerOpacity, { passive: true });
  document.addEventListener("scroll", doksliUpdateStickerOpacity, { passive: true, capture: true });

  // Hook into render — call doksliAttachStickers after every render when answered
  const _origRender = typeof render === "function" ? render : null;
  // We patch via MutationObserver on .options instead (safer)
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
    // Also fire once on theme change
    document.body.addEventListener("classchange", doksliAttachStickers);
  });
  new MutationObserver(() => {
    if (window._dkOn()) {
      clearTimeout(window._doksliThemeT);
      window._doksliThemeT = setTimeout(doksliAttachStickers, 80);
    } else {
      document.querySelectorAll(".doksli-sticker").forEach(el => el.remove());
    }
  }).observe(document.body, { attributes: true, attributeFilter: ["class"] });
