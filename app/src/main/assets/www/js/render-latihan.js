// ── Render: header + mode bar + filter bar ────────────────────────────────
function renderHeaderZone() {
  const quizzableAll = allQuestions.filter(q => !q.isBroken && !q.isIsian);
  const totalQ = quizzableAll.length; // soal rusak & soal isian tidak dihitung di tracker
  let trackerHtml = "";
  if (quizMode === "biasa" && biasaLoaded) {
    const answeredCount = quizzableAll.filter(q => biasaAnswersMap[q.id] !== undefined && biasaAnswersMap[q.id] !== null).length;
    const correctCount = quizzableAll.filter(q => biasaAnswersMap[q.id] === q.answer).length;
    trackerHtml = `
      <div class="tracker">
        <div class="count mono">${answeredCount}/${totalQ}</div>
        <div class="sub"><span class="ok">${correctCount}</span>/<span class="bad">${answeredCount - correctCount}</span></div>
      </div>
    `;
  } else if (quizMode === "tentamen" && tentamenState === "running") {
    const tentAnswered = tentamenAnswers.filter((a) => a !== null && a !== undefined && a !== "skipped").length;
    const tentCorrect = tentamenAnswers.filter((a, i) => a && a !== "skipped" && (tentamenQuestions[i]?.isIsian || a === tentamenQuestions[i]?.answer)).length;
    trackerHtml = `
      <div class="tracker">
        <div class="count mono" id="trackerCount">${cbtActive() ? `${cbtAnsweredCount()}/${tentamenQuestions.length}` : `${tentAnswered}/${tentamenQuestions.length}`}</div>
        <div class="sub">${cbtActive() ? "" : `<span class="ok">${tentCorrect}</span>/<span class="bad">${tentAnswered - tentCorrect}</span>`}</div>
      </div>
    `;
  }

  const showFilterBar = quizMode === "biasa" || (quizMode === "tentamen" && tentamenState === "setup");
  const activeShuffle = quizMode === "biasa" ? biasaShuffleOn : tentamenShuffleOn;
  const showReset = (quizMode === "biasa" && biasaLoaded) || (quizMode === "tentamen" && tentamenState !== "setup");

  return `
    <div class="headerZone">
      ${headerHidden ? "" : `
      <div class="headerCollapse">
        <header>
          <div class="headerInner">
            <div class="titleRow">
              <div>
                <button class="pkgSwitchBtn iconBtn" id="pkgSwitchBtn" title="${activePackage ? "Ganti paket" : "Pilih paket soal"}" aria-label="${activePackage ? "Ganti paket" : "Pilih paket soal"}">${svgIcon("folder")} <span class="lbl">${activePackage ? "Ganti paket" : "Pilih paket soal"}</span></button>
                <h1${activePackage ? ` class="pkgTitleActive"` : ""}>${activePackage ? escapeHtml(activePackage.title) : "Quiz App"}</h1>
                ${activePackage ? `<div class="pkgSubtitle">${escapeHtml(activePackage.category)}</div>` : ""}
                
              </div>
              ${trackerHtml}
            </div>
          </div>
        </header>
      </div>

      <div class="modeBar">
        <div class="modeBarInner">
          <button class="hideToggleBtn${headerHidden ? " active" : ""}" id="hideHeaderBtn" title="Sembunyikan header" aria-label="Sembunyikan header">
            <span class="arrow">${svgIcon("chevron-up")}</span>
          </button>
          <button class="muteBtn${isMuted ? "" : " on"}" id="muteBtn" title="${isMuted ? "Nyalakan suara" : "Matikan suara"}">${isMuted ? svgIcon("speaker-off") : svgIcon("speaker")}</button>
          <button class="pillBtn${quizMode === "biasa" ? " active" : ""}" data-mode="biasa">Default</button>
          <button class="pillBtn${quizMode === "tentamen" ? " active" : ""}" data-mode="tentamen">Modes</button>
          ${showFilterBar ? `<button class="shuffleBtn iconBtn${activeShuffle ? " active" : ""}" id="shuffleBtn" aria-pressed="${activeShuffle}" aria-label="Acak soal" title="Acak soal: ${activeShuffle ? "ON" : "OFF"}">${svgIcon("shuffle")} <span class="lbl">Acak ${activeShuffle ? "ON" : "OFF"}</span></button>` : ""}
          ${showReset ? `<button class="resetBtn iconBtn" id="resetBtn" title="Reset" aria-label="Reset">${svgIcon("reset")} <span class="lbl">Reset</span></button>` : ""}
        </div>
      </div>`}

      ${headerHidden ? `
      <div class="collapsedToggleWrap">
        <button class="hideToggleBtn" id="hideHeaderBtn" title="Tampilkan header" aria-label="Tampilkan header">
          <span class="arrow" style="transform:rotate(180deg);">${svgIcon("chevron-up")}</span>
        </button>
      </div>` : ""}
    </div>
  `;
}

