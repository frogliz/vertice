"use strict";
const Appearance = (() => {
  const M = AppearanceModel,
    legacyKey = "vertice-appearance-v1",
    keyFor = (id) => "vertice-appearance-v2:" + id;
  let legacy = null;
  try {
    legacy = JSON.parse(localStorage.getItem(legacyKey) || "null");
  } catch (_) {}
  let scope = "device",
    prefs = M.normalize(legacy),
    onChange = null,
    lastSaved = true;
  const media = typeof matchMedia === "function" ? matchMedia("(prefers-color-scheme: light)") : null,
    reduceMotion = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null;
  const safe = (v) =>
    String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const all = (s) => document.querySelectorAll(s);
  const read = (id) => {
    try {
      const value = JSON.parse(localStorage.getItem(keyFor(id)) || "null");
      return M.valid(value) ? M.normalize(value) : null;
    } catch (_) {
      return null;
    }
  };
  prefs = read("device") || prefs;
  function statusText() {
    return !lastSaved
      ? "Aplicado agora. Confira se seus dados foram salvos."
      : scope.startsWith("user:")
        ? "Salvo na sua conta. Vale em todos os seus aparelhos."
        : "Salvo neste navegador.";
  }
  function resolvedMode() {
    return prefs.mode === "system" ? (media?.matches ? "light" : "dark") : prefs.mode;
  }
  function apply() {
    const mode = resolvedMode();
    const hex =
      prefs.accent === "mono"
        ? mode === "dark"
          ? "#ffffff"
          : "#000000"
        : prefs.accent === "custom"
          ? prefs.custom
          : M.colors[prefs.accent];
    const rgb = hex.match(/\w\w/g).map((v) => parseInt(v, 16)),
      linear = rgb.map((v) => {
        v /= 255;
        return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      }),
      luminance = linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
    // Versão do destaque usada em texto e linhas finas: escurece no claro e clareia no escuro.
    const readable =
        mode === "light" && luminance > 0.2
          ? rgb.map((v) => Math.round(v * 0.5))
          : mode === "dark" && luminance < 0.2
            ? rgb.map((v) => Math.round(120 + v * 0.53))
            : rgb,
      root = document.documentElement;
    root.dataset.theme = mode;
    root.dataset.style = prefs.style;
    root.dataset.density = prefs.density;
    root.dataset.motion = prefs.motion ? "on" : "off";
    root.dataset.perf = prefs.performance;
    root.dataset.fx = prefs.performance === "full" && prefs.motion && !reduceMotion?.matches ? "on" : "off";
    root.style.setProperty("--accent", hex);
    root.style.setProperty("--accent-rgb", rgb.join(","));
    root.style.setProperty("--accent-readable", "rgb(" + readable.join(",") + ")");
    root.style.setProperty("--accent-ink", luminance > 0.179 ? "#000000" : "#ffffff");
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", mode === "dark" ? "#000000" : "#ececf0");
    for (const [selector, key, field] of [
      ["[data-theme-style]", "style", "themeStyle"],
      ["[data-theme-mode]", "mode", "themeMode"],
      ["[data-theme-accent]", "accent", "themeAccent"],
      ["[data-theme-density]", "density", "themeDensity"],
      ["[data-theme-perf]", "performance", "themePerf"],
    ])
      all(selector).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset[field] === prefs[key])));
    all("[data-appearance-custom]").forEach((el) => (el.value = prefs.custom));
    all("[data-appearance-hex]").forEach((el) => (el.textContent = prefs.custom.toUpperCase()));
    all("[data-appearance-motion]").forEach((el) => (el.checked = prefs.motion));
    all("[data-appearance-private]").forEach((el) => (el.checked = prefs.privateStart));
    all("[data-current-style]").forEach((el) => (el.textContent = M.styles[prefs.style].name));
    all("[data-appearance-status]").forEach((el) => (el.textContent = statusText()));
  }
  function persist() {
    lastSaved = true;
    try {
      localStorage.setItem(keyFor(scope), JSON.stringify(prefs));
    } catch (_) {
      lastSaved = false;
    }
    if (onChange) {
      try {
        if (onChange({ ...prefs }) === false) lastSaved = false;
      } catch (_) {
        lastSaved = false;
      }
    }
  }
  function set(next) {
    const privacyChanged = next.privateStart !== undefined && next.privateStart !== prefs.privateStart;
    const candidate = { ...prefs, ...next };
    if (!M.valid(candidate)) return false;
    prefs = candidate;
    persist();
    apply();
    if (privacyChanged && typeof applyPrivacyPreference === "function") applyPrivacyPreference();
    return true;
  }
  function bind(id, remote, handler) {
    scope = id;
    onChange = typeof handler === "function" ? handler : null;
    prefs = M.valid(remote) ? M.normalize(remote) : read(id) || M.normalize(legacy);
    lastSaved = true;
    apply();
  }
  function sync(remote) {
    const next = M.valid(remote) ? M.normalize(remote) : null;
    if (next && JSON.stringify(next) !== JSON.stringify(prefs)) {
      prefs = next;
      try {
        localStorage.setItem(keyFor(scope), JSON.stringify(prefs));
      } catch (_) {}
      apply();
    }
  }
  function detach() {
    onChange = null;
    scope = "device";
    prefs = read(scope) || M.normalize(legacy);
    lastSaved = true;
    apply();
  }
  const segment = (attr, items, current) =>
    `<div class="segmented" role="group">${items
      .map(
        ([id, label]) => `<button type="button" ${attr}="${id}" aria-pressed="${current === id}">${label}</button>`,
      )
      .join("")}</div>`;
  function panel() {
    const styleCards = Object.entries(M.styles)
      .map(
        ([id, s]) =>
          `<button type="button" class="style-card style-${id}" data-theme-style="${id}" aria-pressed="${prefs.style === id}"><span class="style-preview" aria-hidden="true"><i class="sp-lens"><b></b><b></b></i><i class="sp-row"></i><i class="sp-row short"></i><i class="sp-pill"></i></span><span class="style-name">${s.name}</span><span class="style-desc">${s.description}</span></button>`,
      )
      .join("");
    const swatches = Object.entries(M.colors)
      .map(
        ([id, color]) =>
          `<button type="button" class="swatch ${id === "mono" ? "is-mono" : ""}" data-theme-accent="${id}" aria-label="${M.colorNames[id]}" title="${M.colorNames[id]}" aria-pressed="${prefs.accent === id}" style="--swatch:${color || "transparent"}"><span aria-hidden="true">${typeof icon === "function" ? icon("check") : "✓"}</span></button>`,
      )
      .join("");
    return `<div class="atelier">
      <section class="atelier-block"><div class="atelier-title"><h3>Desempenho</h3><p>${M.weakDevice() ? "Este aparelho parece mais simples: o modo leve deixa tudo mais rápido." : "O modo leve tira os efeitos pesados e mantém o visual."}</p></div><div class="perf-gallery">${perfCards()}</div></section>
      <section class="atelier-block"><div class="atelier-title"><h3>Estilo do vidro</h3><p>Três acabamentos para o mesmo painel.</p></div><div class="style-gallery">${styleCards}</div></section>
      <div class="atelier-split">
        <section class="atelier-block"><div class="atelier-title"><h3>Luz</h3><p>Branco, preto ou igual ao seu aparelho.</p></div>${segment(
          "data-theme-mode",
          [
            ["light", "Claro"],
            ["dark", "Escuro"],
            ["system", "Automático"],
          ],
          prefs.mode,
        )}</section>
        <section class="atelier-block"><div class="atelier-title"><h3>Espaçamento</h3><p>Mais respiro ou mais informação por tela.</p></div>${segment(
          "data-theme-density",
          [
            ["comfortable", "Confortável"],
            ["compact", "Compacto"],
          ],
          prefs.density,
        )}</section>
      </div>
      <section class="atelier-block"><div class="atelier-title"><h3>Cor de destaque</h3><p>Aparece no botão principal, nos gráficos e nos detalhes.</p></div><div class="swatches">${swatches}<label class="swatch-custom"><input data-appearance-custom type="color" value="${safe(prefs.custom)}" aria-label="Escolher uma cor personalizada"><span>Personalizada<small data-appearance-hex>${safe(prefs.custom.toUpperCase())}</small></span></label></div></section>
      <section class="atelier-block toggles">
        <label class="toggle"><span><strong>Movimento suave</strong><small>O brilho do vidro se move devagar no cartão principal.</small></span><input data-appearance-motion type="checkbox" ${prefs.motion ? "checked" : ""}><i aria-hidden="true"></i></label>
        <label class="toggle"><span><strong>Começar com valores ocultos</strong><small>Os valores aparecem borrados até você tocar no olho.</small></span><input data-appearance-private type="checkbox" ${prefs.privateStart ? "checked" : ""}><i aria-hidden="true"></i></label>
      </section>
      <div class="atelier-foot"><span class="saved-note"><i class="dot"></i><span data-appearance-status>${statusText()}</span></span><button type="button" class="btn ghost" data-appearance="reset">Restaurar padrão</button></div>
    </div>`;
  }
  function perfCards(attr = "data-theme-perf") {
    const weak = M.weakDevice();
    return Object.entries(M.performances)
      .map(
        ([id, p]) =>
          `<button type="button" class="perf-card perf-${id}" ${attr}="${id}" aria-pressed="${prefs.performance === id}"><span class="perf-preview" aria-hidden="true"><i class="pp-lens"><b></b><b></b></i><i class="pp-row"></i><i class="pp-row short"></i></span><span class="style-name">${p.name}${(id === "lite") === weak ? '<span class="chip soft">Indicado aqui</span>' : ""}</span><span class="style-desc">${p.description}</span></button>`,
      )
      .join("");
  }
  // Primeiro acesso: aparece uma vez por pessoa (o aviso fica salvo junto com as preferências da conta).
  function welcome() {
    const dialog = document.querySelector("#welcome-dialog");
    if (!dialog || dialog.open || prefs.welcomed) return;
    if (M.weakDevice() && prefs.performance === "full") {
      prefs = { ...prefs, performance: "lite" };
      apply();
    }
    document.querySelector("#welcome-body").innerHTML = `<div class="welcome-head">${typeof brandMark === "function" ? brandMark() : ""}<div><h2 id="welcome-title" tabindex="-1">Como você quer o Vértice?</h2><p>Escolha agora. Dá para trocar quando quiser no Ateliê visual.</p></div></div><div class="perf-gallery">${perfCards()}</div><div class="welcome-light"><span>Luz</span>${segment(
      "data-theme-mode",
      [
        ["light", "Claro"],
        ["dark", "Escuro"],
        ["system", "Automático"],
      ],
      prefs.mode,
    )}</div><div class="welcome-foot"><button type="button" class="btn primary" data-welcome="done">Começar</button></div>`;
    apply();
    dialog.addEventListener?.("close", () => !prefs.welcomed && set({ welcomed: true }), { once: true });
    dialog.showModal();
    document.querySelector("#welcome-title")?.focus?.();
  }
  function finishWelcome() {
    if (!prefs.welcomed) set({ welcomed: true });
    const dialog = document.querySelector("#welcome-dialog");
    if (dialog?.open) dialog.close();
  }
  function open() {
    const target = document.querySelector("#appearance-controls");
    if (target) target.innerHTML = panel();
    apply();
    const dialog = document.querySelector("#theme-dialog");
    if (!dialog.open) dialog.showModal();
    document.querySelector("#appearance-title")?.focus?.();
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest?.(
      "[data-theme-style],[data-theme-mode],[data-theme-accent],[data-theme-density],[data-theme-perf],[data-appearance],[data-welcome]",
    );
    if (!b) return;
    if (b.dataset.welcome) finishWelcome();
    else if (b.dataset.themePerf) set({ performance: b.dataset.themePerf });
    else if (b.dataset.themeStyle) set({ style: b.dataset.themeStyle });
    else if (b.dataset.themeMode) set({ mode: b.dataset.themeMode });
    else if (b.dataset.themeAccent) set({ accent: b.dataset.themeAccent });
    else if (b.dataset.themeDensity) set({ density: b.dataset.themeDensity });
    else if (b.dataset.appearance === "open") open();
    else if (b.dataset.appearance === "close") document.querySelector("#theme-dialog").close();
    else if (b.dataset.appearance === "reset") set({ ...M.defaults, welcomed: true });
  });
  document.addEventListener("input", (e) => {
    if (e.target.hasAttribute?.("data-appearance-custom")) set({ custom: e.target.value, accent: "custom" });
  });
  document.addEventListener("change", (e) => {
    if (e.target.hasAttribute?.("data-appearance-motion")) set({ motion: e.target.checked });
    if (e.target.hasAttribute?.("data-appearance-private")) set({ privateStart: e.target.checked });
  });
  media?.addEventListener("change", () => {
    if (prefs.mode === "system") apply();
  });
  apply();
  return {
    apply,
    set,
    bind,
    sync,
    detach,
    panel,
    open,
    welcome,
    mode: resolvedMode,
    get: () => ({ ...prefs }),
    valid: M.valid,
    defaults: M.defaults,
  };
})();
