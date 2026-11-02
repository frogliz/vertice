// Monta entrega/vertice-github com o repositório completo, pronto para subir no GitHub.
const fs = require("node:fs"),
  path = require("node:path");
const root = __dirname,
  out = path.join(root, "entrega", "vertice-github");
const skip = new Set(["entrega", "dist", "node_modules", ".git"]);
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const name of fs.readdirSync(root)) {
  if (skip.has(name) || name.endsWith(".log") || /-backup-.*\.json$/.test(name)) continue;
  fs.cpSync(path.join(root, name), path.join(out, name), { recursive: true });
}
console.log("Pasta pronta para o GitHub: " + out);
