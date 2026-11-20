// ── Render: layar pilih kategori / paket soal ─────────────────────────────
function formatDateShort(iso) {
  try {
    return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  } catch { return ""; }
}

// ── Render: kartu Pengaturan (tema + volume) — tampil di bawah daftar kategori ──
const THEME_OPTIONS = [
  { value: "light", icon: svgIcon("sun"), label: "Terang" },
  { value: "dark", icon: svgIcon("moon"), label: "Gelap" },
  { value: "darkv2", icon: svgIcon("bulb"), label: "Gelap v2" },
  { value: "lightv2", icon: svgIcon("star"), label: "Terang v2" },
  { value: "p5", icon: '<img src="./favicon.ico" style="width:16px;height:16px;vertical-align:middle;image-rendering:pixelated;">', label: "Persona 5" },
  { value: "doksli", icon: svgIcon("document"), label: "Dokumen Asli (Doksli)" },
  { value: "koceng", icon: svgIcon("paw"), label: "Koceng" },
  { value: "capy", icon: svgIcon("leaf"), label: "Capy Masbro" },
  { value: "sxf", icon: '<img src="./images/theme/sxf/notif-anya.png" style="width:18px;height:18px;vertical-align:middle;border-radius:50%;">', label: "Spy x Family" },
];
function renderSettingsCard() {
  const volPct = Math.round(volume * 100);
  const current = THEME_OPTIONS.find((o) => o.value === theme) || THEME_OPTIONS[1];
  return `
    <div class="settingsCard">
      <div class="sectionLabel">${svgIcon("settings")} Pengaturan</div>

      <div class="settingsRow">
        <div class="settingsRowText">
          <span class="settingsRowTitle">${svgIcon("gamepad")} Multiplayer</span>
        </div>
        <button class="themeModeToggle" id="mpOpenBtn" aria-label="Buka multiplayer">
          <span class="themeModeChevron">\u203A</span>
        </button>
      </div>

      <div class="settingsRow">
        <div class="settingsRowText">
          <span class="settingsRowTitle themeModeTitle">${current.icon} Mode UI: ${current.label}</span>
        </div>
        <button class="themeModeToggle" id="themeModeToggleBtn" aria-expanded="${themeMenuOpen}" aria-label="Pilih mode UI">
          <span class="themeModeChevron${themeMenuOpen ? " open" : ""}">${svgIcon("chevron-down")}</span>
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
          <span class="settingsRowTitle">${svgIcon("speaker")} Volume Suara</span>
        </div>
      </div>
      <div class="volumeSliderRow">
        <span class="volumeIcon">${svgIcon("speaker-off")}</span>
        <input type="range" min="0" max="100" step="1" value="${volPct}" class="volumeSlider" id="volumeSlider" aria-label="Volume suara">
        <span class="volumeIcon">${svgIcon("speaker")}</span>
        <span class="volumeVal mono" id="volumeVal">${volPct}%</span>
      </div>
      ${renderAnswertoneCard()}
    </div>
  `;
}

// ── Render: kartu Custom Quiz — di paling atas layar pilih paket ──
// Tekan tahan satu kuis → mode pilih banyak (kotak centang, Pilih semua, Hapus terpilih).
function renderCustomCard() {
  const selecting = customSelect !== null;
  const picked = customSelect || new Set();
  const list = customQuizzes.map((rec) => {
    const id = CUSTOM_PREFIX + rec.id;
    const active = !selecting && activePackage?.id === id;
    const on = picked.has(rec.id);
    return `
        <div class="customRow${selecting ? " selecting" : ""}${on ? " picked" : ""}">
          <button class="packageItem${active ? " active" : ""}" data-pkg="${escapeAttr(id)}" data-rec="${escapeAttr(rec.id)}">
            ${selecting ? `<span class="selBox" aria-hidden="true">${on ? svgIcon("check") : ""}</span>` : ""}
            <span class="pkgTitle">${escapeHtml(rec.title)}</span>
            <span class="pkgMeta">${rec.count} soal \u00B7 ${formatDateShort(rec.savedAt)}</span>
          </button>
          ${selecting ? "" : `<button class="resetBtn customDelBtn" data-del-custom="${escapeAttr(rec.id)}" title="Hapus kuis">${svgIcon("trash")}</button>`}
        </div>`;
  }).join("");
  const allOn = customQuizzes.length > 0 && picked.size === customQuizzes.length;
  const head = selecting
    ? `<div class="customHead customSelBar">
        <span class="catName">${svgIcon("select")} ${picked.size}</span>
        <button class="atBulkBtn" id="customSelAllBtn">${allOn ? "Unselect" : "Select all"}</button>
        <button class="atBulkBtn" id="customSelDelBtn" title="Hapus terpilih" aria-label="Hapus terpilih" ${picked.size ? "" : "disabled"}>${svgIcon("trash")}</button>
      </div>`
    : `<div class="customHead">
        <span class="catName">Custom Quiz (${customQuizzes.length})</span>
        ${customQuizzes.length > 1 ? `<span class="catMeta" title="Tekan lama untuk pilih banyak" aria-label="Tekan lama untuk pilih banyak">${svgIcon("select")}</span>` : ""}
      </div>`;
  return `
    <div class="categoryGroup">
      ${head}
      <input type="file" id="docxInput" accept=".docx,.pdf" multiple hidden>
      ${list}
      <label class="dropZone" for="docxInput" title="Drag and drop atau klik" aria-label="Drag and drop atau klik">
        <span class="dropIcon">${svgIcon("document")}</span>
        <span class="dropFormats"><code>.docx</code><code>.pdf</code></span>
      </label>
      <a class="templateLink" href="https://drive.google.com/drive/folders/1WSxodjrD3jGzQKj0DBROVTUo7I5iBAun?usp=sharing" target="_blank" rel="noopener" title="Download template" aria-label="Download template">${svgIcon("download")}</a>
      ${dropMsg ? `<div class="dropMsg">${markedMsgHtml(dropMsg)}</div>` : ""}
    </div>`;
}

