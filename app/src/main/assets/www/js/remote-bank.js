// Bank soal online (repo soalin-bank). Paket diambil lewat fetch lalu di-cache
// di IndexedDB (pakai helper idb() dari state.js). Kalau offline, pakai cache.
const BANK_BASE = "https://raw.githubusercontent.com/dotleav/soalin-bank/main/";
const BANK_TIMEOUT_MS = 8000;
// Tier yang boleh dimuat app ini. Soalin Reguler: ["reguler"]. Entri tanpa field tier dianggap reguler.
const BANK_TIERS = ["reguler"];

async function bankFetchJson(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), BANK_TIMEOUT_MS);
  try {
    const sep = url.includes("?") ? "&" : "?";
    const res = await fetch(url + sep + "_=" + Date.now(), { cache: "no-store", signal: ctrl.signal });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// Ambil dari jaringan, simpan ke cache. Kalau gagal, pakai cache terakhir.
async function bankCached(key, url) {
  try {
    const data = await bankFetchJson(url);
    idb("readwrite", (s) => s.put({ data, at: Date.now() }, key)).catch(() => {});
    return data;
  } catch {
    try {
      const hit = await idb("readonly", (s) => s.get(key));
      return hit ? hit.data : null;
    } catch {
      return null;
    }
  }
}

async function loadRemoteIndex() {
  const idx = await bankCached("bank:index", BANK_BASE + "index.json");
  if (!idx || !Array.isArray(idx.packages)) return [];
  return idx.packages.filter((p) => BANK_TIERS.includes(p.tier || "reguler"));
}

// Gambar di JSON disimpan relatif ("images/packages/...") seperti di app lokal.
// Di sini diubah jadi URL absolut ke bank.
function bankAbsolutizeImages(v) {
  if (typeof v === "string") return v.startsWith("images/") ? BANK_BASE + v : v;
  if (Array.isArray(v)) return v.map(bankAbsolutizeImages);
  if (v && typeof v === "object") {
    const out = {};
    for (const k in v) out[k] = bankAbsolutizeImages(v[k]);
    return out;
  }
  return v;
}

async function loadRemoteQuestions(pkg) {
  const data = await bankCached("bank:pkg:" + pkg.id, BANK_BASE + pkg.file);
  if (!data) throw new Error("Paket belum bisa diunduh dan belum pernah dibuka.");
  return bankAbsolutizeImages(Array.isArray(data.questions) ? data.questions : []);
}
