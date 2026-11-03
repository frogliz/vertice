"use strict";
const F = Finance,
  $ = (s) => document.querySelector(s);
const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const uid = () =>
  crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const capital = (s) => s.charAt(0).toLocaleUpperCase("pt-BR") + s.slice(1);
// "novembro de 2026" → "Novembro de 2026" (sem o "De" maiúsculo do CSS antigo).
const mlabel = (m) =>
  capital(new Date(m + "-01T12:00:00").toLocaleDateString("pt-BR", { month: "long", year: "numeric" }));
const monthName = (m, style = "long") =>
  capital(new Date(m + "-01T12:00:00").toLocaleDateString("pt-BR", { month: style }).replace(".", ""));
const shortDate = (d) => d.slice(8) + "/" + d.slice(5, 7);
const fullDate = (d) => shortDate(d) + "/" + d.slice(0, 4);
const dayLabel = (d) =>
  capital(
    new Date(d + "T12:00:00")
      .toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" })
      .replace(/\./g, ""),
  );
const pct = (v, t) => (t ? Math.min(100, Math.round((v / t) * 100)) : 0);
const daysBetween = (a, b) => Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / 86400000);
function dueText(date, done, type = "expense") {
  if (done) return type === "income" ? "Recebido" : "Pago";
  const diff = daysBetween(today(), date);
  if (diff < 0) return diff === -1 ? "Venceu ontem" : `Venceu há ${-diff} dias`;
  if (diff === 0) return "Vence hoje";
  if (diff === 1) return "Vence amanhã";
  if (diff <= 7) return `Em ${diff} dias`;
  return "Dia " + Number(date.slice(8));
}
const isLate = (e) => !e.done && e.date < today();
// Valor em HTML. Sempre marcado como privado para o modo "ocultar valores".
function amount(v, cls = "", sign = "") {
  return `<span class="amount ${cls}" data-private>${sign}${esc(F.money(v))}</span>`;
}
// Valor grande: símbolo e centavos menores, número largo. data-count-cents permite a contagem animada.
function bigAmount(v, cls = "") {
  return `<span class="big-amount ${cls}" data-private data-count-cents="${v}">${bigAmountInner(v)}</span>`;
}
function bigAmountInner(v) {
  const parts = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).formatToParts(v / 100);
  let html = "";
  for (const p of parts) {
    if (p.type === "currency") html += `<span class="cur">${esc(p.value)}</span>`;
    else if (p.type === "literal") html += "";
    else if (p.type === "decimal" || p.type === "fraction") html += `<span class="cents">${esc(p.value)}</span>`;
    else if (p.type === "minusSign") html += `<span class="minus">−</span>`;
    else html += esc(p.value);
  }
  return html;
}
// Efeitos da versão completa: só com o vidro completo, movimento ligado e sem pedido de menos movimento.
const fxOn = () => document.documentElement?.dataset?.fx === "on";
function runEntrance(main) {
  if (!fxOn() || typeof main.querySelectorAll !== "function") return;
  main
    .querySelectorAll(".panel, .goal-card, .cat-tile, .year-card, .summary-strip > div, .lens, .person, .month-note, .tx-day")
    .forEach((el, i) => el.style.setProperty("--stagger", Math.min(i, 14)));
  const items = [...main.querySelectorAll("[data-count-cents], [data-count-pct]")].slice(0, 40);
  if (!items.length || typeof requestAnimationFrame !== "function") return;
  const start = performance.now(),
    dur = 1100,
    ease = (t) => 1 - Math.pow(1 - t, 4);
  const step = (now) => {
    const t = Math.min(1, (now - start) / dur),
      k = ease(t);
    for (const el of items)
      if (el.dataset.countCents !== undefined) el.innerHTML = bigAmountInner(Math.round(Number(el.dataset.countCents) * k));
      else el.textContent = Math.round(Number(el.dataset.countPct) * k) + "%";
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
function field(label, name, type, value, full = false, extra = "") {
  return `<label class="field ${full ? "full" : ""}"><span class="field-label">${label}</span><input name="${name}" type="${type}" value="${esc(value ?? "")}" ${extra}></label>`;
}
// Campo de dinheiro em texto: aceita vírgula, ponto e "R$". O valor é convertido por Finance.cents.
function moneyField(label, name, cents, full = false, extra = "") {
  const value = cents === "" || cents === null || cents === undefined ? "" : F.plain(cents);
  return `<label class="field ${full ? "full" : ""}"><span class="field-label">${label}</span><span class="money-input"><i aria-hidden="true">R$</i><input name="${name}" type="text" inputmode="decimal" autocomplete="off" value="${esc(value)}" placeholder="0,00" ${extra}></span></label>`;
}
function selectField(label, name, options, value, full = false, extra = "") {
  return `<label class="field ${full ? "full" : ""}"><span class="field-label">${label}</span><select name="${name}" ${extra}>${options
    .map(([v, l]) => `<option value="${esc(v)}" ${String(value) === String(v) ? "selected" : ""}>${esc(l)}</option>`)
    .join("")}</select></label>`;
}
function checkField(label, name, checked, hint = "") {
  return `<label class="check full"><input type="checkbox" name="${name}" ${checked ? "checked" : ""}><span>${label}${hint ? `<small>${hint}</small>` : ""}</span></label>`;
}
const hint = (text) => `<p class="hint full">${text}</p>`;
const empty = (title, desc, action, label = "Adicionar agora") =>
  `<div class="empty"><strong>${title}</strong><p>${desc}</p>${action ? `<button class="btn" data-action="${action}">${icon("plus")}${label}</button>` : ""}</div>`;
function pageHead(title, text, actions = "") {
  return `<div class="page-head"><div><h2>${title}</h2>${text ? `<p>${text}</p>` : ""}</div>${actions ? `<div class="page-actions">${actions}</div>` : ""}</div>`;
}
function panelHead(title, text = "", actions = "") {
  return `<div class="panel-head"><div><h3>${title}</h3>${text ? `<p>${text}</p>` : ""}</div>${actions ? `<div class="panel-actions">${actions}</div>` : ""}</div>`;
}
const btn = (action, label, opts = {}) =>
  `<button type="button" class="btn ${opts.cls || ""}" data-action="${action}" ${opts.id !== undefined ? `data-id="${esc(opts.id)}"` : ""} ${opts.attrs || ""}>${opts.icon ? icon(opts.icon) : ""}${label}</button>`;
const iconBtn = (action, name, label, id, cls = "") =>
  `<button type="button" class="icon-btn ${cls}" data-action="${action}" ${id !== undefined ? `data-id="${esc(id)}"` : ""} title="${esc(label)}" aria-label="${esc(label)}">${icon(name)}</button>`;
const progress = (value, color = "") =>
  `<div class="progress" role="presentation"><span style="width:${Math.max(0, Math.min(100, value))}%;${color ? "background:" + color : ""}"></span></div>`;
