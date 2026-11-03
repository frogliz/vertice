"use strict";
let flowRange = "month";
function applyPrivacyPreference() {
  hideAmounts = Appearance.get().privateStart;
  document.body.classList.toggle("hide-amounts", hideAmounts);
  if (typeof syncPrivacyButton === "function") syncPrivacyButton();
}
function appearanceView() {
  return `${pageHead("Do seu jeito", "Escolha o acabamento do vidro, a luz e a cor. Fica salvo para a próxima vez.")}<article class="panel atelier-panel">${Appearance.panel()}</article>`;
}
function confirmedFlow() {
  const count = F.daysIn(month),
    t = F.totals(state, month),
    all = F.entries(state, month),
    paidShifts = F.shiftPaidList(state),
    points = [];
  for (let i = 1; i <= count; i++) {
    const date = F.dateFor(month, i),
      entries = all.filter((e) => e.done && e.date <= date);
    let value = t.opening + entries.reduce((a, e) => a + (e.type === "income" ? e.value : -e.value), 0);
    value += paidShifts.filter((d) => d.startsWith(month) && d <= date).reduce((a, d) => a + F.rate(d, state.holidays), 0);
    value -= (state.transfers || [])
      .filter((e) => e.date.startsWith(month) && e.date <= date)
      .reduce((a, e) => a + (e.kind === "deposit" ? e.value : -e.value), 0);
    points.push({ date, value });
  }
  return points;
}
const compact = (v) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 }).format(
    v / 100,
  );
