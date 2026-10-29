// ── Render: layar pilih kategori / paket soal ─────────────────────────────
function formatDateShort(iso) {
  try {
    return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  } catch { return ""; }
}

// ── Render: kartu Pengaturan (tema + volume) — tampil di bawah daftar kategori ──
const THEME_OPTIONS = [
  { value: "light", icon: "\u2600\uFE0F", label: "Terang" },
  { value: "dark", icon: "\uD83C\uDF19", label: "Gelap" },
  { value: "p5", icon: '<img src="./favicon.ico" style="width:16px;height:16px;vertical-align:middle;image-rendering:pixelated;">', label: "Persona 5" },
  { value: "doksli", icon: '🙏', label: "Dokumen Asli (Doksli)" },
  { value: "koceng", icon: '🐱', label: "Koceng" },
  { value: "capy", icon: '🦫', label: "Capy Masbro" },
  { value: "sxf", icon: '<img src="./images/theme/sxf/notif-anya.png" style="width:18px;height:18px;vertical-align:middle;border-radius:50%;">', label: "Spy x Family" },
];
function renderSettingsCard() {
  const volPct = Math.round(volume * 100);
  const current = THEME_OPTIONS.find((o) => o.value === theme) || THEME_OPTIONS[1];
  return `
    <div class="settingsCard">
      <div class="sectionLabel">\u2699\uFE0F Pengaturan</div>

      <div class="settingsRow">
        <div class="settingsRowText">
          <span class="settingsRowTitle">\uD83C\uDFAE Multiplayer</span>
          <span class="settingsRowDesc">Main bareng: masukkan kode room dari host</span>
        </div>
        <button class="themeModeToggle" id="mpOpenBtn" aria-label="Buka multiplayer">
          <span class="themeModeChevron">\u203A</span>
        </button>
      </div>

      <div class="settingsRow">
        <div class="settingsRowText">
          <span class="settingsRowTitle themeModeTitle">${current.icon} Mode UI: ${current.label}</span>
          <span class="settingsRowDesc">Pilih tampilan!</span>
        </div>
        <button class="themeModeToggle" id="themeModeToggleBtn" aria-expanded="${themeMenuOpen}" aria-label="Pilih mode UI">
          <span class="themeModeChevron${themeMenuOpen ? " open" : ""}">\u25BE</span>
        </button>
      </div>
      ${themeMenuOpen ? `
      <div class="themeModeOptions">
        ${THEME_OPTIONS.map((o) => `
          <button class="themeModeOption${o.value === theme ? " active" : ""}" data-theme-value="${o.value}">
            <span class="themeModeOptionIcon">${o.icon}</span>
            <span>${o.label}</span>
          </button>
        `).join("")}
      </div>` : ""}

      <div class="settingsRow settingsRow-noBorder">
        <div class="settingsRowText">
          <span class="settingsRowTitle">\uD83D\uDD09 Volume Suara</span>
          <span class="settingsRowDesc">Atur kerasnya suara pas jawaban benar/salah</span>
        </div>
      </div>
      <div class="volumeSliderRow">
        <span class="volumeIcon">\uD83D\uDD07</span>
        <input type="range" min="0" max="100" step="1" value="${volPct}" class="volumeSlider" id="volumeSlider" aria-label="Volume suara">
        <span class="volumeIcon">\uD83D\uDD0A</span>
        <span class="volumeVal mono" id="volumeVal">${volPct}%</span>
      </div>
    </div>
  `;
}

// ── Render: kartu Custom Quiz (1 slot) — di paling atas layar pilih paket ──
function renderCustomCard() {
  const list = customQuizzes.map((rec) => {
    const id = CUSTOM_PREFIX + rec.id;
    const active = activePackage?.id === id;
    return `
        <div class="customRow">
          <button class="packageItem${active ? " active" : ""}" data-pkg="${escapeAttr(id)}">
            <span class="pkgTitle">${escapeHtml(rec.title)}</span>
            <span class="pkgMeta">${rec.questions.length} soal \u00B7 ${formatDateShort(rec.savedAt)}</span>
          </button>
          <button class="resetBtn customDelBtn" data-del-custom="${escapeAttr(rec.id)}" title="Hapus kuis">\uD83D\uDDD1\uFE0F</button>
        </div>`;
  }).join("");
  return `
    <div class="categoryGroup">
      <div class="customHead">
        <span class="catName">Custom Quiz (${customQuizzes.length})</span>
        <span class="catMeta">tanpa batas</span>
      </div>
      <input type="file" id="docxInput" accept=".docx,.pdf" multiple hidden>
      ${list}
      <label class="dropZone" for="docxInput">
        <span class="dropIcon">\uD83D\uDCC4</span>
        <span class="dropTitle">Drag and drop</span>
        <span class="dropFormats"><span><code>.docx</code> — soal, gambar, soal rusak &amp; isian</span><span><code>.pdf</code> — soal pilihan ganda, teks dan gambar</span></span>
      </label>
      <a class="templateLink" href="https://drive.google.com/drive/folders/1WSxodjrD3jGzQKj0DBROVTUo7I5iBAun?usp=sharing" target="_blank" rel="noopener">Download template disini</a>
      ${dropMsg ? `<div class="dropMsg">${escapeHtml(dropMsg)}</div>` : ""}
      <div class="dropFormat">Format: <code>1. Soal</code> \u00B7 opsi <code>A.</code>\u2013<code>E.</code> \u00B7 <code>Kunci: X</code> \u00B7 <code>{penjelasan}</code></div>
    </div>`;
}

