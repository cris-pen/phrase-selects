# Release Checklist

Use this checklist when publishing Phrase Selects to GitHub or sharing an installer file.

## Before Packaging

1. Set the new version everywhere it appears (manifest, package.json, `src/version.js`, and `index.html`):

```bash
npm run set-version -- 1.0.0
```

2. Add a matching entry to `CHANGELOG.md`.
3. Build the package folder. This runs `npm run check` first and fails on version drift, leftover debug labels, syntax errors, or failing tests:

```bash
npm run build
```

4. Run the manual Premiere smoke checklist in `README.md`.

## Package The Installer

Adobe distributes UXP plugins as `.ccx` files. Build one with:

```bash
npm run package
```

This runs `npm run build`, then writes `release/com.crispenstanbach.phrase-selects_premierepro.ccx`. The script packages `dist/` the same way UXP Developer Tool's Package command does: a zip with `manifest.json` (one per host) plus the runtime files, skipping dotfiles.

1. Double-click the generated `.ccx` and install it locally through Creative Cloud. From the command line you can use Adobe's installer instead: `UnifiedPluginInstallerAgent --install <path to .ccx>` (it lives under `/Library/Application Support/Adobe/Adobe Desktop Common/RemoteComponents/UPI/UnifiedPluginInstallerAgent/`).
2. Test the installed plugin in Premiere before uploading it anywhere.
3. Remove the local install afterwards (`UnifiedPluginInstallerAgent --remove "Phrase Selects"`, or Creative Cloud's Manage plugins) if you also load the plugin through UXP Developer Tool, because both share the same plugin ID.

You can still package with UXP Developer Tool instead: Add Plugin, select `dist/manifest.json` (not the project folder's manifest), then choose Package from the plugin's action menu.

## GitHub Release

1. Commit the release changes and create a tag that matches the manifest version, such as `v1.0.0`.
2. Create a GitHub Release from that tag.
3. Attach the tested `.ccx` from `release/`.
4. Include the supported Premiere version from `manifest.json`.
5. Include a short note that local installs show Adobe's unverified-plugin warning until the plugin is submitted through Adobe's distribution process.

## Useful Adobe References

- [Packaging Your Plugin](https://developer.adobe.com/photoshop/uxp/2022/guides/distribution/packaging-your-plugin/)
- [Distribution Options](https://developer.adobe.com/photoshop/uxp/2022/guides/distribution/distribution-options/)
- [Premiere UXP Manifest](https://developer.adobe.com/premiere-pro/uxp/plugins/concepts/manifest/)
