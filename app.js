"use strict";
const KEY = "vertice-financas-v1";
const blank = () => ({
  version: 1,
  entries: [],
  shifts: [],
  shiftPaid: [],
  holidays: [],
  paid: {},
  goals: [],
  budget: 0,
  debts: [],
  funds: [],
  transfers: [],
  wealth: { monthly: 0, essential: 0, months: 6 },
  monthSettings: {},
  overrides: {},
  categories: CategoryCatalog.migrate({ entries: [] }),
});
let state = blank(),
  storageFailed = false;
try {
  const raw = localStorage.getItem(KEY);
  if (raw) {
    const parsed = JSON.parse(raw);
    if (!F.valid(parsed)) throw Error("Dados inválidos");
    state = upgradeState(parsed);
  }
} catch (e) {
  storageFailed = true;
}
let month = today().slice(0, 7),
  view = "shared",
  query = "",
  filter = "all",
  status = "all",
  holidayMode = false,
  modal = null;
// Ordem do menu. "group" separa os blocos da barra lateral.
const pages = {
  shared: { title: "Início", group: 1 },
  transactions: { title: "Lançamentos", group: 1 },
  forecast: { title: "Relatórios", group: 1 },
  categories: { title: "Categorias", group: 1 },
  goals: { title: "Metas", group: 2 },
  wealth: { title: "Reservas", group: 2 },
  shifts: { title: "Plantões", group: 2, owner: true },
  appearance: { title: "Ateliê visual", group: 3 },
  settings: { title: "Configurações", group: 3 },
  help: { title: "Ajuda", group: 3 },
};
const mobileTabs = ["shared", "transactions", "new", "forecast", "more"];
function toast(msg) {
  const node = $("#toast");
  node.textContent = msg;
  node.classList.add("show");
  node.style.display = "block";
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => {
    node.classList.remove("show");
    node.style.display = "none";
  }, 3800);
}
function save() {
  if (!F.valid(state)) {
    toast("Há dados inválidos nesta alteração. Revise os campos antes de salvar.");
    return false;
  }
  if (typeof Account !== "undefined") {
    try {
      return Account.saveState(state);
    } catch (error) {
      toast("Não foi possível salvar. Exporte um backup e tente novamente.");
      return false;
    }
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    storageFailed = false;
    $("#save-status").textContent = "Salvo neste navegador";
    return true;
  } catch (e) {
    storageFailed = true;
    $("#save-status").textContent = "Não salvo. Exporte um backup";
    toast("Não foi possível salvar. Exporte um backup nas configurações.");
    return false;
  }
}
function freshRecords() {
  const next = blank();
  if (state.appearance) next.appearance = { ...state.appearance };
  return next;
}
function commit(msg) {
  const ok = save();
  render();
  if (!ok) toast("A alteração está na tela, mas não foi salva. Exporte um backup.");
  else if (msg) toast(msg);
}
function greeting() {
  const h = new Date().getHours(),
    name = typeof myName === "function" ? myName().split(" ")[0] : "";
  const hello = h < 5 ? "Boa noite" : h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  return name ? `${hello}, ${name}` : hello;
}
function periodText() {
  const now = today().slice(0, 7);
  return month === now ? "Mês atual" : month < now ? "Histórico" : "Planejamento";
}
function navButton(k, p) {
  return `<button class="${view === k ? "active" : ""}" data-view="${k}" title="${p.title}" ${view === k ? 'aria-current="page"' : ""}><span class="nav-icon">${navIcon(k)}</span><span class="nav-label">${p.title}</span></button>`;
}
function renderNav() {
  const visible = Object.entries(pages).filter(([k, p]) => !p.owner || ownerTools());
  let html = "",
    group = 0;
  for (const [k, p] of visible) {
    if (p.group !== group) {
      if (group) html += '<hr class="nav-sep">';
      group = p.group;
    }
    html += navButton(k, p);
  }
  $("#nav").innerHTML = html;
  const tabbar = $("#tabbar");
  if (tabbar)
    tabbar.innerHTML = mobileTabs
      .map((k) =>
        k === "new"
          ? `<button class="tab-new" data-action="expense" aria-label="Novo lançamento">${icon("plus")}</button>`
          : k === "more"
            ? `<button class="${["shared", "transactions", "forecast"].includes(view) ? "" : "active"}" data-action="more-open" aria-haspopup="dialog">${icon("menu")}<span>Mais</span></button>`
            : `<button class="${view === k ? "active" : ""}" data-view="${k}" aria-label="${pages[k].title}" ${view === k ? 'aria-current="page"' : ""}>${navIcon(k)}<span>${k === "shared" ? "Início" : k === "transactions" ? '<b class="long">Lançamentos</b><b class="short">Extrato</b>' : '<b class="long">Relatórios</b><b class="short">Relatório</b>'}</span></button>`,
      )
      .join("");
  const more = $("#more-list");
  if (more)
    more.innerHTML = visible
      .filter(([k]) => !["shared", "transactions", "forecast"].includes(k))
      .map(([k, p]) => navButton(k, p))
      .join("");
}
function render() {
  F.options.shifts = ownerTools();
  if (typeof Appearance !== "undefined") Appearance.sync(state.appearance);
  if (view === "overview" || !Object.hasOwn(pages, view) || (pages[view].owner && !ownerTools())) view = "shared";
  $("#month").value = month;
  $("#month-label").textContent = mlabel(month);
  $("#title").textContent = view === "shared" ? greeting() : pages[view].title;
  $("#subtitle").textContent = ["appearance", "help"].includes(view) ? "" : periodText();
  document.body.dataset.view = view;
  renderNav();
  const mainHTML = {
    shared: homeView,
    appearance: appearanceView,
    transactions: ledgerView,
    categories: categoriesView,
    shifts,
    forecast: yearView,
    goals,
    settings: () => (typeof Account !== "undefined" ? Account.panel() : "") + settingsView(),
    wealth: wealthView,
    help: helpView,
  }[view]();
  $("#main").innerHTML = mainHTML;
  if (view === "shifts") renderPayPreview();
  syncPrivacyButton();
  if (typeof paintAvatars === "function") paintAvatars();
  animatePage();
  if (typeof Account !== "undefined" && Account.ready) Appearance.welcome?.();
  if (storageFailed) $("#save-status").textContent = "Armazenamento indisponível. Exporte um backup";
}
function animatePage() {
  const key = view + "-" + month;
  if (animatePage.key === key) return;
  animatePage.key = key;
  const main = $("#main");
  main.classList.remove("page-enter");
  void main.offsetWidth;
  main.classList.add("page-enter");
  runEntrance(main);
  // A entrada anima só na troca de tela ou de mês, não a cada clique.
  clearTimeout(animatePage.timer);
  animatePage.timer = setTimeout(() => main.classList.remove("page-enter"), 1900);
}
// Brilho que acompanha o mouse nos cartões (só na versão completa, em telas com mouse).
let spotFrame = 0;
document.addEventListener("pointermove", (e) => {
  if (e.pointerType !== "mouse" || !fxOn() || spotFrame || document.documentElement.dataset.fxLevel === "low") return;
  spotFrame = requestAnimationFrame(() => {
    spotFrame = 0;
    const card = e.target.closest?.(".panel, .goal-card, .cat-tile, .year-card");
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty("--mx", e.clientX - r.left + "px");
    card.style.setProperty("--my", e.clientY - r.top + "px");
  });
});
function syncPrivacyButton() {
  const b = $("#privacy-toggle");
  if (!b) return;
  b.innerHTML = icon(hideAmounts ? "eyeOff" : "eye");
  b.setAttribute("aria-pressed", String(hideAmounts));
  b.setAttribute("aria-label", hideAmounts ? "Mostrar valores" : "Ocultar valores");
  b.title = hideAmounts ? "Mostrar valores" : "Ocultar valores";
}
function categoryChip(name) {
  return `<span class="cat"><i style="background:${esc(categoryColor(name))}"></i>${esc(name)}</span>`;
}
function payButton(e, action) {
  const label = e.done ? (e.type === "income" ? "Recebido" : "Pago") : e.type === "income" ? "Receber" : "Pagar";
  return `<button type="button" class="pay ${e.done ? "is-done" : ""}" data-action="${action}" data-id="${esc(e.id)}" aria-pressed="${e.done}" title="${e.done ? "Marcar como pendente" : "Confirmar neste mês"}">${e.done ? icon("check") : ""}${label}</button>`;
}
function transactionRow(e, actions = true) {
  if (e.payroll) return payrollRow(e, actions);
  if (e.sharedId) return sharedTransactionRow(e, actions);
  const tags = [
    e.debtId ? `<span class="tag">Parcela ${e.installment}/${e.count}</span>` : "",
    e.recurring ? '<span class="tag">Mensal</span>' : "",
    e.adjusted ? '<span class="tag">Ajustado neste mês</span>' : "",
  ].join("");
  const name = e.debtId ? e.name.replace(/ · \d+\/\d+$/, "") : e.name,
    compact = actions === "compact";
  return `<div class="tx ${e.type} ${e.done ? "done" : ""} ${isLate(e) ? "late" : ""}"><span class="tx-icon" style="--c:${esc(categoryColor(e.category))}">${icon(e.type === "income" ? "income" : "expense")}</span><div class="tx-main"><strong class="tx-title">${esc(name)}</strong><div class="tx-meta">${compact ? (e.debtId ? `<span class="tag">Parcela ${e.installment}/${e.count}</span>` : categoryChip(e.category)) : categoryChip(e.category) + tags}<span class="due">${dueText(e.date, e.done, e.type)}</span></div></div>${amount(e.value, "tx-value " + (e.type === "income" ? "pos" : ""), e.type === "income" ? "+ " : "− ")}${
    compact
      ? `<div class="tx-actions">${payButton(e, "paid")}</div>`
      : actions
        ? `<div class="tx-actions">${payButton(e, "paid")}${iconBtn("edit", "edit", "Editar " + name, e.id)}${iconBtn("delete", "trash", "Excluir " + name, e.id, "danger")}</div>`
        : ""
  }</div>`;
}
function txList(list, actions = true, groupByDay = true) {
  if (!groupByDay) return `<div class="tx-list">${list.map((e) => transactionRow(e, actions)).join("")}</div>`;
  const groups = new Map();
  for (const e of list) groups.set(e.date, [...(groups.get(e.date) || []), e]);
  return `<div class="tx-list">${[...groups]
    .map(
      ([date, items]) =>
        `<div class="tx-day"><span>${dayLabel(date)}${date === today() ? '<b class="today-chip">Hoje</b>' : ""}</span></div>${items.map((e) => transactionRow(e, actions)).join("")}`,
    )
    .join("")}</div>`;
}
let shiftPayEditing = false,
  payInssMode = null;
