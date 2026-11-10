// ── Mode CBT (Other Modes → CBT) ──────────────────────────────────────────
// Computer Based Test: satu paket soal dengan batas waktu TOTAL (default 2 jam,
// bisa diatur sendiri), bukan timer per soal. Bebas pindah ke soal mana pun lewat
// daftar nomor, jawaban boleh diganti sampai Submit, dan tidak ada penilaian
// langsung. Tombol Submit muncul setelah soal terakhir terjawab, atau kalau waktu
// paket sudah habis (jawaban dikunci; tidak ada yang ditandai salah).
// Terhubung ke: state.js (cbt*), handlers.js (onOptionClick, handleStartTentamen),
// main.js (render, attachHandlers), render-tentamen.js (pemilih mode), render-cards.js.

// ── Util ──────────────────────────────────────────────────────────────────
function isCbtMode() {
  const cfg = DIFFICULTY_CONFIG[tentamenDifficulty];
  return !!(cfg && cfg.cbt);
}
// Aktif di tab Other Modes saat CBT dipilih. tentamenDifficulty tetap "cbt" setelah
// selesai, jadi layar hasil CBT juga lewat sini.
function cbtActive() {
  return quizMode === "tentamen" && isCbtMode();
}
function cbtFmtDurasi(sec) {
  if (sec < 60) return `${sec} dtk`;
  const m = Math.round(sec / 60);
  if (m < 60) return `${m} menit`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} jam ${r} menit` : `${h} jam`;
}
function cbtFmtClock(sec) {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const d = s % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(d)}` : `${pad(m)}:${pad(d)}`;
}
function cbtIsAnswered(i) {
  const a = tentamenAnswers[i];
  return a !== null && a !== undefined && a !== "";
}
function cbtAnsweredCount() {
  let n = 0;
  for (let i = 0; i < tentamenQuestions.length; i++) if (cbtIsAnswered(i)) n++;
  return n;
}
function cbtLastAnswered() {
  const last = tentamenQuestions.length - 1;
  return last >= 0 && cbtIsAnswered(last);
}
function cbtCanSubmit() {
  return cbtExpired || cbtLastAnswered();
}

// ── Setup: batas waktu satu paket (bar + isian menit) ────────────────────
function renderCbtTimeBar() {
  const min = Math.round(cbtTimeLimitSec / 60);
  const rangeVal = Math.min(480, Math.max(10, min));
  return `
    <div class="cbtTimeCard">
      <div class="cbtTimeHead">
        <span class="sectionLabel cbtTimeTitle">Batas waktu satu paket</span>
        <span class="cbtTimeVal mono" id="cbtTimeVal">${cbtFmtDurasi(cbtTimeLimitSec)}</span>
      </div>
      <div class="cbtTimeRow">
        <input type="range" id="cbtTimeRange" class="cbtTimeRange" min="10" max="480" step="5" value="${rangeVal}" aria-label="Batas waktu paket (menit)">
        <label class="cbtTimeNumWrap">
          <input type="number" id="cbtTimeNum" class="cbtTimeNum" min="1" max="960" step="1" value="${min}" aria-label="Batas waktu paket dalam menit">
          <span>menit</span>
        </label>
      </div>
      <p class="cbtTimeHint">Default 2 jam. Ini batas total untuk mengerjakan paket: waktu tidak memaksa jawaban dan tidak menandai salah.</p>
    </div>`;
}
function cbtSetTimeFromInput(src) {
  let min = Math.round(Number(src.value));
  if (!Number.isFinite(min)) return;
  min = Math.min(960, Math.max(1, min));
  cbtTimeLimitSec = min * 60;
  const range = document.getElementById("cbtTimeRange");
  const num = document.getElementById("cbtTimeNum");
  if (range && src !== range) range.value = String(Math.min(480, Math.max(10, min)));
  if (num && src !== num) num.value = String(min);
  const label = cbtFmtDurasi(cbtTimeLimitSec);
  const val = document.getElementById("cbtTimeVal");
  if (val) val.textContent = label;
  const stat = document.getElementById("cbtStatTime");
  if (stat) stat.textContent = label;
}

