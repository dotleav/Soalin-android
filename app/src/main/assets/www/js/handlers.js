// ── Mode Latihan: hitung daftar soal aktif (shuffle) ─────────────────────
function computeBiasaAll() {
  const key = "__shuffle";
  if (!biasaShuffleOn) {
    delete shuffleOrderCache[key];
    return allQuestions;
  }
  const cached = shuffleOrderCache[key];
  const baseIds = new Set(allQuestions.map(q => q.id));
  if (cached && cached.length === allQuestions.length && cached.every(q => baseIds.has(q.id))) return cached;
  const shuffled = shuffleArray(allQuestions);
  shuffleOrderCache[key] = shuffled;
  return shuffled;
}

// ── Mode Latihan: handlers ───────────────────────────────────────────────
function handleResetBiasa() {
  clearBiasa();
  biasaAnswersMap = {};
  biasaVisibleCount = LOAD_BATCH;
  shuffleOrderCache = {};
  render();
}
function handleBiasaShuffleToggle() {
  biasaShuffleOn = !biasaShuffleOn;
  biasaVisibleCount = LOAD_BATCH;
  saveBiasa();
  render();
}
function handleBiasaLoadMore() {
  const allQ = computeBiasaAll();
  biasaVisibleCount = Math.min(biasaVisibleCount + LOAD_BATCH, allQ.length);
  render();
}
function handleAnswerBiasa(qId, letter) {
  if (biasaAnswersMap[qId] !== undefined && biasaAnswersMap[qId] !== null) return;
  const q = allQuestions.find(x => x.id === qId);
  biasaAnswersMap[qId] = letter;
  saveBiasa();
  playSound(!!q && letter === q.answer);
  render();
}
// Soal isian tidak dinilai benar/salah lewat pencocokan teks — jawaban apa pun
// dianggap benar (audio + badge "benar"), lalu kartu mereveal kunci jawaban.
// Sekali terjawab, tidak bisa diedit (kecuali Reset).
function handleAnswerIsian(qId, text) {
  if (biasaAnswersMap[qId] !== undefined && biasaAnswersMap[qId] !== null) return;
  const trimmed = (text || "").trim();
  if (!trimmed) return;
  biasaAnswersMap[qId] = trimmed;
  saveBiasa();
  playSound(true);
  render();
}

// ── Mode Tentamen: handlers ──────────────────────────────────────────────
function stopTentamenTimerLoop() {
  if (tentamenTimerHandle) { clearInterval(tentamenTimerHandle); tentamenTimerHandle = null; }
  if (tentamenAdvanceHandle) { clearTimeout(tentamenAdvanceHandle); tentamenAdvanceHandle = null; }
}
function startTentamenTimerLoop() {
  stopTentamenTimerLoop();
  tentamenTimerHandle = setInterval(() => {
    if (quizMode !== "tentamen" || tentamenState !== "running" || qPhase !== "answering") return;
    if (tentamenDifficulty === "bekicot") return; // no timer
    if (timeLeft <= 1) {
      timeLeft = 0;
      tentamenAnswers[currentIdx] = "skipped";
      qPhase = "answered_timeout";
      render();
      tentamenAdvanceHandle = setTimeout(advanceOrFinish, 1800);
    } else {
      timeLeft -= 1;
      updateTimerDOM();
    }
  }, 1000);
}