function startCustomSelect(recId) {
  if (!customSelect) customSelect = new Set();
  customSelect.add(recId);
  render();
}

function toggleCustomPick(recId) {
  if (customSelect.has(recId)) customSelect.delete(recId);
  else customSelect.add(recId);
  render();
}

async function deleteSelectedCustoms() {
  const ids = [...customSelect];
  if (!ids.length || !confirm(`Hapus ${ids.length} kuis custom?\nProgresnya ikut hilang.`)) return;
  customSelect = null;
  await deleteCustoms(ids);
}

// Tekan tahan kuis custom memakai SATU timer global, dibatalkan di pointerup/pointercancel
// mana pun. Sengaja tidak per-tombol: DOM baris bisa dibangun ulang di tengah tekanan.
// Klik sisa dari tekan tahan diabaikan; flag di-reset tiap sentuhan baru.
let customPressTimer = 0;
const cancelCustomPress = () => clearTimeout(customPressTimer);
addEventListener("pointerdown", () => { customSuppressClick = false; cancelCustomPress(); }, true);
addEventListener("pointerup", cancelCustomPress, true);
addEventListener("pointercancel", cancelCustomPress, true);
// Jari bergeser lebih dari 10px atau layar di-scroll → tekan tahan dibatalkan.
let customPressX = 0, customPressY = 0;
addEventListener("pointerdown", (e) => { customPressX = e.clientX; customPressY = e.clientY; }, true);
addEventListener("pointermove", (e) => {
  if (Math.hypot(e.clientX - customPressX, e.clientY - customPressY) > 10) cancelCustomPress();
}, true);
addEventListener("scroll", cancelCustomPress, true);
// Tap di luar baris kuis custom dan bar pilih → keluar mode pilih banyak.
document.addEventListener("click", (e) => {
  if (customSelect === null) return;
  if (e.target.closest && e.target.closest(".customRow, .customSelBar")) return;
  customSelect = null;
  render();
});

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
        <h1 class="brandH1">Soalin<span class="brandMark">${svgIcon("brand")}</span></h1>
        <p class="pickerSub">${packageManifest.length ? "Belajar? Kau?" : "Upload file .docx untuk dijadikan kuis."}</p>
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
          <span class="catArrow">${isOpen ? svgIcon("chevron-up") : svgIcon("chevron-down")}</span>
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
    html += `<button class="pickerCloseBtn iconBtn" id="pickerCloseBtn" title="Kembali ke paket saat ini" aria-label="Kembali ke paket saat ini">${svgIcon("chevron-left")} <span class="lbl">Kembali ke paket saat ini</span></button>`;
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
      if (customSuppressClick) { customSuppressClick = false; return; }
      if (customSelect !== null) { if (btn.dataset.rec) toggleCustomPick(btn.dataset.rec); return; }
      const pkg = isCustomId(btn.dataset.pkg) ? customPkg(customRec(btn.dataset.pkg.slice(CUSTOM_PREFIX.length))) : packageManifest.find((p) => p.id === btn.dataset.pkg);
      if (!pkg) return;
      const proceed = async () => {
        customSelect = null;
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
  if (closeBtn) closeBtn.addEventListener("click", () => { customSelect = null; pickerOpen = false; render(); });
  attachAnswertoneHandlers();

  const docxInput = document.getElementById("docxInput");
  docxInput.addEventListener("change", (e) => handleDocx(e.target.files));
  app.querySelectorAll("[data-del-custom]").forEach((btn) => btn.addEventListener("click", () => deleteCustom(btn.dataset.delCustom)));
  // Tekan tahan (±500 ms) baris kuis custom → mode pilih banyak, kuis itu langsung terpilih.
  app.querySelectorAll(".customRow .packageItem[data-rec]").forEach((btn) => {
    btn.addEventListener("pointerdown", () => {
      customPressTimer = setTimeout(() => { customSuppressClick = true; startCustomSelect(btn.dataset.rec); }, 500);
    });
    btn.addEventListener("pointerleave", cancelCustomPress);
    btn.addEventListener("contextmenu", (e) => e.preventDefault()); // menu konteks Android saat tekan lama
  });
  const selAllBtn = document.getElementById("customSelAllBtn");
  if (selAllBtn) selAllBtn.addEventListener("click", () => {
    customSelect = customSelect.size === customQuizzes.length ? new Set() : new Set(customQuizzes.map((r) => r.id));
    render();
  });
  const selDelBtn = document.getElementById("customSelDelBtn");
  if (selDelBtn) selDelBtn.addEventListener("click", deleteSelectedCustoms);

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
