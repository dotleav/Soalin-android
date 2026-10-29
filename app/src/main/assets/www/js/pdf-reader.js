// Baca teks + gambar PDF lewat pdf.js (browser), lalu ubah jadi "dokumen docx" sintetis
// supaya parser soal yang sama (js/convert.js) bisa dipakai.
// Teks: satu <p> per baris. Gambar: <p> berisi <a:blip> yang relasinya menunjuk ke
// word/media/pdf-N.png (PNG dari objek gambar pdf.js).
// Baris yang berada di dalam area highlight diberi penanda HL_MARK di awal.
const PDF_START_RE = /^(\d+[.)]\s|[A-Ea-e][.)]\s|Kunci|Jawaban|Answer|Key|Correct|Penjelasan|Explanation|Gambar\s+Penjelasan|Sumber\s*:|ID\s*:|Kategori|Category|Bagian\s+\d)/i;

// Gambar lebih kecil dari ini dianggap ornamen (bullet, garis, logo kecil) dan dilewati.
const PDF_MIN_IMG_PX = 16;

// Matriks PDF [a b c d e f]: m1 lalu m2 (CTM' = M × CTM).
function pdfMulM(m1, m2) {
  return [
    m1[0] * m2[0] + m1[1] * m2[2], m1[0] * m2[1] + m1[1] * m2[3],
    m1[2] * m2[0] + m1[3] * m2[2], m1[2] * m2[1] + m1[3] * m2[3],
    m1[4] * m2[0] + m1[5] * m2[2] + m2[4], m1[4] * m2[1] + m1[5] * m2[3] + m2[5],
  ];
}

// Kotak [x1,y1,x2,y2] yang sudah dikenai matriks m (hasilnya kotak sumbu-sejajar).
function pdfTransformBox(b, m) {
  const pts = [[b[0], b[1]], [b[2], b[1]], [b[0], b[3]], [b[2], b[3]]].map(([x, y]) => [
    m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5],
  ]);
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

// Scan satu halaman: kotak highlight + gambar yang dipaint (beserta kotaknya).
// Kotak highlight: anotasi "Highlight" + area berwarna. OPS = konstanta pdf.js (lib.OPS).
async function pdfScanPage(page, OPS) {
  const rects = [], images = [];
  try {
    for (const a of await page.getAnnotations()) {
      if (a.subtype === "Highlight" && a.rect) rects.push(a.rect);
    }
  } catch { /* anotasi tidak terbaca → tetap cek warna area */ }
  const ol = await page.getOperatorList();
  let ctm = [1, 0, 0, 1, 0, 0], stack = [], fill = [0, 0, 0], box = null;
  const isColored = ([r, g, b]) => Math.max(r, g, b) - Math.min(r, g, b) > 40;
  for (let i = 0; i < ol.fnArray.length; i++) {
    const f = ol.fnArray[i], a = ol.argsArray[i];
    if (f === OPS.save) stack.push(ctm.slice());
    else if (f === OPS.restore) ctm = stack.pop() || [1, 0, 0, 1, 0, 0];
    else if (f === OPS.transform) ctm = pdfMulM(a, ctm);
    else if (f === OPS.setFillRGBColor) fill = [a[0], a[1], a[2]];
    else if (f === OPS.setFillGray) { const g = a[0] * 255; fill = [g, g, g]; }
    else if (f === OPS.constructPath) box = a[2] ? pdfTransformBox(a[2], ctm) : null;
    else if (f === OPS.fill || f === OPS.eoFill) {
      if (box && isColored(fill) && box[3] - box[1] < 40) rects.push(box);
      box = null;
    } else if (f === OPS.endPath) box = null;
    else if (f === OPS.paintImageXObject || f === OPS.paintInlineImageXObject) {
      // Gambar = unit square yang ditransformasi CTM. a[0] = id objek (string) atau data inline.
      images.push({ obj: a[0], box: pdfTransformBox([0, 0, 1, 1], ctm) });
    }
  }
  return { rects, images };
}

// Objek gambar pdf.js (page.objs) bisa belum ter-load; tunggu sebentar sampai siap.
async function waitPdfObj(store, name) {
  for (let i = 0; i < 150 && !store.has(name); i++) await new Promise((r) => setTimeout(r, 20));
  return store.has(name) ? store.get(name) : null;
}

