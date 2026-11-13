// ── Answertone: pilih suara yang boleh keluar saat jawaban terjawab ─────────
// Katalog suara = suara bawaan (audio/benar & audio/salah, dari manifest.js)
// + suara sendiri (diupload user, disimpan lokal di IndexedDB browser).
// Tiap suara punya dua pengaturan, disimpan di localStorage:
//   on      : dicentang (boleh keluar) atau tidak
//   trigger : "benar" | "salah" | "both" — keluar saat jawaban benar, salah, atau keduanya
// Default suara bawaan mengikuti folder asalnya (benar -> "benar", salah -> "salah"),
// jadi perilaku awal sama seperti sebelumnya. Suara sendiri default "both".

const ANSWERTONE_KEY = "soalin_answertone_v1";
const ANSWERTONE_DB = "soalin_answertone";
const ANSWERTONE_MAX_BYTES = 4 * 1024 * 1024;
const ANSWERTONE_TRIGGERS = [
  { value: "benar", label: "Benar" },
  { value: "salah", label: "Salah" },
  { value: "both", label: "Keduanya" },
];

let soundCatalog = [];       // [{ id, name, folder, custom, audio, url? }]
let answertoneSettings = (() => {
  try { return JSON.parse(localStorage.getItem(ANSWERTONE_KEY)) || {}; } catch { return {}; }
})();
let answertoneOpen = false;  // daftar lagi dibuka atau tidak (tidak disimpan)
let answertoneLastId = null; // biar suara yang sama tidak keputer 2x berturut-turut

