// ── LocalStorage — Mode Latihan (persist across refresh & tab close) ──────
// Progres disimpan per-paket (namespaced by activePackage.id) supaya jawaban
// di satu paket soal tidak tercampur dengan paket lain.
function currentLsKey() {
  return activePackage ? `${LS_KEY_PREFIX}__${activePackage.id}` : LS_KEY_PREFIX;
}
function loadBiasa() {
  try {
    const raw = localStorage.getItem(currentLsKey());
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && "answersMap" in parsed) return parsed;
    return null;
  } catch { return null; }
}
function saveBiasa() {
  try {
    localStorage.setItem(currentLsKey(), JSON.stringify({
      shuffleOn: biasaShuffleOn,
      answersMap: biasaAnswersMap,
    }));
  } catch { /* quota exceeded — abaikan diam-diam */ }
}
function clearBiasa() {
  try { localStorage.removeItem(currentLsKey()); } catch { /* noop */ }
}

// ── State: paket soal / kategori ──────────────────────────────────────────
let packageManifest = []; // diisi dari bank online (remote-bank.js)
let activePackage = null; // entry paket yang lagi dipakai, atau null
let pickerOpen = false; // true = layar pilih kategori/paket sedang ditampilkan
let themeMenuOpen = false; // true = pilihan "Mode UI" (Terang/Gelap/Persona 5) lagi kebuka
let expandedCategories = new Set();

// ── State: Custom Quiz — banyak kuis, diingat di IndexedDB (docx/pdf dikonversi di browser) ──
const CUSTOM_PREFIX = "custom:"; // id paket custom = CUSTOM_PREFIX + id kuis
let customQuizzes = []; // [{ id, title, questions, blobs, savedAt, key }] — semua kuis custom tersimpan
let customUrls = []; // object URL gambar kuis custom (di-revoke saat ganti/hapus)
let dropMsg = ""; // pesan status konversi/hapus di kartu Custom Quiz

// ── State ──────────────────────────────────────────────────────────────────
let quizMode = "biasa"; // "biasa" | "tentamen"
let headerHidden = false;

// Mode Latihan (biasa) — dipersist ke localStorage
let biasaLoaded = false;
let biasaShuffleOn = false;
let biasaAnswersMap = {}; // id soal -> huruf jawaban
let biasaVisibleCount = LOAD_BATCH;
let shuffleOrderCache = {}; // cache urutan acak, biar stabil selama sesi

// Mode Tentamen — ephemeral, tidak disimpan
let tentamenState = "setup"; // "setup" | "running" | "finished"
let tentamenShuffleOn = false;
let tentamenDifficulty = "normal";
let tentamenQuestions = [];
let tentamenAnswers = []; // array sejajar index: huruf | "skipped" | null
let currentIdx = 0;
let timeLeft = 0;
let qPhase = "answering"; // "answering" | "answered_manual" | "answered_timeout"
let tentamenTimerHandle = null;
let tentamenAdvanceHandle = null;
// Nge-track kombinasi state+soal yang terakhir kali di-render "baru pertama
// kali", supaya animasi quiz-fade-in cuma main sekali pas soal itu pertama
// muncul — BUKAN tiap kali render() dipanggil ulang gara-gara jawaban
// diklik. Ini akar dari "blink" tiap jawab: seluruh kartu soal fade-in
// ulang padahal soalnya sama, cuma status jawabannya yang berubah.
let tentamenFadeKey = null;

// ── Paket soal / kategori: manifest, load, switch ─────────────────────────
async function loadManifest() {
  // Satu-satunya sumber paket: bank online (repo soalin-bank). Data lokal repo ini tidak dipakai.
  let remote = [];
  try {
    remote = (await loadRemoteIndex()).map((p) => ({ ...p, remote: true }));
  } catch { /* offline & belum ada cache */ }
  packageManifest = remote;
}

