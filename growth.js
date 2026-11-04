"use strict";
let selectedDebt = null;
function upgradeState(s) {
  return {
    ...s,
    categories: CategoryCatalog.migrate(s),
    monthSettings: s.monthSettings || {},
    overrides: s.overrides || {},
    debts: s.debts || [],
    funds: s.funds || [],
    transfers: s.transfers || [],
    wealth: s.wealth || { monthly: 0, essential: 0, months: 6 },
  };
}
// Quadradinho de uma parcela: número, mês, valor e situação. Tocar marca como paga ou volta para pendente.
function installmentTile(e, clickable = true) {
  const now = today(),
    thisMonth = now.slice(0, 7),
    m = e.date.slice(0, 7),
    late = !e.done && e.date < now,
    status = e.done ? "paid" : late ? "late" : m === thisMonth ? "now" : "future",
    label = e.done ? "Paga" : late ? "Atrasada" : m === thisMonth ? "Vence dia " + Number(e.date.slice(8)) : "A vencer";
  const inner = `<span class="inst-n">${e.installment}<small>/${e.count}</small></span><span class="inst-month">${esc(shortMonth(m))}</span><span class="inst-value" data-private>${esc(F.money(e.value))}</span><span class="inst-state">${e.done ? icon("check") : ""}${label}</span>`;
  return clickable
    ? `<button type="button" class="inst ${status}" data-action="installment-paid" data-id="${esc(e.id)}" data-date="${e.date}" aria-pressed="${e.done}" title="${e.done ? "Toque para voltar a pendente" : "Toque quando pagar"}" aria-label="Parcela ${e.installment} de ${e.count}, ${esc(mlabel(m))}, ${esc(F.money(e.value))}, ${label}">${inner}</button>`
    : `<div class="inst ${status}">${inner}</div>`;
}
function installmentGrid(list, clickable = true, max = 0, more = "") {
  const shown = max && list.length > max ? list.slice(0, max) : list;
  return `<div class="inst-grid">${shown.map((e) => installmentTile(e, clickable)).join("")}${max && list.length > max ? more : ""}</div>`;
}
function debtDetails(d) {
  return installmentGrid(F.debtSummary(state, d, today()).schedule);
}
function wealthView() {
  const funds = state.funds,
    total = funds.reduce((a, f) => a + F.fundBalance(state, f), 0),
    reserve = funds.filter((f) => f.kind === "reserve").reduce((a, f) => a + F.fundBalance(state, f), 0),
    invested = total - reserve,
    target = state.wealth.essential * state.wealth.months,
    t = F.totals(state, month),
    suggested = Math.max(0, Math.min(state.wealth.monthly, t.closing, F.availableAfterSaving(state, month))),
    history = [...state.transfers].sort((a, b) => b.date.localeCompare(a.date));
  const fundCards =
    funds
      .map((f) => {
        const warn = f.kind === "reserve" && (f.liquidity !== "daily" || f.risk !== "low");
        return `<article class="panel fund-card"><div class="fund-top"><div><h3>${esc(f.name)}</h3><div class="tx-meta"><span class="tag">${f.kind === "reserve" ? "Reserva" : "Investimento"}</span><span class="tag">${f.liquidity === "daily" ? "Resgate no dia" : "Resgate com prazo"}</span><span class="tag">Risco ${{ low: "baixo", medium: "médio", high: "alto" }[f.risk]}</span>${f.product ? `<span class="tag">${esc(f.product)}</span>` : ""}</div></div>${bigAmount(F.fundBalance(state, f), "md")}</div>${warn ? '<p class="note warn">Para emergências, o ideal é resgate no mesmo dia e risco baixo.</p>' : ""}<div class="row-actions">${btn("fund-deposit", "Guardar", { id: f.id, cls: "primary", icon: "plus" })}${btn("fund-withdraw", "Resgatar", { id: f.id, icon: "minus" })}${btn("fund-adjust", "Corrigir saldo", { id: f.id, cls: "ghost" })}${iconBtn("fund-edit", "edit", "Editar " + f.name, f.id)}${iconBtn("fund-delete", "trash", "Excluir " + f.name, f.id, "danger")}</div></article>`;
      })
      .join("") ||
    `<article class="panel">${empty("Nenhuma caixinha ainda", "Crie uma para a reserva de emergência e registre cada vez que guardar dinheiro.", "fund-new", "Criar caixinha")}</article>`;
  return `${pageHead("Dinheiro guardado", "Caixinhas para a reserva e outros investimentos. Guardar tira do saldo do mês, mas não vira despesa.", btn("fund-new", "Nova caixinha", { cls: "primary", icon: "plus" }))}
  <div class="summary-strip"><div><span>Total guardado</span>${amount(total)}</div><div><span>Reserva de emergência</span>${amount(reserve)}<small>${state.wealth.essential ? (reserve / state.wealth.essential).toFixed(1).replace(".", ",") + " meses do essencial" : "Defina seu custo essencial"}</small></div><div><span>Outros investimentos</span>${amount(invested)}</div></div>
  <div class="two-col">
    <article class="panel">${panelHead("Plano da reserva", `${state.wealth.months} meses de ${esc(F.money(state.wealth.essential))}`, btn("wealth-plan", "Ajustar", { cls: "ghost", icon: "sliders" }))}${progress(pct(reserve, target))}<div class="split-line"><span>${target ? pct(reserve, target) + "% da meta" : "Defina quanto custa o seu mês essencial"}</span>${amount(target)}</div><p class="hint">${target ? (reserve >= target ? "Reserva completa." : "Faltam " + amount(Math.max(0, target - reserve)) + ".") : "Uma referência comum é de 3 a 12 meses de gastos essenciais."}</p></article>
    <article class="panel">${panelHead("Quanto dá para guardar agora", "O menor valor entre a sua meta mensal, a sobra prevista e o dinheiro já recebido.")}${bigAmount(suggested, "md pos")}<div class="split-line"><span>Meta mensal</span>${amount(state.wealth.monthly)}</div></article>
  </div>
  <div class="fund-list">${fundCards}</div>
  <article class="panel">${panelHead("Histórico", "Últimos aportes e resgates. Remover desfaz o movimento.")}${
    history.length
      ? `<div class="tx-list">${history
          .slice(0, 30)
          .map(
            (h) =>
              `<div class="tx ${h.kind === "deposit" ? "expense" : "income"}"><span class="tx-icon">${icon(h.kind === "deposit" ? "upload" : "download")}</span><div class="tx-main"><strong class="tx-title">${esc(funds.find((f) => f.id === h.fundId)?.name || "Caixinha")}</strong><div class="tx-meta"><span class="tag">${h.kind === "deposit" ? "Guardado" : "Resgatado"}</span><span class="due">${fullDate(h.date)}</span></div></div>${amount(h.value, "tx-value", h.kind === "deposit" ? "+ " : "− ")}<div class="tx-actions">${iconBtn("transfer-delete", "trash", "Desfazer movimento", h.id, "danger")}</div></div>`,
          )
          .join("")}</div>`
      : '<p class="muted">Os aportes e resgates aparecem aqui.</p>'
  }</article>
  <p class="hint">Antes de investir, confira prazo de resgate, riscos e custos na instituição. <a class="link" href="https://www.gov.br/investidor/pt-br/investir/antes-de-investir/defina-seus-objetivos/emergencias-e-aposentadoria" target="_blank" rel="noopener noreferrer">Orientação da CVM sobre reserva de emergência</a>.</p>`;
}
function openDebt(id) {
  const d = state.debts.find((d) => d.id === id);
  modal = { kind: "debt", id };
  $("#modal-title").textContent = d ? "Editar compra parcelada" : "Nova compra parcelada";
  $("#fields").innerHTML =
    field("O que foi parcelado?", "name", "text", d?.name || "", true, 'required maxlength="120" placeholder="Ex.: Geladeira, empréstimo"') +
    field("Onde ou com quem", "creditor", "text", d?.creditor || "", true, 'maxlength="120" placeholder="Ex.: Cartão Nubank, Loja X"') +
    moneyField("Valor total, com juros", "total", d ? d.total : "", false, "required") +
    field("Número de parcelas", "count", "number", d?.count || 12, false, 'required min="1" max="600" step="1"') +
    field("Data da compra", "start", "date", d?.start || today(), false, "required") +
    field("Primeira parcela vence em", "firstDue", "date", d?.firstDue || today(), false, "required") +
    moneyField("Preço à vista (opcional)", "principal", d?.principal ? d.principal : "", true) +
    (d
      ? hint("Mudar valor, datas ou número de parcelas recalcula tudo e desmarca os pagamentos. Mudar só o nome mantém tudo.")
      : field("Parcelas que já foram pagas", "paidCount", "number", 0, true, 'required min="0" max="600" step="1"')) +
    `<div class="full count-chips" role="group" aria-label="Escolha rápida de parcelas">${[2, 3, 4, 6, 10, 12, 18, 24].map((n) => `<button type="button" data-action="debt-count" data-id="${n}" aria-pressed="${(d?.count || 12) === n}">${n}x</button>`).join("")}</div>` +
    `<div class="full debt-preview" id="debt-preview" aria-live="polite"></div>`;
  showDialog({ danger: d ? btn("debt-delete", "Excluir", { id: d.id, cls: "danger", icon: "trash", attrs: "data-dismiss" }) : "" });
  renderDebtPreview();
}
// Prévia ao vivo: mostra cada parcela, mês e valor antes de salvar (assim não precisa editar depois).
function renderDebtPreview() {
  const box = $("#debt-preview");
  if (!box || modal?.kind !== "debt") return;
  const get = (n) => $(`#fields [name="${n}"]`)?.value ?? "",
    total = F.cents(get("total")),
    count = Number(get("count")),
    firstDue = get("firstDue"),
    paidCount = Math.max(0, Number(get("paidCount") || 0));
  if (!Number.isSafeInteger(total) || total <= 0 || !Number.isInteger(count) || count < 1 || count > 600 || !/^\d{4}-\d{2}-\d{2}$/.test(firstDue)) {
    box.innerHTML = '<p class="hint">Preencha o valor total, o número de parcelas e a data da primeira para ver como fica.</p>';
    return;
  }
  const fake = { id: "preview", name: get("name") || "Compra", total, count, firstDue },
    list = F.debtSchedule({ paid: {} }, fake).map((e, i) => ({ ...e, done: i < paidCount && !modal.id })),
    each = Math.floor(total / count),
    last = list.at(-1).date.slice(0, 7);
  box.innerHTML = `<div class="debt-preview-head"><strong>${count}x de ${esc(F.money(each))}</strong><span class="muted">de ${esc(shortMonth(list[0].date.slice(0, 7)))} a ${esc(shortMonth(last))}, todo dia ${Number(firstDue.slice(8))}</span></div>${installmentGrid(list, false, 24, `<div class="inst more">+${count - 24}</div>`)}`;
}
document.addEventListener("input", (e) => {
  if (modal?.kind === "debt" && ["total", "count", "firstDue", "paidCount", "name"].includes(e.target.name)) {
    if (e.target.name === "count") document.querySelectorAll(".count-chips button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.id === e.target.value)));
    renderDebtPreview();
  }
});
function openFund(id) {
  const f = state.funds.find((f) => f.id === id);
  modal = { kind: "fund", id };
  $("#modal-title").textContent = f ? "Editar caixinha" : "Nova caixinha";
  $("#fields").innerHTML =
    field("Nome", "name", "text", f?.name || "", true, 'required maxlength="120" placeholder="Ex.: Reserva de emergência"') +
    selectField(
      "Para que serve",
      "kind",
      [
        ["reserve", "Reserva de emergência"],
        ["investment", "Outro investimento"],
      ],
      f?.kind || "reserve",
    ) +
    field("Onde está guardado", "product", "text", f?.product || "", false, 'maxlength="120" placeholder="Banco ou produto"') +
    (!f ? moneyField("Quanto já tem guardado", "balance", 0, true, "required") : "") +
    selectField(
      "Resgate",
      "liquidity",
      [
        ["daily", "No mesmo dia"],
        ["term", "Com prazo"],
      ],
      f?.liquidity || "daily",
    ) +
    selectField(
      "Risco",
      "risk",
      [
        ["low", "Baixo"],
        ["medium", "Médio"],
        ["high", "Alto"],
      ],
      f?.risk || "low",
    ) +
    hint("Resgate e risco são informações suas, para lembrar. Confira as condições reais na instituição.");
  showDialog({ danger: f ? btn("fund-delete", "Excluir", { id: f.id, cls: "danger", icon: "trash", attrs: "data-dismiss" }) : "" });
}
function openTransfer(id, kind) {
  const f = state.funds.find((f) => f.id === id);
  if (!f) return;
  modal = { kind: "transfer", id, transferKind: kind };
  $("#modal-title").textContent = kind === "deposit" ? "Guardar em " + f.name : "Resgatar de " + f.name;
  $("#fields").innerHTML =
    `<p class="full lead">Saldo atual: ${amount(F.fundBalance(state, f))}</p>` +
    moneyField("Valor", "value", "", false, "required") +
    field("Quando", "date", "date", today(), false, `required max="${today()}"`);
  showDialog();
}
function openWealthPlan() {
  modal = { kind: "wealth-plan" };
  $("#modal-title").textContent = "Plano da reserva";
  $("#fields").innerHTML =
    moneyField("Quanto custa o seu mês essencial", "essential", state.wealth.essential, true, "required") +
    field("Quantos meses quer cobrir", "months", "number", state.wealth.months, false, 'required min="1" max="24" step="1"') +
    moneyField("Quanto quer guardar por mês", "monthly", state.wealth.monthly, false, "required") +
    hint("Essencial é o que não dá para cortar: moradia, comida, contas e transporte.");
  showDialog();
}
function submitGrowth(e) {
  if (!modal || !["debt", "fund", "transfer", "wealth-plan", "fund-adjust"].includes(modal.kind)) return false;
  const data = new FormData(e.target),
    cash = (name) => F.cents(data.get(name)),
    fail = (message) => {
      $("#form-error").textContent = message;
      return true;
    };
  let message = "Salvo.";
  if (modal.kind === "debt") {
    const d = {
        id: modal.id || uid(),
        name: String(data.get("name") || "").trim(),
        creditor: String(data.get("creditor") || "").trim(),
        start: data.get("start"),
        firstDue: data.get("firstDue"),
        total: cash("total"),
        count: Number(data.get("count")),
        principal: cash("principal") || 0,
      },
      paidCount = Number(data.get("paidCount") || 0),
      old = state.debts.find((x) => x.id === modal.id);
    if (!d.name || !F.valid({ ...state, debts: [d] }) || !Number.isInteger(paidCount) || paidCount < 0 || paidCount > d.count)
      return fail("Confira as datas, o valor total e o número de parcelas. A primeira parcela não pode vencer antes da compra.");
    const changed = old && ["total", "count", "firstDue"].some((k) => old[k] !== d[k]);
    if (changed && !confirm("Recalcular todas as parcelas e desmarcar os pagamentos já confirmados?")) return true;
    if (changed) clearDebtPaid(d.id);
    if (old) state.debts = state.debts.map((x) => (x.id === d.id ? d : x));
    else {
      state.debts.push(d);
      F.debtSchedule(state, d)
        .slice(0, paidCount)
        .forEach((p) => (state.paid[p.id + "@" + p.date.slice(0, 7)] = true));
    }
    selectedDebt = d.id;
    message = old ? "Parcelamento atualizado." : "Parcelamento criado. As parcelas já estão nos meses certos.";
  } else if (modal.kind === "fund") {
    const old = state.funds.find((f) => f.id === modal.id),
      f = {
        id: modal.id || uid(),
        name: String(data.get("name") || "").trim(),
        kind: data.get("kind"),
        product: String(data.get("product") || "").trim(),
        balance: old ? old.balance : cash("balance"),
        adjustment: old?.adjustment || 0,
        liquidity: data.get("liquidity"),
        risk: data.get("risk"),
      };
    if (!f.name || !F.valid({ ...state, funds: old ? state.funds.map((x) => (x.id === f.id ? f : x)) : [...state.funds, f] }))
      return fail("Preencha um nome e um saldo válido.");
    if (old) state.funds = state.funds.map((x) => (x.id === f.id ? f : x));
    else state.funds.push(f);
    message = "Caixinha salva.";
  } else if (modal.kind === "transfer") {
    const f = state.funds.find((f) => f.id === modal.id),
      value = cash("value"),
      date = data.get("date"),
      t = { id: uid(), fundId: f.id, value, date, kind: modal.transferKind };
    if (t.kind === "withdraw" && value > F.fundBalance(state, f)) return fail("O resgate não pode ser maior que o saldo da caixinha.");
    if (!F.valid({ ...state, transfers: [...state.transfers, t] }) || date > today())
      return fail("Informe um valor maior que zero e uma data que já passou.");
    if (
      t.kind === "deposit" &&
      value > Math.max(0, F.availableAfterSaving(state, date.slice(0, 7))) &&
      !confirm("Este valor é maior que o dinheiro recebido e livre deste mês. Você tem esse dinheiro guardado de antes?")
    )
      return true;
    state.transfers.push(t);
    message = t.kind === "deposit" ? "Dinheiro guardado." : "Resgate registrado.";
  } else if (modal.kind === "wealth-plan") {
    const wealth = { essential: cash("essential"), monthly: cash("monthly"), months: Number(data.get("months")) };
    if (!F.valid({ ...state, wealth })) return fail("Informe valores positivos ou zero e de 1 a 24 meses.");
    state.wealth = wealth;
    message = "Plano salvo.";
  } else if (modal.kind === "fund-adjust") {
    const f = state.funds.find((f) => f.id === modal.id),
      target = cash("balance");
    if (!Number.isSafeInteger(target) || target < 0) return fail("Informe um saldo válido.");
    f.adjustment = (f.adjustment || 0) + target - F.fundBalance(state, f);
    message = "Saldo corrigido.";
  }
  $("#dialog").close();
  commit(message);
  return true;
}
function clearDebtPaid(id) {
  Object.keys(state.paid)
    .filter((k) => k.startsWith("debt:" + id + ":"))
    .forEach((k) => delete state.paid[k]);
}
function deleteDebt(id) {
  const d = state.debts.find((x) => x.id === id);
  if (!d) return;
  if (confirm(`Excluir “${d.name}” e todas as ${d.count} parcelas, de todos os meses?`)) {
    clearDebtPaid(id);
    state.debts = state.debts.filter((x) => x.id !== id);
    if (selectedDebt === id) selectedDebt = null;
    commit("Parcelamento excluído.");
  }
}
function handleGrowthAction(a, b) {
  const id = b.dataset.id;
  if ((a === "edit" || a === "delete" || a === "paid") && id?.startsWith("debt:")) {
    const d = state.debts.find((d) => id.startsWith("debt:" + d.id + ":"));
    if (!d) return true;
    if (a === "edit") openDebt(d.id);
    else if (a === "delete") deleteDebt(d.id);
    else {
      state.paid[id + "@" + month] = !state.paid[id + "@" + month];
      commit();
    }
    return true;
  }
  if (a === "debt-count") {
    const input = $('#fields [name="count"]');
    if (input) input.value = b.dataset.id;
    document.querySelectorAll(".count-chips button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    renderDebtPreview();
  } else if (a === "debt-new") openDebt();
  else if (a === "debt-edit") openDebt(id);
  else if (a === "debt-details") {
    selectedDebt = id || null;
    render();
  } else if (a === "debt-close") {
    selectedDebt = null;
    render();
  } else if (a === "debt-delete") deleteDebt(id);
  else if (a === "installment-paid") {
    const key = id + "@" + b.dataset.date.slice(0, 7);
    state.paid[key] = !state.paid[key];
    commit();
  } else if (a === "fund-new") openFund();
  else if (a === "fund-edit") openFund(id);
  else if (a === "wealth-plan") openWealthPlan();
  else if (a === "fund-deposit" || a === "fund-withdraw") openTransfer(id, a === "fund-deposit" ? "deposit" : "withdraw");
  else if (a === "fund-adjust") {
    const f = state.funds.find((f) => f.id === id);
    if (!f) return true;
    modal = { kind: "fund-adjust", id };
    $("#modal-title").textContent = "Corrigir saldo de " + f.name;
    $("#fields").innerHTML =
      moneyField("Saldo real hoje", "balance", F.fundBalance(state, f), true, "required") +
      hint("Use para acertar rendimentos ou diferenças com o banco. Não cria aporte, resgate nem receita no mês.");
    showDialog();
  } else if (a === "fund-delete") {
    const f = state.funds.find((f) => f.id === id);
    if (f && confirm(`Excluir “${f.name}” e todo o histórico de aportes e resgates? O saldo livre dos meses também muda.`)) {
      state.funds = state.funds.filter((x) => x.id !== id);
      state.transfers = state.transfers.filter((t) => t.fundId !== id);
      commit("Caixinha excluída.");
    }
  } else if (a === "transfer-delete") {
    const transfer = state.transfers.find((t) => t.id === id),
      fund = transfer && state.funds.find((f) => f.id === transfer.fundId);
    if (!transfer) return true;
    // Antes, esta conferência usava uma variável inexistente e travava a tela.
    if (transfer.kind === "deposit" && fund && F.fundBalance(state, fund) < transfer.value) {
      toast("Parte deste valor já foi resgatada. Desfaça o resgate antes de remover este aporte.");
      return true;
    }
    if (confirm("Desfazer este movimento?")) {
      state.transfers = state.transfers.filter((t) => t.id !== id);
      commit("Movimento desfeito.");
    }
  } else return false;
  return true;
}
