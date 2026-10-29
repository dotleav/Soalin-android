// ── P5 sword stab: diagonal, nancep tepat di tombol jawaban, fade out di tempat ──
function playSwordStab(swordEl, targetBtn) {
  // Hentikan animasi yang lagi jalan (kalau ada) SEBELUM mulai yang baru —
  // ini kunci fix "kadang cuma muncul sekali": dulu pakai banyak setTimeout
  // yang numpuk & saling motong; element.animate() + cancel() gak punya
  // masalah itu karena tiap panggilan selalu instance animasi baru & bersih.
  if (swordEl._swordAnim) {
    try { swordEl._swordAnim.cancel(); } catch (e) {}
    swordEl._swordAnim = null;
  }

  // Titik target: tengah tombol yang diklik (fallback tengah layar kalau gak ketemu)
  let targetX = window.innerWidth / 2;
  let targetY = window.innerHeight / 2;
  try {
    if (targetBtn) {
      const rect = targetBtn.getBoundingClientRect();
      targetX = rect.left + rect.width * 0.62;
      targetY = rect.top + rect.height / 2;
    }
  } catch (e) {}

  // Arah tusukan: selalu dari kanan-atas ke bawah-kiri (diagonal), dengan
  // sedikit variasi acak tiap kali biar gak identik-identik amat.
  const jitter = (Math.random() - 0.5) * 18; // -9..+9 deg variasi arah
  const travelDeg = 135 + jitter; // 135deg = arah kanan-atas -> kiri-bawah (sistem sumbu y ke bawah)
  const dist = Math.max(420, window.innerWidth * 0.5);
  const rad = (travelDeg * Math.PI) / 180;
  const startOffsetX = -Math.cos(rad) * dist; // titik AWAL relatif ke target
  const startOffsetY = -Math.sin(rad) * dist;

  // Gambar sword.png: ujung mata pedang menghadap ke BAWAH (90deg di sistem
  // layar). Supaya ujungnya yang mimpin arah gerak (bukan gagangnya),
  // rotasi elemen = arah tempuh - 90deg.
  const rotateDeg = travelDeg - 90;

  // Elemen di-anchor lewat left/top di titik UJUNG mata pedang (bukan pojok
  // kotak gambar), match dengan transform-origin: 52% 99% di CSS + height:130px
  // tetap di markup. Karena rotate/scale muter di titik itu (transform-origin)
  // dan translate() selalu jalan di ruang layar (di luar rotate/scale), ujung
  // pedang bakal selalu pas nancep di targetX/targetY di ujung animasi,
  // berapa pun sudut rotasinya.
  const SWORD_TIP_OFFSET_X = 38.4; // 52% dari lebar render (height:150px, rasio asli 136:276)
  const SWORD_TIP_OFFSET_Y = 148.5; // 99% dari tinggi render (150px)
  swordEl.style.left = (targetX - SWORD_TIP_OFFSET_X) + "px";
  swordEl.style.top = (targetY - SWORD_TIP_OFFSET_Y) + "px";

  const scaleImpact = 1.1;
  const TOTAL_DURATION = 1650; // ms — sebelumnya 900ms, kerasa sekilas doang
  // Revisi timing (fix laporan "fade in & fade out kecepetan"):
  // PENTING — akar masalah sebenarnya bukan cuma di offset keyframe, tapi di
  // easing GLOBAL yang lama: "cubic-bezier(0.16, 0.9, 0.2, 1)" dipasang di
  // level animate() (bukan per-keyframe). Itu artinya SELURUH timeline
  // (bukan cuma transform-nya) ikut dibengkokkan kurva itu — dan kurva itu
  // "ngebut" ke ~90% progress cuma dalam ~16% durasi lalu landai. Akibatnya
  // walau offset 0.34→0.74 didesain buat "diem lama", posisi efektifnya di
  // waktu asli ke-geser jauh ke depan (hampir seketika), jadi yang kelihatan
  // di layar cuma: numongol sekilas → langsung mulai pudar. Fix-nya: easing
  // top-level di-set "linear" (waktu asli = offset apa adanya), dan variasi
  // percepatan/perlambatan gerak sekarang ditaruh PER-KEYFRAME (easing di tiap
  // titik cuma ngaruh ke interpolasi menuju keyframe berikutnya, gak
  // ngebengkokin keseluruhan timeline). Hasilnya offset 0.34–0.74 beneran
  // holdnya di rentang waktu asli ~560ms–1220ms, bukan kepotong duluan.
  const keyframes = [
    { opacity: 0, transform: `translate(${startOffsetX}px, ${startOffsetY}px) rotate(${rotateDeg}deg) scale(0.5)`, offset: 0, easing: "cubic-bezier(0.3, 0, 0.6, 1)" },
    { opacity: 0.55, transform: `translate(${startOffsetX * 0.62}px, ${startOffsetY * 0.62}px) rotate(${rotateDeg}deg) scale(0.7)`, offset: 0.1, easing: "ease-out" },
    { opacity: 1, transform: `translate(${startOffsetX * 0.22}px, ${startOffsetY * 0.22}px) rotate(${rotateDeg}deg) scale(0.85)`, offset: 0.18, easing: "ease-out" },
    { opacity: 1, transform: `translate(0px, 0px) rotate(${rotateDeg}deg) scale(${scaleImpact})`, offset: 0.34, easing: "ease-out" },
    { opacity: 1, transform: `translate(0px, 0px) rotate(${rotateDeg}deg) scale(1)`, offset: 0.42, easing: "linear" },
    { opacity: 1, transform: `translate(0px, 0px) rotate(${rotateDeg}deg) scale(1)`, offset: 0.74, easing: "ease-in" },
    { opacity: 0, transform: `translate(0px, 0px) rotate(${rotateDeg}deg) scale(1)`, offset: 1 }
  ];
  try {
    swordEl._swordAnim = swordEl.animate(keyframes, {
      duration: TOTAL_DURATION,
      easing: "linear", // waktu beneran linear, biar offset di atas gak kebengkok lagi
      fill: "forwards",
    });
    swordEl._swordAnim.onfinish = () => { swordEl._swordAnim = null; };
  } catch (e) { /* browser lama tanpa Web Animations API — diam aja, gak fatal */ }

  // ── Impact flash: nyala sekilas pas ujung pedang nyampe (offset 0.34) ──
  playSwordFlash(targetX, targetY, TOTAL_DURATION * 0.34);
}

