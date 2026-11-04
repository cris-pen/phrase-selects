// Packages dist/ into a .ccx installer, the same way UXP Developer Tool's
// Package command does: a zip holding a re-serialized manifest.json (one per
// host) plus every other file in the plugin folder except dotfiles.
// Run via `npm run package` (which runs check and build first).
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");
const releaseDir = path.join(root, "release");

function fail(message) {
  console.error("package failed: " + message);
  process.exit(1);
}

function listFiles(dir, prefix) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(function (entry) {
    if (entry.name.startsWith(".")) {
      return [];
    }

    const relative = prefix ? prefix + "/" + entry.name : entry.name;

    if (entry.isDirectory()) {
      return listFiles(path.join(dir, entry.name), relative);
    }

    return [relative];
  });
}

if (!fs.existsSync(path.join(dist, "manifest.json"))) {
  fail("dist/manifest.json is missing. Run npm run build first.");
}

const manifest = JSON.parse(fs.readFileSync(path.join(dist, "manifest.json"), "utf8"));
const hosts = Array.isArray(manifest.host) ? manifest.host : [manifest.host];
const files = listFiles(dist, "").filter(function (file) {
  return file !== "manifest.json" && !file.endsWith(".ccx");
});

fs.mkdirSync(releaseDir, { recursive: true });

hosts.forEach(function (host) {
  const hostManifest = JSON.parse(JSON.stringify(manifest));
  hostManifest.host = host;

  const staging = fs.mkdtempSync(path.join(releaseDir, ".staging-"));

  try {
    fs.writeFileSync(path.join(staging, "manifest.json"), JSON.stringify(hostManifest, null, 2));

    files.forEach(function (file) {
      const target = path.join(staging, file);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(path.join(dist, file), target);
    });

    const ccxName = manifest.id + "_" + host.app + ".ccx";
    const ccxPath = path.join(releaseDir, ccxName);
    fs.rmSync(ccxPath, { force: true });

    // -X: no extra file attributes, -D: no directory entries, -9: max compression.
    const result = spawnSync("zip", ["-X", "-D", "-9", "-q", ccxPath, "manifest.json"].concat(files), {
      cwd: staging,
      stdio: "inherit"
    });

    if (result.error) {
      fail("could not run zip: " + result.error.message);
    }

    if (result.status !== 0) {
      fail("zip exited with status " + result.status);
    }

    console.log("Packaged Phrase Selects " + manifest.version + " for " + host.app + ": release/" + ccxName);
  } finally {
    fs.rmSync(staging, { recursive: true, force: true });
  }
});

console.log("\nNext: double-click the .ccx to install it through Creative Cloud and smoke test it in Premiere.");
