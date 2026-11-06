const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
require("./appearance-model.js");
require("./catalog.js");
require("./security.js");
require("./shared-engine.js");
require("./engine.js");
const F = globalThis.Finance;
let checks = 0;
function test(name, fn) {
  fn();
  checks++;
  console.log("OK " + name);
}
const blank = () => ({
  version: 1,
  entries: [],
  shifts: [],
  shiftPaid: [],
  holidays: [],
  paid: {},
  goals: [],
  budget: 0,
});
test("Plantões: útil 50, sábado/domingo 100 e feriado útil 100", () => {
  assert.equal(F.rate("2026-10-23", []), 5000);
  assert.equal(F.rate("2026-10-24", []), 10000);
  assert.equal(F.rate("2026-10-25", []), 10000);
  assert.equal(F.rate("2026-10-23", ["2026-10-23"]), 10000);
});
test("Feriado no fim de semana não dobra a tarifa", () => assert.equal(F.rate("2026-10-24", ["2026-10-24"]), 10000));
test("Calendário: virada do ano e fevereiro bissexto", () => {
  assert.equal(F.shiftMonth("2026-12", 1), "2027-01");
  assert.equal(F.shiftMonth("2026-01", -1), "2025-12");
  assert.equal(F.dateFor("2028-02", 31), "2028-02-29");
  assert.equal(F.dateFor("2027-02", 31), "2027-02-28");
});
const s = blank();
s.entries = [
  {
    id: "salary",
    name: "Salário",
    type: "income",
    value: 300000,
    date: "2026-10-05",
    recurring: true,
    end: "",
    category: "Receitas",
  },
  {
    id: "rent",
    name: "Aluguel",
    type: "expense",
    value: 100000,
    date: "2026-10-31",
    recurring: true,
    end: "2027-02",
    category: "Moradia",
  },
  {
    id: "market",
    name: "Mercado",
    type: "expense",
    value: 50000,
    date: "2026-10-15",
    recurring: false,
    end: "",
    category: "Alimentação",
  },
];
s.shifts = ["2026-10-23", "2026-10-24"];
s.shiftPaid = ["2026-10-23"];
s.paid = { "salary@2026-10": true, "rent@2026-10": true };
test("Saldo previsto inclui plantões, disponível considera confirmações", () => {
  const t = F.totals(s, "2026-10");
  assert.equal(t.income, 315000);
  assert.equal(t.expense, 150000);
  assert.equal(t.balance, 165000);
  assert.equal(t.available, 205000);
  assert.equal(t.shiftTotal, 15000);
});
test("Recorrência respeita início, fim e vencimento no dia 31", () => {
  assert.equal(F.entries(s, "2026-09").length, 0);
  assert.equal(F.entries(s, "2027-02").find((e) => e.id === "rent").date, "2027-02-28");
  assert.equal(F.entries(s, "2027-03").length, 1);
});
test("Confirmação não se repete no próximo mês", () => assert.equal(F.totals(s, "2026-11").received, 0));
test("Previsão não repete gasto avulso nem escala", () => {
  const t = F.forecast(s, "2026-10");
  assert.equal(t.income, 300000);
  assert.equal(t.expense, 100000);
  assert.equal(t.shiftTotal, 0);
  assert.equal(t.closing, 365000);
});
test("Valores monetários usam centavos", () => {
  assert.equal(F.cents("149.90"), 14990);
  assert.equal(F.cents(0.1) + F.cents(0.2), 30);
});
test("Backup aceita dados válidos e rejeita dados corrompidos", () => {
  assert.ok(F.valid(s));
  assert.ok(!F.valid({ ...s, version: 2 }));
  assert.ok(!F.valid({ ...s, shifts: ["2026-02-31"] }));
  assert.ok(!F.valid({ ...s, entries: [{ ...s.entries[0], value: -1 }] }));
  assert.ok(!F.valid({ ...s, shiftPaid: ["2026-12-25"] }));
  assert.ok(!F.valid({ ...s, shifts: ["2026-10-23", "2026-10-23"] }));
});
function context() {
  const nodes = new Map();
  const get = (key) => {
    if (!nodes.has(key))
      nodes.set(key, {
        value: "",
        textContent: "",
        innerHTML: "",
        style: {},
        files: [],
        dataset: {},
        setAttribute() {},
        classList: { toggle() {}, add() {}, remove() {} },
        listeners: {},
        addEventListener(name, fn) {
          this.listeners[name] = fn;
        },
        showModal() {},
        close() {},
        focus() {},
        setSelectionRange() {},
      });
    return nodes.get(key);
  };
  const store = new Map(),
    document = {
      listeners: {},
      body: { classList: { toggle() {} }, dataset: {} },
      querySelectorAll: () => [],
      querySelector: get,
      addEventListener(name, fn) {
        this.listeners[name] = fn;
      },
      createElement() {
        return { click() {} };
      },
    };
  const c = {
    document,
    localStorage: { getItem: (k) => store.get(k) || null, setItem: (k, v) => store.set(k, v) },
    crypto: { randomUUID: () => Math.random().toString(36).slice(2) },
    console,
    Date,
    Intl,
    JSON,
    Number,
    String,
    Object,
    Array,
    Math,
    RegExp,
    Set,
    FormData: class {
      constructor(values) {
        this.values = values || {};
      }
      get(k) {
        return this.values[k] ?? null;
      }
      has(k) {
        return k in this.values;
      }
    },
    Blob,
    URL,
    setTimeout: () => 0,
    clearTimeout() {},
    confirm: () => true,
  };
  c.window = c;
  vm.createContext(c);
  vm.runInContext(fs.readFileSync(__dirname + "/appearance-model.js", "utf8"), c);
  vm.runInContext(fs.readFileSync(__dirname + "/catalog.js", "utf8"), c);
  vm.runInContext(fs.readFileSync(__dirname + "/security.js", "utf8"), c);
  vm.runInContext(fs.readFileSync(__dirname + "/shared-engine.js", "utf8"), c);
  vm.runInContext(fs.readFileSync(__dirname + "/engine.js", "utf8"), c);
  vm.runInContext(fs.readFileSync(__dirname + "/icons.js", "utf8"), c);
  vm.runInContext(fs.readFileSync(__dirname + "/ui.js", "utf8"), c);
  vm.runInContext(fs.readFileSync(__dirname + "/growth.js", "utf8"), c);
  vm.runInContext(fs.readFileSync(__dirname + "/monthly.js", "utf8"), c);
  vm.runInContext(fs.readFileSync(__dirname + "/shared.js", "utf8"), c);
  vm.runInContext(fs.readFileSync(__dirname + "/experience.js", "utf8"), c);
  vm.runInContext(fs.readFileSync(__dirname + "/goals.js", "utf8"), c);
  vm.runInContext(fs.readFileSync(__dirname + "/profile.js", "utf8"), c);
  vm.runInContext(
    'const Appearance={get:()=>({...AppearanceModel.defaults}),sync(){},detach(){},panel:()=>"<p>Preferências visuais</p>"}',
    c,
  );
  vm.runInContext(fs.readFileSync(__dirname + "/home.js", "utf8"), c);
  vm.runInContext(fs.readFileSync(__dirname + "/app.js", "utf8"), c);
  return { c, get, document, run: (code) => vm.runInContext(code, c) };
}
test("Interface: oito páginas renderizam vazias e com demonstração", () => {
  const { run, get, document } = context();
  for (const v of ["shared", "transactions", "categories", "forecast", "goals", "wealth", "appearance", "settings"]) {
    run(`view='${v}';render()`);
    assert.ok(get("#main").innerHTML.length > 100);
  }
  document.listeners.click({ target: { closest: () => ({ dataset: { action: "demo" } }) } });
  for (const v of ["shared", "transactions", "categories", "forecast", "goals", "wealth", "appearance", "settings"]) {
    run(`view='${v}';render()`);
    assert.ok(get("#main").innerHTML.length > 100);
  }
  assert.ok(run("Finance.valid(state)"));
  assert.equal(run("state.entries.length"), 6);
});
test("Interface: seleção de plantão, feriado e recebimento", () => {
  const { run, document } = context();
  run("var Account={canUseShifts:true,saveState:()=>true}");
  const click = (action, date) =>
    document.listeners.click({ target: { closest: () => ({ dataset: { action, date } }) } });
  click("day", "2026-10-23");
  assert.equal(run("state.shifts.length"), 1);
  click("shift-paid", "2026-10-23");
  assert.equal(run("state.shiftPaid.length"), 1);
  run("holidayMode=true");
  click("day", "2026-10-23");
  assert.equal(run("Finance.rate('2026-10-23',state.holidays)"), 10000);
  run("holidayMode=false");
  click("day", "2026-10-23");
  assert.equal(run("state.shiftPaid.length"), 0);
  assert.equal(run("state.shifts.length"), 0);
});
test("Interface: texto de usuário é escapado no HTML", () => {
  const { run, get } = context();
  run("state.goals=[{id:'g',name:'<script>alert(1)</script>',target:10000,saved:100}];view='goals';render()");
  assert.ok(!get("#main").innerHTML.includes("<script>"));
  assert.ok(get("#main").innerHTML.includes("&lt;script&gt;"));
});
const debt = {
  id: "d1",
  name: "Geladeira",
  creditor: "Loja",
  start: "2026-10-01",
  firstDue: "2026-10-31",
  total: 10000,
  principal: 9000,
  count: 3,
};
test("Parcelamento distribui centavos sem alterar o total", () => {
  const x = { ...blank(), debts: [debt] };
  const list = F.debtSchedule(x, debt);
  assert.deepEqual(
    list.map((e) => e.value),
    [3334, 3333, 3333],
  );
  assert.equal(
    list.reduce((a, e) => a + e.value, 0),
    10000,
  );
  assert.equal(list[1].date, "2026-11-30");
  assert.equal(list[2].date, "2026-12-31");
});
test("Parcelas entram apenas uma vez nos meses corretos", () => {
  const x = { ...blank(), debts: [debt] };
  assert.equal(F.totals(x, "2026-09").expense, 0);
  assert.equal(F.totals(x, "2026-10").expense, 3334);
  assert.equal(F.totals(x, "2026-11").expense, 3333);
  assert.equal(F.totals(x, "2027-01").expense, 0);
});
test("Dívida calcula atraso, pagamento, saldo restante e fim", () => {
  const x = { ...blank(), debts: [debt] };
  x.paid["debt:d1:0@2026-10"] = true;
  const t = F.debtSummary(x, debt, "2026-12-01");
  assert.equal(t.paidCount, 1);
  assert.equal(t.remaining, 6666);
  assert.equal(t.overdue.length, 1);
  assert.equal(t.last, "2026-12-31");
  assert.equal(t.cost, 1000);
});
test("Projeção inclui a próxima parcela e termina após quitação", () => {
  const x = { ...blank(), debts: [debt] };
  assert.equal(F.forecast(x, "2026-10").expense, 3333);
  assert.equal(F.forecast(x, "2026-12").expense, 0);
});
test("Backup antigo continua válido e novos campos são validados", () => {
  assert.ok(F.valid(blank()));
  assert.ok(F.valid({ ...blank(), debts: [debt] }));
  assert.ok(!F.valid({ ...blank(), debts: [{ ...debt, count: 0 }] }));
  assert.ok(!F.valid({ ...blank(), debts: [{ ...debt, firstDue: "2026-09-01" }] }));
  assert.ok(!F.valid({ ...blank(), debts: [{ ...debt, total: 1 }] }));
});
const fund = {
  id: "f1",
  name: "Reserva",
  kind: "reserve",
  product: "Conta",
  balance: 10000,
  liquidity: "daily",
  risk: "low",
};
test("Aportes e resgates movimentam caixa sem duplicar despesas", () => {
  const x = {
    ...blank(),
    funds: [fund],
    transfers: [
      { id: "t1", fundId: "f1", date: "2026-10-10", kind: "deposit", value: 5000 },
      { id: "t2", fundId: "f1", date: "2026-10-11", kind: "withdraw", value: 2000 },
    ],
  };
  x.entries = [{ ...s.entries[0], value: 20000 }];
  x.paid = { "salary@2026-10": true };
  assert.equal(F.fundBalance(x, fund), 13000);
  assert.equal(F.savingFlow(x, "2026-10"), 3000);
  assert.equal(F.totals(x, "2026-10").expense, 0);
  assert.equal(F.availableAfterSaving(x, "2026-10"), 17000);
  assert.ok(F.valid(x));
});
test("Conciliação aceita perdas sem criar um resgate fictício", () => {
  const f = { ...fund, balance: 0, adjustment: -2000 },
    x = {
      ...blank(),
      funds: [f],
      transfers: [{ id: "t", fundId: "f1", date: "2026-10-10", kind: "deposit", value: 10000 }],
    };
  assert.equal(F.fundBalance(x, f), 8000);
  assert.equal(F.savingFlow(x, "2026-10"), 10000);
  assert.ok(F.valid(x));
  assert.ok(!F.valid({ ...x, funds: [{ ...f, adjustment: -20000 }] }));
});
test("Conselhos detectam atraso e déficit com explicação dos valores", () => {
  const x = { ...blank(), debts: [debt] };
  const cards = F.advice(x, "2026-10", "2026-12-01");
  assert.ok(cards.some((c) => c.title.includes("atrasadas")));
  assert.ok(cards.some((c) => c.title.includes("pausa")));
  assert.ok(cards.every((c) => c.text.length > 30));
});
test("Novas telas e formulários renderizam sem dados e com registros", () => {
  const { run, get } = context();
  for (const v of ["transactions", "wealth", "categories"]) {
    run(`view='${v}';render()`);
    assert.ok(get("#main").innerHTML.length > 300);
  }
  run(`state.debts=[${JSON.stringify(debt)}];state.funds=[${JSON.stringify(fund)}];selectedDebt='d1'`);
  for (const v of ["transactions", "wealth", "categories"]) {
    run(`view='${v}';render()`);
    assert.ok(get("#main").innerHTML.length > 300);
  }
  for (const code of [
    "openDebt('d1')",
    "openDebt()",
    "openFund('f1')",
    "openFund()",
    "openTransfer('f1','deposit')",
    "openWealthPlan()",
  ]) {
    run(code);
    assert.ok(get("#fields").innerHTML.includes("input"));
  }
});
test("Formulário cadastra dívida e confirma parcelas já pagas", () => {
  const { run } = context();
  run(
    "modal={kind:'debt'};$('#form').listeners.submit({preventDefault(){},target:{name:'Notebook',creditor:'Loja',start:'2026-01-01',firstDue:'2026-01-31',total:'1200',count:'12',principal:'1000',paidCount:'3'}})",
  );
  assert.equal(run("state.debts.length"), 1);
  assert.equal(run("Finance.debtSummary(state,state.debts[0],today()).paidCount"), 3);
  assert.ok(run("Finance.valid(state)"));
});
test("Formulários criam reserva, registram aporte e impedem resgate maior", () => {
  const { run, get } = context();
  run(
    "modal={kind:'fund'};$('#form').listeners.submit({preventDefault(){},target:{name:'Reserva',kind:'reserve',product:'Conta',balance:'100',liquidity:'daily',risk:'low'}})",
  );
  assert.equal(run("state.funds.length"), 1);
  run(
    "modal={kind:'transfer',id:state.funds[0].id,transferKind:'deposit'};$('#form').listeners.submit({preventDefault(){},target:{value:'50',date:today()}})",
  );
  assert.equal(run("Finance.fundBalance(state,state.funds[0])"), 15000);
  run(
    "modal={kind:'transfer',id:state.funds[0].id,transferKind:'withdraw'};$('#form').listeners.submit({preventDefault(){},target:{value:'200',date:today()}})",
  );
  assert.equal(run("state.transfers.length"), 1);
  assert.ok(get("#form-error").textContent.includes("maior"));
  assert.ok(run("Finance.valid(state)"));
});
test("Visão geral suporta aporte exatamente igual à receita", () => {
  const { run, get } = context();
  run(
    `state.entries=[${JSON.stringify({ ...s.entries[0], date: "2026-10-01", value: 10000 })}];state.funds=[${JSON.stringify({ ...fund, balance: 0 })}];state.transfers=[{id:'t',fundId:'f1',date:'2026-10-10',kind:'deposit',value:10000}];month='2026-10';view='overview';render()`,
  );
  assert.equal(run("Finance.availableAfterSaving(state,'2026-10')"), -10000);
  assert.ok(get("#main").innerHTML.includes("Disponível agora"));
});
test("Acumulado da previsão desconta aportes líquidos sem virar despesa", () => {
  const x = {
    ...blank(),
    funds: [fund],
    transfers: [{ id: "t", fundId: "f1", date: "2026-10-10", kind: "deposit", value: 10000 }],
    entries: [{ ...s.entries[0], value: 100000 }],
  };
  const next = F.forecast(x, "2026-10");
  assert.equal(next.closing, 190000);
  assert.equal(next.expense, 0);
});
test("Conciliação de perda mantém histórico e não cria saída fictícia", () => {
  const { run } = context();
  run(
    `state.funds=[${JSON.stringify({ ...fund, balance: 0 })}];state.transfers=[{id:'t',fundId:'f1',date:today(),kind:'deposit',value:10000}];modal={kind:'fund-adjust',id:'f1'};$('#form').listeners.submit({preventDefault(){},target:{balance:'80'}})`,
  );
  assert.equal(run("Finance.fundBalance(state,state.funds[0])"), 8000);
  assert.equal(run("state.transfers.length"), 1);
  assert.ok(run("Finance.valid(state)"));
});
test("Ajuste pontual altera apenas o mês escolhido", () => {
  const x = {
    ...blank(),
    entries: [s.entries[1]],
    overrides: { "rent@2026-11": { value: 140000, day: 12, name: "Aluguel ajustado" } },
  };
  assert.equal(F.totals(x, "2026-10").expense, 100000);
  assert.equal(F.totals(x, "2026-11").expense, 140000);
  assert.equal(F.entries(x, "2026-11")[0].date, "2026-11-12");
  assert.equal(F.totals(x, "2026-12").expense, 100000);
  assert.ok(F.valid(x));
});
test("Mudança futura preserva histórico e respeita a próxima revisão", () => {
  const e = {
      ...s.entries[1],
      end: "",
      revisions: [
        { from: "2026-11", value: 120000, day: 31 },
        { from: "2027-01", value: 130000, day: 31 },
      ],
    },
    x = { ...blank(), entries: [e] };
  assert.equal(F.totals(x, "2026-10").expense, 100000);
  assert.equal(F.totals(x, "2026-12").expense, 120000);
  assert.equal(F.totals(x, "2027-02").expense, 130000);
  assert.equal(F.entries(x, "2027-02")[0].date, "2027-02-28");
});
test("Ocultar uma recorrência não remove os outros meses", () => {
  const x = { ...blank(), entries: [s.entries[1]], overrides: { "rent@2026-11": { skipped: true } } };
  assert.equal(F.entries(x, "2026-11").length, 0);
  assert.equal(F.entries(x, "2026-12").length, 1);
  assert.equal(F.entries(x, "2026-10").length, 1);
});
test("Limite e saldo inicial são independentes por mês", () => {
  const x = {
    ...blank(),
    budget: 10000,
    monthSettings: { "2026-11": { opening: 50000, budget: 25000, note: "Ajuste" } },
  };
  assert.equal(F.budgetFor(x, "2026-10"), 10000);
  assert.equal(F.budgetFor(x, "2026-11"), 25000);
  assert.equal(F.totals(x, "2026-11").available, 50000);
  assert.equal(F.totals(x, "2026-12").available, 0);
  assert.ok(F.valid(x));
});
test("Projeção atravessa dezembro e respeita saldo manual no destino", () => {
  const x = {
    ...blank(),
    entries: [{ ...s.entries[0], value: 10000 }],
    monthSettings: { "2026-12": { opening: 5000 }, "2027-02": { opening: 1000 } },
  };
  const list = F.timeline(x, "2026-12", 4);
  assert.deepEqual(
    list.map((t) => t.month),
    ["2026-12", "2027-01", "2027-02", "2027-03"],
  );
  assert.deepEqual(
    list.map((t) => t.projectedClosing),
    [15000, 25000, 11000, 21000],
  );
  assert.equal(F.forecast(x, "2027-01").closing, 11000);
});
test("Validação de backup rejeita ajustes e meses inválidos", () => {
  assert.ok(!F.valid({ ...blank(), monthSettings: { "2026-13": { budget: 2 } } }));
  assert.ok(!F.valid({ ...blank(), overrides: { "inexistente@2026-11": { value: 200 } } }));
  assert.ok(
    !F.valid({ ...blank(), entries: [s.entries[1]], overrides: { "rent@2026-11": { id: "outro", value: 200 } } }),
  );
  assert.ok(!F.valid({ ...blank(), entries: [s.entries[1]], overrides: { "rent@2026-11": { day: 32 } } }));
});
test("Editor recorrente salva só no mês padrão e preserva pagamento anterior", () => {
  const { run, get } = context();
  run(
    `state.entries=[${JSON.stringify(s.entries[1])}];month='2026-11';state.paid['rent@2026-10']=true;openMonthlyEntry('rent');$('#form').listeners.submit({preventDefault(){},target:{scope:'month',name:'Aluguel',category:'Moradia',value:'1250',day:'15',done:'on'}})`,
  );
  assert.equal(run("Finance.totals(state,'2026-11').expense"), 125000);
  assert.equal(run("Finance.totals(state,'2026-10').expense"), 100000);
  assert.equal(run("Finance.totals(state,'2026-12').expense"), 100000);
  assert.equal(run("state.paid['rent@2026-10']"), true);
  assert.equal(run("Finance.entries(state,'2026-11')[0].done"), true);
});
test("Editor aplica mudança futura sem reescrever meses anteriores", () => {
  const { run } = context();
  run(
    `state.entries=[${JSON.stringify(s.entries[1])}];month='2026-11';modal={kind:'monthly-entry',id:'rent',month};$('#form').listeners.submit({preventDefault(){},target:{scope:'future',name:'Aluguel',category:'Moradia',value:'1500',day:'31'}})`,
  );
  assert.equal(run("Finance.totals(state,'2026-10').expense"), 100000);
  assert.equal(run("Finance.totals(state,'2026-12').expense"), 150000);
  assert.equal(run("Finance.entries(state,'2027-02')[0].date"), "2027-02-28");
  assert.ok(run("Finance.valid(state)"));
});
test("Ajustar mês aceita saldo zero explícito e mantém o mês vizinho", () => {
  const { run } = context();
  run(
    "month='2026-11';openMonthSettings();$('#form').listeners.submit({preventDefault(){},target:{opening:'0',budget:'1800',note:'Viagem'}})",
  );
  assert.equal(run("Finance.monthConfig(state,'2026-11').opening"), 0);
  assert.equal(run("Finance.budgetFor(state,'2026-11')"), 180000);
  assert.equal(run("Finance.budgetFor(state,'2026-12')"), 0);
  assert.ok(run("Finance.valid(state)"));
});
test("Cópia não duplica avulsos nem copia recorrência, parcela ou pagamentos", () => {
  const { run } = context();
  run(
    `state.entries=${JSON.stringify(s.entries)};state.debts=[${JSON.stringify(debt)}];state.paid['market@2026-10']=true;copyMonthData(state,'2026-10','2026-11',{entries:true},uid);copyMonthData(state,'2026-10','2026-11',{entries:true},uid)`,
  );
  assert.equal(run("state.entries.filter(e=>!e.recurring&&e.date.startsWith('2026-11')).length"), 1);
  assert.equal(run("Finance.entries(state,'2026-11').find(e=>e.name==='Mercado').done"), false);
  assert.equal(run("state.debts.length"), 1);
  assert.ok(run("Finance.valid(state)"));
});
test("Cópia de escala ignora dias inexistentes e não leva confirmações", () => {
  const { run } = context();
  run(
    "state.shifts=['2026-01-28','2026-01-30','2026-01-31'];state.shiftPaid=['2026-01-28'];copyMonthData(state,'2026-01','2026-02',{shifts:true},uid);copyMonthData(state,'2026-01','2026-02',{shifts:true},uid)",
  );
  assert.equal(run("state.shifts.filter(d=>d.startsWith('2026-02')).length"), 1);
  assert.equal(run("state.shiftPaid.includes('2026-02-28')"), false);
});
test("Visão anual renderiza 12 meses e navegação preserva dados", () => {
  const { run, get } = context();
  run("month='2026-12';view='forecast';render()");
  assert.equal((get("#main").innerHTML.match(/class="year-card /g) || []).length, 12);
  run("setMonth('2027-01')");
  assert.equal(run("month"), "2027-01");
  run("setMonth('2027-13')");
  assert.equal(run("month"), "2027-01");
  assert.ok(run("Finance.valid(state)"));
});
test("Cópia encadeada preserva origem e evita nova duplicação", () => {
  const { run } = context();
  run(
    `state.entries=[${JSON.stringify(s.entries[2])}];copyMonthData(state,'2026-10','2026-11',{entries:true},uid);copyMonthData(state,'2026-11','2026-12',{entries:true},uid);copyMonthData(state,'2026-10','2026-12',{entries:true},uid)`,
  );
  assert.equal(run("state.entries.filter(e=>e.date.startsWith('2026-12')).length"), 1);
});
test("Editor em fevereiro preserva dia 31 original para mudanças futuras", () => {
  const { run, get } = context();
  run(`state.entries=[${JSON.stringify({ ...s.entries[1], end: "" })}];month='2027-02';openMonthlyEntry('rent')`);
  assert.ok(get("#fields").innerHTML.includes('name="day" type="number" value="31"'));
});
test("Aviso de orçamento usa o limite específico e respeita limite zero", () => {
  const x = {
    ...blank(),
    entries: [s.entries[1]],
    budget: 200000,
    monthSettings: { "2026-11": { budget: 50000 }, "2026-12": { budget: 0 } },
  };
  assert.ok(F.advice(x, "2026-11", "2026-10-01").some((c) => c.title.includes("ultrapassado")));
  assert.ok(!F.advice(x, "2026-12", "2026-10-01").some((c) => c.title.includes("ultrapassado")));
});
test("Ocultar e restaurar uma conta mantém as confirmações dos outros meses", () => {
  const { run } = context();
  run(
    `state.entries=[${JSON.stringify(s.entries[1])}];month='2026-11';state.paid['rent@2026-10']=true;modal={kind:'remove-recurring',id:'rent',month};$('#form').listeners.submit({preventDefault(){},target:{scope:'month'}})`,
  );
  assert.equal(run("Finance.entries(state,'2026-11').length"), 0);
  run("handleMonthAction('restore-month-entry',{dataset:{id:'rent'}})");
  assert.equal(run("Finance.entries(state,'2026-11').length"), 1);
  assert.equal(run("state.paid['rent@2026-10']"), true);
  assert.ok(run("Finance.valid(state)"));
});
const sharedProfiles = [
  { id: "ana", name: "Ana", kind: "person", color: "#9eafff" },
  { id: "bruno", name: "Bruno", kind: "person", color: "#75d9b1" },
  { id: "extra", name: "Diversos", kind: "pocket", color: "#e9b76c" },
];
const sharedItem = (patch = {}) => ({
  id: "rent",
  name: "Aluguel",
  type: "expense",
  value: 100001,
  date: "2026-10-31",
  recurring: true,
  end: "",
  category: "Casa",
  mode: "equal",
  members: ["ana", "bruno"],
  weights: {},
  ...patch,
});
const sharedState = (items) => ({ ...blank(), shared: { profiles: structuredClone(sharedProfiles), items } });
test("Compartilhado: divide centavos sem perder ou duplicar dinheiro", () => {
  const x = sharedState([sharedItem()]);
  assert.ok(F.valid(x));
  assert.deepEqual(
    SharedFinance.entries(x, "2026-10").map((e) => e.value),
    [50001, 50000],
  );
  assert.equal(F.totals(x, "2026-10").expense, 100001);
  for (let value = 1; value < 300; value++)
    assert.equal(
      SharedFinance.allocate(value, [1, 2, 3]).reduce((a, b) => a + b, 0),
      value,
    );
});
test("Compartilhado: proporcional usa receitas do mês de cada participante", () => {
  const x = sharedState([
    sharedItem({ id: "salary-a", type: "income", value: 300000, mode: "personal", owner: "ana" }),
    sharedItem({ id: "salary-b", type: "income", value: 100000, mode: "personal", owner: "bruno" }),
    sharedItem({ mode: "income", value: 120000 }),
  ]);
  assert.deepEqual(
    SharedFinance.shares(x, x.shared.items[2], "2026-10").map((p) => p.value),
    [90000, 30000],
  );
  const people = SharedFinance.summary(x, "2026-10");
  assert.equal(people[0].balance, 210000);
  assert.equal(people[1].balance, 70000);
  assert.equal(F.totals(x, "2026-10").income, 400000);
  assert.equal(F.totals(x, "2026-10").expense, 120000);
});
test("Compartilhado: sem renda mantém conta nos totais com divisão provisória", () => {
  const x = sharedState([sharedItem({ mode: "income" })]);
  assert.equal(F.totals(x, "2026-10").expense, 100001);
  assert.deepEqual(
    SharedFinance.shares(x, x.shared.items[0], "2026-10").map((p) => p.value),
    [50001, 50000],
  );
});
test("Compartilhado: percentual e valor exato fecham a conta", () => {
  const percent = sharedItem({ mode: "percent", weights: { ana: 6000, bruno: 4000 } }),
    amount = sharedItem({ id: "market", mode: "amount", weights: { ana: 40001, bruno: 60000 } }),
    x = sharedState([percent, amount]);
  assert.ok(F.valid(x));
  assert.deepEqual(
    SharedFinance.shares(x, percent, "2026-10").map((p) => p.value),
    [60001, 40000],
  );
  assert.deepEqual(
    SharedFinance.shares(x, amount, "2026-10").map((p) => p.value),
    [40001, 60000],
  );
  assert.ok(!F.valid(sharedState([{ ...percent, weights: { ana: 6000, bruno: 3000 } }])));
  assert.ok(!F.valid(sharedState([{ ...amount, weights: { ana: 40000, bruno: 60000 } }])));
});
test("Compartilhado: confirmação é individual e não passa ao próximo mês", () => {
  const x = sharedState([sharedItem()]);
  x.paid["shared:rent:ana@2026-10"] = true;
  assert.equal(F.totals(x, "2026-10").paid, 50001);
  assert.equal(SharedFinance.summary(x, "2026-10")[1].pending, 50000);
  assert.equal(F.totals(x, "2026-11").paid, 0);
  assert.equal(F.entries(x, "2027-02")[0].date, "2027-02-28");
});
test("Compartilhado: avulsos, carteiras e encerramento respeitam os meses", () => {
  const x = sharedState([
    sharedItem({ end: "2026-11" }),
    sharedItem({ id: "extra-cost", mode: "personal", owner: "extra", recurring: false, value: 2000 }),
  ]);
  assert.equal(F.totals(x, "2026-10").expense, 102001);
  assert.equal(F.totals(x, "2026-11").expense, 100001);
  assert.equal(F.totals(x, "2026-12").expense, 0);
  assert.equal(SharedFinance.summary(x, "2026-10")[2].expense, 2000);
});
test("Compartilhado: backup rejeita perfis duplicados, referências e formatos inválidos", () => {
  const x = sharedState([sharedItem()]);
  assert.ok(F.valid(JSON.parse(JSON.stringify(x))));
  assert.ok(!F.valid({ ...x, shared: { ...x.shared, profiles: [...sharedProfiles, sharedProfiles[0]] } }));
  assert.ok(!F.valid(sharedState([sharedItem({ members: ["nao-existe"] })])));
  assert.ok(!F.valid(sharedState([sharedItem({ id: "<script>" })])));
  assert.ok(!F.valid(sharedState([sharedItem({ mode: "income", members: ["extra"] })])));
  assert.ok(!F.valid(sharedState([sharedItem({ end: "2026-09" })])));
});
test("Compartilhado: páginas escapam nomes e resumo geral mostra partes", () => {
  const { run, get } = context();
  run(
    `state=${JSON.stringify(sharedState([sharedItem()]))};month='2026-10';state.shared.profiles[0].name='<img src=x>';view='shared';render()`,
  );
  assert.ok(get("#main").innerHTML.includes("Pessoas e carteiras"));
  assert.ok(get("#main").innerHTML.includes("&lt;img src=x&gt;"));
  assert.ok(!get("#main").innerHTML.includes("<img src=x>"));
  run("view='transactions';render()");
  assert.ok(get("#main").innerHTML.includes("shared-edit"));
  run("view='overview';render()");
  assert.ok(get("#main").innerHTML.includes("Pessoas e carteiras"));
});
test("Compartilhado: cadastro e edição de perfil preservam dados anteriores", () => {
  const { run } = context();
  run("modal={kind:'shared-profile'};submitShared({target:{name:'Ana',kind:'person',color:'#9eafff'}})");
  assert.equal(run("state.shared.profiles.length"), 1);
  assert.ok(run("Finance.valid(state)"));
  run(
    "modal={kind:'shared-profile',id:state.shared.profiles[0].id};submitShared({target:{name:'Ana Silva',kind:'person',color:'#75d9b1'}})",
  );
  assert.equal(run("state.shared.profiles[0].name"), "Ana Silva");
});
test("Compartilhado: formulário exige percentuais e valores corretos", () => {
  const { run, get } = context();
  run(
    `state=${JSON.stringify(sharedState([]))};month='2026-10';modal={kind:'shared-item'};submitShared({target:{name:'Casa',type:'expense',value:'1000',date:'2026-10-05',category:'Casa',mode:'percent','member-ana':'on','member-bruno':'on','weight-ana':'60','weight-bruno':'30'}})`,
  );
  assert.equal(run("state.shared.items.length"), 0);
  assert.ok(get("#form-error").textContent.includes("100%"));
  run(
    "submitShared({target:{name:'Casa',type:'expense',value:'1000',date:'2026-10-05',category:'Casa',mode:'percent','member-ana':'on','member-bruno':'on','weight-ana':'60','weight-bruno':'40'}})",
  );
  assert.equal(run("state.shared.items.length"), 1);
  assert.ok(run("Finance.valid(state)"));
});
test("Compartilhado: bloqueia excluir perfil com contas e paga apenas uma parte", () => {
  const { run } = context();
  run(
    `state=${JSON.stringify(sharedState([sharedItem()]))};month='2026-10';handleSharedAction('shared-profile-delete',{dataset:{id:'ana'}})`,
  );
  assert.equal(run("state.shared.profiles.length"), 3);
  run("handleSharedAction('shared-paid',{dataset:{id:'shared:rent:ana'}})");
  assert.equal(run("Finance.totals(state,'2026-10').paid"), 50001);
  run("handleSharedAction('shared-delete',{dataset:{id:'rent'}})");
  assert.equal(run("modal.kind"), "shared-remove");
  run("$('#form').listeners.submit({preventDefault(){},target:{scope:'all'}})");
  assert.equal(run("state.shared.items.length"), 0);
  assert.equal(run("Object.keys(state.paid).length"), 0);
});
test("Compartilhado: renda alterada pede nova conferência das partes proporcionais", () => {
  const { run } = context();
  const x = sharedState([
    sharedItem({ id: "salary", type: "income", mode: "personal", owner: "ana", value: 300000 }),
    sharedItem({ mode: "income" }),
  ]);
  x.paid["shared:rent:ana@2026-10"] = true;
  run(
    `state=${JSON.stringify(x)};month='2026-10';modal={kind:'shared-item',id:'salary'};submitShared({target:{name:'Salário',type:'income',value:'4000',date:'2026-10-31',category:'Receitas',mode:'personal',owner:'ana',recurring:'on'}})`,
  );
  assert.equal(run("state.paid['shared:rent:ana@2026-10']"), undefined);
  assert.equal(run("state.shared.items[0].value"), 400000);
});
test("A navegação remove telas duplicadas e protege plantões no modo local", () => {
  const { run, get, document } = context();
  run("view='shared';render()");
  assert.ok(!get("#nav").innerHTML.includes("Conselhos"));
  assert.ok(!get("#nav").innerHTML.includes("Dívidas e parcelas"));
  assert.ok(!get("#nav").innerHTML.includes("Contas recorrentes"));
  assert.ok(!get("#nav").innerHTML.includes("Plantões"));
  document.listeners.click({ target: { closest: () => ({ dataset: { view: "shifts" } }) } });
  assert.equal(run("view"), "shared");
  document.listeners.click({ target: { closest: () => ({ dataset: { action: "day", date: "2026-10-31" } }) } });
  assert.equal(run("state.shifts.length"), 0);
  run("view='coach';render()");
  assert.equal(run("view"), "shared");
});
test("Categorias têm formulário, arquivamento e preservam o histórico", () => {
  const { run } = context();
  run("modal={kind:'category'};submitCategory({target:{name:'Pets',type:'expense',color:'#358268'}})");
  assert.ok(run("state.categories.some(c=>c.name==='Pets')"));
  run(
    "state.entries=[{id:'pet',name:'Ração',type:'expense',value:1000,date:month+'-01',category:'Pets',recurring:false,end:''}];modal={kind:'category',id:state.categories.find(c=>c.name==='Pets').id};submitCategory({target:{name:'Animais',type:'expense',color:'#358268'}})",
  );
  assert.equal(run("state.entries[0].category"), "Animais");
  run("handleExperienceAction('category-archive',{dataset:{id:state.categories.find(c=>c.name==='Animais').id}})");
  assert.equal(run("state.categories.find(c=>c.name==='Animais').archived"), true);
  assert.ok(!run("categoryField('Outros','expense')").includes("Animais"));
  assert.ok(run("categoryField('Animais','expense',false,true)").includes("Animais"));
  assert.ok(run("Finance.valid(state)"));
});
test("Filtros de lançamentos combinam categoria, tipo, perfil e situação", () => {
  const { run, get } = context();
  run(
    `state=upgradeState(${JSON.stringify(sharedState([sharedItem({ name: "Condomínio", category: "Casa" })]))});month='2026-10';state.entries=[{id:'other',name:'Farmácia',type:'expense',value:5000,date:month+'-01',category:'Saúde',recurring:false,end:''}];view='transactions';ledgerCategory='Casa';ledgerProfile='ana';render()`,
  );
  assert.ok(get("#main").innerHTML.includes("Condomínio"));
  assert.ok(!get("#main").innerHTML.includes("Farmácia"));
  run("ledgerFrequency='once';render()");
  assert.ok(!get("#main").innerHTML.includes("shared-paid"));
});
test("Cópia de despesa dividida mantém perfis e não duplica no segundo clique", () => {
  const { run } = context();
  run(
    `state=upgradeState(${JSON.stringify(sharedState([sharedItem({ recurring: false })]))});state.paid['shared:rent:ana@2026-10']=true;copyMonthData(state,'2026-10','2026-11',{entries:true},uid);copyMonthData(state,'2026-10','2026-11',{entries:true},uid)`,
  );
  assert.equal(run("state.shared.items.length"), 2);
  assert.equal(run("state.entries.length"), 0);
  assert.equal(run("Finance.totals(state,'2026-11').expense"), 100001);
  assert.equal(run("Finance.totals(state,'2026-11').paid"), 0);
  assert.ok(run("Finance.valid(state)"));
});
test("Troca de conta limpa filtros, buscas e formulários da interface", () => {
  const { run, get } = context();
  run(
    "query='Consulta privada';categoryQuery='Categoria privada';ledgerProfile='ana';ledgerCategory='Saúde';sharedFilter='ana';view='transactions';modal={kind:'entry'}",
  );
  get("#fields").innerHTML = '<input value="informação privada">';
  get("#main").innerHTML = "dados financeiros";
  run("resetWorkspaceContext()");
  assert.equal(run("query"), "");
  assert.equal(run("categoryQuery"), "");
  assert.equal(run("ledgerProfile"), "all");
  assert.equal(run("view"), "shared");
  assert.equal(get("#fields").innerHTML, "");
  assert.equal(get("#main").innerHTML, "");
  assert.equal(run("modal"), null);
});
test("Curva confirmada fecha no mesmo caixa do painel sem somar previsão pendente", () => {
  const { run } = context();
  run(
    "month='2026-10';state.entries=[{id:'income',name:'Renda',type:'income',value:100000,date:'2026-10-03',category:'Receitas',recurring:false,end:''},{id:'expense',name:'Conta',type:'expense',value:10000,date:'2026-10-10',category:'Outros',recurring:false,end:''}];state.paid['income@2026-10']=true;state.monthSettings['2026-10']={opening:5000}",
  );
  assert.equal(run("confirmedFlow().length"), 31);
  assert.equal(run("confirmedFlow()[0].value"), 5000);
  assert.equal(run("confirmedFlow()[2].value"), 105000);
  assert.equal(run("confirmedFlow().at(-1).value"), run("Finance.availableAfterSaving(state,month)"));
});
test("Recomeçar os registros preserva a aparência escolhida sem carregar dados financeiros", () => {
  const { run } = context();
  run(
    "state.budget=12345;state.appearance={...AppearanceModel.defaults,style:'editorial',density:'compact'};state=freshRecords()",
  );
  assert.equal(run("state.budget"), 0);
  assert.equal(run("state.appearance.style"), "editorial");
  assert.equal(run("state.appearance.density"), "compact");
  assert.ok(run("Finance.valid(state)"));
});

const submitForm = (run, values) => run(`$('#form').listeners.submit({preventDefault(){},target:${JSON.stringify(values)}})`);
test("Correção do cliente: toda linha de perfil em Lançamentos tem botão de excluir", () => {
  const { run, get } = context();
  run(`state=${JSON.stringify(sharedState([sharedItem({ recurring: false })]))};month='2026-10';view='transactions';render()`);
  const html = get("#main").innerHTML;
  assert.equal((html.match(/data-action="shared-delete"/g) || []).length, 2);
  assert.equal((html.match(/data-action="shared-edit"/g) || []).length, 2);
  run("handleSharedAction('shared-delete',{dataset:{id:'rent'}})");
  assert.equal(run("state.shared.items.length"), 0);
});
test("Correção do cliente: editar um lançamento de perfil mostra Excluir dentro da janela", () => {
  const { run, get } = context();
  run(`state=${JSON.stringify(sharedState([sharedItem()]))};month='2026-10';openSharedItem('expense','rent')`);
  assert.ok(get("#form-danger").innerHTML.includes('data-action="shared-delete"'));
  run(`openEntry('expense',false,undefined)`);
  assert.equal(get("#form-danger").innerHTML, "");
});
test("Correção do cliente: perfil com lançamentos abre a lista e pode ser excluído junto com eles", () => {
  const { run, get } = context();
  const x = sharedState([
    sharedItem(),
    sharedItem({ id: "salary", type: "income", mode: "personal", owner: "ana", members: [], value: 300000, name: "Salário" }),
    sharedItem({ id: "gym", mode: "personal", owner: "bruno", members: [], value: 9000, name: "Academia" }),
  ]);
  x.paid = { "shared:rent:ana@2026-10": true, "shared:gym:bruno@2026-10": true };
  run(`state=${JSON.stringify(x)};month='2026-10';handleSharedAction('shared-profile-delete',{dataset:{id:'ana'}})`);
  assert.equal(run("modal.kind"), "shared-profile-remove");
  assert.equal(run("state.shared.profiles.length"), 3);
  assert.ok(get("#fields").innerHTML.includes("Salário") && get("#fields").innerHTML.includes("Aluguel"));
  assert.ok(!get("#fields").innerHTML.includes("Academia"));
  assert.ok(get("#form-danger").innerHTML.includes("shared-profile-purge"));
  run("handleSharedAction('shared-profile-purge',{dataset:{id:'ana'}})");
  assert.equal(run("state.shared.profiles.some(p=>p.id==='ana')"), false);
  assert.equal(run("JSON.stringify(state.shared.items.map(e=>e.id))"), '["gym"]');
  assert.equal(run("JSON.stringify(Object.keys(state.paid))"), '["shared:gym:bruno@2026-10"]');
  assert.ok(run("Finance.valid(state)"));
});
test("Correção do cliente: perfil sem lançamentos é excluído direto", () => {
  const { run } = context();
  run(`state=${JSON.stringify(sharedState([]))};handleSharedAction('shared-profile-delete',{dataset:{id:'ana'}})`);
  assert.equal(run("state.shared.profiles.length"), 2);
});
test("Conta dividida mensal: ocultar só um mês, restaurar e encerrar a partir de um mês", () => {
  const { run } = context();
  const x = sharedState([sharedItem({ date: "2026-09-10" })]);
  x.paid = { "shared:rent:ana@2026-10": true, "shared:rent:ana@2026-09": true };
  run(`state=${JSON.stringify(x)};month='2026-10';handleSharedAction('shared-delete',{dataset:{id:'rent'}})`);
  submitForm(run, { scope: "month" });
  assert.equal(run("SharedFinance.entries(state,'2026-10').length"), 0);
  assert.equal(run("SharedFinance.entries(state,'2026-11').length"), 2);
  assert.equal(run("state.paid['shared:rent:ana@2026-10']"), undefined);
  assert.equal(run("state.paid['shared:rent:ana@2026-09']"), true);
  assert.ok(run("Finance.valid(state)"));
  run("handleSharedAction('shared-restore-month',{dataset:{id:'rent'}})");
  assert.equal(run("SharedFinance.entries(state,'2026-10').length"), 2);
  assert.equal(run("'skip' in state.shared.items[0]"), false);
  run("month='2026-11';handleSharedAction('shared-delete',{dataset:{id:'rent'}})");
  submitForm(run, { scope: "future" });
  assert.equal(run("state.shared.items[0].end"), "2026-10");
  assert.equal(run("SharedFinance.entries(state,'2026-11').length"), 0);
  assert.equal(run("SharedFinance.entries(state,'2026-10').length"), 2);
});
test("Validação rejeita meses ocultos malformados em contas divididas", () => {
  assert.ok(!F.valid(sharedState([sharedItem({ skip: ["2026-13"] })])));
  assert.ok(!F.valid(sharedState([sharedItem({ skip: ["2026-10", "2026-10"] })])));
  assert.ok(F.valid(sharedState([sharedItem({ skip: ["2026-10"] })])));
});
test("Conta mensal comum: lixeira pergunta o alcance e 'só este mês' pode voltar", () => {
  const { run, document } = context();
  run(`state.entries=[{id:'rent',name:'Aluguel',type:'expense',value:1000,date:'2026-09-05',recurring:true,end:'',category:'Moradia'}];month='2026-10'`);
  document.listeners.click({ target: { closest: () => ({ dataset: { action: "delete", id: "rent" } }) } });
  assert.equal(run("modal.kind"), "remove-recurring");
  submitForm(run, { scope: "month" });
  assert.equal(run("Finance.entries(state,'2026-10').length"), 0);
  assert.equal(run("Finance.entries(state,'2026-11').length"), 1);
  run("handleMonthAction('restore-month-entry',{dataset:{id:'rent'}})");
  assert.equal(run("Finance.entries(state,'2026-10').length"), 1);
});
test("Parcela na lista: a lixeira exclui a compra inteira, sem desviar de tela", () => {
  const { run, document } = context();
  run(`state.debts=[{id:'d1',name:'Geladeira',creditor:'',start:'2026-10-01',firstDue:'2026-10-10',total:1000,count:2,principal:0}];state.paid['debt:d1:0@2026-10']=true;month='2026-10'`);
  document.listeners.click({ target: { closest: () => ({ dataset: { action: "delete", id: "debt:d1:0" } }) } });
  assert.equal(run("state.debts.length"), 0);
  assert.equal(run("Object.keys(state.paid).length"), 0);
});
test("Desfazer aporte não trava mais a tela", () => {
  const { run, document } = context();
  run(`state.funds=[{id:'f1',name:'Reserva',kind:'reserve',product:'',balance:0,adjustment:0,liquidity:'daily',risk:'low'}];state.transfers=[{id:'t1',fundId:'f1',value:5000,date:'2026-10-01',kind:'deposit'},{id:'t2',fundId:'f1',value:5000,date:'2026-10-02',kind:'withdraw'}]`);
  document.listeners.click({ target: { closest: () => ({ dataset: { action: "transfer-delete", id: "t1" } }) } });
  assert.equal(run("state.transfers.length"), 2);
  document.listeners.click({ target: { closest: () => ({ dataset: { action: "transfer-delete", id: "t2" } }) } });
  document.listeners.click({ target: { closest: () => ({ dataset: { action: "transfer-delete", id: "t1" } }) } });
  assert.equal(run("state.transfers.length"), 0);
});
test("Plantões escondidos não somam na renda de quem não é o dono", () => {
  const { run } = context();
  run("state.shifts=['2026-10-23'];state.shiftPaid=['2026-10-23'];month='2026-10';render()");
  assert.equal(run("Finance.totals(state,'2026-10').income"), 0);
  run("var Account={canUseShifts:true,saveState:()=>true};render()");
  assert.equal(run("Finance.totals(state,'2026-10').income"), 5000);
  assert.equal(run("Finance.shiftList(state).length"), 1);
});
test("Valores no formato brasileiro viram centavos certos", () => {
  for (const [v, c] of [["1.500,50", 150050], ["1500,5", 150050], ["149.90", 14990], ["1.500", 150000], ["R$ 2.000,00", 200000], ["", 0], [12.3, 1230]])
    assert.equal(F.cents(v), c);
  assert.ok(Number.isNaN(F.cents("abc")));
  assert.equal(F.plain(150050), "1500,50");
});
test("Nome do mês sem o 'De' maiúsculo e valores ocultáveis nas linhas", () => {
  const { run, get } = context();
  assert.equal(run("mlabel('2026-11')"), "Novembro de 2026");
  run(`state.entries=[{id:'a',name:'Mercado',type:'expense',value:1000,date:'2026-10-05',recurring:false,end:'',category:'Outros'}];month='2026-10';view='transactions';render()`);
  assert.ok(/class="amount tx-value[^"]*" data-private/.test(get("#main").innerHTML));
});
test("Lançamento comum salvo com vírgula e em outro mês leva para o mês certo", () => {
  const { run } = context();
  run("month='2026-10';openEntry()");
  submitForm(run, { type: "expense", value: "1.234,56", name: "Mercado", date: "2026-12-03", category: "Outros" });
  assert.equal(run("state.entries[0].value"), 123456);
  assert.equal(run("month"), "2026-12");
});
test("Todas as telas renderizam, inclusive Ajuda", () => {
  const { run, get } = context();
  for (const v of ["shared", "transactions", "categories", "forecast", "goals", "wealth", "appearance", "settings", "help"]) {
    run(`view='${v}';render()`);
    assert.ok(get("#main").innerHTML.length > (v === "appearance" ? 100 : 300), v);
  }
  assert.ok(get("#nav").innerHTML.includes("Ajuda"));
});

test("Meta: guardar e retirar atualizam o valor e o histórico; não deixa retirar demais", () => {
  const { run, get } = context();
  run(`state.goals=[{id:'ps5',name:'PS5',target:450000,saved:50000}]`);
  run("handleGoalAction('goal-in',{dataset:{id:'ps5'}})");
  assert.equal(run("modal.kind"), "goal-move");
  submitForm(run, { value: "1.000,00", date: run("today()") });
  assert.equal(run("state.goals[0].saved"), 150000);
  assert.equal(run("state.goals[0].log.length"), 1);
  run("handleGoalAction('goal-out',{dataset:{id:'ps5'}})");
  submitForm(run, { value: "5000", date: run("today()") });
  assert.ok(get("#form-error").textContent.includes("retirar mais"));
  assert.equal(run("state.goals[0].saved"), 150000);
  submitForm(run, { value: "500", date: run("today()") });
  assert.equal(run("state.goals[0].saved"), 100000);
  assert.equal(run("state.goals[0].log[1].value"), -50000);
  assert.ok(run("Finance.valid(state)"));
});
test("Meta: prazo calcula quanto guardar por mês e o ritmo prevê a data", () => {
  const { run } = context();
  const now = run("today()").slice(0, 7);
  const deadline = run(`Finance.shiftMonth('${now}', 9)`);
  run(`state.goals=[{id:'g',name:'Viagem',target:1100000,saved:100000,deadline:'${deadline}',log:[{date:today(),value:50000}]}]`);
  const x = run("goalStats(state.goals[0])");
  assert.equal(x.monthsLeft, 10);
  assert.equal(x.perMonth, 100000);
  assert.equal(x.pace, 50000);
  assert.equal(x.eta, run(`Finance.shiftMonth('${now}', 20)`));
  run("view='goals';render()");
  assert.ok(run("$('#main').innerHTML").includes("depois do prazo"));
});
test("Meta: salva foto escolhida e prazo; rejeita foto de site desconhecido", () => {
  const { run, get } = context();
  run("openGoal()");
  const img = "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/PS5.png/640px-PS5.png";
  submitForm(run, { name: "PS5", target: "4.500,00", saved: "0", deadline: "2027-06", image: img });
  assert.equal(run("state.goals[0].image"), img);
  assert.equal(run("state.goals[0].deadline"), "2027-06");
  run("openGoal(state.goals[0].id)");
  submitForm(run, { name: "PS5", target: "4.500,00", saved: "0", deadline: "", image: "https://site-estranho.com/x.png" });
  assert.ok(get("#form-error").textContent.length > 0);
  assert.equal(run("state.goals[0].image"), img);
  run("view='goals';render()");
  assert.ok(run("$('#main').innerHTML").includes(img));
  assert.ok(run("$('#main').innerHTML").includes("Foto: Wikimedia"));
});
test("Meta antiga, sem foto nem prazo, continua aparecendo e editável", () => {
  const { run } = context();
  run(`state.goals=[{id:'old',name:'Reserva',target:1000000,saved:280000}];view='goals';render()`);
  const html = run("$('#main').innerHTML");
  assert.ok(html.includes("Reserva") && html.includes("28%") && html.includes("goal-fallback"));
});
test("Perfil: nome novo vale na saudação e foto enviada fica salva", () => {
  const { run } = context();
  run("document.querySelector('#profile-name').value='Russo Nikolas'");
  run("handleProfileAction('profile-name')");
  assert.equal(run("state.profile.name"), "Russo Nikolas");
  run("render()");
  assert.ok(run("$('#title').textContent").endsWith("Russo"));
  run("saveProfile({ photo: 'data:image/jpeg;base64,AAAA' }, 'ok')");
  assert.equal(run("photoURL()"), "data:image/jpeg;base64,AAAA");
  run("handleProfileAction('profile-photo-remove')");
  assert.equal(run("'photo' in state.profile"), false);
  assert.equal(run("initials('Russo Nikolas')"), "RN");
  assert.ok(run("Finance.valid(state)"));
});
test("Configurações mostram perfil e a troca entre vidro completo e modo leve", () => {
  const { run } = context();
  run("view='settings';render()");
  const html = run("$('#main').innerHTML");
  assert.ok(html.includes("Seu perfil") && html.includes('data-theme-perf="lite"') && html.includes("profile-photo-file"));
});

test("Cartão da meta: anel neon com porcentagem acessível, degradê próprio e cometas", () => {
  const { run } = context();
  run(`state.goals=[{id:'ps5',name:'PS5',target:400000,saved:100000},{id:'ok',name:'Feito',target:100,saved:100}];view='goals';render()`);
  const html = run("$('#main').innerHTML");
  assert.ok(html.includes('aria-label="25% guardado"') && html.includes('data-count-pct="25"'));
  assert.ok(html.includes('stroke="url(#orb-ps5)"') && html.includes('id="orb-ps5"'));
  assert.equal((html.match(/class="orb-spin/g) || []).length, 4);
  assert.ok(html.includes("goal-orb is-done") && html.includes("goal-neon"));
});
test("Desempenho: aparelho lento desliga os efeitos contínuos, aparelho bom mantém", () => {
  const { run } = context();
  run("document.documentElement = document.documentElement || { dataset: {} }");
  run("adaptEffects(Array(30).fill(16))");
  assert.notEqual(run("document.documentElement.dataset.fxLevel"), "low");
  run("adaptEffects(Array(30).fill(55))");
  assert.equal(run("document.documentElement.dataset.fxLevel"), "low");
});
test("Plantões: dia de semana 50, sábado 100, domingo 100, feriado em dia de semana 100", () => {
  const h = ["2026-11-20"];
  assert.equal(F.rate("2026-11-02", h), 5000);
  assert.equal(F.rate("2026-11-07", h), 10000);
  assert.equal(F.rate("2026-11-08", h), 10000);
  assert.equal(F.rate("2026-11-20", h), 10000);
  assert.equal(F.rate("2026-11-21", h), 10000);
  assert.equal(F.rate("2026-11-19", h), 5000);
});
test("Contracheque: salário + plantões, INSS pela tabela, 5º dia útil e recebido de uma vez", () => {
  const { run, get } = context();
  run("var Account={canUseShifts:true,saveState:()=>true,ready:false}");
  run(`state.entries=[{id:'sal',name:'Salário',type:'income',value:200000,date:'2026-01-06',recurring:true,end:'',category:'Receitas'}];state.shifts=['2026-11-02','2026-11-07','2026-11-08','2026-11-20'];month='2026-11';view='shifts';render()`);
  const html = get("#main").innerHTML;
  assert.ok(html.includes("Como você recebe?") && html.includes("Tabela oficial"));
  assert.ok(html.includes("Trouxe de “Salário”"), "salário vem pré-preenchido do lançamento");
  // Finados (02/11) e Consciência Negra (20/11) contam sozinhos como feriado: R$ 100 cada
  assert.equal(run("Finance.shiftPayroll(state,'2026-11').total"), 40000);
  run("document.querySelector('#pay-salary').value='2.000,00';document.querySelector('#pay-daymode').value='business';document.querySelector('#pay-day').value='5';document.querySelector('#pay-offset').value='1';document.querySelector('#pay-other').value='0'");
  run("document.listeners.click({target:{closest:()=>({dataset:{action:'shift-pay-save'}})}})");
  assert.equal(run("state.shiftPay.inss"), "table");
  assert.equal(run("state.shiftPay.dayMode"), "business");
  run("state.shiftPay.since='2026-12'");
  const slip = run("Finance.payslip(state,'2026-12')");
  assert.equal(slip.gross, 240000);
  assert.equal(slip.inss, 19169);
  assert.equal(slip.net, 220831);
  assert.equal(slip.payday, "2026-12-04");
  assert.equal(run("Finance.payslip(state,'2026-11').extended"), false, "antes do início, sem salário duplicado");
  run("month='2026-12';view='shifts';render()");
  assert.ok(get("#main").innerHTML.includes("Seu salário está contado duas vezes"));
  run("document.listeners.click({target:{closest:()=>({dataset:{action:'shift-stop-salary',id:'sal'}})}})");
  assert.equal(run("state.entries[0].end"), "2026-11");
  assert.equal(run("Finance.totals(state,'2026-12').income"), 220831);
  run("view='transactions';render()");
  assert.ok(get("#main").innerHTML.includes("Salário + plantões") && get("#main").innerHTML.includes("Líquido, já sem INSS"));
  run("document.listeners.click({target:{closest:()=>({dataset:{action:'shift-payroll',month:'2026-12'}})}})");
  assert.equal(run("state.paid['payroll@2026-12']"), true);
  assert.equal(run("state.shiftPaid.length"), 4);
  assert.equal(run("Finance.totals(state,'2026-12').received"), 220831);
  run("document.listeners.click({target:{closest:()=>({dataset:{action:'shift-payroll',month:'2026-12'}})}})");
  assert.equal(run("state.paid['payroll@2026-12']"), undefined);
  assert.ok(run("Finance.valid(state)"));
});
test("Feriados: nacional conta sozinho, dá para desligar, e dá para marcar um que não está no calendário", () => {
  const { run } = context();
  run("var Account={canUseShifts:true,saveState:()=>true,ready:false}");
  run("state.shifts=['2026-11-02','2026-11-03'];month='2026-11';holidayMode=true");
  assert.equal(run("Finance.shiftRate(state,'2026-11-02')"), 10000);
  run("document.listeners.click({target:{closest:()=>({dataset:{action:'day',date:'2026-11-02'}})}})");
  assert.equal(run("Finance.shiftRate(state,'2026-11-02')"), 5000, "Finados desligado");
  assert.equal(run("JSON.stringify(state.holidayOff)"), '["2026-11-02"]');
  run("document.listeners.click({target:{closest:()=>({dataset:{action:'day',date:'2026-11-03'}})}})");
  assert.equal(run("Finance.shiftRate(state,'2026-11-03')"), 10000, "feriado municipal marcado à mão");
  run("document.listeners.click({target:{closest:()=>({dataset:{action:'day',date:'2026-11-02'}})}})");
  assert.equal(run("'holidayOff' in state"), false);
  assert.ok(run("Finance.valid(state)"));
  assert.equal(run("Finance.holidayInfo('2027-03-26').name"), "Sexta-feira Santa");
  assert.equal(run("Finance.holidayInfo('2027-02-09').kind"), "facultativo");
});
test("INSS 2026 por faixas e porcentagem fixa", () => {
  assert.equal(F.inssBreakdown(300000, 2026).total, 24860);
  assert.equal(F.inssBreakdown(162100, 2026).total, 12158);
  assert.equal(F.inssBreakdown(1000000, 2026).total, 98809);
  const s = { version: 1, entries: [], shifts: [], shiftPaid: [], holidays: [], paid: {}, goals: [], budget: 0, categories: [], shiftPay: { day: 6, offset: 1, dayMode: "fixed", inss: "percent", inssRate: 1100, salary: 300000 } };
  assert.equal(F.payslip(s, "2026-12").inss, 33000);
  assert.ok(F.valid(s));
  assert.ok(!F.valid({ ...s, shiftPay: { ...s.shiftPay, inss: "chute" } }));
});
test("Folha de plantões no mesmo mês e dia 31 em mês curto", () => {
  const s = { version: 1, entries: [], shifts: ["2027-02-10"], shiftPaid: [], holidays: [], paid: {}, goals: [], budget: 0, categories: [], shiftPay: { day: 31, offset: 0 } };
  assert.equal(F.shiftPayroll(s, "2027-02").payday, "2027-02-28");
  assert.equal(F.totals(s, "2027-02").income, 5000);
  assert.ok(!F.valid({ ...s, shiftPay: { day: 0, offset: 1 } }));
  assert.ok(!F.valid({ ...s, shiftPay: { day: 5, offset: 2 } }));
});
test("Plantões ficam invisíveis para quem não é o dono, inclusive a folha", () => {
  const { run, get } = context();
  run(`state.shifts=['2026-11-02'];state.shiftPay={day:5,offset:1};month='2026-12';view='transactions';render()`);
  assert.ok(!get("#main").innerHTML.includes("Plantões de novembro"));
  assert.equal(run("Finance.totals(state,'2026-12').income"), 0);
  run("view='shifts';render()");
  assert.equal(run("view"), "shared");
});
test("Parcelas em quadradinhos: paga, atrasada, do mês e futura; tocar marca como paga", () => {
  const { run, get, document } = context();
  run(`month=today().slice(0,7);state.debts=[{id:'d1',name:'Geladeira',creditor:'',start:Finance.shiftMonth(month,-2)+'-01',firstDue:Finance.shiftMonth(month,-2)+'-01',total:300000,count:6,principal:0}];state.paid['debt:d1:0@'+Finance.shiftMonth(month,-2)]=true;view='transactions';render()`);
  const html = get("#main").innerHTML;
  assert.ok(html.includes('class="inst paid"') && html.includes('class="inst late"') && html.includes('class="inst future"'));
  assert.equal((html.match(/data-action="installment-paid"/g) || []).length, 6);
  assert.ok(html.includes("1<small>/6</small>"));
  document.listeners.click({ target: { closest: () => ({ dataset: { action: "installment-paid", id: "debt:d1:1", date: run("Finance.shiftMonth(month,-1)") + "-01" } }) } });
  assert.equal(run("state.paid['debt:d1:1@'+Finance.shiftMonth(month,-1)]"), true);
});
test("Nova compra parcelada mostra a prévia das parcelas antes de salvar", () => {
  const { run, get } = context();
  run("openDebt()");
  assert.ok(get("#fields").innerHTML.includes('data-action="debt-count"'));
  assert.ok(get("#fields").innerHTML.includes('id="debt-preview"'));
});
test("Nova receita tem atalhos prontos e prévia dos meses", () => {
  const { run, get } = context();
  run("openEntry('income')");
  const html = get("#fields").innerHTML;
  assert.ok(html.includes('data-action="entry-preset"') && html.includes("Salário") && html.includes('id="entry-preview"'));
  run("openEntry('expense')");
  assert.ok(get("#fields").innerHTML.includes("Mercado"));
  run("openEntry('expense', false, undefined)");
  run(`state.entries=[{id:'x',name:'Luz',type:'expense',value:100,date:'2026-11-05',recurring:false,end:'',category:'Moradia'}];openEntry('expense',false,'x')`);
  assert.ok(!get("#fields").innerHTML.includes('data-action="entry-preset"'), "editar não mostra atalhos");
});
const asyncTests = [];
const atest = (name, fn) => asyncTests.push(async () => {
  await fn();
  checks++;
  console.log("OK " + name);
});
const fakeFetch = `globalThis.fetch = async (url) => {
  const u = String(url), json = (data) => ({ ok: true, json: async () => data });
  if (u.includes("pt.wikipedia.org")) return json({ query: { pages: { 1: { index: 1, title: "PlayStation 5", thumbnail: { source: "https://upload.wikimedia.org/wikipedia/commons/thumb/ps5.png/640px-ps5.png" } }, 2: { index: 2, title: "Sem foto" } } } });
  if (u.includes("en.wikipedia.org")) return json({ query: { pages: { 7: { index: 1, title: "PlayStation 5", thumbnail: { source: "https://upload.wikimedia.org/wikipedia/commons/thumb/ps5.png/640px-ps5.png" } } } } });
  if (u.includes("commons.wikimedia.org")) return json({ query: { pages: {
    3: { index: 2, title: "File:PS5 controle.jpg", imageinfo: [{ mime: "image/jpeg", thumburl: "https://upload.wikimedia.org/c/controle.jpg" }] },
    4: { index: 1, title: "File:PS5 console.jpg", imageinfo: [{ mime: "image/jpeg", thumburl: "https://upload.wikimedia.org/c/console.jpg" }] },
    5: { index: 3, title: "File:logo.svg", imageinfo: [{ mime: "image/svg+xml", thumburl: "https://upload.wikimedia.org/c/logo.png" }] } } } });
  if (u.includes("api.openverse.org")) return json({ results: [
    { title: "PS5 na sala", thumbnail: "https://api.openverse.org/v1/images/0f3e9a8c-1111-4222-8333-444455556666/thumb/" },
    { title: "Fora da lista", thumbnail: "https://site-estranho.com/x.jpg" } ] });
  return { ok: false };
};`;
atest("Fotos da meta: junta Wikipédia, Commons e Openverse, sem repetir e só de endereços seguros", async () => {
  const { run } = context();
  run(fakeFetch);
  const list = await run("findGoalPhotos('PS5')");
  const srcs = list.map((p) => p.src);
  assert.equal(srcs[0], "https://upload.wikimedia.org/wikipedia/commons/thumb/ps5.png/640px-ps5.png");
  assert.equal(srcs.length, 4);
  assert.equal(srcs[1], "https://upload.wikimedia.org/c/console.jpg");
  assert.ok(srcs.includes("https://api.openverse.org/v1/images/0f3e9a8c-1111-4222-8333-444455556666/thumb/"));
  assert.ok(!srcs.some((x) => x.includes("estranho") || x.includes("logo")));
});
atest("Fotos da meta: se a pessoa não escolher, a meta fica com a primeira relacionada", async () => {
  const { run } = context();
  run(fakeFetch);
  run("openGoal()");
  run("$('#goal-photo-q').value='PS5'");
  run(`$('#form').listeners.submit({preventDefault(){},target:{name:'PS5',target:'4.500,00',saved:'0',deadline:'',image:''}})`);
  assert.equal(run("state.goals[0].image"), undefined);
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(run("state.goals[0].image"), "https://upload.wikimedia.org/wikipedia/commons/thumb/ps5.png/640px-ps5.png");
  assert.ok(run("Finance.valid(state)"));
});
atest("Fotos da meta: 'Sem foto' é respeitado e não busca sozinho", async () => {
  const { run } = context();
  run(fakeFetch);
  run("openGoal();handleGoalAction('goal-photo-none',{dataset:{}})");
  run(`$('#form').listeners.submit({preventDefault(){},target:{name:'PS5',target:'100',saved:'0',deadline:'',image:''}})`);
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(run("state.goals[0].image"), undefined);
});
test("Foto do Openverse só é aceita no formato da miniatura oficial", () => {
  const mk = (image) => ({ version: 1, entries: [], shifts: [], shiftPaid: [], holidays: [], paid: {}, budget: 0, categories: [], goals: [{ id: "g", name: "x", target: 1, saved: 0, image }] });
  assert.ok(F.valid(mk("https://api.openverse.org/v1/images/0f3e9a8c-1111-4222-8333-444455556666/thumb/")));
  assert.ok(!F.valid(mk("https://api.openverse.org/v1/images/../../etc/thumb/")));
  assert.ok(!F.valid(mk("https://api.openverse.org/v1/images/?q=x")));
});
(async () => {
  for (const t of asyncTests) await t();
  console.log(`${checks} verificações passaram.`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
