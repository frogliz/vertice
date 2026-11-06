(function (root) {
  "use strict";
  // Aceita 1500, "1500.5", "1.500,50", "1500,5" e "R$ 1.500,00". Sempre devolve centavos inteiros.
  function cents(v) {
    if (typeof v === "number") return Math.round(v * 100);
    let text = String(v ?? "")
      .trim()
      .replace(/^R\$\s*/i, "")
      .replace(/\s+/g, "");
    if (!text) return 0;
    if (text.includes(",")) text = text.replace(/\./g, "").replace(",", ".");
    else if (/^-?\d{1,3}(\.\d{3})+$/.test(text)) text = text.replace(/\./g, "");
    if (!/^-?\d+(\.\d+)?$/.test(text)) return NaN;
    return Math.round(Number(text) * 100);
  }
  const options = { shifts: true },
    shiftList = (s) => (options.shifts ? s.shifts || [] : []),
    shiftPaidList = (s) => (options.shifts ? s.shiftPaid || [] : []);
  const plain = (v) =>
    (v / 100).toFixed(2).replace(".", ","),
    money = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v / 100);
  const monthOf = (d) => d.slice(0, 7),
    daysIn = (m) => new Date(Number(m.slice(0, 4)), Number(m.slice(5)), 0).getDate();
  function shiftMonth(m, n) {
    const d = new Date(Number(m.slice(0, 4)), Number(m.slice(5)) - 1 + n, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  function dateFor(m, day) {
    return `${m}-${String(Math.min(day, daysIn(m))).padStart(2, "0")}`;
  }
  function rate(date, holidays) {
    const day = new Date(date + "T12:00:00").getDay();
    return day === 0 || day === 6 || holidays.includes(date) ? 10000 : 5000;
  }
  // Feriados nacionais do Brasil. Os móveis saem da data da Páscoa (algoritmo de Meeus).
  // "nacional" conta automaticamente (pode ser desligado dia a dia); "facultativo" só conta se a pessoa marcar.
  const holidayCache = new Map();
  function easter(y) {
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4,
      f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30,
      i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451),
      month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
    return Date.UTC(y, month - 1, day);
  }
  function nationalHolidays(y) {
    if (holidayCache.has(y)) return holidayCache.get(y);
    const out = {},
      fixed = [
        ["01-01", "Confraternização Universal"],
        ["04-21", "Tiradentes"],
        ["05-01", "Dia do Trabalho"],
        ["09-07", "Independência"],
        ["10-12", "Nossa Senhora Aparecida"],
        ["11-02", "Finados"],
        ["11-15", "Proclamação da República"],
        ["11-20", "Consciência Negra"],
        ["12-25", "Natal"],
      ];
    for (const [md, name] of fixed) if (md !== "11-20" || y >= 2024) out[`${y}-${md}`] = { name, kind: "nacional" };
    const e = easter(y),
      add = (days, name, kind) => (out[new Date(e + days * 86400000).toISOString().slice(0, 10)] = { name, kind });
    add(-48, "Carnaval", "facultativo");
    add(-47, "Carnaval", "facultativo");
    add(-2, "Sexta-feira Santa", "nacional");
    add(60, "Corpus Christi", "facultativo");
    holidayCache.set(y, out);
    return out;
  }
  const holidayInfo = (date) => nationalHolidays(Number(date.slice(0, 4)))[date] || null;
  // Conta como feriado: marcado pela pessoa, ou nacional que ela não desligou.
  function holidayCounts(s, date) {
    if ((s.holidays || []).includes(date)) return true;
    const n = holidayInfo(date);
    return !!n && n.kind === "nacional" && !(s.holidayOff || []).includes(date);
  }
  const weekday = (date) => new Date(date + "T12:00:00").getDay();
  // Valor do plantão: sábado, domingo e feriado R$ 100; dia de semana R$ 50.
  const shiftRate = (s, date) => ([0, 6].includes(weekday(date)) || holidayCounts(s, date) ? 10000 : 5000);
  // Dia em que o dinheiro cai. "business": n-ésimo dia útil (sábado conta, como manda a CLT; domingo e
  // feriado não). Com dayMode definido, se cair em fim de semana ou feriado, recebe no dia útil anterior.
  function paydayOf(s, m) {
    const c = s.shiftPay;
    if (!c) return null;
    let date = dateFor(m, c.day);
    if (c.dayMode === "business") {
      let n = 0;
      for (let d = 1; d <= daysIn(m); d++) {
        const x = dateFor(m, d);
        if (weekday(x) === 0 || holidayCounts(s, x)) continue;
        if (++n === c.day) {
          date = x;
          break;
        }
        date = x;
      }
    }
    if (c.dayMode) {
      const back = (x) => new Date(new Date(x + "T12:00:00").getTime() - 86400000).toISOString().slice(0, 10);
      let guard = 0;
      while (([0, 6].includes(weekday(date)) || holidayCounts(s, date)) && date.slice(8) !== "01" && guard++ < 10) date = back(date);
    }
    return date;
  }
  // INSS do empregado, tabela progressiva oficial (limites em centavos, alíquota em centésimos de %).
  // 2026: Portaria Interministerial MPS/MF nº 13/2026. Anos sem tabela usam a mais próxima.
  const INSS_TABLES = {
    2025: [[151800, 750], [279388, 900], [419083, 1200], [815741, 1400]],
    2026: [[162100, 750], [290284, 900], [435427, 1200], [847555, 1400]],
  };
  function inssTable(year) {
    const years = Object.keys(INSS_TABLES).map(Number);
    return INSS_TABLES[year] ? year : year < Math.min(...years) ? Math.min(...years) : Math.max(...years);
  }
  function inssBreakdown(gross, year) {
    const used = inssTable(year),
      parts = [];
    let prev = 0,
      total = 0;
    for (const [limit, rate] of INSS_TABLES[used]) {
      if (gross <= prev) break;
      const base = Math.min(gross, limit) - prev,
        value = (base * rate) / 10000;
      parts.push({ from: prev, to: Math.min(gross, limit), rate, value: Math.round(value) });
      total += value;
      prev = limit;
    }
    return { year: used, total: Math.round(total), parts, ceiling: INSS_TABLES[used].at(-1)[0] };
  }
  // Folha de plantões: os plantões trabalhados em um mês entram juntos no dia do pagamento.
  // shiftPay = { day: 1..31, offset: 0 (mesmo mês) ou 1 (mês seguinte) }. Sem shiftPay, vale o jeito antigo:
  // cada plantão conta no próprio mês.
  function shiftPayroll(s, m) {
    const c = s.shiftPay,
      work = c ? shiftMonth(m, -c.offset) : m,
      paidList = shiftPaidList(s),
      days = shiftList(s)
        .filter((d) => monthOf(d) === work)
        .sort(),
      paidDays = days.filter((d) => paidList.includes(d)),
      sum = (list) => list.reduce((a, d) => a + shiftRate(s, d), 0);
    return {
      configured: !!c,
      work,
      payday: c ? paydayOf(s, m) : null,
      days,
      count: days.length,
      total: sum(days),
      paid: sum(paidDays),
      done: days.length > 0 && paidDays.length === days.length,
      weekend: days.filter((d) => [0, 6].includes(new Date(d + "T12:00:00").getDay())).length,
      holiday: days.filter((d) => ![0, 6].includes(new Date(d + "T12:00:00").getDay()) && holidayCounts(s, d)).length,
    };
  }
  // Contracheque do mês de pagamento m: salário bruto + plantões, menos INSS e outros descontos.
  function payslip(s, m) {
    const p = shiftPayroll(s, m),
      all = s.shiftPay || {},
      c = all.since && m < all.since ? {} : all,
      salary = c.salary || 0,
      gross = salary + p.total,
      table = c.inss === "table" ? inssBreakdown(gross, Number(p.work.slice(0, 4))) : null,
      inss = table ? table.total : c.inss === "percent" ? Math.round((gross * (c.inssRate || 0)) / 10000) : 0,
      other = c.other || 0,
      net = Math.max(0, gross - inss - other),
      key = "payroll@" + m,
      done = !!(s.paid || {})[key] || (p.count > 0 && p.done && !salary && !inss && !other);
    return { ...p, month: m, key, salary, gross, inss, inssMode: c.inss || "none", inssDetail: table, other, net, done, extended: !!(salary || c.inss || other) };
  }
  // Mês em que os plantões de um mês trabalhado são pagos.
  const shiftPayMonth = (s, work) => (s.shiftPay ? shiftMonth(work, s.shiftPay.offset) : work);
  function debtSchedule(s, d) {
    return Array.from({ length: d.count }, (_, i) => {
      const m = shiftMonth(monthOf(d.firstDue), i),
        date = dateFor(m, Number(d.firstDue.slice(8))),
        id = `debt:${d.id}:${i}`;
      return {
        id,
        debtId: d.id,
        installment: i + 1,
        count: d.count,
        name: `${d.name} · ${i + 1}/${d.count}`,
        type: "expense",
        category: "Parcelas",
        recurring: false,
        date,
        value: Math.floor(d.total / d.count) + (i < d.total % d.count ? 1 : 0),
        done: !!s.paid[id + "@" + m],
      };
    });
  }
  function resolveEntry(s, e, m) {
    const revisions = (e.revisions || []).filter((r) => r.from <= m).sort((a, b) => a.from.localeCompare(b.from)),
      latest = revisions.at(-1) || {},
      override = (s.overrides || {})[e.id + "@" + m] || {},
      resolved = { ...e, ...latest, ...override };
    return {
      ...resolved,
      date: e.recurring ? dateFor(m, resolved.day || Number(e.date.slice(8))) : e.date,
      done: !!s.paid[e.id + "@" + m],
      adjusted: !!Object.keys(override).length,
    };
  }
  function entries(s, m) {
    const regular = s.entries
      .filter((e) => (!e.recurring ? monthOf(e.date) === m : monthOf(e.date) <= m && (!e.end || m <= e.end)))
      .map((e) => resolveEntry(s, e, m))
      .filter((e) => !e.skipped);
    return regular
      .concat(typeof SharedFinance !== "undefined" ? SharedFinance.entries(s, m) : [])
      .concat((s.debts || []).flatMap((d) => debtSchedule(s, d).filter((e) => monthOf(e.date) === m)));
  }
  function totals(s, m) {
    const list = entries(s, m),
      payroll = payslip(s, m),
      shiftTotal = payroll.total,
      payIncome = s.shiftPay ? payroll.net : payroll.total,
      payReceived = s.shiftPay && payroll.extended ? (payroll.done ? payroll.net : 0) : payroll.done ? payIncome : payroll.paid,
      income = list.filter((e) => e.type === "income").reduce((a, e) => a + e.value, 0) + payIncome,
      expense = list.filter((e) => e.type === "expense").reduce((a, e) => a + e.value, 0),
      received = list.filter((e) => e.type === "income" && e.done).reduce((a, e) => a + e.value, 0) + payReceived,
      paid = list.filter((e) => e.type === "expense" && e.done).reduce((a, e) => a + e.value, 0),
      opening = monthConfig(s, m).opening || 0;
    return {
      income,
      expense,
      balance: income - expense,
      received,
      paid,
      available: opening + received - paid,
      opening,
      closing: opening + income - expense - savingFlow(s, m),
      shiftTotal,
      shiftCount: payroll.count,
      list,
    };
  }
  function forecast(s, m) {
    const next = timeline(s, m, 2)[1];
    return { ...next, closing: next.projectedClosing };
  }
  function monthConfig(s, m) {
    return (s.monthSettings || {})[m] || {};
  }
  function budgetFor(s, m) {
    return monthConfig(s, m).budget ?? s.budget;
  }
  function timeline(s, start, count) {
    let carry = 0;
    return Array.from({ length: count }, (_, i) => {
      const m = shiftMonth(start, i),
        t = totals(s, m),
        config = monthConfig(s, m),
        explicit = Object.prototype.hasOwnProperty.call(config, "opening"),
        opening = explicit ? config.opening : i === 0 ? t.opening : carry;
      carry = opening + t.balance - savingFlow(s, m);
      return { ...t, month: m, projectedOpening: opening, projectedClosing: carry, explicitOpening: explicit };
    });
  }
  function validMonthly(s) {
    const obj = (v) => v && typeof v === "object" && !Array.isArray(v),
      month = (m) =>
        typeof m === "string" &&
        /^\d{4}-(0[1-9]|1[0-2])$/.test(m) &&
        Number(m.slice(0, 4)) >= 1900 &&
        Number(m.slice(0, 4)) <= 9999,
      patch = (p) =>
        obj(p) &&
        Object.keys(p).every((k) => ["value", "name", "category", "day", "skipped", "from"].includes(k)) &&
        (p.value === undefined || (Number.isSafeInteger(p.value) && p.value > 0)) &&
        (p.name === undefined || (typeof p.name === "string" && p.name.length > 0 && p.name.length <= 120)) &&
        (p.category === undefined || (typeof p.category === "string" && p.category.length <= 60)) &&
        (p.day === undefined || (Number.isInteger(p.day) && p.day >= 1 && p.day <= 31)) &&
        (p.skipped === undefined || typeof p.skipped === "boolean");
    return (
      (s.monthSettings === undefined ||
        (obj(s.monthSettings) &&
          Object.entries(s.monthSettings).every(
            ([m, c]) =>
              month(m) &&
              obj(c) &&
              (c.opening === undefined || Number.isSafeInteger(c.opening)) &&
              (c.budget === undefined || (Number.isSafeInteger(c.budget) && c.budget >= 0)) &&
              (c.note === undefined || (typeof c.note === "string" && c.note.length <= 500)),
          ))) &&
      (s.overrides === undefined ||
        (obj(s.overrides) &&
          Object.entries(s.overrides).every(
            ([key, p]) =>
              month(key.slice(-7)) &&
              s.entries.some((e) => e.recurring && key === e.id + "@" + key.slice(-7)) &&
              patch(p),
          ))) &&
      s.entries.every(
        (e) =>
          e.revisions === undefined ||
          (e.recurring &&
            Array.isArray(e.revisions) &&
            e.revisions.length <= 1000 &&
            e.revisions.every((r) => patch(r) && month(r.from))),
      )
    );
  }
  function valid(s) {
    const date = (d) =>
      typeof d === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(d) &&
      new Date(d + "T12:00:00").toISOString().slice(0, 10) === d;
    return (
      !!s &&
      s.version === 1 &&
      Array.isArray(s.entries) &&
      s.entries.length <= 10000 &&
      s.entries.every(
        (e) =>
          typeof e.id === "string" &&
          typeof e.name === "string" &&
          e.name.length <= 120 &&
          ["income", "expense"].includes(e.type) &&
          Number.isSafeInteger(e.value) &&
          e.value > 0 &&
          date(e.date) &&
          typeof e.recurring === "boolean" &&
          (!e.end || /^\d{4}-\d{2}$/.test(e.end)) &&
          typeof e.category === "string",
      ) &&
      ["shifts", "holidays", "shiftPaid"].every(
        (k) => Array.isArray(s[k]) && s[k].length <= 10000 && s[k].every(date) && new Set(s[k]).size === s[k].length,
      ) &&
      s.shiftPaid.every((d) => s.shifts.includes(d)) &&
      Array.isArray(s.goals) &&
      s.goals.every(
        (g) =>
          typeof g.id === "string" &&
          typeof g.name === "string" &&
          g.name.length <= 120 &&
          Number.isSafeInteger(g.target) &&
          g.target > 0 &&
          Number.isSafeInteger(g.saved) &&
          g.saved >= 0,
      ) &&
      s.paid &&
      typeof s.paid === "object" &&
      !Array.isArray(s.paid) &&
      Object.values(s.paid).every((v) => typeof v === "boolean") &&
      Number.isSafeInteger(s.budget) &&
      s.budget >= 0
    );
  }
  const validBase = valid;
  function validExtended(s) {
    try {
      if (!validBase(s)) return false;
      const cash = (v) => Number.isSafeInteger(v) && v >= 0,
        date = (d) =>
          typeof d === "string" &&
          /^\d{4}-\d{2}-\d{2}$/.test(d) &&
          new Date(d + "T12:00:00").toISOString().slice(0, 10) === d,
        text = (t) => typeof t === "string" && t.length <= 120;
      // Campos novos, todos opcionais: perfil (nome e foto) e metas com foto, prazo e histórico.
      const photo = (v, max) =>
        v === undefined ||
        v === "" ||
        (typeof v === "string" &&
          v.length <= max &&
          (/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(v) ||
            /^https:\/\/upload\.wikimedia\.org\/[^\s"'<>()\\]+$/.test(v) ||
            /^https:\/\/api\.openverse\.org\/v1\/images\/[0-9a-f-]{36}\/thumb\/$/.test(v)));
      const goalsOk = s.goals.every(
        (g) =>
          photo(g.image, 160000) &&
          (g.deadline === undefined || g.deadline === "" || /^\d{4}-(0[1-9]|1[0-2])$/.test(g.deadline)) &&
          (g.log === undefined ||
            (Array.isArray(g.log) &&
              g.log.length <= 1000 &&
              g.log.every((x) => date(x.date) && Number.isSafeInteger(x.value) && x.value !== 0 && Math.abs(x.value) <= 99999999900))),
      );
      const profileOk =
        s.profile === undefined ||
        (s.profile &&
          typeof s.profile === "object" &&
          !Array.isArray(s.profile) &&
          (s.profile.name === undefined || (typeof s.profile.name === "string" && s.profile.name.length <= 60)) &&
          photo(s.profile.photo, 90000) &&
          (s.profile.gravatar === undefined || typeof s.profile.gravatar === "boolean"));
      const money = (v) => v === undefined || (Number.isSafeInteger(v) && v >= 0 && v <= 99999999900);
      const sp = s.shiftPay;
      const shiftPayOk =
        sp === undefined ||
        (sp &&
          typeof sp === "object" &&
          Number.isInteger(sp.day) &&
          sp.day >= 1 &&
          sp.day <= (sp.dayMode === "business" ? 23 : 31) &&
          [0, 1].includes(sp.offset) &&
          (sp.dayMode === undefined || ["fixed", "business"].includes(sp.dayMode)) &&
          (sp.inss === undefined || ["table", "percent", "none"].includes(sp.inss)) &&
          (sp.inssRate === undefined || (Number.isInteger(sp.inssRate) && sp.inssRate >= 0 && sp.inssRate <= 5000)) &&
          money(sp.salary) &&
          money(sp.other) &&
          (sp.since === undefined || /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.since)) &&
          Object.keys(sp).every((k) => ["day", "offset", "dayMode", "inss", "inssRate", "salary", "other", "since"].includes(k)));
      const holidayOffOk =
        s.holidayOff === undefined ||
        (Array.isArray(s.holidayOff) && s.holidayOff.length <= 2000 && s.holidayOff.every(date) && new Set(s.holidayOff).size === s.holidayOff.length);
      if (!holidayOffOk) return false;
      if (!goalsOk || !profileOk || !shiftPayOk) return false;
      return (
        (s.debts === undefined ||
          (Array.isArray(s.debts) &&
            s.debts.length <= 500 &&
            s.debts.every(
              (d) =>
                text(d.id) &&
                text(d.name) &&
                text(d.creditor) &&
                date(d.start) &&
                date(d.firstDue) &&
                d.start <= d.firstDue &&
                cash(d.principal) &&
                cash(d.total) &&
                d.total > 0 &&
                Number.isInteger(d.count) &&
                d.count >= 1 &&
                d.count <= 600 &&
                d.total >= d.count,
            ))) &&
        (s.funds === undefined ||
          (Array.isArray(s.funds) &&
            s.funds.length <= 1000 &&
            s.funds.every(
              (f) =>
                text(f.id) &&
                text(f.name) &&
                ["reserve", "investment"].includes(f.kind) &&
                cash(f.balance) &&
                (f.adjustment === undefined || Number.isSafeInteger(f.adjustment)) &&
                fundBalance(s, f) >= 0 &&
                text(f.product) &&
                ["daily", "term"].includes(f.liquidity) &&
                ["low", "medium", "high"].includes(f.risk),
            ))) &&
        (s.transfers === undefined ||
          (Array.isArray(s.transfers) &&
            s.transfers.length <= 10000 &&
            s.transfers.every(
              (t) =>
                text(t.id) &&
                text(t.fundId) &&
                (s.funds || []).some((f) => f.id === t.fundId) &&
                date(t.date) &&
                ["deposit", "withdraw"].includes(t.kind) &&
                cash(t.value) &&
                t.value > 0,
            ))) &&
        (s.wealth === undefined ||
          (s.wealth &&
            cash(s.wealth.monthly) &&
            cash(s.wealth.essential) &&
            Number.isInteger(s.wealth.months) &&
            s.wealth.months >= 1 &&
            s.wealth.months <= 24))
      );
    } catch (e) {
      return false;
    }
  }
  function fundBalance(s, f) {
    return (
      f.balance +
      (f.adjustment || 0) +
      (s.transfers || [])
        .filter((t) => t.fundId === f.id)
        .reduce((a, t) => a + (t.kind === "deposit" ? t.value : -t.value), 0)
    );
  }
  function savingFlow(s, m) {
    return (s.transfers || [])
      .filter((t) => monthOf(t.date) === m)
      .reduce((a, t) => a + (t.kind === "deposit" ? t.value : -t.value), 0);
  }
  function availableAfterSaving(s, m) {
    return totals(s, m).available - savingFlow(s, m);
  }
  function debtSummary(s, d, asOf) {
    const schedule = debtSchedule(s, d),
      pending = schedule.filter((e) => !e.done);
    return {
      schedule,
      pending,
      remaining: pending.reduce((a, e) => a + e.value, 0),
      paidCount: schedule.length - pending.length,
      overdue: pending.filter((e) => e.date < asOf),
      next: pending[0],
      last: schedule.at(-1).date,
      cost: d.total - d.principal,
    };
  }
  function advice(s, m, asOf) {
    const t = totals(s, m),
      items = [],
      debts = (s.debts || []).map((d) => debtSummary(s, d, asOf)),
      late = debts.flatMap((d) => d.overdue),
      flow = savingFlow(s, m),
      free = t.closing,
      byCategory = {};
    if (late.length)
      items.push({
        tone: "danger",
        title: "Vamos cuidar das parcelas atrasadas primeiro?",
        text: `Há ${late.length} parcela(s) vencida(s), somando ${money(late.reduce((a, e) => a + e.value, 0))}. Confira se já pagou e atualize o registro; se ainda estiverem abertas, tente negociar antes de assumir uma compra nova.`,
      });
    if (t.balance < 0)
      items.push({
        tone: "danger",
        title: "Este mês está pedindo uma pausa nas compras novas.",
        text: `As despesas previstas superam as entradas em ${money(-t.balance)}. Proteja as contas essenciais e reveja os gastos que podem esperar.`,
      });
    if (budgetFor(s, m) && t.expense > budgetFor(s, m))
      items.push({
        tone: "warning",
        title: "Seu limite foi ultrapassado. Dá para ajustar com calma.",
        text: `Os gastos estão ${money(t.expense - budgetFor(s, m))} acima do limite que você escolheu. Uma pausa antes de parcelar outra compra pode aliviar os próximos meses.`,
      });
    const installment = t.list.filter((e) => e.debtId).reduce((a, e) => a + e.value, 0);
    if (t.income && installment / t.income >= 0.3)
      items.push({
        tone: "warning",
        title: "Uma parte importante da renda já tem destino.",
        text: `As parcelas representam ${Math.round((installment / t.income) * 100)}% das entradas previstas deste mês. Este é um alerta do painel, não uma regra universal: veja o que sobra para o básico antes de comprar.`,
      });
    t.list
      .filter((e) => e.type === "expense" && !e.debtId)
      .forEach((e) => (byCategory[e.category] = (byCategory[e.category] || 0) + e.value));
    const top = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];
    if (top)
      items.push({
        tone: "calm",
        title: "Vale olhar com carinho para " + top[0] + ".",
        text: `Essa é a maior categoria de gastos cadastrados fora das parcelas: ${money(top[1])}. Ela pode incluir necessidades. Procure primeiro despesas repetidas ou compras por impulso que você mesmo queira reduzir.`,
      });
    if (flow > 0 && free < 0)
      items.push({
        tone: "warning",
        title: "Guardar dinheiro também precisa caber no mês.",
        text: `Depois dos aportes registrados, faltam ${money(-free)} na previsão de caixa. Considere ajustar o aporte para preservar os vencimentos.`,
      });
    if (!t.income && !t.expense)
      items.push({
        tone: "calm",
        title: "Vamos começar pelo que você sabe hoje.",
        text: "Cadastre a renda, as contas essenciais e as parcelas. Com essa base, os avisos ficam ligados à sua realidade.",
      });
    if (free > 0)
      items.push({
        tone: "good",
        title: "Existe espaço no plano. Vá no seu ritmo.",
        text: `A sobra prevista após aportes é ${money(free)}. Antes de separar esse valor, confira os recebimentos e os gastos que ainda não foram cadastrados.`,
      });
    return items;
  }
  root.Finance = {
    options,
    nationalHolidays,
    holidayInfo,
    holidayCounts,
    shiftRate,
    paydayOf,
    inssBreakdown,
    payslip,
    shiftPayroll,
    shiftPayMonth,
    plain,
    shiftList,
    shiftPaidList,
    cents,
    money,
    monthOf,
    daysIn,
    shiftMonth,
    dateFor,
    rate,
    entries,
    totals,
    forecast,
    valid: (s) =>
      validExtended(s) &&
      validMonthly(s) &&
      (typeof VerticeSecurity === "undefined" || VerticeSecurity.validState(s)) &&
      (typeof SharedFinance === "undefined" ? s.shared === undefined : SharedFinance.valid(s)),
    debtSchedule,
    debtSummary,
    fundBalance,
    savingFlow,
    availableAfterSaving,
    advice,
    resolveEntry,
    monthConfig,
    budgetFor,
    timeline,
  };
})(typeof window !== "undefined" ? window : globalThis);