// ── Render: CBT — mengerjakan paket ──────────────────────────────────────
function renderCbtRunning() {
  const total = tentamenQuestions.length;
  const q = tentamenQuestions[currentIdx];
  if (!q) return `<div class="empty">Tidak ada soal.</div>`;
  const qNum = currentIdx + 1;
  const cfg = DIFFICULTY_CONFIG.cbt;

  // Fade-in hanya saat soal ini pertama kali tampil (sama seperti Tentamen).
  const freshKey = "cbt|" + currentIdx;
  const isFresh = freshKey !== tentamenFadeKey;
  tentamenFadeKey = freshKey;

  const pct = cbtSessionSec > 0 ? Math.max(0, Math.min(100, (cbtTimeLeft / cbtSessionSec) * 100)) : 0;
  const val = tentamenAnswers[currentIdx];
  // Jawaban tidak dinilai di sini: tidak ada kelas benar/salah, opsi bisa diganti.
  const card = q.isIsian
    ? renderCbtIsianCard(q, qNum, val, cbtExpired)
    : renderQuestionCard(q, qNum, val, false, { free: !cbtExpired, lock: cbtExpired });

  let html = `<div class="cbtWrap${isFresh ? " quiz-fade-in" : ""}" style="--cbt:${cfg.color};">`;
  html += `
    <div class="cbtTopBar">
      <div class="cbtTimer${!cbtExpired && cbtTimeLeft <= 60 ? " urgent" : ""}${cbtExpired ? " expired" : ""}" id="cbtTimerCard">
        <span class="cbtTimerLbl">${cbtExpired ? "Waktu habis" : "Sisa waktu paket"}</span>
        <span class="cbtTimerNum mono" id="cbtTimerNum">${cbtFmtClock(cbtExpired ? 0 : cbtTimeLeft)}</span>
      </div>
      <div class="cbtQOf">Soal <span class="mono">${qNum}</span> dari <span class="mono">${total}</span></div>
    </div>
    <div class="cbtTrack"><div class="cbtTrackFill" id="cbtTrackFill" style="width:${pct}%;"></div></div>`;
  if (cbtExpired) {
    html += `<div class="timeoutNotice">${svgIcon("warning")} <span>Waktu paket habis. Jawaban dikunci, tekan Submit untuk melihat nilai.</span></div>`;
  }
  html += `<div id="cbtCard">${card}</div>`;
  html += `
    <div class="cbtNavRow">
      <button class="cbtArrow iconBtn" id="cbtPrevBtn" aria-label="Sebelumnya" title="Sebelumnya" ${currentIdx === 0 ? "disabled" : ""}>${svgIcon("chevron-left")} <span class="lbl">Sebelumnya</span></button>
      <button class="cbtArrow iconBtn" id="cbtNextBtn" aria-label="Berikutnya" title="Berikutnya" ${currentIdx >= total - 1 ? "disabled" : ""}><span class="lbl">Berikutnya</span> ${svgIcon("chevron-right")}</button>
    </div>
    <div class="cbtGridHead"><span class="v2hide">Daftar soal</span><span class="mono" id="cbtCountText">${cbtAnsweredCount()}/${total}<span class="v2hide"> dijawab</span></span></div>
    <div class="cbtGrid" id="cbtGrid">`;
  for (let i = 0; i < total; i++) {
    const cls = (cbtIsAnswered(i) ? " done" : "") + (i === currentIdx ? " current" : "");
    html += `<button class="cbtNum${cls}" data-cbt-idx="${i}" aria-label="Soal ${i + 1}${cbtIsAnswered(i) ? ", sudah dijawab" : ""}">${i + 1}</button>`;
  }
  html += `</div>`;
  html += `<div class="cbtSubmitSlot" id="cbtSubmitSlot">${cbtSubmitSlotHtml()}</div>`;
  html += `</div>`;
  return html;
}
function cbtSubmitSlotHtml() {
  if (!cbtCanSubmit()) {
    return `<p class="cbtHint">Selesaikan soal terakhir (${tentamenQuestions.length}) untuk membuka tombol Submit. Jawaban boleh diganti kapan saja sebelum Submit.</p>`;
  }
  return `<button class="startTentamenBtn cbtSubmitBtn" id="cbtSubmitBtn" style="background:${DIFFICULTY_CONFIG.cbt.color};">${svgIcon("check")} Submit</button>`;
}
function renderCbtIsianCard(q, qNum, value, disabled) {
  const v = value && value !== "skipped" ? String(value) : "";
  const imgs = q.questionImages || [];
  return `
    <div class="qCard isianCard">
      <div class="qMeta">
        <span class="isianBadge">${svgIcon("pen")} Isian</span>
        ${imgs.length > 0 ? `<span class="imgBadge">${svgIcon("image")} Bergambar</span>` : ""}
      </div>
      <p class="qText"><span class="qNum mono">${qNum}.</span>${escapeHtml(q.question)}</p>
      ${imgs.map(src => `<img class="qImg" src="${src}" alt="gambar soal">`).join("")}
      <textarea class="cbtIsianInput" rows="3" placeholder="Ketik jawabanmu di sini\u2026 (boleh diganti sebelum Submit)" ${disabled ? "disabled" : ""}>${escapeHtml(v)}</textarea>
    </div>`;
}

