let mpReviewIdx = null;       // pemain: soal lama yang sedang ditinjau (null = tidak)
let mpReviewListOpen = false;  // pemain: daftar soal sebelumnya terbuka
let mpReviewCur = "";          // kunci room+soal saat daftar terakhir dibuka (reset kalau pindah)
// ── Render: layar Multiplayer (join kode → username → room) ───────────────
function mpErrorHtml() {
  return mpError ? `<div class="mpError">${escapeHtml(mpError)}</div>` : "";
}

function mpModeLabel(meta) {
  const c = DIFFICULTY_CONFIG[meta.difficulty] || DIFFICULTY_CONFIG.bekicot;
  const base = meta.cbt
    ? `${c.label} · ${cbtFmtDurasi(meta.cbtSec)} untuk semua soal`
    : meta.timerSeconds
    ? `${c.label} · ${meta.timerSeconds} dtk/soal (otomatis)`
    : `${c.label} · buka jawaban manual`;
  return meta.shuffled ? `${base} · soal diacak` : base;
}

// Daftar pemain. Host bisa mengeluarkan pemain lewat tombol ✕.
function mpPlayerList(kickable) {
  return Object.entries(mpRoom.players || {}).map(([uid, p]) => kickable
    ? `<button class="mpChip" data-mp-act="kick" data-uid="${uid}">${escapeHtml(p.name)} ${svgIcon("close")}</button>`
    : `<span class="mpChip">${escapeHtml(p.name)}</span>`).join("");
}

function renderMultiplayerScreen() {
  if (mpScreen === "join") return renderMpJoin();
  if (mpScreen === "name") return renderMpName();
  return renderMpRoom();
}

function renderMpJoin() {
  const cards = Object.keys(DIFFICULTY_CONFIG).map((k) => {
    const c = DIFFICULTY_CONFIG[k];
    const timer = c.cbt ? `${cbtFmtDurasi(cbtTimeLimitSec)} total` : c.timerSeconds === 0 ? "\u221E / soal" : `${c.timerSeconds}s / soal`;
    return modeTileHtml(k, mpDiff === k, `data-mp-act="pickdiff"`, `<span class="modeNote mono">${timer}</span>`);
  }).join("");
  const dcfg = DIFFICULTY_CONFIG[mpDiff] || DIFFICULTY_CONFIG.bekicot;
  return `
    <main class="wrap">
      <div class="mpCard mpSetup">
        <button class="mpLinkBtn iconBtn" data-mp-act="back" title="Kembali" aria-label="Kembali">${svgIcon("chevron-left")} <span class="lbl">Kembali</span></button>
        <h1 class="mpTitle">${svgIcon("gamepad")} Multiplayer</h1>
        <p class="mpSub">Masukkan kode room dari host.</p>
        <div class="mpJoinRow">
          <input id="mpCodeInput" class="mpInput mono" maxlength="4" placeholder="KODE" autocomplete="off" autocapitalize="characters" value="${escapeAttr(mpPendingCode)}">
          <button class="mpPrimary mpJoinBtn" data-mp-act="verify" ${mpBusy ? "disabled" : ""}>${mpBusy ? "Mengecek\u2026" : "Lanjut"}</button>
        </div>
        ${mpErrorHtml()}
        <div class="mpDivider"></div>
        <div class="sectionLabel">Jadi host? Pilih mode</div>
        <div class="modeGrid">${cards}</div>
        ${mpDiff === "cbt" ? renderCbtTimeBar() : ""}
        <button class="mpShuffleRow${mpShuffle ? " on" : ""}" data-mp-act="toggleshuffle">
          <span>${svgIcon("shuffle")} Acak urutan soal</span><span class="mpSwitch${mpShuffle ? " on" : ""}"></span>
        </button>
        <button class="mpCreateBtn" data-mp-act="create" style="background:${dcfg.color};" ${mpBusy ? "disabled" : ""}>${svgIcon("play")} Buat room <img class="startSticker" src="${dcfg.sticker}" alt="" aria-hidden="true"></button>
      </div>
    </main>`;
}

