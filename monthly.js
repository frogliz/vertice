"use strict";
let pickerYear = null;
function restoreMonthSelection() {
  try {
    const selected = sessionStorage.getItem("vertice-selected-month");
    if (selected && /^\d{4}-(0[1-9]|1[0-2])$/.test(selected) && Number(selected.slice(0, 4)) >= 1900) month = selected;
  } catch (e) {}
}
function setMonth(value) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value) || Number(value.slice(0, 4)) < 1900) return;
  month = value;
  query = "";
  holidayMode = false;
  selectedDebt = null;
  render();
  try {
    sessionStorage.setItem("vertice-selected-month", month);
  } catch (e) {}
}
function yearBars(rows) {
  const max = Math.max(10000, ...rows.flatMap((t) => [t.income, t.expense]));
  const w = 720,
    h = 180,
    step = w / 12;
  return `<svg class="year-bars" viewBox="0 0 ${w} ${h + 26}" role="img" aria-label="Receitas e despesas de cada mês">${[0.25, 0.5, 0.75, 1]
    .map((n) => `<path d="M0 ${(h - h * n).toFixed(1)}H${w}" class="grid-line"/>`)
    .join("")}${rows
    .map((t, i) => {
      const x = i * step + step / 2,
        hi = (t.income / max) * (h - 6),
        he = (t.expense / max) * (h - 6),
        sel = t.m === month;
      return `<g class="${sel ? "sel" : ""}" style="--i:${i}"><rect x="${(x - 13).toFixed(1)}" y="${(h - hi).toFixed(1)}" width="11" height="${Math.max(1.5, hi).toFixed(1)}" rx="5.5" class="bar-in"/><rect x="${(x + 2).toFixed(1)}" y="${(h - he).toFixed(1)}" width="11" height="${Math.max(1.5, he).toFixed(1)}" rx="5.5" class="bar-out"/><text x="${x.toFixed(1)}" y="${h + 20}" text-anchor="middle">${monthName(t.m, "short")}</text><rect x="${(x - step / 2).toFixed(1)}" y="0" width="${step.toFixed(1)}" height="${h + 26}" fill="transparent" data-action="jump-month" data-month="${t.m}"><title>${esc(mlabel(t.m))}: receitas ${esc(F.money(t.income))}, despesas ${esc(F.money(t.expense))}</title></rect></g>`;
    })
    .join("")}</svg>`;
}
function yearView() {
  const year = month.slice(0, 4),
    months = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`),
    rows = months.map((m) => ({ m, ...F.totals(state, m) })),
    income = rows.reduce((a, t) => a + t.income, 0),
    expense = rows.reduce((a, t) => a + t.expense, 0),
    projection = F.timeline(state, month, 6);
  const controls = `<div class="year-switch" role="group" aria-label="Ano"><button type="button" class="icon-btn" data-action="year-shift" data-offset="-1" aria-label="Ano anterior">${icon("left")}</button><strong>${year}</strong><button type="button" class="icon-btn" data-action="year-shift" data-offset="1" aria-label="Próximo ano">${icon("right")}</button></div>`;
  return `${pageHead("O ano inteiro", "Toque em um mês para abri-lo. Os valores vêm do que você cadastrou.", controls)}
  <div class="summary-strip"><div><span>Receitas em ${year}</span>${amount(income, "pos")}</div><div><span>Despesas em ${year}</span>${amount(expense)}</div><div><span>Resultado do ano</span>${amount(income - expense, income - expense < 0 ? "neg" : "pos")}</div></div>
  <article class="panel">${panelHead("Mês a mês", "", '<div class="legend"><span><i class="in"></i>Receitas</span><span><i class="out"></i>Despesas</span></div>')}<div class="chart-scroll">${yearBars(rows)}</div></article>
  <section class="year-grid">${rows
    .map((t) => {
      const active = t.m === month,
        hasData = t.list.length || t.shiftCount;
      return `<button type="button" class="year-card ${active ? "selected" : ""}" data-action="jump-month" data-month="${t.m}" aria-label="Abrir ${esc(mlabel(t.m))}"><span class="year-card-head"><strong>${monthName(t.m)}</strong>${active ? '<span class="chip">Aberto</span>' : t.m === today().slice(0, 7) ? '<span class="chip soft">Atual</span>' : ""}</span>${amount(t.closing, "year-card-total " + (t.closing < 0 ? "neg" : ""))}<span class="year-card-detail"><span>Receitas</span>${amount(t.income)}</span><span class="year-card-detail"><span>Despesas</span>${amount(t.expense)}</span><span class="year-card-foot">${hasData ? t.list.length + (t.list.length === 1 ? " lançamento" : " lançamentos") + (ownerTools() && t.shiftCount ? ", " + t.shiftCount + " plantões" : "") : "Nada cadastrado"}</span></button>`;
    })
    .join("")}</section>
  <article class="panel">${panelHead("Próximos 6 meses a partir de " + esc(mlabel(month)), "O saldo que sobra em um mês passa para o seguinte. Um saldo inicial informado em Ajustar mês substitui essa conta.")}<div class="table-scroll"><table class="data-table"><thead><tr><th>Mês</th><th>Começa com</th><th>Receitas</th><th>Despesas</th><th>Termina com</th></tr></thead><tbody>${projection
    .map(
      (t) =>
        `<tr><td><button type="button" class="link" data-action="jump-month" data-month="${t.month}">${esc(mlabel(t.month))}</button></td><td>${amount(t.projectedOpening)}${t.explicitOpening ? ' <span class="tag">informado</span>' : ""}</td><td>${amount(t.income)}</td><td>${amount(t.expense)}</td><td>${amount(t.projectedClosing, t.projectedClosing < 0 ? "neg" : "pos")}</td></tr>`,
    )
    .join("")}</tbody></table></div><p class="hint">A projeção não inclui gastos que ainda não foram cadastrados nem o saldo do banco, a menos que você informe o saldo inicial do mês.</p></article>`;
}
function openMonthPicker(year) {
  pickerYear = Number(year || month.slice(0, 4));
  modal = { kind: "month-picker" };
  $("#modal-title").textContent = "Escolha o mês";
  $("#fields").innerHTML = `<div class="picker-year full"><button type="button" class="icon-btn" data-action="picker-year" data-offset="-1" aria-label="Ano anterior">${icon("left")}</button><input id="picker-year-input" type="number" min="1900" max="9999" value="${pickerYear}" aria-label="Ano"><button type="button" class="icon-btn" data-action="picker-year" data-offset="1" aria-label="Próximo ano">${icon("right")}</button></div><div class="picker-months full">${Array.from(
    { length: 12 },
    (_, i) => {
      const m = `${pickerYear}-${String(i + 1).padStart(2, "0")}`;
      return `<button type="button" class="${m === month ? "selected" : ""} ${m === today().slice(0, 7) ? "is-now" : ""}" data-action="pick-month" data-month="${m}">${monthName(m, "short")}</button>`;
    },
  ).join("")}</div>${month !== today().slice(0, 7) ? `<div class="full center">${btn("month-now", "Voltar para o mês atual", { cls: "link" })}</div>` : ""}`;
  showDialog({ noSubmit: true });
}
function openMonthSettings() {
  const config = F.monthConfig(state, month),
    skipped = state.entries.filter((e) => state.overrides?.[e.id + "@" + month]?.skipped),
    sharedSkipped = (state.shared?.items || []).filter((e) => (e.skip || []).includes(month));
  modal = { kind: "month-settings", month };
  $("#modal-title").textContent = "Ajustar " + mlabel(month);
  $("#fields").innerHTML =
    moneyField(
      "Dinheiro que você tinha no começo do mês",
      "opening",
      config.opening === undefined ? "" : config.opening,
      true,
      'placeholder="Deixe vazio se não souber"',
    ) +
    moneyField("Limite de despesas deste mês", "budget", F.budgetFor(state, month), true, "required") +
    field("Lembrete do mês", "note", "text", config.note || "", true, 'maxlength="500" placeholder="Ex.: separar dinheiro para a viagem"') +
    hint("O saldo inicial é o dinheiro fora das reservas antes das movimentações do mês. Estes ajustes não mudam outros meses.") +
    (skipped.length || sharedSkipped.length
      ? `<div class="full linked-list"><p class="field-label">Contas ocultas neste mês</p>${skipped
          .map((e) => `<div class="linked-row"><div><strong>${esc(e.name)}</strong></div>${btn("restore-month-entry", "Mostrar de novo", { id: e.id, cls: "ghost", icon: "restore" })}</div>`)
          .join("")}${sharedSkipped
          .map((e) => `<div class="linked-row"><div><strong>${esc(e.name)}</strong><span class="muted">Conta de perfil</span></div>${btn("shared-restore-month", "Mostrar de novo", { id: e.id, cls: "ghost", icon: "restore" })}</div>`)
          .join("")}</div>`
      : "");
  showDialog();
}
function openMonthlyEntry(id) {
  const base = state.entries.find((e) => e.id === id),
    e = F.resolveEntry(state, base, month);
  modal = { kind: "monthly-entry", id, month };
  $("#modal-title").textContent = "Editar conta mensal";
  $("#fields").innerHTML =
    `<fieldset class="choice-list full"><legend class="field-label">Aplicar a mudança em</legend><label class="choice"><input type="radio" name="scope" value="month" checked><span>Só em ${esc(mlabel(month))}</span></label><label class="choice"><input type="radio" name="scope" value="future"><span>Neste mês e nos próximos</span></label></fieldset>` +
    field("Descrição", "name", "text", e.name, true, 'required maxlength="120"') +
    moneyField("Valor", "value", e.value, false, "required") +
    field("Dia do vencimento", "day", "number", e.day || Number(base.date.slice(8)), false, 'required min="1" max="31" step="1"') +
    categoryField(e.category, e.type, true, true) +
    checkField(e.type === "income" ? "Recebido neste mês" : "Pago neste mês", "done", e.done) +
    hint("Os meses anteriores não mudam. Para mudar o tipo ou o mês de início, exclua e cadastre de novo.");
  showDialog({ danger: btn("delete", "Excluir", { id, cls: "danger", icon: "trash", attrs: "data-dismiss" }) });
}
function openRemoveRecurring(id) {
  const e = state.entries.find((x) => x.id === id);
  modal = { kind: "remove-recurring", id, month };
  $("#modal-title").textContent = `Excluir “${e?.name || "conta"}”`;
  const options = [["month", "Só em " + mlabel(month) + " (dá para desfazer)"]];
  if (e && month > e.date.slice(0, 7)) options.push(["future", "A partir de " + mlabel(month) + " (mantém os meses anteriores)"]);
  options.push(["all", "Todos os meses, inclusive o histórico"]);
  $("#fields").innerHTML =
    `<fieldset class="choice-list full"><legend class="field-label">O que você quer remover?</legend>${options
      .map(
        ([v, l], i) =>
          `<label class="choice"><input type="radio" name="scope" value="${v}" ${i === 0 ? "checked" : ""}><span>${esc(l)}</span></label>`,
      )
      .join("")}</fieldset>` + hint("Uma conta oculta em um mês pode voltar pelo botão Ajustar mês.");
  showDialog({ destructive: true });
}
function openCopyMonth() {
  modal = { kind: "month-copy", month };
  $("#modal-title").textContent = "Copiar lançamentos para " + mlabel(month);
  $("#fields").innerHTML =
    field("Copiar de qual mês?", "source", "month", F.shiftMonth(month, -1), true, "required") +
    checkField("Receitas e despesas que não se repetem", "entries", true) +
    (ownerTools() ? checkField("Os mesmos dias de plantão", "shifts", false) : "") +
    hint(
      "Contas mensais e parcelas já aparecem sozinhas. As cópias chegam como pendentes e não substituem nada. Copiar duas vezes não duplica." +
        (ownerTools() ? " Plantões seguem o número do dia; feriados não são copiados." : ""),
    );
  showDialog();
}
function copyMonthData(s, source, destination, options, idFactory) {
  let added = 0;
  const list = F.entries(s, source).filter((e) => !e.recurring && !e.debtId && !e.sharedId);
  if (options.entries) {
    for (const e of list) {
      const copyRoot = e.copyRoot || e.id,
        copyKey = copyRoot + "@" + destination;
      if (s.entries.some((x) => x.copyKey === copyKey || (x.id === e.id && x.date.slice(0, 7) === destination))) continue;
      const { done, adjusted, ...plain } = e;
      s.entries.push({
        ...plain,
        id: idFactory(),
        date: F.dateFor(destination, Number(e.date.slice(8))),
        recurring: false,
        end: "",
        copyRoot,
        copyKey,
      });
      added++;
    }
    if (s.shared)
      for (const e of [...s.shared.items].filter((e) => !e.recurring && e.date.slice(0, 7) === source)) {
        const copyRoot = e.copyRoot || e.id,
          copyKey = copyRoot + "@" + destination;
        if (s.shared.items.some((x) => x.copyKey === copyKey || (x.id === e.id && x.date.slice(0, 7) === destination))) continue;
        s.shared.items.push({
          ...JSON.parse(JSON.stringify(e)),
          id: idFactory(),
          date: F.dateFor(destination, Number(e.date.slice(8))),
          end: "",
          copyRoot,
          copyKey,
        });
        added++;
      }
  }
  if (options.shifts)
    for (const date of s.shifts.filter((d) => d.slice(0, 7) === source)) {
      const day = Number(date.slice(8));
      if (day > F.daysIn(destination)) continue;
      const target = F.dateFor(destination, day);
      if (!s.shifts.includes(target)) {
        s.shifts.push(target);
        added++;
      }
    }
  return added;
}
function submitMonthly(e) {
  if (!modal || !["monthly-entry", "month-settings", "remove-recurring", "month-copy", "month-picker"].includes(modal.kind))
    return false;
  const d = new FormData(e.target),
    fail = (msg) => {
      $("#form-error").textContent = msg;
      return true;
    },
    m = modal.month || month;
  if (modal.kind === "month-picker") return true;
  if (modal.kind === "month-settings") {
    const config = { budget: F.cents(d.get("budget")), note: String(d.get("note") || "").trim() };
    if (d.get("opening") !== "" && d.get("opening") !== null) config.opening = F.cents(d.get("opening"));
    if (!F.valid({ ...state, monthSettings: { ...state.monthSettings, [m]: config } }))
      return fail("Informe valores válidos e um limite maior ou igual a zero.");
    state.monthSettings[m] = config;
  } else if (modal.kind === "monthly-entry") {
    const base = state.entries.find((x) => x.id === modal.id),
      patch = {
        name: String(d.get("name") || "").trim(),
        category: String(d.get("category") || "").trim(),
        value: F.cents(d.get("value")),
        day: Number(d.get("day")),
      };
    if (!patch.category || !F.valid({ ...state, overrides: { ...state.overrides, [base.id + "@" + m]: patch } }))
      return fail("Confira descrição, valor (maior que zero), categoria e dia entre 1 e 31.");
    if (d.get("scope") === "future") {
      base.revisions = [...(base.revisions || []).filter((r) => r.from !== m), { ...patch, from: m }];
      delete state.overrides[base.id + "@" + m];
    } else state.overrides[base.id + "@" + m] = patch;
    state.paid[base.id + "@" + m] = d.has("done");
  } else if (modal.kind === "remove-recurring") {
    const entry = state.entries.find((x) => x.id === modal.id),
      scope = d.get("scope");
    if (!entry) return fail("Esta conta não existe mais.");
    if (scope === "month")
      state.overrides[entry.id + "@" + m] = { ...(state.overrides[entry.id + "@" + m] || {}), skipped: true };
    else if (scope === "future") entry.end = F.shiftMonth(m, -1);
    else {
      if (!confirm(`Excluir “${entry.name}” de todos os meses, inclusive o histórico?`)) return true;
      state.entries = state.entries.filter((x) => x.id !== entry.id);
      for (const key of Object.keys(state.overrides)) if (key.startsWith(entry.id + "@")) delete state.overrides[key];
      for (const key of Object.keys(state.paid)) if (key.startsWith(entry.id + "@")) delete state.paid[key];
    }
    $("#dialog").close();
    commit(scope === "month" ? "Conta oculta em " + mlabel(m) + "." : scope === "future" ? "Conta encerrada a partir de " + mlabel(m) + "." : "Conta excluída de todos os meses.");
    return true;
  } else if (modal.kind === "month-copy") {
    const source = d.get("source");
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(source) || source === m) return fail("Escolha um mês diferente deste.");
    if (!d.has("entries") && !(d.has("shifts") && ownerTools())) return fail("Marque pelo menos uma opção.");
    const count = copyMonthData(state, source, m, { entries: d.has("entries"), shifts: d.has("shifts") && ownerTools() }, uid);
    $("#dialog").close();
    commit(count ? count + (count === 1 ? " registro copiado." : " registros copiados.") : "Não havia nada novo para copiar.");
    return true;
  }
  $("#dialog").close();
  commit("Ajuste salvo para " + mlabel(m) + ".");
  return true;
}
function handleMonthAction(a, b) {
  const id = b.dataset.id;
  if (a === "income") openEntry("income");
  else if (a === "month-now") {
    if ($("#dialog").open) $("#dialog").close();
    setMonth(today().slice(0, 7));
  } else if (a === "month-settings") openMonthSettings();
  else if (a === "month-picker") openMonthPicker();
  else if (a === "month-copy") openCopyMonth();
  else if (a === "picker-year") {
    const next = pickerYear + Number(b.dataset.offset);
    if (next >= 1900 && next <= 9999) openMonthPicker(next);
  } else if (a === "pick-month") {
    $("#dialog").close();
    setMonth(b.dataset.month);
  } else if (a === "jump-month") {
    view = "shared";
    setMonth(b.dataset.month);
  } else if (a === "year-shift") {
    const next = Number(month.slice(0, 4)) + Number(b.dataset.offset);
    if (next >= 1900 && next <= 9999) setMonth(next + month.slice(4));
  } else if (a === "restore-month-entry") {
    const key = id + "@" + month;
    if (state.overrides[key]) {
      delete state.overrides[key].skipped;
      if (!Object.keys(state.overrides[key]).length) delete state.overrides[key];
    }
    save();
    render();
    openMonthSettings();
  } else if (a === "edit" && state.entries.find((e) => e.id === id)?.recurring) openMonthlyEntry(id);
  else if (a === "delete" && state.entries.find((e) => e.id === id)?.recurring) openRemoveRecurring(id);
  else if (a === "budget") {
    const budget = F.cents($("#budget").value);
    if (!Number.isSafeInteger(budget) || budget < 0) {
      toast("Informe um limite válido. Exemplo: 2.500,00.");
      return true;
    }
    state.monthSettings[month] = { ...F.monthConfig(state, month), budget };
    commit("Limite salvo para " + mlabel(month) + ".");
  } else return false;
  return true;
}
document.addEventListener("change", (e) => {
  if (e.target.id === "picker-year-input") {
    const year = Number(e.target.value);
    if (Number.isInteger(year) && year >= 1900 && year <= 9999) openMonthPicker(year);
  }
});
