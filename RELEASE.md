# Release Checklist

Use this checklist when publishing Phrase Selects to GitHub, sharing an installer file, or submitting to the Adobe Marketplace.

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

## Adobe Marketplace Release

Listing copy, limits and asset files are in `listing/LISTING.md`.

First submission:

1. Sign in at <https://developer.adobe.com/distribute/home> with your Adobe ID and fill in the publisher profile. You get one edit before approval, so check it carefully.
2. Create New Listing > Creative Cloud desktop plugin > Premiere Pro, and copy the plugin ID the portal shows.
3. Build the Marketplace package with that ID:

```bash
npm run package -- --id <portal-plugin-id>
```

4. Install `release/<portal-plugin-id>_premierepro.ccx` locally and run the smoke checklist in `README.md`. Remove other Phrase Selects installs first.
5. Upload the `.ccx`, fill in the listing from `listing/LISTING.md`, add the screenshots and icons, set the purchase method to Free, and submit with the note to reviewers. Adobe aims to review within 10 business days.

Later versions: run the Before Packaging steps, build with the same portal ID, and upload the new `.ccx` as a new version in the portal with its release notes. The GitHub release is built separately with plain `npm run package`.

If the portal rejects a package built by `scripts/package.js`, package `dist/` with UXP Developer Tool's Package command instead, after setting the portal ID in `dist/manifest.json`.

## Useful Adobe References

- [Premiere UXP packaging](https://developer.adobe.com/premiere-pro/uxp/plugins/distribution/package/)
- [Premiere UXP Marketplace distribution](https://developer.adobe.com/premiere-pro/uxp/plugins/distribution/adobe-marketplace/)
- [Create a listing](https://developer.adobe.com/premiere-pro/uxp/plugins/distribution/listing/)
- [Review guidelines](https://developer.adobe.com/premiere-pro/uxp/plugins/distribution/review-guidelines/)
- [Premiere UXP Manifest](https://developer.adobe.com/premiere-pro/uxp/plugins/concepts/manifest/)