function renderMpName() {
  let saved = "";
  try { saved = localStorage.getItem(MP_NAME_KEY) || ""; } catch { /* noop */ }
  return `
    <main class="wrap">
      <div class="mpCard">
        <button class="mpLinkBtn iconBtn" data-mp-act="back" title="Kembali" aria-label="Kembali">${svgIcon("chevron-left")} <span class="lbl">Kembali</span></button>
        <h1 class="mpTitle">Masuk room <span class="mono">${escapeHtml(mpPendingCode)}</span></h1>
        <p class="mpSub">Pilih username yang akan dilihat host dan pemain lain.</p>
        <input id="mpNameInput" class="mpInput" maxlength="20" placeholder="Username kamu" autocomplete="off" value="${escapeAttr(saved)}">
        ${mpErrorHtml()}
        <button class="mpPrimary" data-mp-act="enter" ${mpBusy ? "disabled" : ""}>${mpBusy ? "Masuk\u2026" : "Masuk"}</button>
      </div>
    </main>`;
}

function renderMpRoom() {
  if (!mpRoom.meta) {
    return `
      <main class="wrap">
        <div class="mpCard">
          <p class="mpSub">Memuat room…</p>
          ${mpErrorHtml()}
          <button class="mpLinkBtn" data-mp-act="leave">Keluar</button>
        </div>
      </main>`;
  }

  const phase = mpRoom.state?.phase || "lobby";
  const stage = phase === "playing";
  // Kode room hanya untuk host (dibagikan ke pemain). Pemain tidak melihat kode saat mengerjakan.
  const title = mpRoom.meta.title ? ` · ${escapeHtml(mpRoom.meta.title)}` : "";
  const who = mpIsHost
    ? `${svgIcon("crown")} Host · kode <span class="mpCode mono">${mpRoomCode}</span>`
    : escapeHtml(mpRoom.players?.[mpUid]?.name || "");
  // Tombol keluar/tutup ada di header, jauh dari navigasi soal di bawah.
  const header = `
    <div class="mpTop">
      <div class="mpTopInfo">
        <div class="mpTopTitle">${svgIcon("gamepad")} Multiplayer${title}</div>
        <div class="mpTopSub">${who}</div>
      </div>
      ${mpIsHost
        ? `<button class="mpExitBtn danger" data-mp-act="close">Tutup room</button>`
        : `<button class="mpExitBtn" data-mp-act="leave">Keluar</button>`}
    </div>`;

  let body = "";
  if (phase === "lobby") body = renderMpLobby();
  else if (phase === "ended") body = renderMpEnded();
  else body = mpRoom.meta?.cbt ? renderMpCbtPlaying() : renderMpPlaying() + mpReviewBarHtml();

  return `
    <main class="wrap">
      <div class="mpCard${stage ? " mpStage" : ""}">
        ${header}
        ${mpErrorHtml()}
        ${body}
      </div>
    </main>`;
}

function renderMpLobby() {
  const names = Object.values(mpRoom.players || {}).map((p) => p.name);
  const chips = mpPlayerList(mpIsHost);
  return `
    <p class="mpSub">${escapeHtml(mpRoom.meta.title)} \u00B7 ${mpRoom.meta.count} soal</p>
    <p class="mpSub"><img class="startSticker" src="${(DIFFICULTY_CONFIG[mpRoom.meta.difficulty] || DIFFICULTY_CONFIG.bekicot).sticker}" alt="" aria-hidden="true"> ${escapeHtml(mpModeLabel(mpRoom.meta))}</p>
    <div class="sectionLabel">Pemain (${names.length})</div>
    <div class="mpPlayers">${chips || `<span class="mpSub">Belum ada pemain</span>`}</div>
    ${mpIsHost
      ? `<button class="mpPrimary" data-mp-act="start">${svgIcon("play")} Mulai kuis</button>`
      : `<p class="mpSub">Menunggu host memulai\u2026</p>`}`;
}

