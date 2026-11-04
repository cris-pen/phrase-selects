const fs = require("fs");
const path = require("path");

// Returns the files the plugin needs at runtime, relative to the project
// root: manifest.json, its `main` HTML, every local stylesheet/script that
// HTML references, and any icon files the manifest lists. Docs, tests and
// scripts are deliberately excluded so they never end up in the .ccx.
function getRuntimeFiles(root) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
  const mainFile = manifest.main || "index.html";
  const html = fs.readFileSync(path.join(root, mainFile), "utf8");
  const files = new Set(["manifest.json", mainFile]);
  const assetRE = /<(?:script|link)\b[^>]*?\b(?:src|href)\s*=\s*["']([^"']+)["']/gi;
  let match;

  while ((match = assetRE.exec(html))) {
    const reference = match[1].split(/[?#]/)[0];

    if (!reference || /^[a-z]+:/i.test(reference) || reference.startsWith("//")) {
      continue;
    }

    files.add(path.posix.normalize(path.posix.join(path.posix.dirname(mainFile), reference)));
  }

  collectIconPaths(manifest).forEach(function (iconPath) {
    expandIconPath(root, iconPath).forEach(function (file) {
      files.add(file);
    });
  });

  return Array.from(files);
}

function collectIconPaths(manifest) {
  const icons = [];

  (manifest.icons || []).forEach(function (icon) {
    if (icon && icon.path) {
      icons.push(icon.path);
    }
  });

  (manifest.entrypoints || []).forEach(function (entrypoint) {
    (entrypoint.icons || []).forEach(function (icon) {
      if (icon && icon.path) {
        icons.push(icon.path);
      }
    });
  });

  return icons;
}

// UXP resolves "icon.png" to icon.png, icon@1x.png, icon@2x.png, etc.,
// so ship whichever of those variants exist next to the declared path.
function expandIconPath(root, iconPath) {
  const normalized = path.posix.normalize(iconPath);
  const directory = path.posix.dirname(normalized);
  const extension = path.posix.extname(normalized);
  const base = path.posix.basename(normalized, extension);
  const absoluteDirectory = path.join(root, directory);
  const found = [];

  if (fs.existsSync(path.join(root, normalized))) {
    found.push(normalized);
  }

  if (fs.existsSync(absoluteDirectory)) {
    fs.readdirSync(absoluteDirectory).forEach(function (name) {
      if (name.startsWith(base + "@") && name.endsWith(extension)) {
        found.push(path.posix.join(directory, name));
      }
    });
  }

  return found.length ? found : [normalized];
}

module.exports = { getRuntimeFiles };