// Ledakan cahaya kecil pas titik impact, biar momen "nancep"-nya kerasa
// jelas walau pedangnya sendiri banyak area hitam pekat.
function playSwordFlash(x, y, delayMs) {
  const flashEl = document.getElementById("p5SwordFlash");
  if (!flashEl) return;
  if (flashEl._flashAnim) {
    try { flashEl._flashAnim.cancel(); } catch (e) {}
    flashEl._flashAnim = null;
  }
  flashEl.style.left = x + "px";
  flashEl.style.top = y + "px";
  const flashKeyframes = [
    { opacity: 0, transform: "scale(0.2)", offset: 0 },
    { opacity: 1, transform: "scale(1.3)", offset: 0.25 },
    { opacity: 0.85, transform: "scale(1.1)", offset: 0.4 },
    { opacity: 0, transform: "scale(1.4)", offset: 1 }
  ];
  try {
    flashEl._flashAnim = flashEl.animate(flashKeyframes, {
      duration: 500,
      delay: Math.max(0, delayMs),
      easing: "ease-out",
      fill: "forwards",
    });
    flashEl._flashAnim.onfinish = () => { flashEl._flashAnim = null; };
  } catch (e) { /* noop */ }
}

function playSound(correct) {
  if (!isMuted) {
    const pool = correct ? benarPool : salahPool;
    const lastIdx = correct ? lastBenarIdx : lastSalahIdx;
    const idx = pickRandomIndex(pool.length, lastIdx);
    if (correct) lastBenarIdx = idx; else lastSalahIdx = idx;
    const chosen = pool[idx];
    try {
      chosen.pause(); chosen.currentTime = 0;
      currentAudio = chosen;
      chosen.play().catch(() => {});
    } catch { /* noop */ }
  }
  // ── SxF Mode: character reaction ──
  if (theme === "sxf") {
    const sxfNotifEl = document.getElementById("sxfNotif");
    if (sxfNotifEl) {
      const SXF_CORRECT_VARIANTS = [
        { img: "./images/theme/sxf/donebanner.png", text: "✦ WAKU WAKU! ⭐", cls: "sxfV-anya" },
        { img: "./images/theme/sxf/donebanner.png", text: "Anya senang! 🌟", cls: "sxfV-anya" },
        { img: "./images/theme/sxf/option-correct.png", text: "Bond setuju! 🐾", cls: "sxfV-bond" },
        { img: "./images/theme/sxf/donebanner.png", text: "Anya bangga! 💪", cls: "sxfV-anya" },
        { img: "./images/theme/sxf/category-catname.png", text: "Becky terkesan! ✨", cls: "sxfV-becky" },
        { img: "./images/theme/sxf/donebanner.png", text: "Hebat! anya tahu! 🎉", cls: "sxfV-anya" },
      ];
      const SXF_WRONG_VARIANTS = [
        { img: "./images/theme/sxf/notif-anya-sad.png", text: "Anya sedih... 😢", cls: "sxfV-anya" },
        { img: "./images/theme/sxf/sectionlabel.png", text: "Yor kecewa... 😤", cls: "sxfV-yor" },
        { img: "./images/theme/sxf/notif-anya-sad.png", text: "Heh? salah ya? 😅", cls: "sxfV-anya" },
        { img: "./images/theme/sxf/sectionlabel.png", text: "Yor tidak setuju! ⚔️", cls: "sxfV-yor" },
        { img: "./images/theme/sxf/notif-anya-sad.png", text: "Anya kaget! 😱", cls: "sxfV-anya" },
        { img: "./images/theme/sxf/option-correct.png", text: "Bond geleng kepala 🐶", cls: "sxfV-bond" },
      ];
      const pool = correct ? SXF_CORRECT_VARIANTS : SXF_WRONG_VARIANTS;
      const lastIdx = sxfNotifEl._lastIdx ?? -1;
      let idx;
      do { idx = Math.floor(Math.random() * pool.length); } while (idx === lastIdx && pool.length > 1);
      sxfNotifEl._lastIdx = idx;
      const v = pool[idx];
      // Update img and text
      const imgEl = sxfNotifEl.querySelector(".sxfNotifAnya");
      const txtEl = sxfNotifEl.querySelector(".sxfNotifText");
      if (imgEl) imgEl.src = v.img;
      if (txtEl) txtEl.textContent = v.text;
      // Clear old variant classes
      sxfNotifEl.classList.remove("sxfV-anya","sxfV-bond","sxfV-yor","sxfV-becky");
      sxfNotifEl.className = "sxfNotif " + (correct ? "sxfCorrect" : "sxfWrong") + " " + v.cls;
      sxfNotifEl.classList.add("show");
      if (sxfNotifEl._hideTimer) clearTimeout(sxfNotifEl._hideTimer);
      sxfNotifEl._hideTimer = setTimeout(() => sxfNotifEl.classList.remove("show"), 2200);
    }
  }
  // ── P5 Mode: sword slash + notification banner ──
  if (theme === "p5") {
    const swordEl = document.getElementById("p5Sword");
    const notifEl = document.getElementById("p5Notif");
    // Sword — nusuk diagonal tepat ke jawaban yang baru diklik.
    // Prioritaskan referensi elemen asli (window.p5LastOptionEl) — cuma
    // fallback ke query by-letter kalau elemen itu udah gak ada di DOM lagi
    // (misal kena rebuild render() duluan sebelum sempet dipakai).
    if (swordEl) {
      const targetBtn = (window.p5LastOptionEl && document.body.contains(window.p5LastOptionEl))
        ? window.p5LastOptionEl
        : document.querySelector('.option[data-letter="' + (window.p5LastLetter || "") + '"]');
      playSwordStab(swordEl, targetBtn);
    }
    // Notification banner — gambar CLEAR/FAILED-nya sendiri udah lengkap
    // (nama & teks baked-in), jadi di sini cuma ganti class buat milih
    // gambar mana yang tampil + munculin, tanpa overlay teks apapun.
    if (notifEl) {
      notifEl.className = "p5Notif" + (correct ? " p5NotifCorrect" : " p5NotifWrong");
      notifEl.classList.add("show");
      if (notifEl._hideTimer) clearTimeout(notifEl._hideTimer);
      notifEl._hideTimer = setTimeout(() => notifEl.classList.remove("show"), 2200);
    }
  }
}
function toggleMute() {
  isMuted = !isMuted;
  localStorage.setItem(MUTE_KEY, String(isMuted));
  if (isMuted) {
    // Berhenti LANGSUNG, bukan nunggu suara yang lagi jalan selesai duluan.
    try { currentAudio?.pause(); if (currentAudio) currentAudio.currentTime = 0; } catch { /* noop */ }
  }
  render();
}
function setVolume(v) {
  volume = Math.min(1, Math.max(0, v));
  [...benarPool, ...salahPool].forEach((a) => { a.volume = volume; });
  try { localStorage.setItem(VOLUME_KEY, String(volume)); } catch { /* noop */ }
}