function renderMpPlaying() {
  const st = mpRoom.state;
  const i = st.currentIdx;
  const rvKey = mpRoomCode + ":" + i;
  if (mpReviewCur !== rvKey) { mpReviewCur = rvKey; mpReviewIdx = null; mpReviewListOpen = false; }
  if (mpReviewIdx !== null) return mpReviewViewerHtml(mpReviewIdx);
  const q = mpRoom.questions[i];
  if (!q) return `<p class="mpSub">Memuat soal…</p>`;

  const total = mpRoom.meta.count;
  const rev = mpRoom.reveal?.[i];
  const my = mpMyAnswers[i];
  const picks = mpCurrentPicks(i);
  const pickCount = {};
  Object.values(picks).forEach((l) => { pickCount[l] = (pickCount[l] || 0) + 1; });
  const playerCount = Object.keys(mpRoom.players || {}).length;
  const answeredCount = Object.keys(picks).length;
  const letters = Object.keys(q.options || {}).sort();

  const rem = mpRemaining();
  const timed = rem !== null;
  const timedOut = timed && rem === 0;
  const timerHtml = timed ? `
    <div class="mpTimer mono">${mpTimerText(rem)}</div>
    <div class="mpTimerTrack"><div class="mpTimerFill" style="width:${(rem / mpLimitMs()) * 100}%"></div></div>` : "";

  // Kartu soal memakai komponen yang sama dengan Mode Tentamen. Kunci jawaban hanya
  // ikut setelah dibuka (rev). "" = belum menjawab, tapi kunci tetap disorot saat dibuka.
  const qv = rev ? { ...q, answer: rev.answer, explanation: rev.explanation, explanationImages: rev.explanationImages } : q;
  const chosen = my === undefined ? (rev ? "" : undefined) : my;
  const card = renderQuestionCard(qv, i + 1, chosen, !!rev, {
    free: false,
    lock: !!rev || timedOut || mpIsHost,
    optAttrs: mpIsHost ? "" : `data-mp-act="answer"`,
  });

  let feedback = "";
  if (!mpIsHost) {
    if (rev) {
      if (my === undefined) feedback = `<div class="mpFeedback">Kamu belum menjawab.</div>`;
      else if (my === rev.answer) feedback = `<div class="mpFeedback ok">${svgIcon("check")} Benar!</div>`;
      else feedback = `<div class="mpFeedback bad">${svgIcon("close")} Salah. Jawaban yang benar: <b>${escapeHtml(rev.answer)}</b></div>`;
    } else if (my !== undefined) {
      feedback = `<div class="mpFeedback">Jawabanmu terkirim. Menunggu jawaban dibuka…</div>`;
    } else if (timedOut) {
      feedback = `<div class="mpFeedback">Waktu habis. Menunggu jawaban dibuka…</div>`;
    }
  }

  let hostPanel = "";
  if (mpIsHost) {
    const names = Object.entries(picks)
      .map(([uid, l]) => `${escapeHtml(mpRoom.players?.[uid]?.name || "?")} ${svgIcon("chevron-right")} ${l}`)
      .join(" · ");
    const tally = letters.map((l) => {
      const pct = playerCount ? Math.round(((pickCount[l] || 0) / playerCount) * 100) : 0;
      return `<div class="mpTally"><span class="letter">${l}</span><span class="mpTallyBar"><span class="mpBar" style="width:${pct}%"></span></span><span class="mpCount mono">${pickCount[l] || 0}</span></div>`;
    }).join("");
    hostPanel = `
      <div class="mpPanel">
        <div class="mpHostInfo mono">${answeredCount}/${playerCount} sudah menjawab</div>
        <div class="mpTallies">${tally}</div>
        ${names ? `<div class="mpSub mpPicks">${names}</div>` : ""}
        <div class="mpPlayers">${mpPlayerList(true)}</div>
        ${timed ? `<div class="mpSub">Otomatis: jawaban dibuka saat waktu habis.</div>` : ""}
        ${rev
          ? `<button class="mpPrimary" data-mp-act="next">${i + 1 < total ? "Soal berikutnya " + svgIcon("chevron-right") : "Selesai · lihat skor"}</button>`
          : `<button class="mpPrimary" data-mp-act="reveal">${svgIcon("eye")} Tampilkan jawaban</button>`}
      </div>`;
  }

  return `
    <div class="mpProgress mono">Soal ${i + 1} / ${total}</div>
    ${timerHtml}
    ${card}
    ${feedback}
    ${hostPanel}`;
}

