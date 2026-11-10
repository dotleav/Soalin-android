// ── Ikon custom (SVG garis, grid 24×24). Dipakai di seluruh UI menggantikan emoji. ──
// Pakai: ${svgIcon("check")}. Warna mengikuti currentColor.
const ICON_PATHS = {
  play: '<path d="M8 5.5v13l10.5-6.5z" fill="currentColor" stroke="none"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  check: '<path d="M4.5 12.5l4.5 4.5L19.5 7.5"/>',
  warning: '<path d="M12 3.8 21.2 19.5H2.8z"/><path d="M12 9.5v4.5M12 16.6v.1"/>',
  "chevron-up": '<path d="M6 14.5l6-6 6 6"/>',
  "chevron-down": '<path d="M6 9.5l6 6 6-6"/>',
  "chevron-left": '<path d="M14.5 6l-6 6 6 6"/>',
  "chevron-right": '<path d="M9.5 6l6 6-6 6"/>',
  award: '<circle cx="12" cy="9" r="5.5"/><path d="M8.5 13.5 7 21l5-2.6 5 2.6-1.5-7.5"/>',
  pen: '<path d="M4 20l1-4.2L15.6 5.2a2.1 2.1 0 0 1 3 3L8 18.8z"/><path d="M13.8 7l3.2 3.2"/>',
  key: '<circle cx="8" cy="12" r="3.5"/><path d="M11.5 12H20M17 12v3.2M14 12v2.4"/>',
  skip: '<path d="M5 6.5 12.5 12 5 17.5z"/><path d="M19 6v12"/>',
  trash: '<path d="M4.5 7h15M9.5 7V4.8h5V7M6.5 7l.9 12.2h9.2L17.5 7"/>',
  list: '<path d="M9.5 6.5H20M9.5 12H20M9.5 17.5H20"/><circle cx="5" cy="6.5" r=".8"/><circle cx="5" cy="12" r=".8"/><circle cx="5" cy="17.5" r=".8"/>',
  speaker: '<path d="M4.5 9.5h3.2L12.5 5.5v13l-4.8-4H4.5z"/><path d="M15.8 9a4.2 4.2 0 0 1 0 6M18.6 6.5a7.8 7.8 0 0 1 0 11"/>',
  "speaker-off": '<path d="M4.5 9.5h3.2L12.5 5.5v13l-4.8-4H4.5z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>',
  folder: '<path d="M3.5 7A1.5 1.5 0 0 1 5 5.5h4.2l2 2H19A1.5 1.5 0 0 1 20.5 9v8.5A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5z"/>',
  shuffle: '<path d="M4 7h3.2c4.2 0 4.2 10 8.4 10H20M4 17h3.2c1.2 0 2.3-.6 3-1.7M13.4 8.7C14.1 7.6 15.2 7 16.4 7H20"/><path d="M17.8 4.6 20 7l-2.2 2.4M17.8 14.6 20 17l-2.2 2.4"/>',
  gamepad: '<rect x="3" y="7.5" width="18" height="10" rx="3"/><path d="M7.5 12h3M9 10.5v3M15.5 11.3h.1M17.6 13.4h.1"/>',
  reset: '<path d="M5 12a7 7 0 1 0 2.1-5"/><path d="M5 4.5V8.5h4"/>',
  return: '<path d="M9.5 14.5 4.5 9.5l5-5"/><path d="M4.5 9.5h10a5.5 5.5 0 0 1 0 11H11"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 3.5v2.3M12 18.2v2.3M3.5 12h2.3M18.2 12h2.3M6 6l1.6 1.6M16.4 16.4 18 18M6 18l1.6-1.6M16.4 7.6 18 6"/>',
  document: '<path d="M6.5 3.5h7.2l4.3 4.3V20.5H6.5z"/><path d="M9.5 12h5.5M9.5 15.5h5.5M9.5 8.5h2.5"/>',
  music: '<path d="M9.5 17.5V5.5l10-2v12"/><circle cx="6.8" cy="17.5" r="2.5"/><circle cx="16.8" cy="15.5" r="2.5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5 7.2 7.2M16.8 16.8l1.7 1.7M5.5 18.5 7.2 16.8M16.8 7.2l1.7-1.7"/>',
  moon: '<path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z"/>',
  paw: '<circle cx="6.8" cy="10.2" r="1.8"/><circle cx="10.3" cy="6.4" r="1.8"/><circle cx="14" cy="6.4" r="1.8"/><circle cx="17.5" cy="10.2" r="1.8"/><path d="M12 12.4c-2.9 0-5.3 2.8-5.3 5.2 0 1.6 1.1 2.5 2.5 2.5 1 0 1.7-.6 2.8-.6s1.8.6 2.8.6c1.4 0 2.5-.9 2.5-2.5 0-2.4-2.4-5.2-5.3-5.2z"/>',
  leaf: '<path d="M5 19C5 10.5 9.8 5.5 19 5c0 8.6-5 14-14 14z"/><path d="M5 19l8-8"/>',
  timer: '<circle cx="12" cy="13.5" r="7.2"/><path d="M12 13.5V10M9.5 3.5h5"/>',
  hourglass: '<path d="M7 3.5h10M7 20.5h10M8 3.5c0 4.6 8 4.6 8 9s-8 4.4-8 9M16 3.5c0 4.6-8 4.6-8 9s8 4.4 8 9"/>',
  bulb: '<path d="M9 17.5h6M10 20.5h4M12 3.8a5.7 5.7 0 0 0-3.6 10.1c.6.5 1 1.2 1 2V16.5h5.2v-.6c0-.8.4-1.5 1-2A5.7 5.7 0 0 0 12 3.8z"/>',
  crown: '<path d="M4 8.5 8.2 12.5 12 6.5l3.8 6 4.2-4-1.8 10.5H5.8z"/>',
  heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  star: '<path d="M12 4.2l2.3 4.8 5.2.7-3.8 3.6.9 5.2L12 16l-4.6 2.5.9-5.2-3.8-3.6 5.2-.7z"/>',
  sparkle: '<path d="M12 3c.6 4.4 2.6 6.4 7 7-4.4.6-6.4 2.6-7 7-.6-4.4-2.6-6.4-7-7 4.4-.6 6.4-2.6 7-7z"/>',
  sword: '<path d="M14.5 4.5h5v5L10 19l-4-4z"/><path d="M4.5 19.5 8 16M12 12l-2 2"/>',
  brand: '<path d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v7a2.5 2.5 0 0 1-2.5 2.5H11l-4.5 4v-4h-1A2.5 2.5 0 0 1 3 13.5v-7z"/><path d="M9.6 9.3a2.4 2.4 0 1 1 3.4 2.2c-.6.3-1 .8-1 1.5M12 14.6v.1"/>',
  eye: '<path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6S2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.6"/>',
};
function svgIcon(name) {
  const d = ICON_PATHS[name];
  if (!d) return "";
  return `<svg class="ico" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" style="vertical-align:-0.15em;flex:none">${d}</svg>`;
}
// Pesan status (dropMsg) ditulis sebagai teks dengan penanda [ok] [err] [warn] [wait] [del].
const MSG_ICON = { ok: "check", err: "close", warn: "warning", wait: "hourglass", del: "trash" };
function markedMsgHtml(s) {
  return escapeHtml(s).replace(/\[(ok|err|warn|wait|del)\] ?/g, (_, k) => svgIcon(MSG_ICON[k]) + " ");
}
