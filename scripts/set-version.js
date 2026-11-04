// Updates every place that carries the plugin version:
//   manifest.json, package.json, src/version.js, and index.html
//   (asset cache-busting queries and the visible version label).
// Usage: npm run set-version -- 1.0.0
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const version = process.argv[2];

if (!/^\d+\.\d+\.\d+$/.test(version || "")) {
  console.error("Usage: npm run set-version -- <major.minor.patch>  (for example 1.0.0)");
  process.exit(1);
}

function update(relativePath, transform) {
  const filePath = path.join(root, relativePath);
  const before = fs.readFileSync(filePath, "utf8");
  const after = transform(before);

  if (after === before) {
    console.log("unchanged  " + relativePath);
    return;
  }

  fs.writeFileSync(filePath, after);
  console.log("updated    " + relativePath);
}

function updateJSONVersion(text) {
  return text.replace(/("version"\s*:\s*")[^"]*(")/, "$1" + version + "$2");
}

update("manifest.json", updateJSONVersion);
update("package.json", updateJSONVersion);
update("src/version.js", function (text) {
  return text.replace(/(var VERSION = ")[^"]*(")/, "$1" + version + "$2");
});
update("index.html", function (text) {
  return text
    .replace(/\?v=[^"']*/g, "?v=" + version)
    .replace(/>v\d+\.\d+\.\d+</g, ">v" + version + "<");
});

console.log("\nVersion set to " + version + ". Add a CHANGELOG.md entry, then run npm run check.");