// ── Render: Mode Latihan ──────────────────────────────────────────────────
function renderBiasaMode() {
  const allQ = computeBiasaAll();
  const visible = allQ.slice(0, biasaVisibleCount);
  // Soal rusak & soal isian tidak dihitung di progress tracker (bukan pilihan ganda)
  const quizzableQ = allQ.filter(q => !q.isBroken && !q.isIsian);
  const answeredCount = quizzableQ.filter(q => biasaAnswersMap[q.id] !== undefined && biasaAnswersMap[q.id] !== null).length;
  const correctCount = quizzableQ.filter(q => biasaAnswersMap[q.id] === q.answer).length;
  const totalCount = quizzableQ.length; // hanya soal yang bisa dijawab
  const pct = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;
  const allDone = answeredCount === totalCount && totalCount > 0;
  const hasMore = biasaVisibleCount < allQ.length; // load more berdasarkan total semua soal
  const remaining = allQ.length - visible.length;

  let html = `
    <div class="progressCard">
      <div class="progressTop">
        <span class="left"><span class="v2hide">Sudah dijawab: </span><span class="num mono">${answeredCount}</span> / <span class="num total mono">${totalCount}</span></span>
        <div style="display:flex; gap:12px;">
          <span class="statChip"><span class="dot" style="background:var(--correct);"></span><span class="mono" style="color:var(--correct); font-weight:700;">${correctCount}</span><span style="color:var(--muted2);">benar</span></span>
          <span class="statChip"><span class="dot" style="background:var(--wrong);"></span><span class="mono" style="color:var(--wrong); font-weight:700;">${answeredCount - correctCount}</span><span style="color:var(--muted2);">salah</span></span>
        </div>
      </div>
      <div class="progressTrack"><div class="progressFill" style="width:${pct}%;"></div></div>
    </div>
  `;

  if (allDone) {
    html += `
      <div class="doneBanner">
        <span style="font-size:1.3rem;">${svgIcon("award")}</span>
        <div>
          <span class="title v2hide">Selesai! </span>
          <span class="sub">Skor akhir: ${correctCount}/${totalCount} (${Math.round((correctCount/totalCount)*100)}%)</span>
        </div>
      </div>
    `;
  }

  if (allQ.length === 0) {
    html += `<div class="empty">Tidak ada soal pada kategori ini.</div>`;
    return html;
  }

  html += `<div class="qList">`;
  let deckShown = false;
  visible.forEach((q, idx) => {
    if (q.isBroken) {
      if (!deckShown) { html += renderBrokenDeck(allQ.filter(x => x.isBroken)); deckShown = true; }
    } else if (q.isIsian) {
      html += renderIsianCard(q, idx + 1, biasaAnswersMap[q.id]);
    } else {
      html += renderQuestionCard(q, idx + 1, biasaAnswersMap[q.id], true);
    }
  });
  html += `</div>`;

  if (hasMore) {
    html += `<button class="loadMoreBtn" id="loadMoreBtn">${svgIcon("chevron-right")} Lebih banyak (${Math.min(LOAD_BATCH, remaining)})</button>`;
  }

  return html;
}
