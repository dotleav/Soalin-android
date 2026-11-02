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
// Suara bawaan: taruh file di audio/benar/ dan audio/salah/, lalu jalankan
//     npm run audio-manifest
// untuk membuat audio/manifest.js. Daftar suara, centang, dan kapan suara
// keluar (benar / salah / keduanya) ada di js/answertone.js.
// Kalau manifest.js tidak ada, suara bawaan tidak bunyi, halaman tetap jalan.
(function loadAudioManifest() {
  try {
    const s = document.createElement("script");
    s.src = "./audio/manifest.js";
    s.onload = () => answertoneBuildBuiltin(window.AUDIO_MANIFEST || {});
    s.onerror = () => {
      console.warn("[audio] audio/manifest.js tidak ditemukan — suara bawaan tidak akan bunyi. Jalankan 'npm run audio-manifest'.");
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

// Audio yang lagi/baru saja diputar — dipakai buat berhentiin paksa pas mute ditekan.
let currentAudio = null;
