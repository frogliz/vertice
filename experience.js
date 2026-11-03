"use strict";
let categoryQuery = "",
  ledgerCategory = "all",
  ledgerFrequency = "all",
  ledgerProfile = "all",
  ledgerPage = 0,
  hideAmounts = false;
const ownerTools = () => typeof Account !== "undefined" && Account.canUseShifts === true;
function resetWorkspaceContext() {
  if (typeof Appearance !== "undefined") Appearance.detach();
  query = "";
  filter = status = ledgerCategory = ledgerFrequency = ledgerProfile = "all";
  categoryQuery = "";
  ledgerPage = 0;
  sharedFilter = "all";
  selectedDebt = null;
  view = "shared";
  modal = null;
  const dialog = document.querySelector("#dialog");
  dialog?.close();
  for (const selector of ["#main", "#fields", "#form-error"]) {
    const node = document.querySelector(selector);
    if (node) {
      node.innerHTML = "";
      node.textContent = "";
    }
  }
  const name = document.querySelector(".profile-text"),
    avatar = document.querySelector(".avatar");
  if (name) name.textContent = "Meu espaço";
  if (avatar) avatar.textContent = "EU";
}
const catList = () => state.categories || CategoryCatalog.migrate(state);
const categoryColor = (name) => catList().find((c) => c.name === name)?.color || "#8a8a96";
function categoryField(value = "Outros", type = "expense", full = false, preserve = false) {
  const options = catList().filter(
    (c) => (!c.archived && [type, "both"].includes(c.type)) || (preserve && c.name === value),
  );
  if (preserve && !options.some((c) => c.name === value)) options.unshift({ name: value });
  return `<label class="field ${full ? "full" : ""}"><span class="field-label">Categoria</span><select name="category" required>${options.length ? options.map((c) => `<option value="${esc(c.name)}" ${c.name === value ? "selected" : ""}>${esc(c.name)}</option>`).join("") : '<option value="">Cadastre uma categoria ativa</option>'}</select></label>`;
}
function filtersActive() {
  return (
    filter !== "all" ||
    status !== "all" ||
    ledgerCategory !== "all" ||
    ledgerFrequency !== "all" ||
    ledgerProfile !== "all" ||
    !!query
  );
}
function ledgerView() {
  const payroll = shiftPayrollRow(month),
    all = payroll ? [...F.entries(state, month), payroll] : F.entries(state, month);
  let list = all
    .filter(
      (e) =>
        (filter === "all" || e.type === filter) &&
        (status === "all" || (status === "done") === e.done) &&
        (ledgerCategory === "all" || e.category === ledgerCategory) &&
        (ledgerProfile === "all" || e.profileId === ledgerProfile) &&
        (ledgerFrequency === "all" ||
          (ledgerFrequency === "monthly"
            ? e.recurring
            : ledgerFrequency === "installment"
              ? !!e.debtId
              : !e.recurring && !e.debtId)) &&
        `${e.name} ${e.category}`.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")),
    )
    .sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
  const pageSize = 40,
    pages = Math.max(1, Math.ceil(list.length / pageSize));
  ledgerPage = Math.min(ledgerPage, pages - 1);
  const income = list.filter((e) => e.type === "income").reduce((a, e) => a + e.value, 0),
    expense = list.filter((e) => e.type === "expense").reduce((a, e) => a + e.value, 0),
    names = [...new Set(all.map((e) => e.category))].sort((a, b) => a.localeCompare(b)),
    profiles = sharedData().profiles;
  const opt = (v, l, cur) => `<option value="${esc(v)}" ${cur === v ? "selected" : ""}>${esc(l)}</option>`;
  const actions =
    btn("csv", "Exportar", { icon: "download", cls: "ghost" }) +
    btn("month-copy", "Copiar de outro mês", { icon: "copy", cls: "ghost" }) +
    btn("debt-new", "Parcelar compra", { icon: "layers" }) +
    (profiles.length ? btn("shared-new-expense", "Dividir despesa", { icon: "split" }) : "");
  return `${pageHead(esc(mlabel(month)), "Receitas, despesas, contas mensais e parcelas. Toque em Pagar quando o dinheiro sair de verdade.", actions)}
  <div class="summary-strip"><div><span>Receitas</span>${amount(income, "pos")}</div><div><span>Despesas</span>${amount(expense)}</div><div><span>Resultado</span>${amount(income - expense, income - expense < 0 ? "neg" : "pos")}</div></div>
  <div class="filters panel">
    <label class="search">${icon("search")}<input id="search" type="search" placeholder="Buscar por descrição ou categoria" aria-label="Buscar lançamento" value="${esc(query)}"></label>
    <div class="segmented" role="group" aria-label="Tipo">${[
      ["all", "Tudo"],
      ["income", "Receitas"],
      ["expense", "Despesas"],
    ]
      .map(([v, l]) => `<button type="button" data-action="type-filter" data-id="${v}" aria-pressed="${filter === v}">${l}</button>`)
      .join("")}</div>
    <select id="status-filter" aria-label="Situação">${opt("all", "Todas as situações", status)}${opt("pending", "Pendentes", status)}${opt("done", "Confirmados", status)}</select>
    <select id="ledger-category" aria-label="Categoria">${opt("all", "Todas as categorias", ledgerCategory)}${names.map((n) => opt(n, n, ledgerCategory)).join("")}</select>
    <select id="ledger-frequency" aria-label="Frequência">${[
      ["all", "Todas as frequências"],
      ["once", "Só neste mês"],
      ["monthly", "Mensais"],
      ["installment", "Parcelas"],
    ]
      .map(([v, l]) => opt(v, l, ledgerFrequency))
      .join("")}</select>
    ${profiles.length ? `<select id="ledger-profile" aria-label="Perfil">${opt("all", "Todos os perfis", ledgerProfile)}${profiles.map((p) => opt(p.id, p.name, ledgerProfile)).join("")}</select>` : ""}
    ${filtersActive() ? btn("clear-filters", "Limpar filtros", { cls: "link" }) : ""}
  </div>
  <article class="panel ledger">${panelHead("Movimentações", `${list.length} ${list.length === 1 ? "registro" : "registros"}${filtersActive() ? " com os filtros atuais" : ""}`, btn("expense", "Novo", { icon: "plus" }))}${
    list.length
      ? txList(list.slice(ledgerPage * pageSize, (ledgerPage + 1) * pageSize))
      : filtersActive()
        ? empty("Nada encontrado com esses filtros", "Mude a busca ou limpe os filtros para ver tudo do mês.", "clear-filters", "Limpar filtros")
        : empty("Nenhum lançamento neste mês", "Adicione o que entra e o que sai. Contas mensais aparecem sozinhas nos próximos meses.", "expense", "Adicionar lançamento")
  }${pages > 1 ? `<div class="pagination"><button type="button" class="btn ghost" data-action="ledger-page" data-offset="-1" ${ledgerPage === 0 ? "disabled" : ""}>${icon("left")}Anterior</button><span>Página ${ledgerPage + 1} de ${pages}</span><button type="button" class="btn ghost" data-action="ledger-page" data-offset="1" ${ledgerPage === pages - 1 ? "disabled" : ""}>Próxima${icon("right")}</button></div>` : ""}</article>
  ${installmentManager()}`;
}
function installmentManager() {
  const debts = state.debts || [];
  if (!debts.length) return "";
  const rows = debts
    .map((d) => {
      const x = F.debtSummary(state, d, today());
      return `<div class="debt-row"><div class="debt-main"><strong>${esc(d.name)}</strong><span class="muted">${x.paidCount} de ${d.count} pagas, faltam ${amount(x.remaining)}</span>${progress(pct(x.paidCount, d.count))}</div><div class="tx-actions">${btn("debt-details", selectedDebt === d.id ? "Fechar" : "Ver parcelas", { id: selectedDebt === d.id ? "" : d.id, cls: "ghost" })}${iconBtn("debt-edit", "edit", "Editar " + d.name, d.id)}${iconBtn("debt-delete", "trash", "Excluir " + d.name, d.id, "danger")}</div></div>${selectedDebt === d.id ? debtDetails(d) : ""}`;
    })
    .join("");
  return `<article class="panel installments">${panelHead("Compras parceladas", "Cada parcela entra sozinha no mês certo. Excluir remove todas as parcelas.", btn("debt-new", "Parcelar compra", { icon: "plus", cls: "ghost" }))}${rows}</article>`;
}
function categoriesView() {
  const all = catList(),
    list = all.filter((c) => c.name.toLocaleLowerCase("pt-BR").includes(categoryQuery.toLocaleLowerCase("pt-BR"))),
    entries = F.entries(state, month),
    active = list.filter((c) => !c.archived),
    archived = list.filter((c) => c.archived);
  const tile = (c) => {
    const own = entries.filter((e) => e.category === c.name),
      expense = own.filter((e) => e.type === "expense").reduce((a, e) => a + e.value, 0),
      income = own.filter((e) => e.type === "income").reduce((a, e) => a + e.value, 0),
      used = CategoryCatalog.used(state, c.name);
    return `<article class="cat-tile ${c.archived ? "archived" : ""}" style="--c:${esc(c.color)}"><div class="cat-top"><span class="cat-swatch">${esc(c.name.slice(0, 1).toUpperCase())}</span><span class="muted">${c.archived ? "Arquivada" : { both: "Receitas e despesas", income: "Receitas", expense: "Despesas" }[c.type]}</span></div><h3>${esc(c.name)}</h3><div class="cat-value">${amount(expense || income)}<small>${own.length} ${own.length === 1 ? "lançamento" : "lançamentos"} em ${esc(monthName(month))}</small></div><div class="cat-actions">${btn("category-edit", "Editar", { id: c.id, cls: "ghost" })}${btn("category-archive", c.archived ? "Reativar" : "Arquivar", { id: c.id, cls: "ghost" })}${!used ? iconBtn("category-delete", "trash", "Excluir categoria " + c.name, c.id, "danger") : ""}</div></article>`;
  };
  return `${pageHead("Suas categorias", "Nomes e cores para entender para onde o dinheiro vai. Categorias em uso podem ser arquivadas, mas não excluídas, para não apagar o histórico.", btn("category-new", "Nova categoria", { cls: "primary", icon: "plus" }))}<div class="toolbar-row"><label class="search">${icon("search")}<input id="category-search" type="search" placeholder="Buscar categoria" aria-label="Buscar categoria" value="${esc(categoryQuery)}"></label><span class="muted">${all.filter((c) => !c.archived).length} ativas, ${all.filter((c) => c.archived).length} arquivadas</span></div>${active.length ? `<div class="cat-grid">${active.map(tile).join("")}</div>` : `<article class="panel">${empty("Nenhuma categoria encontrada", "Tente outro nome ou crie uma nova.", "category-new", "Nova categoria")}</article>`}${archived.length ? `<details class="archived-block"><summary>Arquivadas (${archived.length})</summary><div class="cat-grid">${archived.map(tile).join("")}</div></details>` : ""}`;
}
function settingsView() {
  return `${typeof profilePanel === "function" ? profilePanel() : ""}<div class="settings-grid">
  <article class="panel">${panelHead("Limite de gastos", "Um teto para as despesas de " + esc(mlabel(month)) + ". Cada mês pode ter o seu.")}<div class="inline-form"><span class="money-input"><i aria-hidden="true">R$</i><input id="budget" type="text" inputmode="decimal" autocomplete="off" aria-label="Limite de despesas" value="${esc(F.plain(F.budgetFor(state, month)))}"></span>${btn("budget", "Salvar limite", { cls: "primary" })}</div><div class="row-actions">${btn("month-settings", "Saldo inicial e lembrete do mês", { cls: "link" })}</div></article>
  <article class="panel">${panelHead("Cópia dos seus dados", "Guarde um arquivo com tudo. Ele restaura seus registros em qualquer aparelho.")}<div class="row-actions">${btn("backup", "Baixar backup", { cls: "primary", icon: "download" })}${btn("import", "Restaurar backup", { icon: "upload" })}${btn("csv", "Planilha do mês (CSV)", { cls: "ghost", icon: "download" })}</div><p class="hint">Restaurar substitui os registros atuais, sempre com confirmação.</p></article>
  <article class="panel">${panelHead("Privacidade na tela", "Útil para abrir o app em público ou mostrar a tela para alguém.")}<div class="row-actions">${btn("privacy", hideAmounts ? "Mostrar valores" : "Ocultar valores", { icon: hideAmounts ? "eye" : "eyeOff" })}${btn("appearance-page", "Começar sempre oculto", { cls: "link" })}</div><p class="hint">Ocultar borra os valores na tela. Não é criptografia: em computador compartilhado, saia da conta ao terminar.</p></article>
  <article class="panel">${panelHead("Desempenho", "No modo leve, o visual continua o mesmo, sem os efeitos que pesam em computador simples e celular.")}<div class="segmented" role="group" aria-label="Desempenho"><button type="button" data-theme-perf="full" aria-pressed="${Appearance.get().performance !== "lite"}">Vidro completo</button><button type="button" data-theme-perf="lite" aria-pressed="${Appearance.get().performance === "lite"}">Leve e rápido</button></div><p class="hint">Atalhos no computador: N cria um lançamento, as setas trocam o mês e / busca nos lançamentos.</p></article>
  <article class="panel">${panelHead("Aparência", "Estilo do vidro, claro ou escuro, cor de destaque.")}<div class="row-actions">${btn("appearance-page", "Abrir o Ateliê visual", { icon: "appearance" })}</div><p class="hint">Estilo atual: <b data-current-style>${AppearanceModel.styles[Appearance.get().style].name}</b>.</p></article>
  ${ownerTools() ? `<article class="panel">${panelHead("Área do proprietário", "Sua escala de plantões aparece só para a sua conta.")}<div class="row-actions"><button type="button" class="btn" data-view="shifts">${icon("shifts")}Abrir plantões</button></div></article>` : ""}
  <article class="panel danger-zone">${panelHead("Recomeçar", "Carregue um exemplo para conhecer as funções ou apague os registros desta conta. Baixe um backup antes.")}<div class="row-actions">${btn("demo", "Carregar exemplo", { cls: "ghost" })}${btn("reset", "Apagar todos os registros", { cls: "danger", icon: "trash" })}</div></article>
  </div>`;
}
function openCategory(id) {
  const c = catList().find((c) => c.id === id);
  modal = { kind: "category", id };
  $("#modal-title").textContent = c ? "Editar categoria" : "Nova categoria";
  $("#fields").innerHTML =
    field("Nome", "name", "text", c?.name || "", true, 'required maxlength="60" placeholder="Ex.: Casa, Pets, Freelance"') +
    selectField(
      "Usar em",
      "type",
      [
        ["both", "Receitas e despesas"],
        ["expense", "Despesas"],
        ["income", "Receitas"],
      ],
      c?.type || "both",
    ) +
    field("Cor", "color", "color", c?.color || CategoryCatalog.palette[catList().length % 6]) +
    (c ? hint("Mudar o nome atualiza todos os lançamentos que usam esta categoria.") : "");
  const used = c && CategoryCatalog.used(state, c.name);
  showDialog({
    danger: c
      ? used
        ? btn("category-archive", c.archived ? "Reativar" : "Arquivar", { id: c.id, cls: "ghost", icon: "archive", attrs: "data-dismiss" })
        : btn("category-delete", "Excluir", { id: c.id, cls: "danger", icon: "trash", attrs: "data-dismiss" })
      : "",
  });
}
function submitCategory(e) {
  if (modal?.kind !== "category") return false;
  const d = new FormData(e.target),
    old = catList().find((c) => c.id === modal.id),
    next = {
      id: old?.id || uid(),
      name: String(d.get("name") || "").trim(),
      type: d.get("type"),
      color: d.get("color"),
      archived: old?.archived || false,
    },
    categories = old ? catList().map((c) => (c.id === old.id ? next : c)) : [...catList(), next];
  if (!CategoryCatalog.valid({ categories })) {
    $("#form-error").textContent = "Use um nome que ainda não existe, com até 60 letras. O limite é de 200 categorias.";
    return true;
  }
  if (old && old.name !== next.name && old.name === "Parcelas" && (state.debts || []).length) {
    $("#form-error").textContent = "A categoria Parcelas é usada pelas compras parceladas.";
    return true;
  }
  if (old) CategoryCatalog.rename(state, old.name, next.name);
  state.categories = categories;
  $("#dialog").close();
  commit("Categoria salva.");
  return true;
}
function handleExperienceAction(a, b) {
  if (a === "privacy") {
    hideAmounts = !hideAmounts;
    document.body.classList.toggle("hide-amounts", hideAmounts);
    render();
  } else if (a === "appearance-page") {
    view = "appearance";
    render();
  } else if (a === "type-filter") {
    filter = b.dataset.id || "all";
    ledgerPage = 0;
    render();
  } else if (a === "category-new") openCategory();
  else if (a === "category-edit") openCategory(b.dataset.id);
  else if (a === "category-archive") {
    const c = catList().find((c) => c.id === b.dataset.id);
    if (!c) return true;
    c.archived = !c.archived;
    commit(c.archived ? "Categoria arquivada." : "Categoria reativada.");
  } else if (a === "category-delete") {
    const c = catList().find((c) => c.id === b.dataset.id);
    if (!c) return true;
    if (CategoryCatalog.used(state, c.name)) {
      toast("Esta categoria tem lançamentos. Arquive para manter o histórico.");
      return true;
    }
    if (confirm("Excluir a categoria " + c.name + "?")) {
      state.categories = catList().filter((x) => x.id !== c.id);
      commit("Categoria excluída.");
    }
  } else if (a === "profile-ledger") {
    ledgerProfile = b.dataset.id;
    view = "transactions";
    render();
  } else if (a === "ledger-page") {
    ledgerPage = Math.max(0, ledgerPage + Number(b.dataset.offset));
    render();
  } else if (a === "clear-filters") {
    ledgerCategory = ledgerFrequency = ledgerProfile = filter = status = "all";
    query = "";
    ledgerPage = 0;
    render();
  } else return false;
  return true;
}
document.addEventListener("change", (e) => {
  const keys = {
    "ledger-category": (v) => (ledgerCategory = v),
    "ledger-frequency": (v) => (ledgerFrequency = v),
    "ledger-profile": (v) => (ledgerProfile = v),
  };
  if (keys[e.target.id]) {
    keys[e.target.id](e.target.value);
    ledgerPage = 0;
    render();
  }
  if (e.target.name === "type" && modal?.kind === "entry") {
    const el = document.querySelector('#fields select[name="category"]'),
      value = el?.value,
      wrap = el?.closest?.(".field");
    if (wrap) wrap.outerHTML = categoryField(value, e.target.value, true);
    const done = document.querySelector('#fields input[name="done"] + span');
    if (done?.firstChild) done.firstChild.textContent = e.target.value === "income" ? "Já recebi neste mês" : "Já paguei neste mês";
    const title = document.querySelector("#modal-title");
    if (title && !modal.id) title.textContent = e.target.value === "income" ? "Nova receita" : "Nova despesa";
  }
});
document.addEventListener("input", (e) => {
  if (e.target.id === "category-search") {
    const pos = e.target.selectionStart;
    categoryQuery = e.target.value;
    render();
    $("#category-search").focus();
    $("#category-search").setSelectionRange(pos, pos);
  }
});