// Data piksel pdf.js → RGBA. pdf.js bisa memberi RGBA, RGB, gray 8-bit, atau gray 1-bit
// (dipak per baris). Panjang data dipakai untuk menebak formatnya.
function pdfRgba(data, w, h) {
  const px = w * h, src = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  const out = new Uint8ClampedArray(px * 4);
  if (src.length === px * 4) out.set(src);
  else if (src.length === px * 3) {
    for (let i = 0; i < px; i++) {
      out[i * 4] = src[i * 3]; out[i * 4 + 1] = src[i * 3 + 1]; out[i * 4 + 2] = src[i * 3 + 2]; out[i * 4 + 3] = 255;
    }
  } else if (src.length === px) {
    for (let i = 0; i < px; i++) { const v = src[i]; out[i * 4] = out[i * 4 + 1] = out[i * 4 + 2] = v; out[i * 4 + 3] = 255; }
  } else {
    const rowBytes = Math.ceil(w / 8);
    if (src.length < rowBytes * h) return null;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const v = ((src[y * rowBytes + (x >> 3)] >> (7 - (x & 7))) & 1) ? 255 : 0;
        const o = (y * w + x) * 4;
        out[o] = out[o + 1] = out[o + 2] = v; out[o + 3] = 255;
      }
    }
  }
  return out;
}

// Objek gambar → bytes PNG (lewat OffscreenCanvas). null kalau tidak bisa / terlalu kecil.
async function pdfImagePng(page, obj) {
  const img = typeof obj === "string" ? await waitPdfObj(page.objs, obj) : obj;
  if (!img || img.width < PDF_MIN_IMG_PX || img.height < PDF_MIN_IMG_PX) return null;
  const cv = new OffscreenCanvas(img.width, img.height), g = cv.getContext("2d");
  if (img.bitmap) g.drawImage(img.bitmap, 0, 0);
  else if (img.data) {
    const rgba = pdfRgba(img.data, img.width, img.height);
    if (!rgba) return null;
    g.putImageData(new ImageData(rgba, img.width, img.height), 0, 0);
  } else return null;
  const blob = await cv.convertToBlob({ type: "image/png" });
  return new Uint8Array(await blob.arrayBuffer());
}

// items per halaman + kotak highlight + gambar per halaman → blok: {text} atau {img: rId}.
function pdfBlocksFromPages(pages, rectsPerPage, imgsPerPage) {
  const lines = [];
  pages.forEach((items, pi) => {
    const rects = (rectsPerPage && rectsPerPage[pi]) || [];
    const inHi = (x, y) => rects.some(([x1, y1, x2, y2]) => x >= x1 - 1 && x <= x2 + 1 && y >= y1 - 1 && y <= y2 + 1);
    const pts = items
      .filter((it) => it.str && it.str.trim())
      .map((it) => ({
        s: it.str, x: it.transform[4], y: it.transform[5], w: it.width || 0,
        hl: inHi(it.transform[4] + (it.width || 0) / 2, it.transform[5] + (it.height || 8) / 2),
      }))
      .sort((a, b) => b.y - a.y || a.x - b.x);
    const pageLines = [];
    let row = [], rowY = null;
    const flush = () => {
      if (!row.length) return;
      row.sort((a, b) => a.x - b.x);
      let text = "", endX = null;
      for (const p of row) {
        if (endX !== null && p.x - endX > 1.5) text += " ";
        text += p.s;
        endX = p.x + p.w;
      }
      const clean = text.replace(/\s+/g, " ").trim();
      if (clean) pageLines.push({ text: clean, hl: row.some((p) => p.hl), y: rowY });
      row = [];
    };
    for (const p of pts) {
      if (rowY === null || Math.abs(p.y - rowY) > 2) { flush(); rowY = p.y; }
      row.push(p);
    }
    flush();
    const pageImgs = ((imgsPerPage && imgsPerPage[pi]) || []).map((im) => ({ img: im.src, y: im.y }));
    // Yang lebih tinggi di halaman (y besar) datang lebih dulu.
    lines.push(...[...pageLines, ...pageImgs].sort((a, b) => b.y - a.y));
  });
  // Baris yang bukan penanda (nomor soal, opsi, Kunci, Penjelasan, dst.) dianggap lanjutan
  // dari baris sebelumnya. Gambar selalu memutus baris: teks setelah gambar mulai blok baru.
  const out = [];
  for (const l of lines) {
    if (l.img) { out.push({ img: l.img }); continue; }
    const last = out[out.length - 1];
    if (last && !last.img && !PDF_START_RE.test(l.text)) last.text += " " + l.text;
    else out.push({ text: l.text, hl: l.hl });
  }
  return out.map((b) => (b.img ? b : { text: (b.hl ? HL_MARK : "") + b.text }));
}

