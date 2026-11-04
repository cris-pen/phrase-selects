// Copies only the runtime plugin files into dist/ so the .ccx packaged by
// UXP Developer Tool does not include tests, scripts, docs, or .git.
// Run via `npm run build` (which runs `npm run check` first).
const fs = require("fs");
const path = require("path");
const { getRuntimeFiles } = require("./runtime-files");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

const files = getRuntimeFiles(root);

files.forEach(function (file) {
  const source = path.join(root, file);
  const target = path.join(dist, file);

  if (!fs.existsSync(source)) {
    console.error("build failed: missing runtime file " + file);
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
});

const manifest = JSON.parse(fs.readFileSync(path.join(dist, "manifest.json"), "utf8"));

console.log("Built Phrase Selects " + manifest.version + " into dist/:");
files.sort().forEach(function (file) {
  console.log("  " + file);
});
console.log("\nNext: in UXP Developer Tool, add dist/manifest.json and choose Package.");