// ── Update tampilan timer secara langsung (tanpa render ulang seluruh halaman) ──
// Ini mencegah "blink" karena kartu soal & animasi ikut dibuat ulang tiap detik.
function updateTimerDOM() {
  const cfg = DIFFICULTY_CONFIG[tentamenDifficulty];
  const maxTime = cfg.timerSeconds || 1;
  const isUrgent = timeLeft <= 10 && tentamenDifficulty !== "bekicot";
  const timerPct = (timeLeft / maxTime) * 100;
  const timerNumEl = document.getElementById("timerNum");
  const timerFillEl = document.getElementById("timerFill");
  const timerCardEl = document.getElementById("timerCard");
  const timerLabelEl = document.getElementById("timerLabel");
  if (!timerNumEl || !timerFillEl || !timerCardEl) return;

  timerNumEl.textContent = String(timeLeft).padStart(2, "0");
  timerNumEl.style.color = isUrgent ? "var(--wrong-strong)" : cfg.color;
  timerNumEl.classList.toggle("pulse", isUrgent);

  timerFillEl.style.width = timerPct + "%";
  timerFillEl.style.background = isUrgent ? "var(--wrong-strong)" : cfg.color;

  timerCardEl.classList.toggle("urgent", isUrgent);
  if (timerLabelEl) timerLabelEl.classList.toggle("urgent", isUrgent);
}
function handleStartTentamen() {
  // Soal rusak (isBroken) tidak dimasukkan ke Mode Tentamen (tidak punya konten yang valid).
  // Soal isian (isIsian) ikut disertakan — dinilai self-graded, lihat handleAnswerTentamenIsian().
  const quizzable = allQuestions.filter(q => !q.isBroken);
  const qs = tentamenShuffleOn ? shuffleArray(quizzable) : quizzable;
  if (!qs.length) return;
  tentamenQuestions = qs;
  tentamenAnswers = new Array(qs.length).fill(null);
  currentIdx = 0;
  timeLeft = DIFFICULTY_CONFIG[tentamenDifficulty].timerSeconds;
  qPhase = "answering";
  tentamenState = "running";
  render();
  startTentamenTimerLoop();
}
function handleResetTentamen() {
  tentamenState = "setup";
  tentamenQuestions = [];
  tentamenAnswers = [];
  stopTentamenTimerLoop();
  render();
}
function handleAnswerTentamen(letter) {
  if (tentamenAnswers[currentIdx] !== null && tentamenAnswers[currentIdx] !== undefined) return;
  const q = tentamenQuestions[currentIdx];
  tentamenAnswers[currentIdx] = letter;
  playSound(letter === q.answer);
  qPhase = "answered_manual";
  render();
}
// Soal isian di Tentamen — sama seperti Mode Latihan: dinilai self-graded,
// jawaban apa pun yang terisi dihitung benar begitu dikirim (lihat renderTentamenResults).
function handleAnswerTentamenIsian(text) {
  if (tentamenAnswers[currentIdx] !== null && tentamenAnswers[currentIdx] !== undefined) return;
  const trimmed = (text || "").trim();
  if (!trimmed) return;
  tentamenAnswers[currentIdx] = trimmed;
  playSound(true);
  qPhase = "answered_manual";
  render();
}
function advanceOrFinish() {
  if (tentamenAdvanceHandle) { clearTimeout(tentamenAdvanceHandle); tentamenAdvanceHandle = null; }
  if (currentIdx >= tentamenQuestions.length - 1) {
    tentamenState = "finished";
    stopTentamenTimerLoop();
  } else {
    currentIdx += 1;
    timeLeft = DIFFICULTY_CONFIG[tentamenDifficulty].timerSeconds;
    qPhase = "answering";
  }
  render();
}

// ── Mode switch ───────────────────────────────────────────────────────────
function handleModeChange(m) {
  if (m === quizMode) return;
  quizMode = m;
  if (m === "tentamen") {
    tentamenState = "setup";
    tentamenQuestions = [];
    tentamenAnswers = [];
  }
  stopTentamenTimerLoop();
  render();
}

// ── Klik opsi jawaban (delegasi, dipakai Latihan & Tentamen) ─────────────
function onOptionClick(qid, letter, btnEl) {
  // Simpen elemen tombol yang BENERAN diklik, bukan cuma huruf-nya. Di Mode
  // Latihan banyak soal tampil sekaligus di satu halaman — kalau targeting
  // sword cuma nyari ".option[data-letter=...]" lewat huruf doang, itu bakal
  // ketemu tombol pertama yang cocok di SELURUH halaman (bisa punya soal
  // lain / yang udah kescroll lewat), jadi sword-nya kayak nusuk ke tempat
  // yang gak keliatan / gak nongol sama sekali di Mode Latihan.
  if (theme === "p5") { window.p5LastOptionEl = btnEl || null; window.p5LastLetter = letter; }
  if (quizMode === "biasa") {
    handleAnswerBiasa(qid, letter);
  } else if (quizMode === "tentamen" && tentamenState === "running" && qPhase === "answering") {
    handleAnswerTentamen(letter);
  }
}

// ── Submit jawaban isian (delegasi, dipakai Latihan & Tentamen) ──────────
function onIsianSubmit(qid, text) {
  if (quizMode === "biasa") {
    handleAnswerIsian(qid, text);
  } else if (quizMode === "tentamen" && tentamenState === "running" && qPhase === "answering") {
    handleAnswerTentamenIsian(text);
  }
}

// ── beforeunload — hanya warning saat tentamen sedang berjalan ───────────
window.addEventListener("beforeunload", (e) => {
  if (quizMode === "tentamen" && tentamenState === "running") {
    e.preventDefault();
    e.returnValue = "";
  }
});