// Reset semua state kuis (Latihan & Tentamen) saat ganti paket soal.
function resetQuizStateForNewPackage() {
  quizMode = "biasa";
  tentamenState = "setup";
  tentamenQuestions = [];
  tentamenAnswers = [];
  shuffleOrderCache = {};
  brokenRevealed.clear();
  brokenIdx = 0;
  stopTentamenTimerLoop();
}

async function selectPackage(pkg) {
  try {
    const mod = pkg.custom
      ? { questions: prepareCustomQs(customRec(pkg.recId)) }
      : pkg.remote
        ? { questions: await loadRemoteQuestions(pkg) }
        : { questions: [] };
    allQuestions = Array.isArray(mod.questions) ? mod.questions : [];
  } catch {
    allQuestions = [];
  }
  activePackage = pkg;
  try { localStorage.setItem(ACTIVE_PKG_KEY, pkg.id); } catch { /* noop */ }
  resetQuizStateForNewPackage();
  initBiasa();
}

// ── Custom Quiz: 1 kuis dari .docx, diingat di IndexedDB ─────────────────
// Kuis TIDAK ditulis ke file/server. Satu slot di IndexedDB browser (gambar
// sebagai Blob apa adanya) — tetap ada sampai user ganti/hapus. Kalau
// IndexedDB gagal/diblokir, kuis tetap jalan di sesi ini, cuma tidak diingat.
let dbPromise;
function idb(mode, run) {
  dbPromise ??= new Promise((ok, no) => {
    const req = indexedDB.open("soalin-custom", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("kv");
    req.onsuccess = () => ok(req.result);
    req.onerror = () => no(req.error);
  });
  return dbPromise.then((db) => new Promise((ok, no) => {
    const tx = db.transaction("kv", mode), rq = run(tx.objectStore("kv"));
    tx.oncomplete = () => ok(rq.result);
    tx.onerror = tx.onabort = () => no(tx.error);
  }));
}

const customPkg = (rec) => rec && { id: CUSTOM_PREFIX + rec.id, title: rec.title, category: "Custom Quiz", custom: true, recId: rec.id };
const customRec = (recId) => customQuizzes.find((r) => r.id === recId) || null;
const isCustomId = (id) => typeof id === "string" && id.startsWith(CUSTOM_PREFIX);

function clearCustomProgress(recId) {
  try { localStorage.removeItem(`${LS_KEY_PREFIX}__${CUSTOM_PREFIX}${recId}`); } catch { /* noop */ }
}

// Rekaman IndexedDB → soal siap main (index gambar diganti object URL).
function prepareCustomQs(rec) {
  customUrls.forEach((u) => u && URL.revokeObjectURL(u));
  const urls = rec.blobs.map((b) => b && URL.createObjectURL(b));
  customUrls = urls;
  const pick = (idxs) => idxs.map((i) => urls[i]);
  return rec.questions.map((q) => ({ ...q, questionImages: pick(q.questionImages), explanationImages: pick(q.explanationImages) }));
}

// Muat semua kuis custom dari IndexedDB. Kunci "custom" (format lama, 1 kuis) ikut dibaca.
async function loadCustom() {
  customQuizzes = [];
  try {
    const keys = await idb("readonly", (st) => st.getAllKeys());
    for (const key of keys) {
      if (!(key === "custom" || (typeof key === "string" && key.startsWith("cq:")))) continue;
      const rec = await idb("readonly", (st) => st.get(key));
      if (rec?.questions) customQuizzes.push({ ...rec, id: rec.id || "legacy", key });
    }
    customQuizzes.sort((a, b) => b.savedAt - a.savedAt);
  } catch { /* IndexedDB diblokir → daftar kosong */ }
}

// Pilih/seret satu atau beberapa file → konversi → simpan sebagai kuis baru (tidak menimpa kuis lain).
async function handleDocx(fileList) {
  const files = [...fileList].filter((f) => /\.(docx|pdf)$/i.test(f.name));
  pickerOpen = true; // pesan (proses/gagal) harus kelihatan walau lagi di tengah kuis
  if (!files.length) { dropMsg = "⚠️ Pilih file Word (.docx) atau PDF (.pdf)."; render(); return; }
  const msgs = [];
  let last = null;
  for (const file of files) {
    dropMsg = [...msgs, `⏳ Mengonversi ${file.name}…`].join("\n");
    render();
    try {
      const { questions, blobs, stats } = await convertDocx(await file.arrayBuffer());
      if (!stats.normal && !stats.rusak && !stats.isian) throw new Error("Tidak ada soal terdeteksi. Format: 1. Soal / A. … E. / Kunci: X / {penjelasan}");
      const rec = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), title: file.name.replace(/\.(docx|pdf)$/i, ""), questions, blobs, savedAt: Date.now() };
      let saved = true;
      await idb("readwrite", (st) => st.put(rec, "cq:" + rec.id)).catch(() => { saved = false; });
      customQuizzes.unshift({ ...rec, key: "cq:" + rec.id });
      clearCustomProgress(rec.id);
      last = rec;
      const skipped = stats.skippedExt.length ? ` ⚠️ gambar .${stats.skippedExt.join(", .")} dilewati (browser tidak bisa menampilkan)` : "";
      msgs.push(`✅ ${file.name}: ${stats.normal} soal${stats.rusak ? ` + ${stats.rusak} soal rusak` : ""}${stats.isian ? ` + ${stats.isian} soal isian` : ""}, ${stats.images} gambar${skipped}${saved ? "" : " ⚠️ tidak tersimpan (IndexedDB)"}`);
    } catch (e) {
      msgs.push(`❌ ${file.name}: ${e instanceof ReferenceError ? "Browser terlalu lama (butuh DecompressionStream). Pakai Chrome/Edge/Firefox/Safari terbaru." : e.message}`);
    }
  }
  dropMsg = msgs.join("\n");
  // Satu file yang sukses langsung dimainkan; banyak file → tetap di pemilih paket.
  if (files.length === 1 && last) {
    await selectPackage(customPkg(last));
    pickerOpen = msgs[0].includes("⚠️");
  }
  render();
}