// ── Tema (dark/light/p5) ──────────────────────────────────────────────────
const THEME_VALUES = ["dark", "light", "p5", "sxf", "doksli", "koceng", "capy"];
let theme = THEME_VALUES.includes(localStorage.getItem(THEME_KEY)) ? localStorage.getItem(THEME_KEY) : "dark";
function setTheme(t) {
  theme = THEME_VALUES.includes(t) ? t : "dark";
  try { localStorage.setItem(THEME_KEY, theme); } catch { /* noop */ }
}
function syncThemeClass() {
  document.body.classList.toggle("light", theme === "light");
  document.body.classList.toggle("p5", theme === "p5");
  document.body.classList.toggle("sxf", theme === "sxf");
  document.body.classList.toggle("doksli", theme === "doksli");
  document.body.classList.toggle("koceng", theme === "koceng");
  document.body.classList.toggle("capy", theme === "capy");
}

// ── P5 Mode: Ransom/cutout letter effect ──────────────────────────────────
// Called after render() in P5 mode. Wraps heading/label text in per-char
// spans. Chars at positions determined by a lightweight hash get the
// red-box invert treatment — looks like cut-out ransom note letters.
// NEVER applied to question text, option text, or image containers.
function p5RansomifyEl(el) {
  if (!el || el.dataset.p5r === "1") return; // already done
  const text = el.textContent;
  if (!text.trim()) return;
  // Deterministic "random" selection: pick ~1 in 3 chars using char code sum
  let out = "";
  let charIdx = 0;
  for (const ch of text) {
    if (ch === " " || ch === "\n") {
      out += '<span class="p5rc p5rc-space"> </span>';
    } else {
      // Use char code + position hash to decide invert — not every Nth, more organic
      const hash = (ch.charCodeAt(0) * 13 + charIdx * 7) % 11;
      const isInv = hash < 3; // ~27% of chars get inverted
      out += isInv
        ? `<span class="p5rc p5rc-inv" aria-hidden="true">${ch}</span>`
        : `<span class="p5rc">${ch}</span>`;
      charIdx++;
    }
  }
  el.innerHTML = out;
  el.dataset.p5r = "1";
}

function p5ApplyRansom() {
  if (theme !== "p5") return;
  // Only target decorative headings — NOT question text or answer options
  const selectors = [
    ".sectionLabel",
    ".catName",
    ".pickerHeader h1",
    ".doneBanner .title",
    ".scoreHero .gradeLabel",
    ".reviewLabel",
    ".pkgSubtitle",
  ];
  selectors.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => {
      el.classList.add("p5-ransom");
      p5RansomifyEl(el);
    });
  });
}
