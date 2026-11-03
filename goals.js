"use strict";
// Metas: cartão com foto, barra do quanto falta, prazo, quanto guardar por mês e previsão pelo seu ritmo.
let goalSearchTimer = null,
  goalSearchSeq = 0;
const monthsBetween = (from, to) => (Number(to.slice(0, 4)) - Number(from.slice(0, 4))) * 12 + Number(to.slice(5, 7)) - Number(from.slice(5, 7));
const shortMonth = (m) => monthName(m, "short") + "/" + m.slice(2, 4);
function goalStats(g) {
  const now = today(),
    thisMonth = now.slice(0, 7),
    remaining = Math.max(0, g.target - g.saved),
    done = g.saved >= g.target,
    stats = { remaining, done, p: pct(g.saved, g.target) };
  if (g.deadline) {
    const left = monthsBetween(thisMonth, g.deadline) + 1;
    stats.monthsLeft = left;
    stats.late = left < 1 && !done;
    stats.perMonth = left >= 1 ? Math.ceil(remaining / left) : remaining;
  }
  // Ritmo: o que entrou e saiu da meta nos últimos 90 dias, por mês.
  const since = new Date(now + "T12:00:00");
  since.setDate(since.getDate() - 90);
  const from = since.toISOString().slice(0, 10),
    recent = (g.log || []).filter((x) => x.date >= from);
  if (recent.length && !done) {
    const first = recent.reduce((a, x) => (x.date < a ? x.date : a), now),
      months = Math.max(1, Math.min(3, daysBetween(first, now) / 30.4 || 1)),
      avg = Math.round(recent.reduce((a, x) => a + x.value, 0) / months);
    if (avg > 0) {
      stats.pace = avg;
      stats.eta = F.shiftMonth(thisMonth, Math.ceil(remaining / avg));
    }
  }
  return stats;
}
function goalCover(g, size = "") {
  const wiki = /^https:\/\/upload\.wikimedia\.org\//.test(g.image || "");
  return `<div class="goal-cover ${size}">${
    g.image
      ? `<img src="${esc(g.image)}" alt="" loading="lazy" referrerpolicy="no-referrer">`
      : `<span class="goal-fallback" aria-hidden="true">${esc((g.name.trim()[0] || "?").toUpperCase())}</span>`
  }${wiki && !size ? '<small class="goal-credit">Foto: Wikimedia Commons</small>' : ""}</div>`;
}
function goalCard(g) {
  const x = goalStats(g);
  const facts = [
    ["Falta", x.done ? "Nada" : amount(x.remaining)],
    ["Prazo", g.deadline ? esc(shortMonth(g.deadline)) + (x.late ? ' <b class="neg-text">passou</b>' : "") : "Sem prazo"],
    ["Por mês", g.deadline && !x.done && !x.late ? amount(x.perMonth) : "—"],
  ];
  const pace = x.done
    ? `<p class="goal-pace good">${icon("check")}Meta alcançada. Parabéns!</p>`
    : x.pace
      ? `<p class="goal-pace ${g.deadline && x.eta > g.deadline ? "warn" : ""}">No seu ritmo de ${amount(x.pace)} por mês, você chega lá em <b>${esc(mlabel(x.eta).toLowerCase())}</b>${g.deadline && x.eta > g.deadline ? ", depois do prazo" : ""}.</p>`
      : g.deadline && !x.late
        ? `<p class="goal-pace">Guardando ${amount(x.perMonth)} por mês, você chega até ${esc(mlabel(g.deadline).toLowerCase())}.</p>`
        : `<p class="goal-pace">Toque em Guardar sempre que separar dinheiro. O Vértice calcula quando você chega lá.</p>`;
  return `<article class="goal-card ${x.done ? "is-done" : ""}">${goalCover(g)}<span class="goal-pct">${x.p}%</span><div class="goal-body"><h3>${esc(g.name)}</h3><div class="goal-amounts">${bigAmount(g.saved, "md")}<span class="muted">de ${amount(g.target)}</span></div>${progress(x.p, x.done ? "var(--pos)" : "")}<dl class="goal-facts">${facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>${pace}<div class="goal-actions">${btn("goal-in", "Guardar", { id: g.id, cls: "primary", icon: "plus" })}${g.saved ? btn("goal-out", "Retirar", { id: g.id, icon: "minus", cls: "ghost" }) : ""}${iconBtn("goal-edit", "edit", "Editar meta " + g.name, g.id)}${iconBtn("goal-delete", "trash", "Excluir meta " + g.name, g.id, "danger")}</div></div></article>`;
}
function goals() {
  const list = state.goals,
    saved = list.reduce((a, g) => a + g.saved, 0),
    target = list.reduce((a, g) => a + g.target, 0);
  return `${pageHead("Seus sonhos, com data", "Dê um nome, um valor e, se quiser, um prazo. A foto aparece sozinha.", btn("goal-new", "Nova meta", { cls: "primary", icon: "plus" }))}${
    list.length
      ? `<div class="summary-strip"><div><span>Já guardado</span>${amount(saved, "pos")}</div><div><span>Somando todas as metas</span>${amount(target)}</div><div><span>Metas alcançadas</span><span class="amount">${list.filter((g) => g.saved >= g.target).length} de ${list.length}</span></div></div><div class="goal-grid">${list.map(goalCard).join("")}</div>`
      : `<article class="panel goals-empty"><div class="goal-ideas" aria-hidden="true">${["PS5", "Viagem", "Carro", "Casa"].map((n) => `<span>${n}</span>`).join("")}</div><div><h3>Nenhuma meta ainda</h3><p class="muted">Escreva o que você quer, como “PS5”, “Viagem para o Rio” ou “Reserva de emergência”. O Vértice procura uma foto, mostra quanto falta e quanto guardar por mês.</p></div>${btn("goal-new", "Criar a primeira meta", { cls: "primary", icon: "plus" })}</article>`
  }`;
}
function photoChoices(list, current) {
  return list.length
    ? list
        .map(
          (p) =>
            `<button type="button" class="photo-choice" data-action="goal-photo-pick" data-src="${esc(p.src)}" aria-pressed="${p.src === current}" title="${esc(p.title)}"><img src="${esc(p.src)}" alt="${esc(p.title)}" loading="lazy" referrerpolicy="no-referrer"></button>`,
        )
        .join("")
    : "";
}
function renderGoalPhoto() {
  const value = $("#goal-image")?.value || "",
    box = $("#goal-photos"),
    preview = $("#goal-photo-preview");
  if (preview)
    preview.innerHTML = value
      ? `<img src="${esc(value)}" alt="" referrerpolicy="no-referrer">`
      : `<span class="goal-fallback" aria-hidden="true">${esc((($("#goal-name")?.value || "?").trim()[0] || "?").toUpperCase())}</span>`;
  if (box) box.innerHTML = photoChoices(modal?.photos || [], value) || `<p class="hint">${modal?.searching ? "Procurando fotos…" : modal?.searched ? "Nenhuma foto encontrada para esse nome. Envie uma sua, se quiser." : "Escreva o nome da meta para ver sugestões de foto."}</p>`;
}
function openGoal(id) {
  const g = state.goals.find((g) => g.id === id);
  modal = { kind: "goal", id, photos: [], autoImage: !g?.image };
  $("#modal-title").textContent = g ? "Editar meta" : "Nova meta";
  $("#fields").innerHTML =
    field("O que você quer conquistar?", "name", "text", g?.name || "", true, 'id="goal-name" required maxlength="120" placeholder="Ex.: PS5, Viagem para o Rio, Carro"') +
    moneyField("Quanto custa", "target", g ? g.target : "", false, "required") +
    moneyField("Quanto já tem guardado", "saved", g ? g.saved : 0, false, "required") +
    field("Até quando (opcional)", "deadline", "month", g?.deadline || "", true) +
    `<div class="full goal-photo"><span class="field-label">Foto da meta</span><div class="goal-photo-row"><div class="goal-photo-preview" id="goal-photo-preview"></div><div class="photo-picker" id="goal-photos"></div></div><div class="row-actions">${btn("goal-photo-search", "Buscar fotos", { cls: "ghost", icon: "search" })}<label class="btn ghost">${icon("upload")}Enviar foto<input type="file" accept="image/*" id="goal-photo-file" hidden></label>${btn("goal-photo-none", "Sem foto", { cls: "ghost" })}</div><input type="hidden" name="image" id="goal-image" value="${esc(g?.image || "")}"><p class="hint">As sugestões vêm da Wikipédia. A foto que você enviar fica só na sua conta.</p></div>`;
  showDialog({ danger: g ? btn("goal-delete", "Excluir", { id: g.id, cls: "danger", icon: "trash", attrs: "data-dismiss" }) : "" });
  renderGoalPhoto();
  if (g?.name) searchGoalPhotos(g.name);
}
function openGoalMove(id, dir) {
  const g = state.goals.find((g) => g.id === id);
  if (!g) return;
  modal = { kind: "goal-move", id, dir };
  $("#modal-title").textContent = dir === "in" ? "Guardar para " + g.name : "Retirar de " + g.name;
  $("#fields").innerHTML =
    `<div class="full goal-move-head">${goalCover(g, "sm")}<div><strong>${esc(g.name)}</strong><span class="muted">${amount(g.saved)} de ${amount(g.target)}</span></div></div>` +
    moneyField("Valor", "value", "", false, 'required autofocus') +
    field("Quando", "date", "date", today(), false, `required max="${today()}"`) +
    hint(dir === "in" ? "Isso só atualiza a meta. Para tirar o valor do saldo do mês, registre também uma despesa ou use Reservas." : "O valor sai da meta e entra no histórico dela.");
  showDialog({ submit: dir === "in" ? "Guardar" : "Retirar" });
}
// Busca na Wikipédia (português e, se faltar, inglês). Só aceita imagens de upload.wikimedia.org.
async function findGoalPhotos(term) {
  const q = String(term || "").trim();
  if (q.length < 2 || typeof fetch !== "function") return [];
  const out = [],
    seen = new Set();
  for (const lang of ["pt", "en"]) {
    try {
      const url = `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrnamespace=0&gsrlimit=8&gsrsearch=${encodeURIComponent(q)}&prop=pageimages&piprop=thumbnail&pithumbsize=640`;
      const res = await fetch(url, { referrerPolicy: "no-referrer" });
      if (!res.ok) continue;
      const pages = Object.values((await res.json())?.query?.pages || {}).sort((a, b) => a.index - b.index);
      for (const p of pages) {
        const src = p.thumbnail?.source;
        if (src && /^https:\/\/upload\.wikimedia\.org\/[^\s"'<>()\\]+$/.test(src) && src.length <= 500 && !seen.has(src)) {
          seen.add(src);
          out.push({ src, title: String(p.title || "").slice(0, 120) });
        }
      }
    } catch (_) {}
    if (out.length >= 6) break;
  }
  return out.slice(0, 6);
}
async function searchGoalPhotos(term) {
  if (modal?.kind !== "goal") return;
  const seq = ++goalSearchSeq;
  modal.searching = true;
  renderGoalPhoto();
  const photos = await findGoalPhotos(term);
  if (seq !== goalSearchSeq || modal?.kind !== "goal") return;
  modal.photos = photos;
  modal.searching = false;
  modal.searched = true;
  if (modal.autoImage && photos[0] && $("#goal-image")) $("#goal-image").value = photos[0].src;
  renderGoalPhoto();
}
// Reduz a foto enviada para caber nos dados da conta (JPEG, lado maior de até 720 px).
function shrinkImage(file, maxSide = 640, maxChars = 90000) {
  return new Promise((resolve, reject) => {
    if (!file || !/^image\//.test(file.type) || file.size > 15000000) return reject(Error("Escolha uma imagem de até 15 MB."));
    const url = URL.createObjectURL(file),
      img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let side = maxSide,
        quality = 0.82,
        data = "";
      for (let i = 0; i < 6; i++) {
        const scale = Math.min(1, side / Math.max(img.naturalWidth, img.naturalHeight)),
          canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        data = canvas.toDataURL("image/jpeg", quality);
        if (data.length <= maxChars) return resolve(data);
        side = Math.round(side * 0.8);
        quality = Math.max(0.6, quality - 0.06);
      }
      reject(Error("Não foi possível reduzir esta imagem. Tente outra."));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(Error("Não foi possível abrir esta imagem."));
    };
    img.src = url;
  });
}
function submitGoals(e) {
  if (!modal || !["goal", "goal-move"].includes(modal.kind)) return false;
  const data = new FormData(e.target),
    fail = (msg) => {
      $("#form-error").textContent = msg;
      return true;
    };
  if (modal.kind === "goal-move") {
    const g = state.goals.find((g) => g.id === modal.id),
      value = F.cents(data.get("value")),
      date = data.get("date");
    if (!g) return true;
    if (!Number.isSafeInteger(value) || value <= 0) return fail("Informe um valor maior que zero. Exemplo: 150,00.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > today()) return fail("Escolha uma data de hoje ou de antes.");
    if (modal.dir === "out" && value > g.saved) return fail("Não dá para retirar mais do que está guardado na meta.");
    const signed = modal.dir === "in" ? value : -value,
      next = { ...g, saved: g.saved + signed, log: [...(g.log || []), { date, value: signed }].slice(-1000) };
    const candidate = { ...state, goals: state.goals.map((x) => (x.id === g.id ? next : x)) };
    if (!F.valid(candidate)) return fail("Confira o valor.");
    const reached = g.saved < g.target && next.saved >= next.target;
    state.goals = candidate.goals;
    $("#dialog").close();
    commit(reached ? "Meta alcançada! Parabéns." : modal.dir === "in" ? "Guardado na meta." : "Retirado da meta.");
    return true;
  }
  const old = state.goals.find((g) => g.id === modal.id),
    goal = {
      ...(old || {}),
      id: modal.id || uid(),
      name: String(data.get("name") || "").trim(),
      target: F.cents(data.get("target")),
      saved: F.cents(data.get("saved")),
      deadline: String(data.get("deadline") || ""),
      image: String(data.get("image") || ""),
    };
  if (!goal.name) return fail("Escreva o nome da meta.");
  if (!Number.isSafeInteger(goal.target) || goal.target <= 0) return fail("Informe quanto custa. Exemplo: 4.500,00.");
  if (!Number.isSafeInteger(goal.saved) || goal.saved < 0) return fail("Informe quanto já tem guardado, ou 0.");
  if (!goal.deadline) delete goal.deadline;
  if (!goal.image) delete goal.image;
  const candidate = { ...state, goals: old ? state.goals.map((g) => (g.id === old.id ? goal : g)) : [...state.goals, goal] };
  if (!F.valid(candidate)) return fail("Confira os valores, o prazo e o limite de 500 metas.");
  state.goals = candidate.goals;
  $("#dialog").close();
  commit(old ? "Meta atualizada." : "Meta criada.");
  return true;
}
function handleGoalAction(a, b) {
  const id = b.dataset.id;
  if (a === "goal-new") openGoal();
  else if (a === "goal-edit") openGoal(id);
  else if (a === "goal-in" || a === "goal-out") openGoalMove(id, a === "goal-in" ? "in" : "out");
  else if (a === "goal-delete") {
    const g = state.goals.find((g) => g.id === id);
    if (g && confirm(`Excluir a meta “${g.name}”?`)) {
      state.goals = state.goals.filter((g) => g.id !== id);
      commit("Meta excluída.");
    }
  } else if (a === "goal-photo-search") {
    if (modal) modal.autoImage = !$("#goal-image").value;
    searchGoalPhotos($("#goal-name").value);
  } else if (a === "goal-photo-pick") {
    $("#goal-image").value = b.dataset.src;
    modal.autoImage = false;
    renderGoalPhoto();
  } else if (a === "goal-photo-none") {
    $("#goal-image").value = "";
    modal.autoImage = false;
    renderGoalPhoto();
  } else return false;
  return true;
}
document.addEventListener("input", (e) => {
  if (e.target.id !== "goal-name" || modal?.kind !== "goal") return;
  clearTimeout(goalSearchTimer);
  const term = e.target.value;
  goalSearchTimer = setTimeout(() => searchGoalPhotos(term), 650);
  if (!$("#goal-image").value) renderGoalPhoto();
});
document.addEventListener("change", async (e) => {
  if (e.target.id !== "goal-photo-file") return;
  try {
    $("#goal-image").value = await shrinkImage(e.target.files[0]);
    modal.autoImage = false;
    renderGoalPhoto();
  } catch (err) {
    $("#form-error").textContent = err.message;
  } finally {
    e.target.value = "";
  }
});