// ── Mulai & timer waktu paket ─────────────────────────────────────────────
function cbtStartSession(qs) {
  tentamenQuestions = qs;
  tentamenAnswers = new Array(qs.length).fill(null);
  currentIdx = 0;
  cbtSessionSec = cbtTimeLimitSec;
  cbtDeadline = Date.now() + cbtSessionSec * 1000;
  cbtTimeLeft = cbtSessionSec;
  cbtExpired = false;
  qPhase = "answering";
  tentamenState = "running";
  tentamenFadeKey = null;
  render();
  startCbtTimerLoop();
}
function startCbtTimerLoop() {
  stopTentamenTimerLoop();
  tentamenTimerHandle = setInterval(() => {
    if (!cbtActive() || tentamenState !== "running" || cbtExpired) return;
    // Dihitung dari tenggat (bukan hitung mundur 1 per tick), jadi tetap akurat
    // walau tab sempat di-background dan timer browser melambat.
    cbtTimeLeft = Math.max(0, Math.ceil((cbtDeadline - Date.now()) / 1000));
    if (cbtTimeLeft <= 0) {
      cbtExpired = true;
      clearInterval(tentamenTimerHandle);
      tentamenTimerHandle = null;
      render();
      return;
    }
    cbtUpdateTimerDOM();
  }, 1000);
}
// Perbarui jam & bar tanpa render ulang (kartu soal tidak ikut berkedip).
function cbtUpdateTimerDOM() {
  const num = document.getElementById("cbtTimerNum");
  const card = document.getElementById("cbtTimerCard");
  const fill = document.getElementById("cbtTrackFill");
  if (!num || !card) return;
  num.textContent = cbtFmtClock(cbtTimeLeft);
  card.classList.toggle("urgent", cbtTimeLeft <= 60);
  if (fill) fill.style.width = Math.max(0, Math.min(100, (cbtTimeLeft / cbtSessionSec) * 100)) + "%";
}

// ── Jawaban: boleh diganti sampai Submit; tidak dinilai, tanpa suara benar/salah ──
function handleCbtAnswer(letter) {
  if (!cbtActive() || tentamenState !== "running" || cbtExpired) return;
  const q = tentamenQuestions[currentIdx];
  if (!q || q.isIsian) return;
  if (tentamenAnswers[currentIdx] === letter) return;
  tentamenAnswers[currentIdx] = letter;
  render();
}
function handleCbtIsianInput(text) {
  if (!cbtActive() || tentamenState !== "running" || cbtExpired) return;
  const t = String(text || "").trim();
  tentamenAnswers[currentIdx] = t === "" ? null : t;
  cbtRefreshLive(); // tanpa render ulang: fokus textarea tetap di tempatnya
}
// Perbarui nomor, hitungan, dan tombol Submit tanpa render ulang.
function cbtRefreshLive() {
  const total = tentamenQuestions.length;
  document.querySelectorAll("#cbtGrid .cbtNum").forEach((el) => {
    el.classList.toggle("done", cbtIsAnswered(Number(el.dataset.cbtIdx)));
  });
  const count = document.getElementById("cbtCountText");
  if (count) count.textContent = `${cbtAnsweredCount()}/${total} dijawab`;
  const slot = document.getElementById("cbtSubmitSlot");
  if (slot) slot.innerHTML = cbtSubmitSlotHtml();
  const tracker = document.getElementById("trackerCount");
  if (tracker) tracker.textContent = `${cbtAnsweredCount()}/${total}`;
}