function renderMpEnded() {
  if (!mpIsHost && mpRoom.meta?.cbt) return renderMpCbtEnded();
  if (mpIsHost) {
    const board = mpLeaderboard();
    const rows = board.map((b, k) => `
      <div class="mpRow"><span>${k + 1}. ${escapeHtml(b.name)}</span><span class="mono">${b.score}/${mpRoom.meta.count}</span></div>`).join("");
    return `<div class="sectionLabel">Papan skor</div>${rows || `<p class="mpSub">Belum ada pemain.</p>`}`;
  }
  return `
    <div class="sectionLabel">Selesai!</div>
    <p class="mpBig mono">${mpMyScore()}/${mpRoom.meta.count}</p>
    <p class="mpSub">Tunggu host menutup room.</p>`;
}

// ── Multiplayer CBT: tampilan saat paket dikerjakan ───────────────────────
// Susunan sama dengan CBT biasa: bar waktu, kartu soal, navigasi di bawah kartu,
// daftar nomor, lalu Selesai di paling bawah. Keluar room ada di header.
function mpCbtTopHtml(rem, qOf) {
  const timedOut = rem === 0;
  const urgent = rem !== null && rem <= 60000 && !timedOut;
  const timer = rem !== null ? `
    <div class="cbtTimer${urgent ? " urgent" : ""}${timedOut ? " expired" : ""}">
      <span class="cbtTimerLbl">${timedOut ? "Waktu habis" : "Sisa waktu paket"}</span>
      <span class="cbtTimerNum mono">${mpTimerText(rem)}</span>
    </div>` : "";
  const limit = mpLimitMs();
  const pct = rem !== null && limit ? (rem / limit) * 100 : 0;
  const track = rem !== null ? `<div class="cbtTrack"><div class="cbtTrackFill" style="width:${pct}%"></div></div>` : "";
  return `
    <div class="cbtTopBar">
      ${timer}
      <div class="cbtQOf">${qOf}</div>
    </div>
    ${track}`;
}

function renderMpCbtPlaying() {
  const total = mpRoom.meta.count;
  const rem = mpRemaining();
  const timedOut = rem === 0;
  const players = Object.entries(mpRoom.players || {});
  const doneCount = players.filter(([, p]) => p.done).length;
  const cbtColor = DIFFICULTY_CONFIG.cbt.color;

  if (mpIsHost) {
    const rows = players.map(([uid, p]) => {
      const n = Object.values(mpRoom.answers || {}).filter((a) => a && a[uid] !== undefined).length;
      return `<div class="mpRow"><span>${escapeHtml(p.name)}</span><span class="mono">${n}/${total}${p.done ? " · selesai" : ""}</span></div>`;
    }).join("");
    return `
      <div style="--cbt:${cbtColor};">
        ${mpCbtTopHtml(rem, `Pemain ${players.length}`)}
        <div class="mpPanel">
          <div class="mpHostInfo mono">${doneCount}/${players.length} pemain selesai</div>
          <div class="mpPlayers">${mpPlayerList(false)}</div>
          <div class="mpRows">${rows}</div>
          <button class="mpPrimary" data-mp-act="cbtend">${svgIcon("eye")} Akhiri dan buka jawaban</button>
        </div>
      </div>`;
  }

  const i = Math.min(mpCbtIdx, total - 1);
  const q = mpRoom.questions[i];
  const my = mpMyAnswers[i];
  const done = !!mpRoom.players?.[mpUid]?.done;
  const locked = timedOut || done;
  let answered = 0;
  for (let k = 0; k < total; k++) if (mpMyAnswers[k] !== undefined) answered++;

  const grid = Array.from({ length: total }, (_, k) =>
    `<button class="cbtNum${k === i ? " current" : ""}${mpMyAnswers[k] !== undefined ? " done" : ""}" data-mp-act="cbtjump" data-idx="${k}" aria-label="Soal ${k + 1}">${k + 1}</button>`).join("");
  const card = q ? renderQuestionCard(q, i + 1, my, false, { free: !locked, lock: locked, optAttrs: `data-mp-act="answer"` }) : "";
  const status = timedOut ? `<div class="timeoutNotice">${svgIcon("warning")} <span>Waktu paket habis. Jawaban dikunci.</span></div>`
    : done ? `<div class="mpFeedback ok">${svgIcon("check")} Kamu sudah selesai. Menunggu pemain lain…</div>` : "";
  const submit = locked ? "" : `<div class="cbtSubmitSlot"><button class="startTentamenBtn cbtSubmitBtn" data-mp-act="cbtdone" style="background:${cbtColor};">${svgIcon("check")} Selesai</button></div>`;

  return `
    <div class="cbtWrap" style="--cbt:${cbtColor};">
      ${mpCbtTopHtml(rem, `Soal <span class="mono">${i + 1}</span> dari <span class="mono">${total}</span>`)}
      ${status}
      ${card}
      <div class="cbtNavRow">
        <button class="cbtArrow iconBtn" data-mp-act="cbtstep" data-d="-1" aria-label="Sebelumnya" title="Sebelumnya" ${i === 0 ? "disabled" : ""}>${svgIcon("chevron-left")} <span class="lbl">Sebelumnya</span></button>
        <button class="cbtArrow iconBtn" data-mp-act="cbtstep" data-d="1" aria-label="Berikutnya" title="Berikutnya" ${i >= total - 1 ? "disabled" : ""}><span class="lbl">Berikutnya</span> ${svgIcon("chevron-right")}</button>
      </div>
      <div class="cbtGridHead"><span class="v2hide">Daftar soal</span><span class="mono">${answered}/${total}<span class="v2hide"> dijawab</span></span></div>
      <div class="cbtGrid">${grid}</div>
      ${submit}
    </div>`;
}

