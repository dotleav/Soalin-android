// ── State: soal rusak yang sudah di-tap (revealed) ────────────────────────
const brokenRevealed = new Set(); // Set of q.id that have been tapped open

// ── Render: flashcard soal rusak (1 kartu per layar, tap → penjelasan terbuka) ──
let brokenIdx = 0;
function renderBrokenDeck(list) {
  const n = list.length;
  brokenIdx = Math.min(Math.max(brokenIdx, 0), n - 1);
  const q = list[brokenIdx];
  const open = brokenRevealed.has(q.id);
  const qImgs = q.questionImages || [], eImgs = q.explanationImages || [];
  const hasExp = !!q.explanation || eImgs.length > 0;

  const revealHtml = open ? `
    <div class="brokenReveal">
      <div class="tag">\uD83D\uDCA1 Penjelasan</div>
      ${q.explanation ? `<p class="brokenExp">${escapeHtml(q.explanation)}</p>` : ""}
      ${eImgs.map(src => `<img class="exImg" src="${src}" alt="gambar penjelasan">`).join("")}
      ${hasExp ? "" : `<p class="noImg">(belum ada penjelasan di dokumen ini)</p>`}
    </div>` : "";

  return `
    <div class="brokenDeck">
      <div class="brokenCard" data-broken-id="${escapeAttr(q.id)}">
        <div class="brokenMeta">
          <span class="brokenBadge">\u26A0\uFE0F Soal Rusak</span>
          <span class="tapHint">${open ? "\uD83D\uDC46 Tap lagi untuk tutup" : "\uD83D\uDC46 Tap untuk lihat penjelasan"}</span>
          <span class="brokenCount">${brokenIdx + 1} / ${n}</span>
        </div>
        <p class="brokenQ">${escapeHtml(q.question)}</p>
        ${qImgs.map(src => `<img class="exImg" src="${src}" alt="gambar soal">`).join("")}
        ${revealHtml}
      </div>
      <div class="brokenNav">
        <button data-broken-nav="-1" ${brokenIdx === 0 ? "disabled" : ""}>\u2190 Sebelumnya</button>
        <button data-broken-nav="1" ${brokenIdx === n - 1 ? "disabled" : ""}>Berikutnya \u2192</button>
      </div>
    </div>
  `;
}

// ── Render: kartu soal isian (textarea → submit → reveal kunci) ──────────
// Dipakai di Mode Latihan & Mode Tentamen. answeredValue:
//   undefined/null/""  → belum dijawab, tampilkan input
//   "skipped"          → dilewati (waktu habis di Tentamen; tidak pernah terjadi di Latihan)
//   string lain        → jawaban yang dikirim user (self-graded, selalu dianggap benar)
function renderIsianCard(q, qNum, answeredValue) {
  const isSkipped = answeredValue === "skipped";
  const isAnswered = !isSkipped && answeredValue !== undefined && answeredValue !== null && answeredValue !== "";

  let bodyHtml;
  if (isSkipped) {
    bodyHtml = `
      <div class="isianReveal">
        <div class="skipNote">⏭️ Soal ini dilewati (waktu habis)</div>
        <div class="explanation">
          <div class="tag">🔑 Kunci Jawaban</div>
          <p>${escapeHtml(q.answer || "(tidak ada kunci jawaban)")}</p>
        </div>
      </div>
    `;
  } else if (isAnswered) {
    bodyHtml = `
      <div class="isianReveal">
        <div class="isianYourAnswer">
          <div class="tag">✍️ Jawaban kamu <span class="icon ok">✓</span> <span class="isianCorrectLabel">Benar</span></div>
          <p>${escapeHtml(answeredValue)}</p>
        </div>
        <div class="explanation">
          <div class="tag">🔑 Kunci Jawaban</div>
          <p>${escapeHtml(q.answer || "(tidak ada kunci jawaban)")}</p>
        </div>
      </div>
    `;
  } else {
    bodyHtml = `
      <div class="isianInputRow">
        <textarea class="isianInput" data-qid="${escapeAttr(q.id)}" rows="2" placeholder="Ketik jawabanmu di sini…"></textarea>
        <button class="isianSubmitBtn" data-qid="${escapeAttr(q.id)}" title="Kirim jawaban" aria-label="Kirim jawaban">▶</button>
      </div>
    `;
  }

  return `
    <div class="qCard isianCard">
      <div class="qMeta">
        <span class="isianBadge">✍️ Isian</span>
        ${(q.questionImages || []).length > 0 ? `<span class="imgBadge">🖼️ Bergambar</span>` : ""}
        ${isAnswered ? `<span class="tapHint">✅ Sudah dijawab</span>` : ""}
      </div>
      <p class="qText"><span class="qNum mono">${qNum}.</span>${escapeHtml(q.question)}</p>
      ${(q.questionImages || []).map(src => `<img class="qImg" src="${src}" alt="gambar soal">`).join("")}
      ${bodyHtml}
    </div>
  `;
}

