(function (root) {
  "use strict";
  // Os identificadores (fluid, editorial, precision, mint, blue…) são os mesmos das versões
  // anteriores. A versão 3 acrescenta "performance" (vidro completo ou leve) e "welcomed"
  // (se a pessoa já escolheu o visual no primeiro acesso). Preferências v2 continuam válidas
  // e são atualizadas automaticamente, sem perder nada.
  const defaults = Object.freeze({
    version: 3,
    style: "fluid",
    mode: "system",
    accent: "violet",
    custom: "#6e56ff",
    density: "comfortable",
    motion: true,
    privateStart: false,
    performance: "full",
    welcomed: false,
  });
  const v2Keys = ["version", "style", "mode", "accent", "custom", "density", "motion", "privateStart"];
  const styles = Object.freeze({
    fluid: { name: "Prisma", description: "Vidro iridescente que espalha a luz em cores suaves." },
    editorial: { name: "Névoa", description: "Vidro fosco e leitoso, com a sua cor no brilho." },
    precision: { name: "Grafite", description: "Só preto e branco, com contornos nítidos." },
  });
  const performances = Object.freeze({
    full: { name: "Vidro completo", description: "Desfoque real, brilho em movimento e todos os efeitos." },
    lite: { name: "Leve e rápido", description: "O mesmo visual, sem os efeitos pesados. Ideal para computador simples e celular." },
  });
  const colors = Object.freeze({
    mono: null,
    violet: "#6e56ff",
    blue: "#3563f5",
    mint: "#2fcf98",
    amber: "#ffad5c",
  });
  const colorNames = Object.freeze({
    mono: "Preto e branco",
    violet: "Violeta",
    blue: "Azul",
    mint: "Menta",
    amber: "Âmbar",
  });
  const legacy = (p) =>
    !!p &&
    typeof p === "object" &&
    ["dark", "light", "system"].includes(p.mode) &&
    Object.keys(colors).concat("custom").includes(p.accent) &&
    /^#[0-9a-f]{6}$/i.test(p.custom);
  const common = (p) =>
    legacy(p) &&
    Object.hasOwn(styles, p.style) &&
    ["comfortable", "compact"].includes(p.density) &&
    typeof p.motion === "boolean" &&
    typeof p.privateStart === "boolean";
  function validV2(p) {
    return common(p) && p.version === 2 && Object.keys(p).every((k) => v2Keys.includes(k));
  }
  function validV3(p) {
    return (
      common(p) &&
      p.version === 3 &&
      Object.hasOwn(performances, p.performance) &&
      typeof p.welcomed === "boolean" &&
      Object.keys(p).every((k) => Object.hasOwn(defaults, k))
    );
  }
  const valid = (p) => validV2(p) || validV3(p);
  function normalize(p) {
    if (validV3(p)) return { ...p };
    if (validV2(p)) return { ...defaults, ...p, version: 3 };
    if (legacy(p) && p.version === undefined) return { ...defaults, mode: p.mode, accent: p.accent, custom: p.custom };
    return { ...defaults };
  }
  // Aparelho fraco: poucos núcleos, pouca memória, economia de dados ou transparência reduzida.
  function weakDevice(env = typeof navigator !== "undefined" ? navigator : {}, mm = typeof matchMedia === "function" ? matchMedia : null) {
    try {
      return !!(
        (env.hardwareConcurrency && env.hardwareConcurrency <= 4) ||
        (env.deviceMemory && env.deviceMemory <= 4) ||
        env.connection?.saveData ||
        mm?.("(prefers-reduced-transparency: reduce)")?.matches
      );
    } catch (_) {
      return false;
    }
  }
  root.AppearanceModel = { defaults, styles, performances, colors, colorNames, valid, validV2, validV3, normalize, weakDevice };
})(typeof window !== "undefined" ? window : globalThis);
