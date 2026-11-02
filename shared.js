"use strict";
let sharedFilter = "all";
const sharedData = () => state.shared || { profiles: [], items: [] };
const profileColors = ["#8f7cff", "#2fcf98", "#ffad5c", "#ff86c8", "#4fb4ff", "#e5d35a"];
const modeLabels = {
  personal: "Só de um perfil",
  equal: "Dividida igualmente",
  income: "Proporcional à renda",
  percent: "Por porcentagem",
  amount: "Valores combinados",
};
const linkedItems = (id) => sharedData().items.filter((e) => SharedFinance.involves(e, id));
function sharedTransactionRow(e, actions = true) {
  const p = sharedData().profiles.find((p) => p.id === e.profileId),
    item = sharedData().items.find((x) => x.id === e.sharedId),
    split = item && item.mode !== "personal",
    compact = actions === "compact";
  const tags = [
    `<span class="tag profile-tag" style="--c:${esc(p?.color || "#888")}">${esc(p?.name || "Perfil")}</span>`,
    split && !compact ? `<span class="tag">${modeLabels[item.mode]}</span>` : "",
    e.recurring && !compact ? '<span class="tag">Mensal</span>' : "",
  ].join("");
  return `<div class="tx ${e.type} ${e.done ? "done" : ""} ${isLate(e) ? "late" : ""}"><span class="tx-icon" style="--c:${esc(categoryColor(e.category))}">${icon(split ? "split" : e.type === "income" ? "income" : "expense")}</span><div class="tx-main"><strong class="tx-title">${esc(item?.name || e.name)}</strong><div class="tx-meta">${compact ? "" : categoryChip(e.category)}${tags}<span class="due">${dueText(e.date, e.done, e.type)}</span></div></div>${amount(e.value, "tx-value " + (e.type === "income" ? "pos" : ""), e.type === "income" ? "+ " : "− ")}${
    compact
      ? `<div class="tx-actions">${payButton(e, "shared-paid")}</div>`
      : actions
      ? `<div class="tx-actions">${payButton(e, "shared-paid")}${iconBtn("shared-edit", "edit", "Editar " + (item?.name || e.name), e.sharedId)}${iconBtn("shared-delete", "trash", "Excluir " + (item?.name || e.name), e.sharedId, "danger")}</div>`
      : ""
  }</div>`;
}
function openSharedProfile(id) {
  const p = sharedData().profiles.find((p) => p.id === id);
  modal = { kind: "shared-profile", id };
  $("#modal-title").textContent = p ? "Editar perfil" : "Novo perfil";
  $("#fields").innerHTML =
    field("Nome", "name", "text", p?.name || "", true, 'required maxlength="60" placeholder="Ex.: Ana, Bruno ou Casa"') +
    selectField(
      "Tipo",
      "kind",
      [
        ["person", "Pessoa (tem renda própria)"],
        ["pocket", "Carteira de gastos (casa, viagem…)"],
      ],
      p?.kind || "person",
    ) +
    field("Cor", "color", "color", p?.color || profileColors[sharedData().profiles.length % profileColors.length]) +
    hint("Perfis separam o dinheiro de cada pessoa dentro da sua conta. Ninguém precisa de login próprio. Limite de 20 perfis.");
  showDialog({
    danger: p
      ? btn("shared-profile-delete", "Excluir perfil", { id: p.id, cls: "danger", icon: "trash", attrs: "data-dismiss" })
      : "",
  });
}
function openProfileRemoval(id) {
  const p = sharedData().profiles.find((p) => p.id === id);
  if (!p) return;
  const items = linkedItems(id);
  if (!items.length) {
    if (confirm(`Excluir o perfil “${p.name}”?`)) {
      state.shared = { ...sharedData(), profiles: sharedData().profiles.filter((x) => x.id !== id) };
      if (ledgerProfile === id) ledgerProfile = "all";
      commit("Perfil excluído.");
    }
    if ($("#dialog").open && modal?.kind === "shared-profile-remove") $("#dialog").close();
    return;
  }
  modal = { kind: "shared-profile-remove", id };
  const shared = items.filter((e) => e.mode !== "personal").length;
  $("#modal-title").textContent = `Excluir “${p.name}”`;
  $("#fields").innerHTML =
    `<p class="full lead">Este perfil está em ${items.length} ${items.length === 1 ? "lançamento" : "lançamentos"}. Exclua um por um abaixo ou apague o perfil junto com todos eles.</p>` +
    `<div class="full linked-list">${items
      .map(
        (e) =>
          `<div class="linked-row"><div><strong>${esc(e.name)}</strong><span class="muted">${e.type === "income" ? "Receita" : "Despesa"}, ${esc(modeLabels[e.mode].toLowerCase())}${e.recurring ? ", todo mês" : ", " + fullDate(e.date)}</span></div>${amount(e.value)}<div class="tx-actions">${iconBtn("shared-edit", "edit", "Editar " + e.name, e.id)}${iconBtn("shared-delete-all", "trash", "Excluir " + e.name, e.id, "danger")}</div></div>`,
      )
      .join("")}</div>` +
    (shared
      ? hint(`${shared} ${shared === 1 ? "conta é dividida" : "contas são divididas"} com outros perfis. Ao excluir tudo, elas somem para todos os participantes.`)
      : "");
  showDialog({
    noSubmit: true,
    danger: btn("shared-profile-purge", `Excluir perfil e ${items.length} ${items.length === 1 ? "lançamento" : "lançamentos"}`, {
      id,
      cls: "danger",
      icon: "trash",
    }),
  });
}
function openSharedItem(type = "expense", id) {
  const e = sharedData().items.find((e) => e.id === id),
    profiles = sharedData().profiles;
  if (!profiles.length) {
    openSharedProfile();
    return;
  }
  modal = { kind: "shared-item", id };
  $("#modal-title").textContent = e
    ? "Editar lançamento do perfil"
    : type === "income"
      ? "Receita de um perfil"
      : "Despesa de um perfil";
  const current = e?.type || type;
  $("#fields").innerHTML =
    selectField(
      "Tipo",
      "type",
      [
        ["expense", "Despesa"],
        ["income", "Receita"],
      ],
      current,
      false,
      'id="shared-type"',
    ) +
    moneyField("Valor total", "value", e ? e.value : "", false, "required") +
    field("Descrição", "name", "text", e?.name || "", true, 'required maxlength="120" placeholder="Aluguel, salário, mercado, lazer…"') +
    field("Data", "date", "date", e?.date || (month === today().slice(0, 7) ? today() : month + "-01"), false, "required") +
    categoryField(e?.category || (current === "income" ? "Receitas" : "Outros"), current, false, !!e) +
    `<label class="field full"><span class="field-label">Quem paga ou recebe?</span><select name="mode" id="shared-mode">${Object.entries(modeLabels)
      .map(([v, l]) => `<option value="${v}" ${(e?.mode || "personal") === v ? "selected" : ""}>${v === "personal" ? "Um perfil fica com o valor inteiro" : l}</option>`)
      .join("")}</select></label>` +
    `<label class="field full" id="shared-owner"><span class="field-label">Perfil</span><select name="owner">${profiles.map((p) => `<option value="${esc(p.id)}" ${e?.owner === p.id ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select></label>` +
    `<div class="full" id="shared-members"><p class="field-label">Quem participa</p>${profiles
      .map(
        (p) =>
          `<div class="shared-allocation"><label class="check"><input type="checkbox" name="member-${esc(p.id)}" ${e?.members?.includes(p.id) || (!e && p.kind === "person") ? "checked" : ""}><span><i class="dot" style="background:${esc(p.color)}"></i>${esc(p.name)}</span></label><label class="shared-weight"><span class="money-input"><input type="text" inputmode="decimal" name="weight-${esc(p.id)}" value="${e?.weights?.[p.id] !== undefined ? F.plain(e.weights[p.id]) : ""}" placeholder="0" aria-label="Parte de ${esc(p.name)}"><i class="weight-unit" aria-hidden="true"></i></span></label></div>`,
      )
      .join("")}<p class="hint" id="shared-split-hint"></p></div>` +
    checkField("Repetir todo mês", "recurring", e?.recurring) +
    field("Último mês (opcional)", "end", "month", e?.end || "", true) +
    hint(
      e?.recurring
        ? "Editar muda esta conta em todos os meses. Se valor ou divisão mudarem, as confirmações de pagamento são refeitas."
        : "Cada perfil confirma a própria parte, mês a mês.",
    );
  showDialog({
    danger: e ? btn("shared-delete", "Excluir", { id: e.id, cls: "danger", icon: "trash", attrs: "data-dismiss" }) : "",
  });
  updateSharedFields();
}
function updateSharedFields() {
  const mode = $("#shared-mode"),
    type = $("#shared-type");
  if (!mode || !type) return;
  const income = type.value === "income";
  for (const option of mode.options || []) option.disabled = income && option.value !== "personal";
  if (income) mode.value = "personal";
  $("#shared-owner").hidden = mode.value !== "personal";
  $("#shared-members").hidden = mode.value === "personal";
  document.querySelectorAll(".shared-weight").forEach((el) => {
    el.hidden = !["percent", "amount"].includes(mode.value);
  });
  document.querySelectorAll(".weight-unit").forEach((el) => {
    el.textContent = mode.value === "percent" ? "%" : "R$";
  });
  $("#shared-split-hint").textContent =
    mode.value === "percent"
      ? "As porcentagens precisam somar 100%."
      : mode.value === "amount"
        ? "Os valores precisam somar exatamente o total da conta."
        : mode.value === "income"
          ? "Usa as receitas do mês cadastradas em cada pessoa. Sem renda cadastrada, divide igualmente por enquanto."
          : "Os centavos que sobram são distribuídos sem mudar o total.";
}
function removeSharedItem(id) {
  const data = sharedData(),
    candidate = { ...data, items: data.items.filter((e) => e.id !== id) };
  if (!resetProportionalPayments(data, candidate)) return false;
  state.shared = candidate;
  clearSharedPaid(id);
  return true;
}
function clearSharedPaidMonth(id, m) {
  for (const key of Object.keys(state.paid))
    if (key.startsWith("shared:" + id + ":") && key.endsWith("@" + m)) delete state.paid[key];
}
function openSharedRemove(id) {
  const e = sharedData().items.find((x) => x.id === id);
  if (!e) return;
  if (!e.recurring) {
    const parts = e.mode === "personal" ? "" : " A conta será removida para todos os perfis que dividem o valor.";
    if (confirm(`Excluir “${e.name}”?${parts}`) && removeSharedItem(id)) commit("Lançamento excluído.");
    return;
  }
  const start = e.date.slice(0, 7),
    options = [["month", "Só em " + mlabel(month)]];
  if (month > start) options.push(["future", "A partir de " + mlabel(month) + " (mantém os meses anteriores)"]);
  options.push(["all", "Todos os meses, inclusive o histórico"]);
  modal = { kind: "shared-remove", id, month };
  $("#modal-title").textContent = `Excluir “${e.name}”`;
  $("#fields").innerHTML =
    `<fieldset class="choice-list full"><legend class="field-label">O que você quer remover?</legend>${options
      .map(
        ([v, l], i) =>
          `<label class="choice"><input type="radio" name="scope" value="${v}" ${i === 0 ? "checked" : ""}><span>${esc(l)}</span></label>`,
      )
      .join("")}</fieldset>` +
    hint(
      (e.mode === "personal" ? "" : "Vale para todos os perfis que dividem esta conta. ") +
        "Ocultar um mês pode ser desfeito em Ajustar mês.",
    );
  showDialog({ destructive: true });
}
function submitShared(event) {
  if (!modal?.kind?.startsWith("shared-")) return false;
  const form = new FormData(event.target),
    data = sharedData(),
    fail = (msg) => {
      $("#form-error").textContent = msg;
      return true;
    };
  if (modal.kind === "shared-profile-remove") return true;
  if (modal.kind === "shared-remove") {
    const e = data.items.find((x) => x.id === modal.id),
      scope = form.get("scope"),
      m = modal.month;
    if (!e) return true;
    if (scope === "all") {
      if (!removeSharedItem(e.id)) return true;
      $("#dialog").close();
      commit("Lançamento excluído de todos os meses.");
      return true;
    }
    const next =
      scope === "future"
        ? { ...e, end: F.shiftMonth(m, -1) }
        : { ...e, skip: [...new Set([...(e.skip || []), m])].sort() };
    const candidate = { ...data, items: data.items.map((x) => (x.id === e.id ? next : x)) };
    if (!F.valid({ ...state, shared: candidate })) return fail("Não foi possível remover deste mês. Tente excluir a série.");
    if (!resetProportionalPayments(data, candidate)) return true;
    state.shared = candidate;
    if (scope === "month") clearSharedPaidMonth(e.id, m);
    $("#dialog").close();
    commit(scope === "future" ? "Conta encerrada a partir de " + mlabel(m) + "." : "Conta oculta em " + mlabel(m) + ".");
    return true;
  }
  let candidate, resetId;
  if (modal.kind === "shared-profile") {
    const p = {
      id: modal.id || uid(),
      name: String(form.get("name") || "").trim(),
      kind: form.get("kind"),
      color: form.get("color"),
    };
    candidate = {
      ...data,
      profiles: modal.id ? data.profiles.map((x) => (x.id === modal.id ? p : x)) : [...data.profiles, p],
    };
  } else {
    const old = data.items.find((e) => e.id === modal.id),
      e = {
        id: modal.id || uid(),
        name: String(form.get("name") || "").trim(),
        type: form.get("type"),
        value: F.cents(form.get("value")),
        date: form.get("date"),
        category: String(form.get("category") || "").trim(),
        recurring: form.has("recurring"),
        end: form.has("recurring") ? form.get("end") || "" : "",
        mode: form.get("mode"),
        owner: form.get("owner"),
        members: data.profiles.filter((p) => form.has("member-" + p.id)).map((p) => p.id),
        weights: {},
      };
    if (old?.skip?.length && e.recurring) e.skip = [...old.skip];
    for (const id of e.members) e.weights[id] = F.cents(form.get("weight-" + id) || 0);
    if (!Number.isSafeInteger(e.value) || e.value <= 0) return fail("Informe um valor maior que zero. Exemplo: 150,90.");
    candidate = { ...data, items: old ? data.items.map((x) => (x.id === e.id ? e : x)) : [...data.items, e] };
    if (!SharedFinance.valid({ ...state, shared: candidate }))
      return fail(
        "Confira quem participa. Porcentagens precisam somar 100%; valores combinados, o total da conta. Divisão por renda aceita só pessoas.",
      );
    if (old) {
      const changed = ["value", "type", "mode", "owner", "members", "weights", "date", "recurring"].some(
        (k) => JSON.stringify(old[k]) !== JSON.stringify(e[k]),
      );
      if (changed && Object.keys(state.paid).some((k) => k.startsWith("shared:" + e.id + ":") && state.paid[k])) {
        if (!confirm("Esta alteração recalcula as partes e desmarca os pagamentos desta conta em todos os meses. Continuar?"))
          return true;
        resetId = e.id;
      }
    }
  }
  if (!F.valid({ ...state, shared: candidate })) return fail("Confira nome, cor, valores e o limite de 20 perfis.");
  if (!resetProportionalPayments(data, candidate)) return true;
  if (resetId) clearSharedPaid(resetId);
  state.shared = candidate;
  $("#dialog").close();
  commit(modal.kind === "shared-profile" ? "Perfil salvo." : "Lançamento salvo.");
  return true;
}
function clearSharedPaid(id) {
  for (const key of Object.keys(state.paid)) if (key.startsWith("shared:" + id + ":")) delete state.paid[key];
}
function resetProportionalPayments(data, candidate) {
  const before = data.items.filter((e) => e.type === "income"),
    after = candidate.items.filter((e) => e.type === "income");
  if (JSON.stringify(before) === JSON.stringify(after)) return true;
  const ids = data.items.filter((e) => e.mode === "income").map((e) => e.id),
    keys = Object.keys(state.paid).filter(
      (key) => state.paid[key] && ids.some((id) => key.startsWith("shared:" + id + ":")),
    );
  if (!keys.length) return true;
  if (
    !confirm(
      "A renda mudou e as contas proporcionais à renda serão recalculadas. Desmarcar os pagamentos dessas contas para você conferir os novos valores?",
    )
  )
    return false;
  for (const key of keys) delete state.paid[key];
  return true;
}
function handleSharedAction(action, button) {
  if (!action?.startsWith("shared-")) return false;
  const id = button.dataset.id,
    data = sharedData();
  if (action === "shared-profile") openSharedProfile(id);
  else if (action === "shared-new-income") openSharedItem("income");
  else if (action === "shared-new-expense") openSharedItem();
  else if (action === "shared-edit") openSharedItem("expense", id);
  else if (action === "shared-paid") {
    const entry = SharedFinance.entries(state, month).find((x) => x.id === id);
    if (entry?.mode === "income" && !entry.members.some((p) => SharedFinance.income(state, month, p) > 0)) {
      toast("Cadastre a renda dos participantes antes de confirmar esta divisão.");
      return true;
    }
    if (!entry) return true;
    state.paid[id + "@" + month] = !state.paid[id + "@" + month];
    commit();
  } else if (action === "shared-filter") {
    sharedFilter = id;
    render();
  } else if (action === "shared-profile-delete") openProfileRemoval(id);
  else if (action === "shared-profile-purge") {
    const p = data.profiles.find((x) => x.id === id),
      items = linkedItems(id);
    if (!p) return true;
    if (!confirm(`Excluir “${p.name}” e ${items.length} ${items.length === 1 ? "lançamento" : "lançamentos"}? Isso não pode ser desfeito.`))
      return true;
    const ids = new Set(items.map((e) => e.id)),
      candidate = { profiles: data.profiles.filter((x) => x.id !== id), items: data.items.filter((e) => !ids.has(e.id)) };
    if (!resetProportionalPayments(data, candidate)) return true;
    for (const itemId of ids) clearSharedPaid(itemId);
    state.shared = candidate;
    if (ledgerProfile === id) ledgerProfile = "all";
    $("#dialog").close();
    commit("Perfil e lançamentos excluídos.");
  } else if (action === "shared-delete") openSharedRemove(id);
  else if (action === "shared-delete-all") {
    const e = data.items.find((x) => x.id === id),
      reopen = modal?.kind === "shared-profile-remove" ? modal.id : null;
    if (e && confirm(`Excluir “${e.name}”${e.recurring ? " de todos os meses" : ""}?`) && removeSharedItem(id)) {
      save();
      render();
      toast("Lançamento excluído.");
      if (reopen) openProfileRemoval(reopen);
    }
  } else if (action === "shared-stop") {
    const e = data.items.find((e) => e.id === id);
    if (e && month >= e.date.slice(0, 7) && confirm("Manter esta conta até o mês selecionado e encerrar depois dele?")) {
      const candidate = { ...data, items: data.items.map((x) => (x.id === id ? { ...x, end: month } : x)) };
      if (!resetProportionalPayments(data, candidate)) return true;
      state.shared = candidate;
      commit("Conta encerrada depois de " + mlabel(month) + ".");
    }
  } else if (action === "shared-restore-month") {
    const e = data.items.find((x) => x.id === id);
    if (!e) return true;
    const skip = (e.skip || []).filter((m) => m !== month),
      next = { ...e };
    if (skip.length) next.skip = skip;
    else delete next.skip;
    state.shared = { ...data, items: data.items.map((x) => (x.id === id ? next : x)) };
    save();
    render();
    openMonthSettings();
  } else return false;
  return true;
}
document.addEventListener("change", (event) => {
  if (event.target.id === "shared-filter") {
    sharedFilter = event.target.value;
    render();
  } else if (["shared-mode", "shared-type"].includes(event.target.id)) updateSharedFields();
});
