const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const requiredFiles = [
  "manifest.json",
  "index.html",
  "styles.css",
  "src/transcript-utils.js",
  "src/premiere-api.js",
  "src/main.js",
  "tests/transcript-utils.test.js"
];

const jsFiles = [
  "src/transcript-utils.js",
  "src/premiere-api.js",
  "src/main.js",
  "tests/transcript-utils.test.js"
];

function fail(message) {
  console.error(message);
  process.exit(1);
}

function readJSON(relativePath) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
  } catch (error) {
    fail("Could not read " + relativePath + ": " + error.message);
  }
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit"
  });

  if (result.error) {
    fail(result.error.message);
  }

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    fail("Missing required file: " + file);
  }
}

const manifest = readJSON("manifest.json");
const packageJSON = readJSON("package.json");

if (manifest.version !== packageJSON.version) {
  fail("Version mismatch: manifest.json is " + manifest.version + " but package.json is " + packageJSON.version);
}

if (manifest.manifestVersion !== 5) {
  fail("manifestVersion must be 5 for Premiere UXP.");
}

if (!manifest.host || manifest.host.app !== "premierepro") {
  fail("manifest.json must target the premierepro host.");
}

if (!manifest.entrypoints || !manifest.entrypoints.length) {
  fail("manifest.json must define at least one entrypoint.");
}

for (const file of jsFiles) {
  run(process.execPath, ["--check", file]);
}

run(process.execPath, ["tests/transcript-utils.test.js"]);
