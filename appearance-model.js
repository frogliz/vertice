(function (root) {
  "use strict";
  // Os identificadores (fluid, editorial, precision, mint, blue…) são os mesmos das versões
  // anteriores: preferências já salvas nas contas continuam válidas sem migração.
  const defaults = Object.freeze({
    version: 2,
    style: "fluid",
    mode: "system",
    accent: "violet",
    custom: "#6e56ff",
    density: "comfortable",
    motion: true,
    privateStart: false,
  });
  const styles = Object.freeze({
    fluid: { name: "Prisma", description: "Vidro iridescente que espalha a luz em cores suaves." },
    editorial: { name: "Névoa", description: "Vidro fosco e leitoso, com a sua cor no brilho." },
    precision: { name: "Grafite", description: "Só preto e branco, com contornos nítidos." },
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
  function valid(p) {
    return (
      legacy(p) &&
      p.version === 2 &&
      Object.hasOwn(styles, p.style) &&
      ["comfortable", "compact"].includes(p.density) &&
      typeof p.motion === "boolean" &&
      typeof p.privateStart === "boolean" &&
      Object.keys(p).every((k) => Object.hasOwn(defaults, k))
    );
  }
  function normalize(p) {
    if (valid(p)) return { ...p };
    if (legacy(p) && p.version === undefined) return { ...defaults, mode: p.mode, accent: p.accent, custom: p.custom };
    return { ...defaults };
  }
  root.AppearanceModel = { defaults, styles, colors, colorNames, valid, normalize };
})(typeof window !== "undefined" ? window : globalThis);
