// ── Render: Tentamen — setup ──────────────────────────────────────────────
function renderTentamenSetup() {
  const qCount = allQuestions.filter(q => !q.isBroken).length; // soal rusak tidak masuk tentamen; soal isian ikut
  const cfg = DIFFICULTY_CONFIG[tentamenDifficulty];
  const timerSec = cfg.timerSeconds;
  const estLabel = (() => {
    if (timerSec === 0) return "\u221E";
    const totalSec = qCount * timerSec;
    if (totalSec < 60) return `${totalSec} dtk`;
    return `${Math.ceil(totalSec / 60)} menit`;
  })();
  const timerLabel = timerSec === 0 ? "\u221E" : `${timerSec}s`;

  let html = `<div class="quiz-fade-in">`;
  html += `<div style="margin-bottom:16px;">
    <div class="sectionLabel">Tingkat Kesulitan</div>
    <div class="diffGrid">`;
  Object.keys(DIFFICULTY_CONFIG).forEach(d => {
    const dcfg = DIFFICULTY_CONFIG[d];
    const active = tentamenDifficulty === d;
    html += `
      <button class="diffCard${active ? " active" : ""}" data-diff="${d}" style="${active ? `border-color:${dcfg.color}; background:${dcfg.color}18;` : ""}">
        <div class="diffTop">
          <span class="diffEmoji">${diffIconHtml(dcfg, "diffIcon")}</span>
          <span class="diffLabel" style="color:${active ? dcfg.color : "var(--text)"};">${dcfg.label}</span>
        </div>
        <div class="diffDesc">${escapeHtml(dcfg.desc)}</div>
        <div class="diffTimer" style="color:${active ? dcfg.color : "var(--muted3)"};">${dcfg.timerSeconds === 0 ? "5-7 hari kerja" : `${dcfg.timerSeconds}s / soal`}</div>
      </button>
    `;
  });
  html += `</div></div>`;

  html += `<div class="statsRow3">
    <div class="statBox2"><div class="val">${qCount}</div><div class="lbl">Soal</div></div>
    <div class="statBox2"><div class="val">${timerLabel}</div><div class="lbl">Timer/soal</div></div>
    <div class="statBox2"><div class="val">${estLabel}</div><div class="lbl">Estimasi</div></div>
  </div>`;

  html += `<button class="startTentamenBtn" id="startTentamenBtn" style="background:${cfg.color};" ${qCount === 0 ? "disabled" : ""}>
    \u25B6 Mulai Tentamen \u2014 ${diffIconHtml(cfg, "startIcon")} ${cfg.label}
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
        \u23F1 ${tentamenDifficulty === "bekicot" ? "No timer \uD83D\uDC0C" : isAnswering ? "Waktu tersisa" : isTimeout ? "Waktu habis!" : "Selesai"}
      </div>
      <span class="timerNum${isUrgent ? " pulse" : ""}" id="timerNum" style="color:${isUrgent ? "var(--wrong-strong)" : cfg.color};">
        ${tentamenDifficulty === "bekicot" ? "\u221E" : String(isAnswering ? timeLeft : isTimeout ? 0 : timeLeft).padStart(2, "0")}
      </span>
    </div>
    <div class="timerTrack"><div class="timerFill" id="timerFill" style="background:${isUrgent ? "var(--wrong-strong)" : cfg.color}; width:${tentamenDifficulty === "bekicot" ? 100 : isAnswering ? timerPct : isTimeout ? 0 : 100}%;"></div></div>
  </div>`;

  html += q.isIsian
    ? renderIsianCard(q, qNum, tentamenAnswers[currentIdx])
    : renderQuestionCard(q, qNum, tentamenAnswers[currentIdx], qPhase !== "answering");

  if (isTimeout) {
    html += `<div class="timeoutNotice">\u26A0\uFE0F <span>Waktu habis! Soal ini dihitung terlewati. Melanjutkan\u2026</span></div>`;
  }

  if (isManual) {
    html += `<button class="nextBtn" id="nextTentamenBtn">${qNum < total ? "\u2794 Soal Berikutnya" : "\uD83C\uDFC6 Lihat Hasil"}</button>`;
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
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const gradeColor = pct >= 80 ? "var(--correct)" : pct >= 60 ? "var(--accent)" : "var(--wrong)";
  const gradeLabel = pct >= 80 ? "Sangat Baik" : pct >= 60 ? "Cukup Baik" : "Perlu Belajar Lagi";

  let html = `<div class="quiz-fade-in">`;

  html += `
    <div class="scoreHero">
      <div class="trophy">\uD83C\uDFC6</div>
      <div class="pct" style="color:${gradeColor};">${pct}%</div>
      <div class="gradeLabel" style="color:${gradeColor};">${gradeLabel}</div>
      <div class="subline">${correct} dari ${total} soal benar</div>
    </div>
  `;

  html += `
    <div class="statsGrid statsGrid3">
      <div class="statBox" style="background:#16a34a20; border-color:#16a34a40; color:var(--correct);"><div class="val mono">${correct}</div><div class="lbl">Benar</div></div>
      <div class="statBox" style="background:#ef444420; border-color:#ef444440; color:var(--wrong);"><div class="val mono">${wrong}</div><div class="lbl">Salah</div></div>
      <div class="statBox" style="background:#94a3b818; border-color:#94a3b835; color:#94a3b8;"><div class="val mono">${skipped}</div><div class="lbl">Terlewati</div></div>
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
        <span style="color:#94a3b8;">${total ? Math.round((skipped/total)*100) : 0}% terlewati</span>
      </div>
    </div>
  `;

  html += `<button class="restartBtn" id="restartTentamenBtn">\u21BA Ulangi Tentamen</button>`;

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