// Pemain setelah sesi CBT selesai: skor dan daftar tinjauan semua soal.
function mpCbtReviewListHtml() {
  const total = mpRoom.meta.count;
  let html = `<div class="trvList">`;
  for (let j = 0; j < total; j++) {
    const rev = mpRoom.reveal?.[j];
    const my = mpMyAnswers[j];
    const ok = my !== undefined && my === rev?.answer;
    const snippet = String(mpRoom.questions[j]?.question || "").replace(/\s+/g, " ").slice(0, 80);
    const chip = my === undefined ? "Kosong" : ok ? `${svgIcon("check")} Benar` : `${svgIcon("close")} Salah`;
    html += `<button class="trvItem ${ok ? "ok" : "bad"}" data-mp-rv="open" data-idx="${j}"><span class="trvNum mono">${j + 1}</span><span class="trvText">${escapeHtml(snippet)}</span><span class="trvChip">${chip}</span></button>`;
  }
  return html + `</div>`;
}
function renderMpCbtEnded() {
  if (mpReviewIdx !== null) return mpReviewViewerHtml(mpReviewIdx);
  return `
    <div class="sectionLabel">Selesai!</div>
    <p class="mpBig mono">${mpMyScore()}/${mpRoom.meta.count}</p>
    <div class="sectionLabel">Tinjau jawaban</div>
    ${mpCbtReviewListHtml()}
    <p class="mpSub">Tunggu host menutup room.</p>`;
}

function attachMultiplayerHandlers() {
  app.querySelectorAll("[data-mp-act]").forEach((el) => {
    el.addEventListener("click", () => mpAct(el.dataset.mpAct, el));
  });
  app.querySelectorAll("[data-mp-rv]").forEach((el) => {
    el.addEventListener("click", () => mpReviewAct(el.dataset.mpRv, el));
  });
  const codeInput = document.getElementById("mpCodeInput");
  if (codeInput) codeInput.addEventListener("keydown", (e) => { if (e.key === "Enter") mpAct("verify"); });
  const nameInput = document.getElementById("mpNameInput");
  if (nameInput) nameInput.addEventListener("keydown", (e) => { if (e.key === "Enter") mpAct("enter"); });
}

