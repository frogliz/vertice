"use strict";
// Ícones desenhados em linha (24×24). Tudo local: a política de segurança não permite fontes de ícones externas.
const ICONS = {
  shared: "M4 10.5 12 4l8 6.5V20h-5.5v-5.5h-5V20H4z",
  transactions: "M5 8h13M14.5 4.5 18 8l-3.5 3.5M19 16H6M9.5 12.5 6 16l3.5 3.5",
  categories: "M4.5 4.5h6v6h-6zM13.5 4.5h6v6h-6zM4.5 13.5h6v6h-6zM13.5 13.5h6v6h-6z",
  forecast: "M4 4v16h16M8 15l3.5-4.5 3 2.5L20 7",
  goals: "M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12.01V12",
  wealth: "M12 3.5 20.5 12 12 20.5 3.5 12zM12 8v8M8 12h8",
  appearance:
    "M12 3.5a8.5 8.5 0 1 0 0 17h1.3a1.8 1.8 0 0 0 1.2-3.2 1.4 1.4 0 0 1 .9-2.4H17a3.5 3.5 0 0 0 3.5-3.5c0-4.4-3.8-7.9-8.5-7.9zM7.5 11h.01M10.5 7.5h.01M15 8h.01",
  shifts: "M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v11.5A1.5 1.5 0 0 1 19 20H5a1.5 1.5 0 0 1-1.5-1.5V7A1.5 1.5 0 0 1 5 5.5zM8 3.5v4M16 3.5v4M3.5 10.5h17M8 14.5h.01M12 14.5h.01M16 14.5h.01",
  settings:
    "M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4zM19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 0 0-2-1.2L14.2 3h-4.4l-.4 2.6a7 7 0 0 0-2 1.2l-2.3-.9-2 3.4 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-.9a7 7 0 0 0 2 1.2l.4 2.6h4.4l.4-2.6a7 7 0 0 0 2-1.2l2.3.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z",
  help: "M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17zM9.6 9.4a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.2-2.4 3.7M12 16.6h.01",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  edit: "M4.5 19.5h4l10-10a2.1 2.1 0 0 0-3-3l-10 10zM13.5 7.5l3 3",
  trash: "M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 12.5h9l1-12.5M10.5 10.5v6M13.5 10.5v6",
  eye: "M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  eyeOff:
    "M3.5 3.5l17 17M10.6 5.6c.5-.1.9-.1 1.4-.1 6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.6 3.4M6.6 6.7A16.5 16.5 0 0 0 2.5 12S6 18.5 12 18.5c1.6 0 3-.4 4.3-1.1M9.9 9.9a3 3 0 0 0 4.2 4.2",
  left: "M14.5 5.5 8 12l6.5 6.5",
  right: "M9.5 5.5 16 12l-6.5 6.5",
  down: "M6 9.5 12 15.5l6-6",
  check: "M5 12.5l4.5 4.5L19 7.5",
  close: "M6 6l12 12M18 6 6 18",
  more: "M6 12h.01M12 12h.01M18 12h.01",
  search: "M11 18.5a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15zM16.5 16.5 20.5 20.5",
  download: "M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14",
  upload: "M12 15V4M7.5 8.5 12 4l4.5 4.5M5 19.5h14",
  open: "M9 5h10v10M19 5 6 18",
  split: "M12 3.5v6M12 9.5 6 15v5M12 9.5l6 5.5v5",
  layers: "M12 4 21 9l-9 5-9-5zM3 13.5l9 5 9-5",
  copy: "M8.5 8.5h11v11h-11zM15.5 8.5v-4h-11v11h4",
  sliders: "M5 6.5h8M17 6.5h2M5 12h2M11 12h8M5 17.5h10M19 17.5h0M13 4.5v4M7 10v4M15 15.5v4",
  income: "M17 7 7 17M7 9v8h8",
  expense: "M7 17 17 7M9 7h8v8",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20.5a7.5 7.5 0 0 1 15 0",
  logout: "M14.5 4.5h4a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5h-4M10 16.5 5.5 12 10 7.5M5.5 12H15",
  sync: "M19.5 8.5A8 8 0 0 0 5 7.5M4.5 15.5A8 8 0 0 0 19 16.5M19.5 4v4.5H15M4.5 20v-4.5H9",
  calendar: "M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v11.5A1.5 1.5 0 0 1 19 20H5a1.5 1.5 0 0 1-1.5-1.5V7A1.5 1.5 0 0 1 5 5.5zM8 3.5v4M16 3.5v4M3.5 10.5h17",
  archive: "M4 5h16v4H4zM5.5 9v10h13V9M10 13h4",
  restore: "M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4.5v4h4",
  lock: "M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z",
  menu: "M4 7h16M4 12h16M4 17h16",
};
function icon(name, label = "") {
  const path = ICONS[name] || ICONS.more;
  return `<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" ${label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"'}><path d="${path}"/></svg>`;
}
function navIcon(key) {
  return icon(ICONS[key] ? key : "more");
}
// Marca do Vértice: o vértice de um prisma, com uma face que espalha a luz.
function brandMark(extra = "") {
  return `<svg class="mark ${extra}" viewBox="0 0 48 48" fill="none" aria-hidden="true"><defs><linearGradient id="vx-face" x1="10" y1="40" x2="30" y2="8" gradientUnits="userSpaceOnUse"><stop stop-color="#b9a5ff"/><stop offset=".38" stop-color="#ff9fd6"/><stop offset=".66" stop-color="#ffcf9c"/><stop offset="1" stop-color="#9fd8ff"/></linearGradient></defs><path d="M24 6.5 6.8 39.2a1.2 1.2 0 0 0 1.1 1.8H24z" fill="url(#vx-face)"/><path d="M24 6.5 41.2 39.2a1.2 1.2 0 0 1-1.1 1.8H24z" fill="currentColor" opacity=".14"/><path d="M24 6.5 6.8 39.2a1.2 1.2 0 0 0 1.1 1.8h32.2a1.2 1.2 0 0 0 1.1-1.8L24 6.5zM24 6.5V41" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/></svg>`;
}