// ── Navigasi: bebas ke soal mana pun ──────────────────────────────────────
function handleCbtJump(idx) {
  if (!cbtActive() || tentamenState !== "running") return;
  if (!Number.isInteger(idx) || idx < 0 || idx >= tentamenQuestions.length || idx === currentIdx) return;
  currentIdx = idx;
  render();
  cbtScrollToCard();
}
function handleCbtStep(delta) { handleCbtJump(currentIdx + delta); }
function cbtScrollToCard() {
  const el = document.getElementById("cbtCard");
  if (el && el.scrollIntoView) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ── Submit: hanya muncul setelah soal terakhir terjawab (atau waktu habis) ──
function handleCbtSubmit() {
  if (!cbtActive() || tentamenState !== "running" || !cbtCanSubmit()) return;
  const kosong = tentamenAnswers.filter((a, i) => !cbtIsAnswered(i)).length;
  if (!cbtExpired && kosong > 0 && !window.confirm(`Masih ada ${kosong} soal yang belum dijawab. Kirim sekarang?`)) return;
  // Soal yang tidak terjawab dicatat "skipped" supaya tampil sebagai kosong, bukan salah.
  tentamenAnswers = tentamenAnswers.map((a, i) => (cbtIsAnswered(i) ? a : "skipped"));
  tentamenState = "finished";
  stopTentamenTimerLoop();
  render();
  window.scrollTo(0, 0);
}

// ── Delegasi event CBT: dipasang sekali, tetap berfungsi setelah render ulang ──
document.addEventListener("click", (e) => {
  const t = e.target && e.target.closest
    ? e.target.closest("#cbtSubmitBtn, #cbtPrevBtn, #cbtNextBtn, [data-cbt-idx]")
    : null;
  if (!t || !cbtActive() || tentamenState !== "running") return;
  if (t.id === "cbtSubmitBtn") handleCbtSubmit();
  else if (t.id === "cbtPrevBtn") handleCbtStep(-1);
  else if (t.id === "cbtNextBtn") handleCbtStep(1);
  else handleCbtJump(Number(t.dataset.cbtIdx));
});
document.addEventListener("input", (e) => {
  const t = e.target;
  if (!t) return;
  if (t.id === "cbtTimeRange" || t.id === "cbtTimeNum") cbtSetTimeFromInput(t);
  else if (t.classList && t.classList.contains("cbtIsianInput")) handleCbtIsianInput(t.value);
});

// ── Tile mode (stiker): dipakai pemilih Other Modes dan pemilih host Multiplayer ──
// active: tile yang dipilih. attrs: atribut tambahan (mis. data-mp-act). note: teks kecil di bawah caption.
function modeTileHtml(k, active, attrs = "", note = "") {
  const c = DIFFICULTY_CONFIG[k];
  return `
    <button class="modeTile${active ? " active" : ""}" data-diff="${k}" ${attrs} style="--mc:${c.color};" aria-pressed="${active}" aria-label="${escapeAttr(c.label)}${c.tentamen ? ", Tentamen" : ""}">
      ${c.tentamen ? `<span class="modeBadge">Tentamen</span>` : ""}
      <img class="modeSticker" src="${c.sticker}" alt="" draggable="false">
      <span class="modeCaption">${c.descHtml || escapeHtml(c.desc || "")}</span>
      ${note}
    </button>`;
}

// Stiker hasil sesuai skor (dipakai layar hasil; tampil penuh di tema v2).
function resultStickerSrc(pct) {
  const k = pct >= 80 ? "cheetah" : pct >= 60 ? "normal" : pct >= 40 ? "folivora" : "bekicot";
  return DIFFICULTY_CONFIG[k].sticker;
}

// Judul paket: ukuran huruf dikecilkan sampai muat satu baris (11-20px), semua tema.
function fitPkgTitle() {
  const h = document.querySelector("h1.pkgTitleActive");
  if (!h) return;
  h.style.fontSize = "";
  let px = Math.min(parseFloat(getComputedStyle(h).fontSize), 20);
  h.style.fontSize = px + "px";
  while (h.scrollWidth > h.clientWidth && px - 0.5 >= 11) { px -= 0.5; h.style.fontSize = px + "px"; }
}
window.addEventListener("resize", fitPkgTitle);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitPkgTitle);
