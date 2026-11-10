// ── Render: Tentamen — setup ──────────────────────────────────────────────
function renderTentamenSetup() {
  const qCount = allQuestions.filter(q => !q.isBroken).length; // soal rusak tidak masuk; soal isian ikut
  const cfg = DIFFICULTY_CONFIG[tentamenDifficulty];
  const cbt = !!cfg.cbt;
  const timerSec = cfg.timerSeconds;
  const estLabel = (() => {
    if (timerSec === 0) return "\u221E";
    const totalSec = qCount * timerSec;
    if (totalSec < 60) return `${totalSec} dtk`;
    return `${Math.ceil(totalSec / 60)} menit`;
  })();
  const timerLabel = timerSec === 0 ? "\u221E" : `${timerSec}s`;

  // Other Modes: tiap mode tampil sebagai stiker. Mode bertimer per soal (Tentamen)
  // diberi lencana "Tentamen" di pojok kanan atas. Bekicot & CBT bukan Tentamen.
  let html = `<div class="quiz-fade-in">`;
  html += `<div>
    <div class="sectionLabel v2hide">Pilih mode</div>
    <div class="modeGrid">`;
  Object.keys(DIFFICULTY_CONFIG).forEach(d => {
    html += modeTileHtml(d, tentamenDifficulty === d);
  });
  html += `</div></div>`;

  html += `<div class="statsRow3">
    <div class="statBox2"><div class="val">${qCount}</div><div class="lbl">Soal</div></div>`;
  html += cbt
    ? `<div class="statBox2"><div class="val" id="cbtStatTime">${cbtFmtDurasi(cbtTimeLimitSec)}</div><div class="lbl">Batas paket</div></div>
       <div class="statBox2"><div class="val">Bebas</div><div class="lbl">Navigasi</div></div>`
    : `<div class="statBox2"><div class="val">${timerLabel}</div><div class="lbl">Timer/soal</div></div>
       <div class="statBox2"><div class="val">${estLabel}</div><div class="lbl">Estimasi</div></div>`;
  html += `</div>`;

  if (cbt) html += renderCbtTimeBar();

  html += `<button class="startTentamenBtn" id="startTentamenBtn" style="background:${cfg.color};" ${qCount === 0 ? "disabled" : ""}>
    ${svgIcon("play")} Mulai <img class="startSticker" src="${cfg.sticker}" alt="" aria-hidden="true">
  </button>`;
  html += `</div>`;
  return html;
}

