// ── Zoom gambar opsi (🔍): gambar tampil besar di layar penuh, latar gelap. ──
// Tutup: tombol ✕, ketuk area di luar gambar, atau tombol Esc.
// Listener di fase capture supaya ketuk 🔍 tidak ikut memilih opsi.
(function () {
  let layer = null;

  function onKey(e) {
    if (e.key === "Escape") closeZoom();
  }

  function closeZoom() {
    if (!layer) return;
    layer.remove();
    layer = null;
    document.body.classList.remove("imgZoomOpen");
    document.removeEventListener("keydown", onKey, true);
  }

  function openZoom(src) {
    closeZoom();
    layer = document.createElement("div");
    layer.className = "imgZoom";
    layer.innerHTML = '<button type="button" class="imgZoomClose" aria-label="Tutup">\u2715</button>';
    const img = document.createElement("img");
    img.className = "imgZoomImg";
    img.alt = "gambar opsi";
    img.src = src;
    layer.appendChild(img);
    layer.addEventListener("click", (e) => {
      if (e.target === layer || e.target.classList.contains("imgZoomClose")) closeZoom();
    });
    document.body.appendChild(layer);
    document.body.classList.add("imgZoomOpen");
    document.addEventListener("keydown", onKey, true);
  }

  document.addEventListener("click", (e) => {
    const z = e.target.closest && e.target.closest(".optZoom");
    if (!z) return;
    e.preventDefault();
    e.stopPropagation(); // jangan ikut memilih opsi
    openZoom(z.dataset.zoomSrc);
  }, true);
})();