// Blok → word/document.xml sintetis (format docx yang dipahami parser).
function pdfDocxXml(blocks) {
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const paras = blocks.map((b) => (b.img
    ? `<p><r><a:blip r:embed="${b.img}"/></r></p>`
    : `<p><r><t xml:space="preserve">${esc(b.text)}</t></r></p>`)).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><document xmlns="${PDF_W_NS}" xmlns:a="${PDF_A_NS}" xmlns:r="${PDF_R_NS}"><body>${paras}</body></document>`;
}

// Relasi word/_rels/document.xml.rels untuk gambar: rels = [{id, target}] (target relatif ke word/).
function pdfRelsXml(rels) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${PDF_PKG_NS}">` +
    rels.map((r) => `<Relationship Id="${r.id}" Type="${PDF_R_NS}/image" Target="${r.target}"/>`).join("") +
    `</Relationships>`;
}

// ── Browser: baca PDF lewat pdf.js (dimuat dari CDN saat pertama dipakai) ──
const PDFJS_BASE = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/";
const PDF_W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const PDF_A_NS = "http://schemas.openxmlformats.org/drawingml/2006/main";
const PDF_R_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const PDF_PKG_NS = "http://schemas.openxmlformats.org/package/2006/relationships";
let pdfjsPromise = null;

function isPdfBuffer(buf) {
  const b = new Uint8Array(buf, 0, 4);
  return b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46; // "%PDF"
}

function loadPdfJs() {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  if (!pdfjsPromise) {
    pdfjsPromise = new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = PDFJS_BASE + "pdf.min.js";
      s.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_BASE + "pdf.worker.min.js";
        res(window.pdfjsLib);
      };
      s.onerror = () => { pdfjsPromise = null; rej(new Error("Gagal memuat pdf.js — cek koneksi internet.")); };
      document.head.appendChild(s);
    });
  }
  return pdfjsPromise;
}

// Pengganti openZip() untuk PDF: word/document.xml, relasi, dan media gambar (PNG) dari PDF.
async function pdfDocxReader(buf) {
  const lib = await loadPdfJs();
  const doc = await lib.getDocument({ data: new Uint8Array(buf.slice(0)) }).promise;
  const pages = [], rects = [], imgs = [], media = new Map(), rels = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    pages.push((await page.getTextContent()).items);
    const scan = await pdfScanPage(page, lib.OPS);
    rects.push(scan.rects);
    const pageImgs = [], seen = new Map(); // id objek gambar di halaman ini → rId (tidak ditulis dua kali)
    for (const im of scan.images) {
      const key = typeof im.obj === "string" ? im.obj : null;
      let rid = key && seen.get(key);
      if (!rid) {
        const png = await pdfImagePng(page, im.obj);
        if (!png) continue;
        const n = rels.length + 1;
        rid = `rIdPdf${n}`;
        rels.push({ id: rid, target: `media/pdf-${n}.png` });
        media.set(`word/media/pdf-${n}.png`, png);
        if (key) seen.set(key, rid);
      }
      pageImgs.push({ y: im.box[3], src: rid });
    }
    imgs.push(pageImgs);
  }
  const docBytes = new TextEncoder().encode(pdfDocxXml(pdfBlocksFromPages(pages, rects, imgs)));
  const relsBytes = new TextEncoder().encode(pdfRelsXml(rels));
  return async (name) => {
    if (name === "word/document.xml") return docBytes;
    if (name === "word/_rels/document.xml.rels") return relsBytes;
    return media.get(name) || null;
  };
}
