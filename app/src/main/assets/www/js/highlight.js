const HL_MARK = "{{HL}}";

// Penanda highlight: paragraf/baris yang teksnya di-highlight diawali HL_MARK.
// Parser memakai penanda ini sebagai jawaban benar bila tidak ada baris "Kunci:".
function markHighlightsInXml(xml) {
  return xml.replace(/<w:p(?=[\s>])[\s\S]*?<\/w:p>/g, (para) => {
    const rprs = para.match(/<w:rPr>[\s\S]*?<\/w:rPr>/g) || [];
    const hit = rprs.some((r) => {
      const h = r.match(/<w:highlight w:val="([^"]+)"/);
      if (h) return h[1] !== "none";
      const s = r.match(/<w:shd [^>]*w:fill="([^"]+)"/);
      return !!s && !/^(auto|FFFFFF)$/i.test(s[1]);
    });
    if (!hit) return para;
    const open = para.match(/^<w:p(?:\s[^>]*)?>(?:<w:pPr>[\s\S]*?<\/w:pPr>)?/);
    if (!open) return para;
    return open[0] + `<w:r><w:t xml:space="preserve">${HL_MARK}</w:t></w:r>` + para.slice(open[0].length);
  });
}

// Dipanggil saat satu soal selesai: bila belum ada "Kunci:", pilihan yang di-highlight jadi kunci.
function finishHighlightQuestion(q) {
  if (!q.answer && q.highlight) q.answer = q.highlight;
  delete q.highlight;
  return q;
}