// ── Multiplayer: tinjau soal sebelumnya ───────────────────────────────────
// Aturan sama seperti Mode Tentamen: mode dengan timer → baru bisa setelah
// jawab soal yang sedang berjalan (atau waktu habis). Mode tanpa timer → kapan saja.
// Hanya pemain yang melihat daftar ini (host tidak menjawab).
function mpSolvedBefore(i) {
  const out = [];
  for (let j = 0; j < i; j++) {
    if (mpRoom.reveal?.[j] && mpMyAnswers[j] !== undefined) out.push(j);
  }
  return out;
}
function mpReviewAllowed(i) {
  const timed = mpRemaining() !== null;
  if (!timed) return true;
  const timedOut = mpRemaining() === 0;
  return mpMyAnswers[i] !== undefined || timedOut;
}
function mpReviewBarHtml() {
  if (mpReviewIdx !== null || mpIsHost || !mpRoom.state || mpRoom.state.phase !== "playing") return "";
  const i = mpRoom.state.currentIdx;
  if (!mpReviewAllowed(i)) return "";
  const solved = mpSolvedBefore(i);
  if (!solved.length) return "";
  let html = `<div class="trvBar"><button class="trvToggle${mpReviewListOpen ? " open" : ""}" data-mp-rv="toggle" aria-expanded="${mpReviewListOpen}">${svgIcon("list")} Soal sebelumnya <span class="mono">(${solved.length})</span></button></div>`;
  if (mpReviewListOpen) {
    html += `<div class="trvList">`;
    for (const j of solved) {
      const ok = mpMyAnswers[j] === mpRoom.reveal[j].answer;
      const snippet = String(mpRoom.questions[j]?.question || "").replace(/\s+/g, " ").slice(0, 80);
      html += `<button class="trvItem ${ok ? "ok" : "bad"}" data-mp-rv="open" data-idx="${j}"><span class="trvNum mono">${j + 1}</span><span class="trvText">${escapeHtml(snippet)}</span><span class="trvChip">${ok ? svgIcon("check") + " Benar" : svgIcon("close") + " Salah"}</span></button>`;
    }
    html += `</div>`;
  }
  return html;
}
function mpReviewViewerHtml(j) {
  const q = mpRoom.questions[j];
  const rev = mpRoom.reveal?.[j];
  const my = mpMyAnswers[j];
  if (!q || !rev) return `<p class="mpSub">Soal tidak tersedia.</p><button class="mpPrimary trvResume" data-mp-rv="resume">${svgIcon("return")} Lanjutkan</button>`;
  const ok = my === rev.answer;
  const opts = Object.keys(q.options || {}).sort().map((l) => {
    const cls = ["option", "mpOpt", "mpRvOpt"];
    if (l === rev.answer) cls.push("correct");
    else if (l === my) cls.push("wrong");
    if (my === l) cls.push("selected");
    return `<div class="${cls.join(" ")}"><span class="letter">${l}</span><span class="optBody">${q.optionImages?.[l] ? optionImageHtml(q.optionImages[l]) : ""}${q.options[l] ? `<span class="optText">${escapeHtml(q.options[l])}</span>` : ""}</span></div>`;
  }).join("");
  const qImgs = (q.questionImages || []).map((src) => `<img class="qImg" src="${escapeAttr(src)}" alt="gambar soal">`).join("");
  const status = my === undefined ? "tidak dijawab" : ok ? "jawabanmu benar" : "jawabanmu salah";
  return `
    <div class="trvBanner ${ok ? "ok" : "bad"}">Meninjau soal ${j + 1} \u00B7 ${status} \u00B7 kunci: ${escapeHtml(String(rev.answer))}</div>
    <div class="mpRvQ">${escapeHtml(q.question || "")}</div>
    ${qImgs}
    <div class="mpRvOpts">${opts}</div>
    <button class="mpPrimary trvResume" data-mp-rv="resume">${svgIcon("return")} Lanjutkan</button>`;
}
function mpReviewAct(act, el) {
  if (act === "toggle") mpReviewListOpen = !mpReviewListOpen;
  else if (act === "open") { mpReviewIdx = Number(el.dataset.idx); mpReviewListOpen = false; }
  else if (act === "resume") mpReviewIdx = null;
  render();
}