// ── Render: Tentamen — running ────────────────────────────────────────────
function renderTentamenRunning() {
  const q = tentamenQuestions[currentIdx];
  if (!q) return `<div class="empty">Tidak ada soal.</div>`;
  const cfg = DIFFICULTY_CONFIG[tentamenDifficulty];
  const maxTime = cfg.timerSeconds || 1;
  const isAnswering = qPhase === "answering";
  const isManual = qPhase === "answered_manual";
  const isTimeout = qPhase === "answered_timeout";
  const isUrgent = timeLeft <= 10 && isAnswering && tentamenDifficulty !== "bekicot";
  const timerPct = tentamenDifficulty === "bekicot" ? 100 : (timeLeft / maxTime) * 100;
  const total = tentamenQuestions.length;
  const qNum = currentIdx + 1;

  // Fade-in cuma pas soal ini pertama kali tampil (baru pindah/mulai) —
  // BUKAN tiap render() ulang gara-gara jawaban diklik (lihat komentar di
  // deklarasi tentamenFadeKey).
  const freshKey = tentamenState + "|" + currentIdx;
  const isFreshQuestion = freshKey !== tentamenFadeKey;
  tentamenFadeKey = freshKey;
  let html = `<div class="${isFreshQuestion ? "quiz-fade-in" : ""}">`;

  html += `<div class="tentamenTop">
    <span class="qOf">Soal <span class="mono" style="color:var(--accent); font-weight:700;">${qNum}</span> dari ${total}</span>
    <div class="dotsRow">`;
  const dotCount = Math.min(total, 15);
  for (let i = 0; i < dotCount; i++) {
    const done = i < qNum - 1;
    const current = i === qNum - 1;
    html += `<div class="dotItem${done ? " done" : ""}${current ? " current" : ""}"></div>`;
  }
  if (total > 15) html += `<span class="dotsOverflow">+${total - 15}</span>`;
  html += `</div></div>`;

  html += `<div class="timerCard${isUrgent ? " urgent" : ""}${isTimeout ? " timeoutFlash" : ""}" id="timerCard">
    <div class="timerTop">
      <div class="timerLabel${isUrgent ? " urgent" : ""}" id="timerLabel">
        ${svgIcon("timer")} ${tentamenDifficulty === "bekicot" ? "No timer" : isAnswering ? "Waktu tersisa" : isTimeout ? "Waktu habis!" : "Selesai"}
      </div>
      <span class="timerNum${isUrgent ? " pulse" : ""}" id="timerNum" style="color:${isUrgent ? "var(--wrong-strong)" : cfg.color};">
        ${tentamenDifficulty === "bekicot" ? "\u221E" : String(isAnswering ? timeLeft : isTimeout ? 0 : timeLeft).padStart(2, "0")}
      </span>
    </div>
    <div class="timerTrack"><div class="timerFill" id="timerFill" style="background:${isUrgent ? "var(--wrong-strong)" : cfg.color}; width:${tentamenDifficulty === "bekicot" ? 100 : isAnswering ? timerPct : isTimeout ? 0 : 100}%;"></div></div>
  </div>`;

  const viewing = tentamenReviewViewerIdx();
  if (viewing !== null) {
    html += tentamenReviewViewerHtml(viewing);
  } else {
    html += q.isIsian
      ? renderIsianCard(q, qNum, tentamenAnswers[currentIdx])
      : renderQuestionCard(q, qNum, tentamenAnswers[currentIdx], qPhase !== "answering");
  }

  if (isTimeout) {
    html += `<div class="timeoutNotice">${svgIcon("warning")} <span>Waktu habis! Soal ini dihitung terlewati. Melanjutkan…</span></div>`;
  }

  if (viewing !== null) {
    html += `<button class="nextBtn trvResume iconBtn" id="tentamenResumeBtn" title="Lanjutkan kuis" aria-label="Lanjutkan kuis">${svgIcon("return")} <span class="lbl">Lanjutkan Kuis</span></button>`;
  } else {
    html += tentamenReviewBarHtml();
  }

  if (isManual && viewing === null) {
    html += `<button class="nextBtn" id="nextTentamenBtn">${qNum < total ? `${svgIcon("chevron-right")} Berikutnya` : `${svgIcon("award")} Lihat Hasil`}</button>`;
  }

  html += `</div>`;
  return html;
}

// ── Render: Tentamen — hasil ──────────────────────────────────────────────
function renderTentamenResults() {
  const total = tentamenQuestions.length;
  const correct = tentamenAnswers.filter((a, i) => {
    if (typeof a !== "string" || a === "skipped") return false;
    const q = tentamenQuestions[i];
    // Soal isian self-graded: jawaban apa pun yang terisi dihitung benar (sama seperti Mode Latihan).
    return q?.isIsian ? true : a === q?.answer;
  }).length;
  const skipped = tentamenAnswers.filter(a => a === "skipped").length;
  const wrong = total - correct - skipped;
  const cbtRes = cbtActive();                 // CBT: soal kosong, bukan salah
  const skipLbl = cbtRes ? "Kosong" : "Terlewati";
  const skipWord = cbtRes ? "kosong" : "terlewati";
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const gradeColor = pct >= 80 ? "var(--correct)" : pct >= 60 ? "var(--accent)" : "var(--wrong)";
  const gradeLabel = pct >= 80 ? "Sangat Baik" : pct >= 60 ? "Cukup Baik" : "Perlu Belajar Lagi";

  let html = `<div class="quiz-fade-in">`;

  html += `
    <div class="scoreHero">
      <img class="resultSticker" src="${resultStickerSrc(pct)}" alt="">
      <div class="trophy">${svgIcon("award")}</div>
      <div class="pct" style="color:${gradeColor};">${pct}%</div>
      <div class="gradeLabel" style="color:${gradeColor};">${gradeLabel}</div>
      <div class="subline">${correct} dari ${total} soal benar</div>
    </div>
  `;

  html += `
    <div class="statsGrid statsGrid3">
      <div class="statBox" style="background:#16a34a20; border-color:#16a34a40; color:var(--correct);"><div class="val mono">${correct}</div><div class="lbl">Benar</div></div>
      <div class="statBox" style="background:#ef444420; border-color:#ef444440; color:var(--wrong);"><div class="val mono">${wrong}</div><div class="lbl">Salah</div></div>
      <div class="statBox" style="background:#94a3b818; border-color:#94a3b835; color:#94a3b8;"><div class="val mono">${skipped}</div><div class="lbl">${skipLbl}</div></div>
    </div>
  `;

  html += `
    <div class="progressCard">
      <div style="font-size:0.75rem; color:var(--muted2); margin-bottom:8px;">Distribusi jawaban</div>
      <div class="distBar">
        ${correct > 0 ? `<div style="flex:${correct}; background:var(--correct);"></div>` : ""}
        ${wrong > 0 ? `<div style="flex:${wrong}; background:var(--wrong);"></div>` : ""}
        ${skipped > 0 ? `<div style="flex:${skipped}; background:#475569;"></div>` : ""}
      </div>
      <div class="distLegend">
        <span style="color:var(--correct);">${pct}% benar</span>
        <span style="color:var(--wrong);">${total ? Math.round((wrong/total)*100) : 0}% salah</span>
        <span style="color:#94a3b8;">${total ? Math.round((skipped/total)*100) : 0}% ${skipWord}</span>
      </div>
    </div>
  `;

  html += `<button class="restartBtn iconBtn" id="restartTentamenBtn" title="Ulangi" aria-label="Ulangi">${svgIcon("reset")} <span class="lbl">Ulangi</span></button>`;

  html += `<div class="reviewLabel">Detail jawaban:</div>`;
  html += `<div class="reviewList">`;
  tentamenQuestions.forEach((q, idx) => {
    html += q.isIsian
      ? renderIsianCard(q, idx + 1, tentamenAnswers[idx])
      : renderQuestionCard(q, idx + 1, tentamenAnswers[idx], true);
  });
  html += `</div>`;

  html += `</div>`;
  return html;
}

