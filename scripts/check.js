const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { getRuntimeFiles } = require("./runtime-files");

const root = path.resolve(__dirname, "..");

const jsFiles = [
  "src/version.js",
  "src/transcript-utils.js",
  "src/premiere-api.js",
  "src/main.js",
  "tests/transcript-utils.test.js",
  "scripts/runtime-files.js",
  "scripts/build.js",
  "scripts/set-version.js"
];

const SEMVER_RE = /^\d+\.\d+\.\d+$/;

function fail(message) {
  console.error("check failed: " + message);
  process.exit(1);
}

function readText(relativePath) {
  try {
    return fs.readFileSync(path.join(root, relativePath), "utf8");
  } catch (error) {
    fail("Could not read " + relativePath + ": " + error.message);
  }
}

function readJSON(relativePath) {
  try {
    return JSON.parse(readText(relativePath));
  } catch (error) {
    fail("Could not parse " + relativePath + ": " + error.message);
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

const manifest = readJSON("manifest.json");
const packageJSON = readJSON("package.json");
const version = manifest.version;

// Manifest shape.
if (manifest.manifestVersion !== 5) {
  fail("manifestVersion must be 5 for Premiere UXP.");
}

if (!manifest.host || manifest.host.app !== "premierepro") {
  fail("manifest.json must target the premierepro host.");
}

if (!manifest.entrypoints || !manifest.entrypoints.length) {
  fail("manifest.json must define at least one entrypoint.");
}

if (!SEMVER_RE.test(String(version))) {
  fail("manifest.json version must look like 1.2.3 (got " + version + ").");
}

// Every place that carries a version must agree with manifest.json.
// Use `npm run set-version <x.y.z>` to update them together.
if (packageJSON.version !== version) {
  fail("package.json version is " + packageJSON.version + " but manifest.json is " + version + ".");
}

const versionModulePath = path.join(root, "src/version.js");
delete require.cache[versionModulePath];
const versionModule = require(versionModulePath);

if (versionModule !== version) {
  fail("src/version.js is " + versionModule + " but manifest.json is " + version + ".");
}

const indexHTML = readText("index.html");
const cacheBusters = indexHTML.match(/\?v=[^"']*/g) || [];

cacheBusters.forEach(function (value) {
  if (value !== "?v=" + version) {
    fail("index.html has asset query " + value + " but manifest.json is " + version + ".");
  }
});

const htmlVersionLabels = indexHTML.match(/>v\d+\.\d+\.\d+</g) || [];

htmlVersionLabels.forEach(function (value) {
  if (value !== ">v" + version + "<") {
    fail("index.html shows version " + value.slice(1, -1) + " but manifest.json is " + version + ".");
  }
});

// Leftover debug/dev markers that should never ship.
const shippedText = getRuntimeFiles(root)
  .filter(function (file) { return /\.(js|html|css)$/.test(file); })
  .map(function (file) { return { file: file, text: readText(file) }; });

shippedText.forEach(function (entry) {
  if (/create-debug|sequence-source-spacing/.test(entry.text)) {
    fail(entry.file + " still contains a debug build label.");
  }
});

// Every runtime file referenced by index.html / manifest.json must exist.
getRuntimeFiles(root).forEach(function (file) {
  if (!fs.existsSync(path.join(root, file))) {
    fail("Missing runtime file: " + file);
  }
});

// Catch a new src/ script that index.html does not load (it would be left
// out of dist/ and the .ccx).
const runtimeFiles = getRuntimeFiles(root);

fs.readdirSync(path.join(root, "src")).forEach(function (name) {
  if (name.endsWith(".js") && runtimeFiles.indexOf("src/" + name) === -1) {
    fail("src/" + name + " is not loaded by index.html, so npm run build would leave it out of the package.");
  }
});

for (const file of jsFiles) {
  run(process.execPath, ["--check", file]);
}

run(process.execPath, ["tests/transcript-utils.test.js"]);

console.log("check passed for Phrase Selects " + version);
