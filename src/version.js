// Single source of truth for the panel version shown in the UI.
// Keep in sync with manifest.json via `npm run set-version <x.y.z>`;
// `npm run check` fails if they drift.
(function (root) {
  var VERSION = "1.0.0";

  if (typeof module === "object" && module.exports) {
    module.exports = VERSION;
  }

  if (root) {
    root.PhraseSelectsVersion = VERSION;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