// ── Tinjau soal sebelumnya (Mode Tentamen) ────────────────────────────────
// Mode dengan timer: daftar baru muncul setelah soal yang sedang berjalan sudah dijawab.
// Mode Bekicot (tanpa timer): bisa dibuka kapan saja, tanpa batas.
function tentamenSolvedBefore() {
  const out = [];
  for (let i = 0; i < currentIdx; i++) {
    const a = tentamenAnswers[i];
    if (typeof a === "string" && a !== "skipped") out.push(i);
  }
  return out;
}
function tentamenIsCorrect(i) {
  const q = tentamenQuestions[i];
  const a = tentamenAnswers[i];
  if (!q || typeof a !== "string" || a === "skipped") return false;
  return q.isIsian ? true : a === q.answer;
}
function tentamenReviewAllowed() {
  if (tentamenState !== "running") return false;
  return tentamenDifficulty === "bekicot" || qPhase === "answered_manual";
}
// Indeks soal yang sedang ditinjau, atau null kalau kembali ke soal berjalan.
function tentamenReviewViewerIdx() {
  if (tentamenReviewIdx === null || tentamenReviewIdx === undefined) return null;
  const ok = tentamenReviewIdx >= 0 && tentamenReviewIdx < currentIdx && typeof tentamenAnswers[tentamenReviewIdx] === "string";
  return ok ? tentamenReviewIdx : null;
}
function tentamenReviewBarHtml() {
  if (!tentamenReviewAllowed()) return "";
  const solved = tentamenSolvedBefore();
  if (!solved.length) return "";
  let html = `<div class="trvBar"><button class="trvToggle iconBtn${tentamenReviewListOpen ? " open" : ""}" id="tentamenReviewToggle" title="Soal sebelumnya" aria-label="Soal sebelumnya" aria-expanded="${tentamenReviewListOpen}">${svgIcon("list")} <span class="lbl">Soal sebelumnya</span> <span class="mono">(${solved.length})</span></button></div>`;
  if (tentamenReviewListOpen) {
    html += `<div class="trvList">`;
    for (const i of solved) {
      const q = tentamenQuestions[i];
      const ok = tentamenIsCorrect(i);
      const snippet = String(q.question || "").replace(/\s+/g, " ").slice(0, 80);
      html += `<button class="trvItem ${ok ? "ok" : "bad"}" data-review-idx="${i}"><span class="trvNum mono">${i + 1}</span><span class="trvText">${escapeHtml(snippet)}</span><span class="trvChip">${ok ? svgIcon("check") + " Benar" : svgIcon("close") + " Salah"}</span></button>`;
    }
    html += `</div>`;
  }
  return html;
}
function tentamenReviewViewerHtml(i) {
  const q = tentamenQuestions[i];
  const a = tentamenAnswers[i];
  const ok = tentamenIsCorrect(i);
  let html = `<div class="trvBanner ${ok ? "ok" : "bad"}">Meninjau soal ${i + 1} \u00B7 ${ok ? "dijawab benar" : "dijawab salah"}</div>`;
  html += q.isIsian ? renderIsianCard(q, i + 1, a) : renderQuestionCard(q, i + 1, a, true);
  return html;
}
