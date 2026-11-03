// Prepara a pasta dist/ com só o que o site precisa. Usado pelo GitHub Actions.
const fs = require("node:fs"),
  path = require("node:path");
const root = __dirname,
  dist = path.join(root, "dist");
const files = [
  "index.html", "vertice.css", "manifest.webmanifest", "favicon.svg", "icon-192.png", "icon-512.png",
  "icon-maskable-512.png", "apple-touch-icon.png", "og.png", "_headers", "config.js", "mona-sans.woff2",
  "appearance-model.js", "icons.js", "theme.js", "catalog.js", "security.js", "shared-engine.js", "engine.js",
  "ui.js", "growth.js", "monthly.js", "cloud-store.js", "auth-errors.js", "auth.js", "shared.js",
  "experience.js", "home.js", "app.js",
];
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });
for (const file of files) fs.copyFileSync(path.join(root, file), path.join(dist, file));
fs.cpSync(path.join(root, "vendor"), path.join(dist, "vendor"), { recursive: true });
if (fs.existsSync(path.join(root, "MonaSans-OFL.txt"))) fs.copyFileSync(path.join(root, "MonaSans-OFL.txt"), path.join(dist, "MonaSans-OFL.txt"));
// Confere se todo script e estilo citado no HTML foi copiado.
const html = fs.readFileSync(path.join(dist, "index.html"), "utf8");
const refs = [...html.matchAll(/(?:src|href)="([^"#:]+)"/g)].map((m) => m[1]);
const missing = refs.filter((r) => !fs.existsSync(path.join(dist, r)));
if (missing.length) {
  console.error("Arquivos citados no HTML e ausentes em dist/: " + missing.join(", "));
  process.exit(1);
}
console.log("Site pronto em dist/ (" + files.length + " arquivos + vendor).");
