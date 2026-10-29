// Soal dimuat secara dinamis (lihat "Paket soal" di bawah), bukan di-import
// statis lagi — supaya bisa ganti-ganti paket/kategori tanpa reload halaman.
let allQuestions = [];

// ── Constants ──────────────────────────────────────────────────────────────
const LOAD_BATCH = 15; // jumlah soal yang dimuat sekaligus, biar Mode Latihan gak lag
// v2: dinaikkan supaya progres lama yang mungkin sudah "tercemar" (bocor dari
// bug lintas-paket sebelumnya) tidak ikut ke-load lagi — user mulai bersih.
const LS_KEY_PREFIX = "soalin_biasa_progress_v2";
const ACTIVE_PKG_KEY = "soalin_active_package";
const MUTE_KEY = "soalin_muted";
const THEME_KEY = "soalin_theme"; // "dark" | "light" | "p5"
const VOLUME_KEY = "soalin_volume"; // "0".."1"

const DIFFICULTY_CONFIG = {
  cheetah:  { label: "Cheetah",      emoji: "🐆", timerSeconds: 30,  desc: "am fast boi",                          color: "#f59e0b" },
  normal:   { label: "Orang Normal", emoji: "🧍", timerSeconds: 60,  desc: "dasar normies",                        color: "#58a6ff" },
  folivora: { label: "Folivora",     emoji: "🦥", timerSeconds: 300, desc: "pasti pas ditanya jawabannya \u201Chah?\u201D", color: "#86efac" },
  bekicot:  { label: "Bekicot",      emoji: "🐌", timerSeconds: 0,   desc: "mode biasa aja kalau gitu",            color: "#c084fc" },
  minites:  { label: "minites dr Erda", emoji: "", icon: "./images/difficulty/squidward.png", timerSeconds: 15, desc: "Makan noh 15 detik", color: "#2dd4bf" },
};

// Ikon tingkat kesulitan: pakai gambar kalau ada `icon`, selain itu emoji.
function diffIconHtml(cfg, cls) {
  return cfg.icon
    ? `<img class="${cls}" src="${cfg.icon}" alt="" aria-hidden="true">`
    : cfg.emoji;
}

const app = document.getElementById("app");

// ── Utils ──────────────────────────────────────────────────────────────────
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
function escapeAttr(str) { return escapeHtml(str); }

// ── Audio (benar/salah) ──────────────────────────────────────────────────
// File suara "benar" tinggal ditaruh di folder audio/benar/, dan file
// suara "salah" di audio/salah/ — nama file BEBAS (ga perlu diawali
// "benar"/"salah" atau dinomori urut). Daftar isi tiap folder di-generate
// ke audio/manifest.js lewat:
//     npm run audio-manifest
// (jalankan ulang tiap kali nambah/hapus/rename file di audio/benar/ atau
// audio/salah/). App tinggal baca window.AUDIO_MANIFEST dari file itu.
//
// BUG LAMA yang ini gantiin: penemuan file bernomor (benar1.mp3, dst)
// berhenti begitu ketemu SATU nomor yang bolong (mis. salah3.mp3 ga ada),
// jadi semua file sesudah nomor yang bolong itu (salah4..salah9) ga
// pernah ikut kedeteksi/keputer sama sekali. Manifest yang di-generate
// dari isi folder asli ga punya masalah "bolong nomor" ini.
// Coba load audio/manifest.js secara dinamis (non-blocking) — kalau 404,
// pool tetap kosong dan suara hanya tidak bunyi, halaman tidak crash.
let benarPool = [];
let salahPool = [];
function buildAudioPool(folder, fileNames) {
  return (fileNames || []).map((name) => new Audio(`./audio/${folder}/${name}`));
}
(function loadAudioManifest() {
  try {
    const s = document.createElement("script");
    s.src = "./audio/manifest.js";
    s.onload = () => {
      const m = window.AUDIO_MANIFEST || {};
      benarPool = buildAudioPool("benar", m.benar);
      salahPool = buildAudioPool("salah", m.salah);
      [...benarPool, ...salahPool].forEach((a) => { a.volume = volume; });
    };
    s.onerror = () => {
      console.warn("[audio] audio/manifest.js tidak ditemukan — suara benar/salah tidak akan bunyi. Jalankan 'npm run audio-manifest'.");
    };
    document.head.appendChild(s);
  } catch {
    console.warn("[audio] gagal load audio/manifest.js");
  }
})();

let isMuted = localStorage.getItem(MUTE_KEY) === "true";

// Volume (0..1) — terpisah dari mute on/off, diatur lewat kartu Pengaturan.
let volume = 1;
try {
  const rawVol = parseFloat(localStorage.getItem(VOLUME_KEY));
  if (!Number.isNaN(rawVol)) volume = Math.min(1, Math.max(0, rawVol));
} catch { /* noop */ }
[...benarPool, ...salahPool].forEach((a) => { a.volume = volume; });

// Audio yang lagi/baru saja diputar — dipakai buat berhentiin paksa pas mute ditekan.
let currentAudio = null;

// Index terakhir yang kepilih tiap pool — dipakai biar file yang SAMA ga
// keputer 2x berturut-turut. Murni Math.random() bisa aja ngasih hasil sama
// beberapa kali beruntun (itu wajar, bukan bug), tapi kedengerannya kayak
// "kok gini-gini aja" — jadi di sini kita sengaja larang pengulangan langsung.
let lastBenarIdx = -1;
let lastSalahIdx = -1;

function pickRandomIndex(poolLength, lastIdx) {
  if (poolLength <= 1) return 0;
  let idx;
  do {
    idx = Math.floor(Math.random() * poolLength);
  } while (idx === lastIdx);
  return idx;
}