function answertoneSave() {
  try { localStorage.setItem(ANSWERTONE_KEY, JSON.stringify(answertoneSettings)); } catch { /* noop */ }
}
function answertoneDefault(item) {
  if (item.custom) return { on: true, trigger: "both" };
  return { on: true, trigger: item.folder === "salah" ? "salah" : "benar" };
}
function answertoneGet(item) {
  return { ...answertoneDefault(item), ...(answertoneSettings[item.id] || {}) };
}
function answertoneSet(id, patch) {
  answertoneSettings[id] = { ...(answertoneSettings[id] || {}), ...patch };
  answertoneSave();
}
function answertoneDisplayName(name) {
  return String(name).replace(/\.[^.]+$/, "");
}
function answertoneAttr(str) {
  return String(str ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}
function answertoneMakeAudio(src) {
  const a = new Audio(src);
  a.volume = volume;
  return a;
}
function answertoneRefresh() {
  if (document.getElementById("answertoneCard") && typeof render === "function") render();
}

// Dipanggil dari core.js begitu audio/manifest.js selesai dimuat.
function answertoneBuildBuiltin(manifest) {
  const custom = soundCatalog.filter((s) => s.custom);
  const builtin = [];
  for (const folder of ["benar", "salah"]) {
    for (const file of manifest[folder] || []) {
      builtin.push({
        id: `${folder}/${file}`,
        name: answertoneDisplayName(file),
        folder,
        custom: false,
        audio: answertoneMakeAudio(`./audio/${folder}/${file}`),
      });
    }
  }
  soundCatalog = [...builtin, ...custom];
  answertoneRefresh();
}

// ── Penyimpanan suara sendiri (IndexedDB, database terpisah) ───────────────
function answertoneDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(ANSWERTONE_DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore("sounds", { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
function answertoneTx(mode, op) {
  return answertoneDb().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction("sounds", mode);
    const req = op(tx.objectStore("sounds"));
    tx.oncomplete = () => { db.close(); resolve(req ? req.result : undefined); };
    tx.onerror = () => { db.close(); reject(tx.error); };
    tx.onabort = () => { db.close(); reject(tx.error); };
  }));
}
async function answertoneLoadCustom() {
  let recs = [];
  try {
    recs = (await answertoneTx("readonly", (st) => st.getAll())) || [];
  } catch (err) {
    console.warn("[answertone] gagal baca suara sendiri:", err);
  }
  soundCatalog.filter((s) => s.custom && s.url).forEach((s) => { try { URL.revokeObjectURL(s.url); } catch { /* noop */ } });
  soundCatalog = soundCatalog.filter((s) => !s.custom);
  for (const r of recs) {
    const url = URL.createObjectURL(r.blob);
    soundCatalog.push({ id: r.id, name: r.name, folder: "custom", custom: true, url, audio: answertoneMakeAudio(url) });
  }
  answertoneRefresh();
}
async function answertoneAddFile(file) {
  if (!file) return;
  const isAudio = /^audio\//.test(file.type) || /\.(mp3|wav|ogg|m4a|aac|webm)$/i.test(file.name);
  if (!isAudio) { alert("File harus berupa audio (mp3, wav, ogg, m4a)."); return; }
  if (file.size > ANSWERTONE_MAX_BYTES) { alert("Ukuran file maksimal 4 MB."); return; }
  const id = "custom:" + (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  try {
    await answertoneTx("readwrite", (st) => st.put({ id, name: answertoneDisplayName(file.name), blob: file, addedAt: Date.now() }));
  } catch (err) {
    alert("Gagal menyimpan suara: " + (err && err.message ? err.message : err));
    return;
  }
  answertoneSet(id, { on: true, trigger: "both" });
  await answertoneLoadCustom();
}
async function answertoneDelete(id) {
  const s = soundCatalog.find((x) => x.id === id);
  if (!s || !s.custom) return;
  if (!confirm(`Hapus suara "${s.name}"?`)) return;
  try { await answertoneTx("readwrite", (st) => st.delete(id)); } catch (err) { console.warn("[answertone] gagal hapus:", err); }
  try { s.audio.pause(); } catch { /* noop */ }
  delete answertoneSettings[id];
  answertoneSave();
  await answertoneLoadCustom();
}

// ── Pemutaran: dipanggil dari playSound() di fx.js ────────────────────────
function answertoneCandidates(correct) {
  const want = correct ? "benar" : "salah";
  return soundCatalog.filter((s) => {
    const cfg = answertoneGet(s);
    return cfg.on && (cfg.trigger === "both" || cfg.trigger === want);
  });
}
function answertoneStart(s) {
  try {
    s.audio.pause();
    s.audio.currentTime = 0;
    currentAudio = s.audio;
    s.audio.play().catch(() => {});
  } catch { /* noop */ }
}
function answertonePlay(correct) {
  let list = answertoneCandidates(correct);
  if (!list.length) return;
  if (list.length > 1) list = list.filter((s) => s.id !== answertoneLastId);
  const chosen = list[Math.floor(Math.random() * list.length)];
  answertoneLastId = chosen.id;
  answertoneStart(chosen);
}
function answertonePreview(id) {
  const s = soundCatalog.find((x) => x.id === id);
  if (s) answertoneStart(s);
}

// ── Kartu Answertone (di bawah Pengaturan Volume Suara) ───────────────────
function renderAnswertoneCard() {
  const items = [...soundCatalog].sort((a, b) => a.name.localeCompare(b.name, "id"));
  const onCount = items.filter((s) => answertoneGet(s).on).length;
  const allSelected = items.length > 0 && onCount === items.length;
  const rows = items.map((s) => {
    const cfg = answertoneGet(s);
    const id = answertoneAttr(s.id);
    return `
          <div class="atItem${cfg.on ? "" : " off"}">
            <input type="checkbox" class="atCheck" data-at-on="${id}"${cfg.on ? " checked" : ""} aria-label="Aktifkan ${answertoneAttr(s.name)}">
            <div class="atName">
              <span class="atTitle">${escapeHtml(s.name)}</span>
              <span class="atTag">${s.custom ? "suara sendiri" : "bawaan"}</span>
            </div>
            <select class="atTrigger" data-at-trigger="${id}" aria-label="Keluar saat">
              ${ANSWERTONE_TRIGGERS.map((t) => `<option value="${t.value}"${cfg.trigger === t.value ? " selected" : ""}>${t.label}</option>`).join("")}
            </select>
            <button class="atBtn" data-at-play="${id}" aria-label="Putar contoh ${answertoneAttr(s.name)}">${svgIcon("play")}</button>
            ${s.custom ? `<button class="atBtn atDel" data-at-del="${id}" aria-label="Hapus ${answertoneAttr(s.name)}">${svgIcon("close")}</button>` : ""}
          </div>`;
  }).join("");
  return `
      <div class="atWrap" id="answertoneCard">
        <div class="settingsRow atHead">
          <div class="settingsRowText">
            <span class="settingsRowTitle">${svgIcon("music")} Answertone</span>
          </div>
          <button class="themeModeToggle" id="atToggleBtn" aria-expanded="${answertoneOpen}" aria-label="Buka daftar Answertone">
            <span class="themeModeChevron${answertoneOpen ? " open" : ""}">${svgIcon("chevron-down")}</span>
          </button>
        </div>
        ${answertoneOpen ? `
        <div class="atBody">
          <div class="atBulk">
            <button class="atBulkBtn" data-at-bulk="${allSelected ? "none" : "all"}">${allSelected ? "Unselect all" : "Select all"}</button>
            <button class="atBulkBtn" id="atAddBtn">+ Custom</button>
            <input type="file" id="atFile" accept="audio/*" hidden>
          </div>
          ${items.length ? `<div class="atList">${rows}</div>` : `<div class="atEmpty">Suara belum termuat. Coba buka ulang halaman.</div>`}
        </div>` : ""}
      </div>`;
}
function attachAnswertoneHandlers() {
  const card = document.getElementById("answertoneCard");
  if (!card) return;
  const tog = document.getElementById("atToggleBtn");
  if (tog) tog.addEventListener("click", () => { answertoneOpen = !answertoneOpen; render(); });
  card.querySelectorAll("[data-at-on]").forEach((el) => el.addEventListener("change", () => {
    answertoneSet(el.dataset.atOn, { on: el.checked });
    render();
  }));
  card.querySelectorAll("[data-at-trigger]").forEach((el) => el.addEventListener("change", () => {
    answertoneSet(el.dataset.atTrigger, { trigger: el.value });
  }));
  card.querySelectorAll("[data-at-play]").forEach((el) => el.addEventListener("click", () => answertonePreview(el.dataset.atPlay)));
  card.querySelectorAll("[data-at-del]").forEach((el) => el.addEventListener("click", () => answertoneDelete(el.dataset.atDel)));
  card.querySelectorAll("[data-at-bulk]").forEach((el) => el.addEventListener("click", () => {
    const on = el.dataset.atBulk === "all";
    soundCatalog.forEach((s) => answertoneSet(s.id, { on }));
    render();
  }));
  const addBtn = document.getElementById("atAddBtn");
  const fileInput = document.getElementById("atFile");
  if (addBtn && fileInput) {
    addBtn.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", () => {
      const f = fileInput.files && fileInput.files[0];
      fileInput.value = "";
      answertoneAddFile(f);
    });
  }
}

// Muat suara sendiri begitu halaman dibuka.
answertoneLoadCustom();