// ── Render: kartu soal (dipakai di semua mode) ────────────────────────────
function renderQuestionCard(q, qNum, chosen, revealAnswer) {
  const isAnswered = chosen !== undefined && chosen !== null;
  const showState = revealAnswer && isAnswered;
  const oExp = q.optionExplanations || {};

  const optionsHtml = Object.entries(q.options).map(([letter, text]) => {
    let cls = "option";
    let letterCls = "letter";
    let icon = "";
    const locked = isAnswered ? " locked" : "";

    if (!showState) {
      if (chosen === letter) cls += " selected";
    } else {
      if (letter === q.answer) {
        cls += " correct"; letterCls += " correct";
        if (chosen === letter) icon = `<span class="icon ok">\u2713</span>`;
      } else if (letter === chosen) {
        cls += " wrong"; letterCls += " wrong";
        icon = theme === "p5"
          ? `<span class="icon no"><img src="./images/theme/p5/icon-no.png" alt="salah" style="width:14px;height:14px;vertical-align:middle;"></span>`
          : `<span class="icon no">\u2715</span>`;
      } else {
        cls += " faded"; letterCls += " faded";
      }
    }

    // Penjelasan per opsi: hanya tampil setelah jawab, dan hanya kalau memang ada.
    let expTag = "";
    if (letter === q.answer) expTag = `<span class="optExpTag ok">\u2713 Jawaban yang benar</span>`;
    else if (letter === chosen) expTag = `<span class="optExpTag no">\u2715 Kurang tepat</span>`;
    const expHtml = (showState && oExp[letter]) ? `<span class="optExp">${expTag}${escapeHtml(oExp[letter])}</span>` : "";

    return `
      <button class="${cls}${locked}" data-qid="${escapeAttr(q.id)}" data-letter="${escapeAttr(letter)}">
        <span class="${letterCls}" data-letter="${letter}">${(window._dkOn() && window._dkImg) ? `<img class="doksli-letter-img" src="${window._dkImg()}" aria-hidden="true">` : letter}</span>
        <span class="optBody">
          <span class="optText">${escapeHtml(text)}</span>
          ${expHtml}
        </span>
        ${icon}
      </button>
    `;
  }).join("");

  const skipNoteHtml = (showState && chosen === "skipped")
    ? `<div class="skipNote">\u23ED\uFE0F Soal ini dilewati (waktu habis)</div>`
    : "";

  // Card Gambar Penjelasan: teks opsional, utamanya gambar. Tidak tampil kalau kosong.
  const hasGambarPenj = !!q.explanation || (q.explanationImages || []).length > 0;
  const explanationHtml = (showState && hasGambarPenj) ? `
    <div class="explanation">
      <div class="tag">\uD83D\uDDBC\uFE0F Gambar Penjelasan</div>
      ${q.explanation ? `<p>${escapeHtml(q.explanation)}</p>` : ""}
      ${(q.explanationImages || []).map(src => `<img class="exImg" src="${src}" alt="gambar penjelasan">`).join("")}
    </div>
  ` : "";

  return `
    <div class="qCard">
      <div class="qMeta">
        ${(q.questionImages || []).length > 0 ? `<span class="imgBadge">\uD83D\uDDBC\uFE0F Bergambar</span>` : ""}
      </div>
      <p class="qText"><span class="qNum mono">${qNum}.</span>${escapeHtml(q.question)}</p>
      ${(q.questionImages || []).map(src => `<img class="qImg" src="${src}" alt="gambar soal">`).join("")}
      <div class="options">${optionsHtml}</div>
      ${skipNoteHtml}
      ${explanationHtml}
    </div>
  `;
}