function renderPickerScreen() {
  const grouped = {};
  packageManifest.forEach((p) => {
    if (!grouped[p.category]) grouped[p.category] = [];
    grouped[p.category].push(p);
  });
  const categories = Object.keys(grouped).sort((a, b) => a.localeCompare(b));

  let html = `
    <main class="wrap">
      <div class="pickerHeader">
        <h1>Pilih Paket Soal</h1>
        <p class="pickerSub">${packageManifest.length ? "Ketuk kategori untuk membuka daftar paket soal di dalamnya." : "Upload file .docx untuk dijadikan kuis."}</p>
      </div>
      <div class="categoryList">
        ${renderCustomCard()}
  `;

  categories.forEach((cat) => {
    const isOpen = expandedCategories.has(cat);
    const pkgs = grouped[cat];
    html += `
      <div class="categoryGroup">
        <button class="categoryHeader${isOpen ? " open" : ""}" data-cat="${escapeAttr(cat)}">
          <span class="catName">${escapeHtml(cat)}</span>
          <span class="catMeta">${pkgs.length} paket</span>
          <span class="catArrow">${isOpen ? "\u25B2" : "\u25BC"}</span>
        </button>
        <div class="categoryBody${isOpen ? " open" : ""}">
          ${pkgs.map((p) => `
            <button class="packageItem${activePackage && activePackage.id === p.id ? " active" : ""}" data-pkg="${escapeAttr(p.id)}">
              <span class="pkgTitle">${escapeHtml(p.title)}</span>
              <span class="pkgMeta">${p.count} soal${p.convertedAt ? " \u00B7 " + formatDateShort(p.convertedAt) : ""}</span>
            </button>
          `).join("")}
        </div>
      </div>
    `;
  });

  html += `</div>`;
  html += renderSettingsCard();
  if (allQuestions.length) {
    html += `<button class="pickerCloseBtn" id="pickerCloseBtn">\u2190 Kembali ke paket saat ini</button>`;
  }
  html += `</main>`;
  return html;
}

function attachPickerHandlers() {
  app.querySelectorAll(".categoryHeader[data-cat]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const cat = btn.dataset.cat;
      if (expandedCategories.has(cat)) expandedCategories.delete(cat);
      else expandedCategories.add(cat);
      render();
    });
  });
  app.querySelectorAll(".packageItem[data-pkg]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const pkg = isCustomId(btn.dataset.pkg) ? customPkg(customRec(btn.dataset.pkg.slice(CUSTOM_PREFIX.length))) : packageManifest.find((p) => p.id === btn.dataset.pkg);
      if (!pkg) return;
      const proceed = async () => {
        await selectPackage(pkg);
        pickerOpen = false;
        render();
      };
      if (theme === "p5") {
        btn.classList.add("p5WiggleSelect");
        setTimeout(proceed, 480); // biarin animasi wiggle kelar dulu sebelum pindah layar
      } else {
        await proceed();
      }
    });
  });
  const closeBtn = document.getElementById("pickerCloseBtn");
  if (closeBtn) closeBtn.addEventListener("click", () => { pickerOpen = false; render(); });

  const docxInput = document.getElementById("docxInput");
  docxInput.addEventListener("change", (e) => handleDocx(e.target.files));
  app.querySelectorAll("[data-del-custom]").forEach((btn) => btn.addEventListener("click", () => deleteCustom(btn.dataset.delCustom)));

  const mpOpenBtn = document.getElementById("mpOpenBtn");
  if (mpOpenBtn) mpOpenBtn.addEventListener("click", () => {
    mpScreen = "join";
    mpError = "";
    render();
  });

  const themeModeToggleBtn = document.getElementById("themeModeToggleBtn");
  if (themeModeToggleBtn) themeModeToggleBtn.addEventListener("click", () => {
    themeMenuOpen = !themeMenuOpen;
    render();
  });
  document.querySelectorAll(".themeModeOption").forEach((btn) => {
    btn.addEventListener("click", () => {
      setTheme(btn.getAttribute("data-theme-value"));
      themeMenuOpen = false;
      render();
    });
  });

  const volumeSlider = document.getElementById("volumeSlider");
  if (volumeSlider) volumeSlider.addEventListener("input", () => {
    const v = parseInt(volumeSlider.value, 10) / 100;
    setVolume(Number.isNaN(v) ? 1 : v);
    // Update label langsung tanpa render ulang, biar slider gak "lompat" pas ditarik.
    const valEl = document.getElementById("volumeVal");
    if (valEl) valEl.textContent = `${Math.round(volume * 100)}%`;
  });
}