// Gráfico de linha com halo, como um traço de caneta sobre vidro. Os pontos ficam no atributo para o cursor.
function lineChart(points, opts) {
  const W = 720,
    H = 220,
    L = 56,
    R = 14,
    T = 16,
    B = 30,
    values = points.map((p) => p.value),
    low = Math.min(0, ...values),
    high = Math.max(10000, ...values),
    spread = high - low || 10000,
    x = (i) => L + (points.length === 1 ? 0 : (i / (points.length - 1)) * (W - L - R)),
    y = (v) => T + (1 - (v - low) / spread) * (H - T - B),
    path = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(" "),
    marker = opts.marker ?? points.length - 1;
  const grid = [0, 0.5, 1]
    .map((n) => {
      const v = low + spread * n;
      return `<path d="M${L} ${y(v).toFixed(1)}H${W - R}" class="grid-line"/><text x="${L - 10}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end">${esc(compact(v))}</text>`;
    })
    .join("");
  const zero = low < 0 ? `<path d="M${L} ${y(0).toFixed(1)}H${W - R}" class="zero-line"/>` : "";
  const labels = opts.labels
    .filter((i) => i < points.length)
    .map((i) => `<text x="${x(i).toFixed(1)}" y="${H - 8}" text-anchor="middle">${esc(points[i].label)}</text>`)
    .join("");
  const data = esc(JSON.stringify(points.map((p, i) => [Number(x(i).toFixed(1)), Number(y(p.value).toFixed(1)), p.tip, F.money(p.value)])));
  return `<div class="line-chart" data-points="${data}" data-w="${W}"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.label)}"><defs><linearGradient id="area-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".22"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>${grid}${zero}<path d="${path} L${x(points.length - 1).toFixed(1)} ${H - B} L${L} ${H - B} Z" fill="url(#area-fill)"/><path d="${path}" class="line-halo" pathLength="1"/><path d="${path}" class="line-ink" pathLength="1"/>${labels}<circle cx="${x(marker).toFixed(1)}" cy="${y(points[marker].value).toFixed(1)}" r="5" class="line-dot"/><g class="cursor" hidden><path d="M0 ${T}V${H - B}" class="cursor-line"/><circle r="6" class="cursor-dot"/></g></svg><div class="chart-tip" hidden></div></div>`;
}
function flowChart() {
  if (flowRange === "half") {
    const points = Array.from({ length: 6 }, (_, i) => {
      const m = F.shiftMonth(month, i - 5),
        t = F.totals(state, m);
      return { label: monthName(m, "short"), value: t.closing, tip: mlabel(m) + ": fechamento" };
    });
    return lineChart(points, { labels: [0, 1, 2, 3, 4, 5], label: "Fechamento previsto nos últimos seis meses" });
  }
  const daily = confirmedFlow(),
    points = daily.map((p) => ({ label: p.date.slice(8), value: p.value, tip: dayLabel(p.date) })),
    now = today(),
    marker = now.startsWith(month) ? Number(now.slice(8)) - 1 : points.length - 1;
  return lineChart(points, {
    labels: [0, 7, 14, 21, points.length - 1],
    marker,
    label: "Saldo confirmado ao longo de " + mlabel(month),
  });
}
function destinations(t) {
  const categories = new Map();
  for (const e of t.list.filter((e) => e.type === "expense")) categories.set(e.category, (categories.get(e.category) || 0) + e.value);
  const sorted = [...categories].sort((a, b) => b[1] - a[1]),
    top = sorted.slice(0, 5),
    others = sorted.slice(5).reduce((a, [, v]) => a + v, 0);
  if (others) top.push(["Outras categorias", others]);
  let from = 0;
  const gradient = top
    .map(([name, value]) => {
      const start = from;
      from += (value / (t.expense || 1)) * 100;
      return `${name === "Outras categorias" ? "var(--ink-4)" : categoryColor(name)} ${start.toFixed(2)}% ${from.toFixed(2)}%`;
    })
    .join(",");
  return `<article class="panel destinations">${panelHead("Para onde vai o dinheiro", "Despesas previstas do mês por categoria.", `<button type="button" class="icon-btn" data-view="categories" aria-label="Abrir categorias" title="Abrir categorias">${icon("open")}</button>`)}${
    top.length
      ? `<div class="donut-wrap"><div class="donut" style="--donut:conic-gradient(${gradient})" role="img" aria-label="Distribuição das despesas por categoria"><div><span>Despesas</span>${amount(t.expense)}</div></div><ul class="donut-legend">${top
          .map(
            ([name, value]) =>
              `<li><i style="background:${name === "Outras categorias" ? "var(--ink-4)" : esc(categoryColor(name))}"></i><span>${esc(name)}</span>${amount(value)}<small>${pct(value, t.expense)}%</small></li>`,
          )
          .join("")}</ul></div>`
      : '<p class="muted">As categorias aparecem aqui quando você cadastrar despesas.</p>'
  }</article>`;
}
function upcomingPanel(t) {
  const pending = t.list
    .filter((e) => !e.done)
    .sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
  const late = pending.filter(isLate).length;
  return `<article class="panel upcoming">${panelHead(
    "Próximos vencimentos",
    pending.length
      ? `${pending.length} ${pending.length === 1 ? "pendente" : "pendentes"}${late ? `, <b class="neg-text">${late} ${late === 1 ? "atrasado" : "atrasados"}</b>` : ""}`
      : "",
    `<button type="button" class="btn ghost" data-view="transactions">Ver todos</button>`,
  )}${
    pending.length
      ? txList(pending.slice(0, 7), "compact", false) +
        (pending.length > 7 ? `<p class="hint more-line">Mais ${pending.length - 7} em Lançamentos.</p>` : "")
      : empty(
          t.list.length ? "Tudo confirmado" : "Nada para pagar ainda",
          t.list.length ? "Todos os lançamentos do mês estão marcados como pagos ou recebidos." : "Os vencimentos aparecem aqui quando você cadastrar contas.",
          t.list.length ? "" : "expense",
          "Adicionar conta",
        )
  }</article>`;
}
function planPanel(t) {
  const budget = F.budgetFor(state, month),
    goal = state.goals[0],
    over = budget && t.expense > budget;
  return `<article class="panel plan">${panelHead("Limite do mês", "", `<button type="button" class="btn ghost" data-action="month-settings">Ajustar</button>`)}${
    budget
      ? `<div class="plan-numbers">${amount(t.expense, over ? "neg" : "")}<span class="muted">de ${amount(budget)}</span></div>${progress(pct(t.expense, budget), over ? "var(--neg)" : "")}<p class="hint">${over ? amount(t.expense - budget) + " acima do limite." : "Ainda cabem " + amount(budget - t.expense) + "."}</p>`
      : `<p class="muted">Defina um teto de despesas para ver quanto ainda cabe no mês.</p>${btn("month-settings", "Definir limite", { cls: "ghost", icon: "plus" })}`
  }<div class="plan-goal">${
    goal
      ? `<div class="goal-mini">${goal.image ? `<img class="goal-thumb" src="${esc(goal.image)}" alt="" referrerpolicy="no-referrer">` : `<div class="goal-ring sm">${goalRing(pct(goal.saved, goal.target))}</div>`}<div><span class="muted">Sua meta</span><strong>${esc(goal.name)}</strong><span>${amount(goal.saved)} de ${amount(goal.target)}</span></div></div><button type="button" class="btn ghost" data-view="goals">Metas</button>`
      : `<span class="muted">Guardando para algo?</span><button type="button" class="btn ghost" data-view="goals">Criar meta</button>`
  }</div></article>`;
}
function peopleSection(people) {
  const head = `<div class="section-head"><div><h2>Pessoas e carteiras</h2><p>Separe a renda e as contas de cada pessoa da casa, ou crie carteiras para viagem, casa e filhos.</p></div><div class="page-actions">${people.length ? btn("shared-new-income", "Receita de um perfil", { cls: "ghost", icon: "income" }) + btn("shared-new-expense", "Dividir despesa", { cls: "ghost", icon: "split" }) : ""}${btn("shared-profile", "Novo perfil", { icon: "plus" })}</div></div>`;
  if (!people.length)
    return `<section class="people">${head}<article class="panel people-empty"><div class="avatars" aria-hidden="true"><span style="--c:#8f7cff">A</span><span style="--c:#2fcf98">B</span><span style="--c:#ffad5c">${icon("plus")}</span></div><div><h3>Dividir as contas da casa</h3><p class="muted">Cadastre cada pessoa, lance a renda de cada uma e divida o aluguel igualmente, por porcentagem ou de acordo com a renda.</p></div>${btn("shared-profile", "Criar o primeiro perfil", { cls: "primary" })}</article></section>`;
  return `<section class="people">${head}<div class="people-grid">${people
    .map(
      (p) =>
        `<article class="panel person" style="--c:${esc(p.color)}"><div class="person-top"><span class="avatar">${esc(p.name.slice(0, 2).toUpperCase())}</span><div><h3>${esc(p.name)}</h3><span class="muted">${p.kind === "person" ? "Pessoa" : "Carteira"}</span></div><div class="tx-actions">${iconBtn("shared-profile", "edit", "Editar perfil " + p.name, p.id)}${iconBtn("shared-profile-delete", "trash", "Excluir perfil " + p.name, p.id, "danger")}</div></div><div class="person-balance"><span class="muted">Sobra prevista</span>${bigAmount(p.balance, "md " + (p.balance < 0 ? "neg" : ""))}</div><div class="split-line"><span>Receitas</span>${amount(p.income, "pos")}</div><div class="split-line"><span>Despesas</span>${amount(p.expense)}</div>${progress(pct(p.paid, p.expense), "var(--c)")}<div class="person-foot"><span class="muted">${p.pending ? amount(p.pending) + " a pagar" : p.expense ? "Tudo pago" : "Sem despesas no mês"}</span><button type="button" class="btn ghost" data-action="profile-ledger" data-id="${esc(p.id)}">Lançamentos</button></div></article>`,
    )
    .join("")}</div></section>`;
}
function onboarding() {
  return `<article class="panel onboarding"><div><h2>Seu mês em três passos</h2><p class="muted">Leva menos de dois minutos. Você pode mudar tudo depois.</p></div><ol class="steps"><li><strong>Quanto entra</strong><span>Salário, vendas, pensão. Marque "Repetir todo mês" no que é fixo.</span>${btn("income", "Adicionar receita", { icon: "income" })}</li><li><strong>Quanto sai</strong><span>Aluguel, mercado, cartão. Parcelas têm um botão próprio.</span>${btn("expense", "Adicionar despesa", { icon: "expense" })}</li><li><strong>Marque ao pagar</strong><span>Toque em Pagar quando o dinheiro sair. O cartão de cima mostra o que sobrou de verdade.</span></li></ol><p class="hint">Quer só olhar antes? ${btn("demo", "Ver um exemplo", { cls: "link" })}</p></article>`;
}
function homeView() {
  const t = F.totals(state, month),
    cash = F.availableAfterSaving(state, month),
    people = SharedFinance.summary(state, month),
    note = F.monthConfig(state, month).note,
    blankMonth = !t.list.length && !t.shiftCount,
    blankAll = blankMonth && !hasRecords();
  const toReceive = t.income - t.received,
    toPay = t.expense - t.paid;
  return `<section class="hero">
    <article class="lens">
      <div class="lens-grain" aria-hidden="true"></div>
      <div class="lens-top"><span class="chip">${esc(mlabel(month))}</span>${btn("month-settings", "Ajustar mês", { cls: "link" })}</div>
      <p class="lens-label">Disponível agora</p>
      ${bigAmount(cash, "xl" + (cash < 0 ? " neg" : ""))}
      <p class="lens-sub">O que já entrou, menos o que você já pagou e guardou.</p>
      <div class="lens-foot">
        <div><span>Fechamento previsto</span>${amount(t.closing, t.closing < 0 ? "neg" : "")}</div>
        <div><span>Falta receber</span>${amount(toReceive)}</div>
        <div><span>Falta pagar</span>${amount(toPay)}</div>
      </div>
    </article>
    <div class="hero-side">
      <article class="panel stat"><div class="stat-top"><span class="stat-icon in">${icon("income")}</span><span>Receitas do mês</span>${iconBtn("income", "plus", "Adicionar receita")}</div>${bigAmount(t.income, "md")}${progress(pct(t.received, t.income), "var(--pos)")}<p class="muted">${amount(t.received)} recebidos</p></article>
      <article class="panel stat"><div class="stat-top"><span class="stat-icon out">${icon("expense")}</span><span>Despesas do mês</span>${iconBtn("expense", "plus", "Adicionar despesa")}</div>${bigAmount(t.expense, "md")}${progress(pct(t.paid, t.expense))}<p class="muted">${amount(t.paid)} pagos</p></article>
    </div>
  </section>
  ${note ? `<div class="month-note">${icon("calendar")}<span>${esc(note)}</span></div>` : ""}
  ${blankAll ? onboarding() : blankMonth ? `<article class="panel quiet-month"><div><h3>${esc(mlabel(month))} ainda está vazio</h3><p class="muted">Contas mensais aparecem sozinhas a partir do mês em que começam. Para trazer avulsos de outro mês, use Copiar.</p></div><div class="row-actions">${btn("month-copy", "Copiar de outro mês", { cls: "ghost", icon: "copy" })}${btn("expense", "Adicionar lançamento", { icon: "plus" })}</div></article>` : ""}
  <section class="home-grid">
    <article class="panel flow">${panelHead(flowRange === "half" ? "Fechamento dos últimos meses" : "Saldo ao longo do mês", flowRange === "half" ? "Quanto sobrou ou faltou no fim de cada mês." : "Só conta o que foi confirmado como pago ou recebido.", `<div class="segmented sm" role="group" aria-label="Período do gráfico"><button type="button" data-action="flow-range" data-id="month" aria-pressed="${flowRange === "month"}">Mês</button><button type="button" data-action="flow-range" data-id="half" aria-pressed="${flowRange === "half"}">6 meses</button></div>`)}${flowChart()}</article>
    ${upcomingPanel(t)}
    ${destinations(t)}
    ${planPanel(t)}
  </section>
  ${peopleSection(people)}`;
}
const helpTopics = [
  [
    "Primeiros passos",
    [
      ["Por onde eu começo?", "Cadastre o que entra (salário, vendas) e o que sai (aluguel, mercado, cartão). No que se repete, marque <b>Repetir todo mês</b>: a conta aparece sozinha nos próximos meses. Depois, toque em <b>Pagar</b> ou <b>Receber</b> quando o dinheiro se mover de verdade."],
      ["O que é “Disponível agora”?", "É o dinheiro que já entrou no mês menos o que você já pagou e guardou em Reservas. Só conta o que foi confirmado. <b>Fechamento previsto</b> é como o mês termina se tudo que está cadastrado acontecer."],
      ["Qual a diferença entre conta mensal, parcela e avulso?", "<b>Avulso</b> acontece uma vez. <b>Mensal</b> se repete todo mês até você encerrar. <b>Parcela</b> vem de uma compra parcelada: você informa o total e o número de parcelas e cada uma entra no mês certo."],
      ["Como mudo o mês que estou vendo?", "Use as setas ao lado do nome do mês, no topo. Tocar no nome abre a lista de meses e anos. Meses futuros servem para planejar."],
    ],
  ],
  [
    "Editar e excluir",
    [
      ["Como excluo um lançamento?", "Toque na lixeira ao lado do lançamento, ou abra Editar e use <b>Excluir</b>. Em uma conta mensal você escolhe: só neste mês, a partir deste mês ou todos os meses. Ocultar só um mês pode ser desfeito em <b>Ajustar mês</b>."],
      ["Como excluo um perfil que tem lançamentos?", "Toque na lixeira do perfil, em Início. Aparece a lista de tudo que está ligado a ele: exclua um por um ou use <b>Excluir perfil e lançamentos</b> para apagar tudo de uma vez."],
      ["Marquei como pago sem querer", "Toque de novo no botão <b>Pago</b>. Ele volta para pendente."],
      ["Por que não consigo excluir uma categoria?", "Categorias usadas em algum lançamento não podem ser excluídas, para não apagar o histórico. Use <b>Arquivar</b>: ela some das novas escolhas e os registros antigos continuam certos."],
    ],
  ],
  [
    "Pessoas e contas divididas",
    [
      ["Como divido uma conta com alguém?", "Em Início, crie um perfil para cada pessoa. Depois use <b>Dividir despesa</b> e escolha como dividir: igualmente, por porcentagem, por valores combinados ou de acordo com a renda de cada um no mês."],
      ["A outra pessoa precisa de uma conta?", "Não. Perfis são divisões dentro da sua conta. Se cada pessoa quiser ver os próprios números no celular, cada uma pode criar a sua conta."],
      ["Para que serve uma carteira?", "Para separar dinheiro com um destino, como a casa, uma viagem ou os filhos, sem ser uma pessoa."],
    ],
  ],
  [
    "Conta, celular e segurança",
    [
      ["Onde meus dados ficam salvos?", "Na conta online, seus registros ficam guardados com segurança e só você tem acesso a eles. Você vê o estado no rodapé do menu: “Salvo na sua conta”. No modo sem conta, tudo fica só neste navegador e se perde se você limpar os dados do navegador."],
      ["Posso usar no celular?", "Sim. No iPhone, abra no Safari, toque em Compartilhar e em <b>Adicionar à Tela de Início</b>. No Android, abra no Chrome, toque no menu e em <b>Instalar app</b> ou <b>Adicionar à tela inicial</b>. Ele abre como um aplicativo."],
      ["Usei em dois aparelhos e apareceu “duas versões”", "Isso acontece quando você altera algo nos dois aparelhos sem internet. Escolha qual versão manter. Se tiver dúvida, baixe um backup antes de escolher."],
      ["Esqueci minha senha", "Na tela de entrada, toque em <b>Esqueci minha senha</b> e abra o link mais recente que chegar no seu e-mail. Confira também o spam."],
      ["O Vértice mexe na minha conta do banco?", "Não. O Vértice não se conecta a bancos e não move dinheiro. Tocar em Pagar só registra que você pagou."],
      ["Como apago meus dados?", "Em Configurações, use <b>Apagar todos os registros</b>. Antes, se quiser, baixe um backup."],
    ],
  ],
];
function helpView() {
  return `${pageHead("Dúvidas comuns", "Toque em uma pergunta para ver a resposta.")}<div class="help-grid">${helpTopics
    .map(
      ([title, items]) =>
        `<section class="panel help-block"><h3>${title}</h3>${items.map(([q, a]) => `<details><summary>${q}${icon("down")}</summary><p>${a}</p></details>`).join("")}</section>`,
    )
    .join("")}</div><p class="hint center">Algo não funcionou? Mande um print da tela para quem te indicou o Vértice.</p>`;
}
function updateChartCursor(chart, clientX) {
  const svg = chart.querySelector("svg"),
    rect = svg.getBoundingClientRect(),
    w = Number(chart.dataset.w),
    points = JSON.parse(chart.dataset.points),
    vx = ((clientX - rect.left) / rect.width) * w;
  let best = 0;
  for (let i = 1; i < points.length; i++) if (Math.abs(points[i][0] - vx) < Math.abs(points[best][0] - vx)) best = i;
  const [px, py, label, value] = points[best],
    cursor = svg.querySelector(".cursor"),
    tip = chart.querySelector(".chart-tip");
  cursor.removeAttribute("hidden");
  cursor.setAttribute("transform", `translate(${px} 0)`);
  cursor.querySelector("circle").setAttribute("cy", py);
  tip.hidden = false;
  tip.innerHTML = `<span>${esc(label)}</span><strong data-private>${esc(value)}</strong>`;
  const left = (px / w) * rect.width;
  tip.style.left = Math.max(8, Math.min(rect.width - tip.offsetWidth - 8, left - tip.offsetWidth / 2)) + "px";
}
document.addEventListener("pointermove", (e) => {
  const chart = e.target.closest?.(".line-chart");
  if (chart) updateChartCursor(chart, e.clientX);
});
document.addEventListener(
  "pointerleave",
  (e) => {
    if (!e.target.classList?.contains("line-chart")) return;
    e.target.querySelector(".cursor")?.setAttribute("hidden", "");
    const tip = e.target.querySelector(".chart-tip");
    if (tip) tip.hidden = true;
  },
  true,
);
document.addEventListener("click", (e) => {
  const b = e.target.closest?.('[data-action="flow-range"]');
  if (!b) return;
  flowRange = b.dataset.id === "half" ? "half" : "month";
  render();
});