const weekdayShort = (d) => capital(new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""));
// Linha do pagamento (salário + plantões ou só plantões) em Lançamentos e no Início. Só para o dono.
function shiftPayrollRow(m) {
  if (!ownerTools() || !state.shiftPay) return null;
  const p = F.payslip(state, m);
  if (!p.count && !p.extended) return null;
  if (!p.net && !p.count) return null;
  return {
    id: "payroll:" + m,
    name: p.extended ? (p.salary ? "Salário" + (p.count ? " + plantões" : "") : "Plantões de " + monthName(p.work).toLowerCase()) : "Plantões de " + monthName(p.work).toLowerCase(),
    type: "income",
    value: p.extended ? p.net : p.total,
    date: p.payday,
    category: "Plantões",
    done: p.done,
    payroll: true,
    month: m,
    work: p.work,
    count: p.count,
    net: p.extended,
    recurring: false,
  };
}
function payrollRow(e, actions = true) {
  return `<div class="tx income payroll ${e.done ? "done" : ""} ${isLate(e) ? "late" : ""}"><span class="tx-icon" style="--c:#8f7cff">${icon("shifts")}</span><div class="tx-main"><strong class="tx-title">${esc(e.name)}</strong><div class="tx-meta">${e.count ? `<span class="tag">${e.count} ${e.count === 1 ? "plantão" : "plantões"}</span>` : ""}<span class="tag">${e.net ? "Líquido, já sem INSS" : "Na folha"}</span><span class="due">${dueText(e.date, e.done, "income")}</span></div></div>${amount(e.value, "tx-value pos", "+ ")}${actions ? `<div class="tx-actions"><button type="button" class="pay ${e.done ? "is-done" : ""}" data-action="shift-payroll" data-month="${e.month}" aria-pressed="${e.done}">${e.done ? icon("check") + "Recebido" : "Receber"}</button>${actions === "compact" ? "" : `<button type="button" class="icon-btn" data-view="shifts" title="Abrir plantões" aria-label="Abrir plantões">${icon("open")}</button>`}</div>` : ""}</div>`;
}
// Lançamento de salário antigo (receita mensal com "salário" no nome) que a folha passa a substituir.
function salaryEntry() {
  return state.entries.find(
    (e) => e.type === "income" && e.recurring && /sal[aá]rio/i.test(e.name) && (!e.end || e.end >= today().slice(0, 7)),
  );
}
function payForm(c) {
  const old = salaryEntry(),
    salary = c?.salary ?? old?.value ?? "",
    mode = c?.dayMode || "business",
    inss = payInssMode || c?.inss || "table";
  return `<div class="pay-form">
    <div class="pay-step"><span class="step-n">1</span><div>${moneyField("Salário bruto do mês", "pay-salary", salary, false, 'id="pay-salary"')}<p class="hint">O valor antes dos descontos, como vem no contracheque. ${!c?.salary && old ? `Trouxe de “${esc(old.name)}”, que está em Lançamentos.` : "Deixe 0 se quiser contar só os plantões."}</p></div></div>
    <div class="pay-step"><span class="step-n">2</span><div><span class="field-label">Quando o dinheiro cai na conta</span><div class="pay-day"><select id="pay-daymode" aria-label="Tipo de dia"><option value="business" ${mode === "business" ? "selected" : ""}>No dia útil número</option><option value="fixed" ${mode === "fixed" ? "selected" : ""}>Sempre no dia</option></select><input id="pay-day" type="number" inputmode="numeric" min="1" max="31" step="1" value="${c?.day || 5}" aria-label="Dia"></div><div id="pay-preview" class="pay-preview"></div><p class="hint">Dia útil: sábado conta e domingo e feriado não, como na lei trabalhista. Se cair no fim de semana ou feriado, conta o dia útil anterior.</p></div></div>
    <div class="pay-step"><span class="step-n">3</span><div>${selectField("O salário e os plantões de um mês são pagos", "pay-offset", [["1", "No mês seguinte (o mais comum)"], ["0", "No mesmo mês"]], String(c?.offset ?? 1), false, 'id="pay-offset"')}</div></div>
    <div class="pay-step"><span class="step-n">4</span><div><span class="field-label">Desconto do INSS</span><div class="segmented inss-mode" role="group" aria-label="INSS">${[["table", "Tabela oficial"], ["percent", "Porcentagem fixa"], ["none", "Sem desconto"]].map(([v, l]) => `<button type="button" data-action="pay-inss" data-id="${v}" aria-pressed="${inss === v}">${l}</button>`).join("")}</div>${inss === "percent" ? `<label class="field inline-pct"><span class="field-label">Porcentagem</span><span class="money-input"><input id="pay-rate" type="text" inputmode="decimal" value="${c?.inssRate ? F.plain(c.inssRate) : "11"}" aria-label="Porcentagem do INSS"><i>%</i></span></label>` : ""}<p class="hint">${inss === "table" ? "Não sabe a porcentagem? Deixe assim: o Vértice calcula pela tabela de 2026 (7,5% a 14%, por faixas) sobre o salário mais os plantões, do jeito que a empresa faz." : inss === "percent" ? "Use se o seu contracheque mostra uma porcentagem só." : "Use se não há desconto de INSS."}</p></div></div>
    <div class="pay-step"><span class="step-n">5</span><div>${moneyField("Outros descontos por mês (opcional)", "pay-other", c?.other || 0, false, 'id="pay-other"')}<p class="hint">Vale-transporte, plano de saúde, refeição… o total que sai todo mês.</p></div></div>
    <div class="pay-actions">${c ? btn("shift-pay-cancel", "Cancelar", { cls: "ghost" }) : ""}${btn("shift-pay-save", "Salvar e ver o contracheque", { cls: "primary" })}</div>
  </div>`;
}
function renderPayPreview() {
  const box = $("#pay-preview");
  if (!box) return;
  const day = Number($("#pay-day")?.value),
    dayMode = $("#pay-daymode")?.value;
  if (!Number.isInteger(day) || day < 1 || day > (dayMode === "business" ? 23 : 31)) return (box.innerHTML = '<span class="hint">Escolha um dia válido.</span>');
  const temp = { ...state, shiftPay: { day, offset: 1, dayMode } },
    now = today().slice(0, 7);
  box.innerHTML = `<span class="field-label">Próximos pagamentos</span><div class="month-tiles">${Array.from({ length: 4 }, (_, i) => {
    const m = F.shiftMonth(now, i),
      d = F.paydayOf(temp, m);
    return `<div class="month-tile income"><b>${weekdayShort(d)} ${shortDate(d)}</b><span>${esc(monthName(m))}</span></div>`;
  }).join("")}</div>`;
}
function payslipCard(p, title) {
  const ins = p.inssDetail,
    rows = [
      p.salary ? ["Salário bruto", amount(p.salary)] : null,
      [`Plantões de ${esc(monthName(p.work).toLowerCase())} (${p.count})`, amount(p.total)],
      p.extended ? ["Total bruto", amount(p.gross), "sum"] : null,
      p.inssMode !== "none" && p.extended ? [`INSS ${p.inssMode === "table" ? "(tabela " + ins.year + ")" : "(" + F.plain(state.shiftPay.inssRate || 0).replace(",00", "") + "%)"}`, amount(p.inss, "neg", "− ")] : null,
      p.other ? ["Outros descontos", amount(p.other, "neg", "− ")] : null,
    ].filter(Boolean);
  const detail =
    ins && ins.parts.length
      ? `<details class="inss-detail"><summary>Como o INSS foi calculado${icon("down")}</summary><p class="hint">O desconto é por faixas: cada parte do total paga a porcentagem da sua faixa.</p>${ins.parts.map((x) => `<div class="split-line"><span>${(x.rate / 100).toString().replace(".", ",")}% sobre ${esc(F.money(x.to - x.from))}</span>${amount(x.value)}</div>`).join("")}${p.gross > ins.ceiling ? `<p class="hint">Acima de ${esc(F.money(ins.ceiling))} (teto) não há desconto.</p>` : ""}</details>`
      : "";
  return `<article class="panel payslip"><div class="payslip-head"><div><span class="stat-label">${title}</span><strong>Cai na conta ${p.payday ? `em ${weekdayShort(p.payday).toLowerCase()}, ${shortDate(p.payday)}` : ""}</strong></div><span class="chip ${p.done ? "" : "soft"}">${p.done ? "Recebido" : "A receber"}</span></div><div class="payslip-rows">${rows.map(([l, v, c]) => `<div class="split-line ${c || ""}"><span>${l}</span>${v}</div>`).join("")}</div><div class="payslip-net"><span>${p.extended ? "Líquido na conta" : "Total dos plantões"}</span>${bigAmount(p.extended ? p.net : p.total, "md pos")}</div>${detail}<button type="button" class="pay wide ${p.done ? "is-done" : ""}" data-action="shift-payroll" data-month="${p.month}" aria-pressed="${p.done}">${p.done ? icon("check") + "Recebido. Tocar desfaz" : "Marcar como recebido"}</button></article>`;
}
function shifts() {
  const c = state.shiftPay,
    work = month,
    payMonth = F.shiftPayMonth(state, work),
    p = F.payslip(state, payMonth),
    first = new Date(month + "-01T12:00:00").getDay(),
    normal = p.count - p.weekend - p.holiday;
  const days = Array.from({ length: F.daysIn(month) }, (_, i) => {
    const d = F.dateFor(month, i + 1),
      weekend = [0, 6].includes(new Date(d + "T12:00:00").getDay()),
      selected = state.shifts.includes(d),
      info = F.holidayInfo(d),
      counts = F.holidayCounts(state, d),
      value = F.shiftRate(state, d) / 100,
      cls = counts ? "holiday" : info?.kind === "nacional" ? "holiday-off" : info ? "optional" : "";
    return `<button type="button" class="day ${weekend ? "weekend" : ""} ${selected ? "selected" : ""} ${cls} ${d === today() ? "today" : ""}" data-action="day" data-date="${d}" aria-pressed="${holidayMode ? counts : selected}" title="${info ? esc(info.name) + (counts ? " (conta como feriado)" : " (não conta)") : ""}" aria-label="${dayLabel(d)}${info ? ", " + esc(info.name) : ""}${counts ? ", feriado" : ""}, R$ ${value}${selected ? ", plantão marcado" : ""}"><b>${i + 1}</b><small><span class="day-cur">R$ </span>${value}</small>${info || counts ? '<i class="hol-dot" aria-hidden="true"></i>' : ""}</button>`;
  }).join("");
  const monthHolidays = Array.from({ length: F.daysIn(month) }, (_, i) => F.dateFor(month, i + 1)).filter((d) => F.holidayInfo(d) || (state.holidays || []).includes(d));
  const holidayList = monthHolidays.length
    ? `<div class="holiday-list">${monthHolidays
        .map((d) => {
          const info = F.holidayInfo(d),
            counts = F.holidayCounts(state, d);
          return `<div class="holiday-row"><div><strong>${dayLabel(d)}</strong><span class="muted">${info ? esc(info.name) + (info.kind === "facultativo" ? ", ponto facultativo" : ", feriado nacional") : "Feriado marcado por você"}</span></div><label class="toggle compact"><span><small>${counts ? "Conta como feriado" : "Não conta"}</small></span><input type="checkbox" data-holiday-toggle="${d}" ${counts ? "checked" : ""} aria-label="${dayLabel(d)} conta como feriado"><i aria-hidden="true"></i></label></div>`;
        })
        .join("")}</div>`
    : "";
  const list =
    p.days
      .map((d) => {
        const info = F.holidayInfo(d);
        return `<div class="tx"><span class="tx-icon" style="--c:${F.shiftRate(state, d) > 5000 ? "#ff86c8" : "#8f7cff"}">${icon("calendar")}</span><div class="tx-main"><strong class="tx-title">${dayLabel(d)}</strong><div class="tx-meta"><span class="tag">${F.holidayCounts(state, d) ? (info ? esc(info.name) : "Feriado") : [0, 6].includes(new Date(d + "T12:00:00").getDay()) ? "Fim de semana" : "Dia de semana"}</span></div></div>${amount(F.shiftRate(state, d), "tx-value pos", "+ ")}${c ? "" : `<div class="tx-actions"><button type="button" class="pay ${state.shiftPaid.includes(d) ? "is-done" : ""}" data-action="shift-paid" data-date="${d}" aria-pressed="${state.shiftPaid.includes(d)}">${state.shiftPaid.includes(d) ? icon("check") + "Recebido" : "Receber"}</button></div>`}</div>`;
      })
      .join("") || '<p class="muted">Nenhum plantão marcado neste mês. Toque nos dias do calendário.</p>';
  const setup =
    !c || shiftPayEditing || (c && !c.dayMode)
      ? `<article class="panel shift-setup">${panelHead(c?.dayMode ? "Como você recebe" : "Como você recebe? Leva 1 minuto", "Com isso o Vértice monta o seu contracheque: salário mais plantões, menos o INSS, no dia certo.")}${payForm(c)}</article>`
      : "";
  const old = salaryEntry();
  const salaryWarning =
    c?.salary && old
      ? `<div class="banner warn-banner"><div><strong>Seu salário está contado duas vezes</strong><p>O contracheque já inclui o salário, e “${esc(old.name)}” também está em Lançamentos. Pare o lançamento antigo para não somar duas vezes.</p></div><div class="row-actions">${btn("shift-stop-salary", "Parar “" + esc(old.name) + "”", { cls: "primary", id: old.id })}</div></div>`
      : "";
  const breakdown = [normal && `${normal} em dia de semana`, p.weekend && `${p.weekend} no fim de semana`, p.holiday && `${p.holiday} em feriado`].filter(Boolean).join(", ");
  const nowSlip = c && c.offset === 1 ? F.payslip(state, month) : null;
  return `${pageHead("Plantões de " + esc(monthName(month).toLowerCase()), "Toque nos dias em que você pegou plantão. Segunda a sexta R$ 50; sábado, domingo e feriado R$ 100.", c?.dayMode && !shiftPayEditing ? btn("shift-pay-edit", "Como eu recebo", { cls: "ghost", icon: "sliders" }) : "")}${salaryWarning}${setup}
  <div class="shift-layout"><article class="panel"><div class="segmented cal-mode" role="group" aria-label="O que marcar"><button type="button" data-action="cal-mode" data-id="shift" aria-pressed="${!holidayMode}">${icon("calendar")}Marcar plantões</button><button type="button" data-action="cal-mode" data-id="holiday" aria-pressed="${holidayMode}">${icon("check")}Marcar feriados</button></div><p class="cal-hint">${holidayMode ? "Toque no dia para dizer se é feriado. Os feriados nacionais já vêm marcados; toque para tirar se no seu trabalho não contar." : "Toque no dia em que você pegou plantão. Toque de novo para desmarcar."}</p><div class="shift-legend"><span><i class="lg-day"></i>Dia de semana R$ 50</span><span><i class="lg-weekend"></i>Fim de semana R$ 100</span><span><i class="lg-holiday"></i>Feriado R$ 100</span><span><i class="lg-off"></i>Feriado que não conta</span></div><div class="calendar">${["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => `<div class="weekday">${d}</div>`).join("")}${"<span></span>".repeat(first)}${days}</div>${holidayList ? `<div class="holiday-box">${panelHead("Feriados de " + esc(monthName(month).toLowerCase()), "Ligado vale R$ 100 em dia de semana.")}${holidayList}</div>` : ""}</article>
  <div class="stack"><article class="panel stat-panel shift-total"><span class="stat-label">Plantões de ${esc(monthName(month).toLowerCase())}</span>${bigAmount(p.total)}<p class="muted">${p.count ? `${p.count} ${p.count === 1 ? "plantão" : "plantões"}${breakdown ? ": " + breakdown : ""}` : "Nenhum plantão marcado ainda."}</p></article>${c ? payslipCard(p, `Contracheque de ${monthName(payMonth).toLowerCase()}`) : ""}${
    nowSlip && (nowSlip.count || nowSlip.extended)
      ? `<article class="panel payroll-now"><div class="payroll-line"><div><span class="muted">Neste mês, ${nowSlip.payday ? shortDate(nowSlip.payday) : ""}</span>${amount(nowSlip.extended ? nowSlip.net : nowSlip.total, "pos")}<span class="muted">${nowSlip.salary ? "Salário + " : ""}${nowSlip.count} ${nowSlip.count === 1 ? "plantão" : "plantões"} de ${esc(monthName(nowSlip.work).toLowerCase())}</span></div><button type="button" class="pay ${nowSlip.done ? "is-done" : ""}" data-action="shift-payroll" data-month="${month}" aria-pressed="${nowSlip.done}">${nowSlip.done ? icon("check") + "Recebido" : "Recebi"}</button></div></article>`
      : ""
  }<article class="panel">${panelHead("Dias marcados")}<div class="tx-list">${list}</div></article></div></div>`;
}
function toggleHoliday(d) {
  const info = F.holidayInfo(d);
  state.holidays = state.holidays || [];
  state.holidayOff = state.holidayOff || [];
  if (state.holidays.includes(d)) state.holidays = state.holidays.filter((x) => x !== d);
  else if (info?.kind === "nacional") {
    state.holidayOff = state.holidayOff.includes(d) ? state.holidayOff.filter((x) => x !== d) : [...state.holidayOff, d];
  } else state.holidays = [...state.holidays, d];
  if (!state.holidayOff.length) delete state.holidayOff;
}
function goalRing(p) {
  const r = 26,
    c = 2 * Math.PI * r;
  return `<svg class="ring" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="${r}" class="ring-track"/><circle cx="32" cy="32" r="${r}" class="ring-value" stroke-dasharray="${((c * p) / 100).toFixed(2)} ${c.toFixed(2)}"/></svg><span class="ring-label" data-count-pct="${p}">${p}%</span>`;
}
function typeSwitch(current) {
  return `<div class="type-switch full" role="radiogroup" aria-label="Tipo"><label><input type="radio" name="type" value="expense" ${current === "expense" ? "checked" : ""}><span>${icon("expense")}Despesa</span></label><label><input type="radio" name="type" value="income" ${current === "income" ? "checked" : ""}><span>${icon("income")}Receita</span></label></div>`;
}
// Atalhos para não precisar editar depois: preenchem descrição, categoria e repetição de uma vez.
const entryPresets = {
  income: [
    ["Salário", "Receitas", true],
    ["Freelance", "Receitas", false],
    ["Vendas", "Receitas", false],
    ["Pix recebido", "Receitas", false],
    ["Aluguel recebido", "Receitas", true],
    ["Pensão", "Receitas", true],
  ],
  expense: [
    ["Aluguel", "Moradia", true],
    ["Mercado", "Alimentação", false],
    ["Luz", "Moradia", true],
    ["Internet", "Assinaturas", true],
    ["Transporte", "Transporte", false],
    ["Cartão de crédito", "Outros", true],
  ],
};
function presetChips(type) {
  return `<div class="full preset-chips" role="group" aria-label="Atalhos">${entryPresets[type].map(([name], i) => `<button type="button" data-action="entry-preset" data-id="${i}">${esc(name)}</button>`).join("")}</div>`;
}
// Prévia: em que meses e dias o lançamento vai aparecer.
function renderEntryPreview() {
  const box = $("#entry-preview");
  if (!box || modal?.kind !== "entry") return;
  const f = (n) => $(`#fields [name="${n}"]`),
    type = $('#fields input[name="type"]:checked')?.value || "expense",
    value = F.cents(f("value")?.value || ""),
    date = f("date")?.value || "",
    recurring = !!f("recurring")?.checked,
    end = f("end")?.value || "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return (box.innerHTML = "");
  const start = date.slice(0, 7),
    months = recurring ? Array.from({ length: 6 }, (_, i) => F.shiftMonth(start, i)).filter((m) => !end || m <= end) : [start],
    money = Number.isSafeInteger(value) && value > 0 ? F.money(value) : "R$ —";
  box.innerHTML = `<span class="field-label">${recurring ? (type === "income" ? "Vai entrar todo mês" : "Vai sair todo mês") : type === "income" ? "Vai entrar uma vez" : "Vai sair uma vez"}</span><div class="month-tiles">${months
    .map((m) => `<div class="month-tile ${type}"><b>${esc(monthName(m, "short"))}</b><span>dia ${Number(F.dateFor(m, Number(date.slice(8))).slice(8))}</span><small data-private>${esc(money)}</small></div>`)
    .join("")}${recurring && !end ? '<div class="month-tile more">e segue</div>' : ""}</div>`;
}
function openEntry(type = "expense", recurring = false, id) {
  const e = id ? state.entries.find((e) => e.id === id) : null;
  const current = e?.type || type;
  modal = { kind: "entry", id };
  $("#modal-title").textContent = e ? "Editar lançamento" : current === "income" ? "Nova receita" : "Nova despesa";
  $("#fields").innerHTML =
    typeSwitch(current) +
    (e ? "" : presetChips(current)) +
    moneyField("Valor", "value", e ? e.value : "", false, 'required autofocus aria-describedby="form-error"') +
    field(
      "Data",
      "date",
      "date",
      e?.date || (month === today().slice(0, 7) ? today() : month + "-01"),
      false,
      "required",
    ) +
    field("Descrição", "name", "text", e?.name || "", true, 'maxlength="120" required placeholder="Ex.: Salário, aluguel, mercado"') +
    categoryField(e?.category || (current === "income" ? "Receitas" : "Outros"), current, true, !!e) +
    checkField("Repetir todo mês", "recurring", e?.recurring ?? recurring, "Contas fixas, como aluguel e salário.") +
    field("Último mês da repetição (opcional)", "end", "month", e?.end || "", true) +
    checkField(
      current === "income" ? "Já recebi neste mês" : "Já paguei neste mês",
      "done",
      e && state.paid[e.id + "@" + month],
      "Vale só para " + esc(mlabel(month)) + ".",
    ) +
    '<div class="full entry-preview" id="entry-preview" aria-live="polite"></div>';
  showDialog({ danger: e ? btn("delete", "Excluir", { id: e.id, cls: "danger", icon: "trash", attrs: "data-dismiss" }) : "" });
  renderEntryPreview();
}
const submitLabels = {
  entry: "Salvar lançamento",
  goal: "Salvar meta",
  category: "Salvar categoria",
  "shared-profile": "Salvar perfil",
  "shared-item": "Salvar lançamento",
  "shared-remove": "Remover",
  "monthly-entry": "Salvar ajuste",
  "month-settings": "Salvar ajustes",
  "remove-recurring": "Remover",
  "month-copy": "Copiar lançamentos",
  debt: "Salvar parcelamento",
  fund: "Salvar caixinha",
  "wealth-plan": "Salvar plano",
  "fund-adjust": "Atualizar saldo",
};
function showDialog(opts = {}) {
  const submit = $("#form .submit");
  submit.style.display = opts.noSubmit ? "none" : "";
  submit.textContent =
    opts.submit ||
    (modal.kind === "transfer"
      ? modal.transferKind === "deposit"
        ? "Guardar"
        : "Resgatar"
      : submitLabels[modal.kind] || "Salvar");
  submit.classList.toggle("danger-fill", !!opts.destructive);
  $("#cancel").textContent = opts.noSubmit ? "Fechar" : "Cancelar";
  $("#form-danger").innerHTML = opts.danger || "";
  $("#form-error").textContent = "";
  const dialog = $("#dialog");
  if (!dialog.open) dialog.showModal();
  // Novo cadastro: o cursor já vai para o primeiro campo. Edição: foco no título, sem abrir o teclado à toa.
  const first = modal.id ? null : $("#fields").querySelector?.('input:not([type="radio"]):not([type="checkbox"]):not([type="color"]),select');
  if (first) first.focus?.();
  else $("#modal-title").focus?.();
  syncEndField();
}
function syncEndField() {
  const recurring = $("#fields").querySelector?.('input[name="recurring"]'),
    end = $("#fields").querySelector?.('input[name="end"]')?.closest?.(".field");
  if (recurring && end) end.hidden = !recurring.checked;
}
$("#form").addEventListener("submit", (e) => {
  e.preventDefault();
  if (submitCategory(e)) return;
  if (typeof submitShared === "function" && submitShared(e)) return;
  if (submitMonthly(e)) return;
  if (submitGrowth(e)) return;
  if (typeof submitGoals === "function" && submitGoals(e)) return;
  const data = new FormData(e.target);
  if (modal.kind === "entry") {
    const value = F.cents(data.get("value")),
      date = data.get("date"),
      end = data.get("end"),
      recurring = data.has("recurring");
    if (!Number.isSafeInteger(value) || value <= 0)
      return ($("#form-error").textContent = "Informe um valor maior que zero. Exemplo: 150,90.");
    if (!String(data.get("name") || "").trim()) return ($("#form-error").textContent = "Escreva uma descrição.");
    if (!String(data.get("category") || "").trim() || !/^\d{4}-\d{2}-\d{2}$/.test(date))
      return ($("#form-error").textContent = "Confira a data e a categoria.");
    if (recurring && end && end < date.slice(0, 7))
      return ($("#form-error").textContent = "O último mês precisa ser igual ou depois do mês de início.");
    const entry = {
      id: modal.id || uid(),
      name: data.get("name").trim(),
      type: data.get("type") === "income" ? "income" : "expense",
      value,
      date,
      category: data.get("category").trim(),
      recurring,
      end: recurring ? end || "" : "",
    };
    const candidate = {
      ...state,
      entries: modal.id
        ? state.entries.map((x) => (x.id === modal.id ? { ...x, ...entry } : x))
        : [...state.entries, entry],
    };
    if (!F.valid(candidate)) return ($("#form-error").textContent = "Confira valor, data, categoria e limite de registros.");
    state.entries = candidate.entries;
    const occurs = F.entries(state, month).some((x) => x.id === entry.id);
    if (occurs) state.paid[entry.id + "@" + month] = data.has("done");
    $("#dialog").close();
    if (!occurs) {
      month = date.slice(0, 7);
      try {
        sessionStorage.setItem("vertice-selected-month", month);
      } catch (_) {}
      commit("Salvo em " + mlabel(month) + ".");
    } else commit(modal.id ? "Lançamento atualizado." : "Lançamento adicionado.");
    return;
  } else if (modal.kind === "goal-legacy") {
    const goal = {
      id: modal.id || uid(),
      name: String(data.get("name") || "").trim(),
      target: F.cents(data.get("target")),
      saved: F.cents(data.get("saved")),
    };
    if (
      !goal.name ||
      !Number.isSafeInteger(goal.target) ||
      goal.target <= 0 ||
      !Number.isSafeInteger(goal.saved) ||
      goal.saved < 0
    ) {
      $("#form-error").textContent = "Informe um nome e valores válidos.";
      return;
    }
    const candidate = {
      ...state,
      goals: modal.id ? state.goals.map((g) => (g.id === modal.id ? goal : g)) : [...state.goals, goal],
    };
    if (!F.valid(candidate)) {
      $("#form-error").textContent = "Confira os valores e o limite de metas.";
      return;
    }
    state.goals = candidate.goals;
  }
  $("#dialog").close();
  commit("Salvo.");
});
function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type })),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function csv() {
  const safe = VerticeSecurity.csvCell,
    rows = [
      ["Data", "Descrição", "Tipo", "Categoria", "Valor (R$)", "Situação"],
      ...F.entries(state, month).map((e) => [
        e.date,
        e.name,
        e.type === "income" ? "Receita" : "Despesa",
        e.category,
        (((e.type === "expense" ? -1 : 1) * e.value) / 100).toFixed(2).replace(".", ","),
        e.done ? "Confirmado" : "Pendente",
      ]),
      ...(state.shiftPay && ownerTools()
        ? [shiftPayrollRow(month)].filter(Boolean).map((e) => [e.date, e.name, "Receita", "Plantões", (e.value / 100).toFixed(2).replace(".", ","), e.done ? "Recebido" : "Pendente"])
        : []),
      ...F.shiftList(state)
        .filter((d) => !state.shiftPay && F.monthOf(d) === month)
        .sort()
        .map((d) => [
          d,
          "Plantão",
          "Receita",
          "Plantões",
          (F.shiftRate(state, d) / 100).toFixed(2).replace(".", ","),
          state.shiftPaid.includes(d) ? "Recebido" : "Pendente",
        ]),
    ];
  download(`vertice-${month}.csv`, "\ufeff" + rows.map((r) => r.map(safe).join(";")).join("\r\n"), "text/csv;charset=utf-8");
}
function hasRecords() {
  return !!(
    state.shared?.profiles.length ||
    state.shared?.items.length ||
    state.entries.length ||
    state.shifts.length ||
    state.goals.length ||
    state.holidays.length ||
    state.budget ||
    state.debts.length ||
    state.funds.length ||
    state.transfers.length ||
    state.wealth.monthly ||
    state.wealth.essential
  );
}
function loadDemo() {
  state = freshRecords();
  const add = (name, type, value, day, category, done, recurring = true) => {
    const id = uid();
    state.entries.push({ id, name, type, value, date: F.dateFor(month, day), category, recurring, end: "" });
    state.paid[id + "@" + month] = done;
  };
  add("Salário mensal", "income", 350000, 5, "Receitas", true);
  add("Aluguel", "expense", 110000, 10, "Moradia", true);
  add("Internet e celular", "expense", 14990, 12, "Assinaturas", true);
  add("Supermercado", "expense", 42850, 18, "Alimentação", true, false);
  add("Academia", "expense", 9990, 20, "Saúde", false);
  add("Energia elétrica", "expense", 18500, 25, "Moradia", false);
  state.shifts = (ownerTools() ? [6, 8, 15, 20, 27] : [])
    .filter((d) => d <= F.daysIn(month))
    .map((d) => F.dateFor(month, d));
  state.shiftPaid = state.shifts.length ? [state.shifts[0]] : [];
  state.budget = 250000;
  state.goals = [{ id: uid(), name: "Reserva de emergência", target: 1000000, saved: 280000 }];
  view = "shared";
}
function closeOverlays() {
  const more = $("#more-sheet");
  if (more?.open) more.close();
}
document.addEventListener("click", (e) => {
  const b = e.target.closest?.("[data-view],[data-action]");
  if (!b) return;
  if (b.hasAttribute?.("data-dismiss")) $("#dialog").close();
  if (b.dataset.view) {
    if (!Object.hasOwn(pages, b.dataset.view) || (pages[b.dataset.view].owner && !ownerTools())) return;
    view = b.dataset.view;
    closeOverlays();
    render();
    if (typeof window.scrollTo === "function") window.scrollTo({ top: 0, behavior: "instant" });
    return;
  }
  const a = b.dataset.action,
    id = b.dataset.id,
    d = b.dataset.date;
  if (["day", "shift-paid", "shift-payroll", "shift-pay-save", "shift-pay-edit", "shift-pay-cancel", "cal-mode", "pay-inss", "shift-stop-salary"].includes(a) && !ownerTools()) return;
  if (a === "more-open") {
    renderNav();
    $("#more-sheet").showModal();
    return;
  }
  if (a === "more-close") return closeOverlays();
  closeOverlays();
  if (typeof handleGoalAction === "function" && handleGoalAction(a, b)) return;
  if (typeof handleProfileAction === "function" && handleProfileAction(a, b)) return;
  if (handleExperienceAction(a, b)) return;
  if (typeof handleSharedAction === "function" && handleSharedAction(a, b)) return;
  if (handleMonthAction(a, b)) return;
  if (handleGrowthAction(a, b)) return;
  if (a === "entry-preset" && modal?.kind === "entry") {
    const type = $('#fields input[name="type"]:checked')?.value || "expense",
      [name, category, rec] = entryPresets[type][Number(b.dataset.id)] || [];
    if (!name) return;
    const f = (n) => $(`#fields [name="${n}"]`);
    f("name").value = name;
    const select = f("category");
    if (select && [...select.options].some((o) => o.value === category)) select.value = category;
    f("recurring").checked = rec;
    syncEndField();
    document.querySelectorAll(".preset-chips button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    renderEntryPreview();
    f("value").focus();
    return;
  }
  if (a === "expense") openEntry();
  else if (a === "fixed-expense") openEntry("expense", true);
  else if (a === "fixed-income") openEntry("income", true);
  else if (a === "edit") openEntry("expense", false, id);
  else if (a === "paid") {
    state.paid[id + "@" + month] = !state.paid[id + "@" + month];
    commit();
  } else if (a === "delete") {
    const entry = state.entries.find((e) => e.id === id);
    if (!entry) return;
    if (confirm(`Excluir “${entry.name}”? Esta ação não pode ser desfeita.`)) {
      state.entries = state.entries.filter((e) => e.id !== id);
      Object.keys(state.paid)
        .filter((k) => k.startsWith(id + "@"))
        .forEach((k) => delete state.paid[k]);
      commit("Lançamento excluído.");
    }
  } else if (a === "day") {
    if (holidayMode) toggleHoliday(d);
    else if (state.shifts.includes(d)) {
      state.shifts = state.shifts.filter((x) => x !== d);
      state.shiftPaid = state.shiftPaid.filter((x) => x !== d);
    } else state.shifts.push(d);
    commit();
  } else if (a === "cal-mode") {
    holidayMode = b.dataset.id === "holiday";
    render();
  } else if (a === "pay-inss") {
    payInssMode = b.dataset.id;
    const keep = { salary: $("#pay-salary")?.value, day: $("#pay-day")?.value, mode: $("#pay-daymode")?.value, offset: $("#pay-offset")?.value, other: $("#pay-other")?.value };
    render();
    if ($("#pay-salary")) {
      $("#pay-salary").value = keep.salary ?? "";
      $("#pay-day").value = keep.day ?? 5;
      $("#pay-daymode").value = keep.mode || "business";
      $("#pay-offset").value = keep.offset ?? "1";
      $("#pay-other").value = keep.other ?? "";
      renderPayPreview();
    }
  } else if (a === "shift-pay-cancel") {
    shiftPayEditing = false;
    payInssMode = null;
    render();
  } else if (a === "shift-stop-salary") {
    const entry = state.entries.find((x) => x.id === id),
      since = state.shiftPay?.since || today().slice(0, 7);
    if (!entry) return;
    const stop = F.shiftMonth(since, -1);
    if (stop >= entry.date.slice(0, 7)) entry.end = stop;
    else if (confirm(`“${entry.name}” começou neste mês. Excluir o lançamento, já que o contracheque inclui o salário?`))
      state.entries = state.entries.filter((x) => x.id !== id);
    else return;
    commit("Pronto: o salário agora vem só pelo contracheque.");
  } else if (a === "shift-payroll") {
    // data-month = mês do pagamento. Marca o contracheque e os plantões que ele paga.
    const pm = b.dataset.month,
      slip = F.payslip(state, pm),
      done = slip.done,
      days = slip.days;
    state.shiftPaid = done ? state.shiftPaid.filter((x) => !days.includes(x)) : [...new Set([...state.shiftPaid, ...days])];
    if (done) delete state.paid[slip.key];
    else state.paid[slip.key] = true;
    commit(done ? "Pagamento voltou para a receber." : "Pagamento recebido.");
  } else if (a === "shift-pay-edit") {
    shiftPayEditing = true;
    render();
  } else if (a === "shift-pay-save") {
    const day = Number($("#pay-day").value),
      dayMode = $("#pay-daymode").value === "fixed" ? "fixed" : "business",
      offset = Number($("#pay-offset").value),
      salary = F.cents($("#pay-salary").value || 0),
      other = F.cents($("#pay-other").value || 0),
      inss = payInssMode || state.shiftPay?.inss || "table",
      rate = inss === "percent" ? F.cents($("#pay-rate")?.value || 0) : 0;
    if (!Number.isInteger(day) || day < 1 || day > (dayMode === "business" ? 23 : 31)) return toast(dayMode === "business" ? "Escolha um dia útil entre 1 e 23." : "Escolha um dia entre 1 e 31.");
    if (!Number.isSafeInteger(salary) || salary < 0 || !Number.isSafeInteger(other) || other < 0) return toast("Confira o salário e os descontos. Exemplo: 2.500,00.");
    if (inss === "percent" && (!Number.isSafeInteger(rate) || rate <= 0 || rate > 5000)) return toast("Informe a porcentagem do INSS, por exemplo 11.");
    const next = { day, offset, dayMode, inss, salary, other, since: state.shiftPay?.since || today().slice(0, 7) };
    if (inss === "percent") next.inssRate = rate;
    if (!F.valid({ ...state, shiftPay: next })) return toast("Confira os campos do pagamento.");
    state.shiftPay = next;
    shiftPayEditing = false;
    payInssMode = null;
    commit("Pronto. Veja o contracheque ao lado.");
  } else if (a === "shift-paid") {
    state.shiftPaid = state.shiftPaid.includes(d) ? state.shiftPaid.filter((x) => x !== d) : [...state.shiftPaid, d];
    commit();
  } else if (a === "budget") {
    const v = F.cents($("#budget").value);
    if (!Number.isSafeInteger(v) || v < 0 || v > 99999999900) {
      toast("Informe um limite válido.");
      return;
    }
    state.budget = v;
    commit("Limite mensal atualizado.");
  } else if (a === "backup") download("vertice-backup-" + today() + ".json", JSON.stringify(state, null, 2), "application/json");
  else if (a === "import") $("#import").click();
  else if (a === "csv") csv();
  else if (a === "reset") {
    if (confirm("Apagar TODOS os seus registros desta conta? Isso não pode ser desfeito sem um backup.")) {
      state = freshRecords();
      commit("Registros apagados.");
    }
  } else if (a === "demo") {
    if (hasRecords() && !confirm("O exemplo substitui todos os seus dados atuais. Exporte um backup antes. Continuar?"))
      return;
    loadDemo();
    commit("Exemplo carregado. Os valores são fictícios.");
  }
});
document.addEventListener("input", (e) => {
  if (modal?.kind === "entry" && ["value", "date", "end"].includes(e.target.name)) renderEntryPreview();
  if (["pay-day", "pay-daymode"].includes(e.target.id)) renderPayPreview();
});
document.addEventListener("change", (e) => {
  if (modal?.kind === "entry" && ["recurring", "type", "date", "end"].includes(e.target.name)) {
    if (e.target.name === "type") {
      const chips = document.querySelector(".preset-chips");
      if (chips) chips.outerHTML = presetChips(e.target.value);
    }
    renderEntryPreview();
  }
  if (e.target.name === "recurring") syncEndField();
  if (e.target.id === "type-filter") {
    filter = e.target.value;
    ledgerPage = 0;
    render();
  } else if (e.target.id === "status-filter") {
    status = e.target.value;
    ledgerPage = 0;
    render();
  } else if (e.target.id === "holiday-mode" && ownerTools()) {
    holidayMode = e.target.checked;
    render();
  } else if (e.target.dataset?.holidayToggle && ownerTools()) {
    toggleHoliday(e.target.dataset.holidayToggle);
    commit();
  } else if (e.target.id === "pay-daymode") renderPayPreview();
});
document.addEventListener("input", (e) => {
  if (e.target.id === "search") {
    const pos = e.target.selectionStart;
    query = e.target.value;
    ledgerPage = 0;
    render();
    $("#search").focus();
    $("#search").setSelectionRange(pos, pos);
  }
});
// Atalhos: N cria lançamento, setas trocam o mês, / busca nos lançamentos.
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") return closeOverlays();
  const t = e.target,
    typing = t && (["INPUT", "SELECT", "TEXTAREA"].includes(t.tagName) || t.isContentEditable);
  if (typing || e.ctrlKey || e.metaKey || e.altKey || document.querySelector("dialog[open]")) return;
  if (document.body.dataset.auth !== "cloud" && document.body.dataset.auth !== "local") return;
  if (e.key === "n" || e.key === "N") {
    e.preventDefault();
    openEntry();
  } else if (e.key === "ArrowLeft") setMonth(F.shiftMonth(month, -1));
  else if (e.key === "ArrowRight") setMonth(F.shiftMonth(month, 1));
  else if (e.key === "/" && view === "transactions") {
    e.preventDefault();
    $("#search")?.focus();
  }
});
$("#month").addEventListener("change", (e) => {
  if (/^\d{4}-\d{2}$/.test(e.target.value)) setMonth(e.target.value);
});
$("#prev").onclick = () => setMonth(F.shiftMonth(month, -1));
$("#next").onclick = () => setMonth(F.shiftMonth(month, 1));
$("#new").onclick = () => openEntry();
$("#close").onclick = () => $("#dialog").close();
$("#cancel").onclick = () => $("#dialog").close();
$("#import").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    if (file.size > 5000000) throw Error("Arquivo muito grande.");
    const parsed = JSON.parse(await file.text());
    if (!F.valid(parsed)) throw Error("Este arquivo não é um backup válido do Vértice.");
    if (confirm("Restaurar este backup e substituir todos os dados atuais?")) {
      state = upgradeState(parsed);
      commit("Backup restaurado.");
    }
  } catch (err) {
    toast(err.message || "Não foi possível ler o backup.");
  } finally {
    e.target.value = "";
  }
});
restoreMonthSelection();
render();
if (typeof Account !== "undefined") Account.start();