async function deleteCustom(recId) {
  const rec = customRec(recId);
  if (!rec || !confirm(`Hapus kuis custom "${rec.title}"?\nProgresnya ikut hilang.`)) return;
  const wasActive = activePackage?.id === CUSTOM_PREFIX + recId;
  customQuizzes = customQuizzes.filter((r) => r.id !== recId);
  clearCustomProgress(recId);
  await idb("readwrite", (st) => st.delete(rec.key)).catch(() => {});
  if (wasActive) {
    allQuestions = [];
    activePackage = null;
    try { localStorage.removeItem(ACTIVE_PKG_KEY); } catch { /* noop */ }
    resetQuizStateForNewPackage();
  }
  dropMsg = "🗑️ Kuis custom dihapus.";
  pickerOpen = true;
  render();
}

// Seret-lepas di mana saja di halaman (preventDefault supaya browser tidak membuka file-nya).
let dragTimer;
addEventListener("dragover", (e) => {
  e.preventDefault();
  document.body.classList.add("dragging");
  clearTimeout(dragTimer);
  dragTimer = setTimeout(() => document.body.classList.remove("dragging"), 120);
});
addEventListener("drop", (e) => {
  e.preventDefault();
  document.body.classList.remove("dragging");
  if (e.dataTransfer.files.length) handleDocx(e.dataTransfer.files);
});

// ── Init Mode Latihan dari localStorage ──────────────────────────────────
function initBiasa() {
  const saved = loadBiasa();
  // Selalu reset dulu ke default sebelum load — supaya kalau paket baru
  // belum pernah punya progres tersimpan, state paket sebelumnya (yang
  // masih ada di memory) tidak ikut kebawa / "bocor" ke paket baru.
  biasaShuffleOn = false;
  biasaAnswersMap = {};
  if (saved) {
    biasaShuffleOn = !!saved.shuffleOn;
    biasaAnswersMap = saved.answersMap || {};
  }
  biasaVisibleCount = LOAD_BATCH;
  biasaLoaded = true;
}
