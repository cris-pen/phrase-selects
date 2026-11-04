# Phrase Selects

Phrase Selects is a Premiere Pro UXP panel that searches the transcript for one selected clip or sequence, previews matching phrase ranges, then creates subclips and optionally assembles those generated subclips into a continuous sequence.

## Current Architecture

The v1 pipeline is:

```text
selected clip or sequence -> transcript JSON -> normalized hits -> subclips -> optional sequence assembly
```

The sequence path intentionally uses generated subclips as the intermediate representation. A direct source-clip-to-timeline path may be a good future optimization, but the subclip path is easier to inspect and recover from if sequence insertion fails.

## Files

- `manifest.json`: UXP manifest for Premiere Pro 26.3 or newer.
- `index.html`: Panel markup.
- `styles.css`: Panel styling.
- `src/version.js`: Single source of the version shown in the panel.
- `src/main.js`: UI event handling.
- `src/transcript-utils.js`: Transcript parsing and phrase matching.
- `src/premiere-api.js`: Isolated Premiere UXP API calls.
- `tests/transcript-utils.test.js`: Node test for transcript parsing and matching.
- `scripts/check.js`: Release readiness checks for manifest metadata, version consistency, leftover debug labels, JavaScript syntax, and transcript tests.
- `scripts/build.js`: Copies only the runtime plugin files into `dist/` for packaging.
- `scripts/package.js`: Zips `dist/` into the `.ccx` installer in `release/`.
- `scripts/set-version.js`: Updates the version everywhere it appears.
- `scripts/runtime-files.js`: Works out which files the plugin needs at runtime (shared by check and build).
- `RELEASE.md`: Checklist for packaging and publishing a `.ccx` installer.
- `CHANGELOG.md`: Versioned release notes.

## Install And Test In Premiere

1. Install Premiere Pro 26.3 or newer. If the plugin appears only in Premiere Pro Beta, your standard Premiere build is probably older than the manifest/API requirement.
2. Install UXP Developer Tool 2.2 or newer.
3. Enable Premiere Pro developer mode from Settings -> Plugins -> Enable developer mode, then restart Premiere.
4. In UXP Developer Tool, choose Add Plugin or Load Plugin and select this folder.
5. Use Load & Watch.
6. In Premiere, open the panel from Window -> UXP Plugins -> Phrase Selects.
7. Select one Project panel clip, one Project panel sequence, one timeline clip item, or leave an existing sequence active with no clip selection. The source must already have a Premiere transcript.
8. Click Use Selected Clip, or enter a word/phrase and click Search Transcript to lock the source implicitly.
9. Review the match list, then click Create Outputs.

## Package And Share

For direct distribution, package the plugin as a `.ccx` file and attach that file to a GitHub Release. A raw source zip is useful for developers, but it is not the installer-style artifact users should double-click.

To build the installer, run:

```bash
npm run package
```

This runs `npm run check` and `npm run build`, then zips `dist/` into `release/com.crispenstanbach.phrase-selects_premierepro.ccx`. The build step copies only the files the plugin needs into `dist/`: `manifest.json`, the HTML file named by the manifest's `main`, the local scripts and stylesheets that HTML loads, and any icons the manifest lists. Any other runtime file (for example a JSON file loaded with `require()`) must be referenced from `index.html` or added in `scripts/runtime-files.js`, or it will be missing from the `.ccx`; `npm run check` fails if a `.js` file in `src/` is not included. Only `dist/` is packaged, so tests, scripts, docs, and `.git` stay out of the installer.

Then follow `RELEASE.md` to install the generated `.ccx` locally, smoke test it in Premiere, and upload the tested `.ccx` to the GitHub Release.

## Source Locking

The panel locks the searched source and transcript until Use Selected Clip is clicked again. This lets repeated searches keep using the original clip or sequence even after Premiere focuses a generated selects sequence.

## Sequence Sources

Sequence source support is experimental. The panel can now use a selected Project panel sequence, or the active sequence when nothing else is selected, as the transcript source. This is intended for searching compiled timelines that contain footage from multiple original media files.

Premiere exposes sequences through `Sequence.getProjectItem()` and sequence project items through `ClipProjectItem`, so this build attempts the same transcript and subclip pipeline used for normal clips. If Premiere rejects subclip creation from a sequence source, the panel will report that sequence-specific output creation needs a fallback path.

## Search Syntax

Plain text still searches for an exact phrase:

```text
hot take
```

Use comma, newline, `|`, or uppercase `OR` to match any phrase:

```text
cheese, bread
cheese | bread
cheese OR bread
```

Use `+` or uppercase `AND` to match ordered phrases near each other. The generated range spans from the first phrase through the last matched phrase.

```text
cheese + bread
cheese AND bread
```

Lowercase words like `and` and `or` remain normal searchable words so phrases such as `mac and cheese` keep working.

## Handle Presets

Before/after handles default to `0 / 0`. The panel includes common handle presets and a Set Default action. Defaults are saved in local panel storage when available.

## Output Behavior

When Create subclips is checked, Phrase Selects creates or reuses a bin named:

```text
Phrase Selects - [search term] - Run [timestamp]
```

Subclips are named:

```text
[search term] - 001 - [source clip name] - Run [timestamp]
```

When only Create continuous sequence is checked, v1 still creates generated source segments in:

```text
Phrase Selects - [search term] - Run [timestamp] - Source Segments
```

When Create continuous sequence is checked, Phrase Selects creates a sequence named:

```text
Phrase Selects - [search term] - Run [timestamp]
```

If sequence assembly fails after subclips are created, the subclips are preserved and the panel reports that partial success.

Sequence assembly inserts generated subclips in reverse order at the start of the new timeline so Premiere ripples each item against the next. This avoids frame-rounding gaps that can appear when timeline placement is calculated from transcript seconds.

## Manual Smoke Checklist

Use this checklist before UI or creation-flow changes:

1. Select the original media clip in the Project panel.
2. Click Use Selected Clip.
3. Search `cheese`.
4. Create both subclips and a continuous sequence.
5. Change the search term without clicking Use Selected Clip.
6. Search Transcript again.
7. Create both outputs again.
8. Select a generated sequence in Premiere.
9. Change the search term and run another search; the locked source should remain the original media clip.
10. Click Use Selected Clip only when intentionally switching to a different source clip.

## Known Limitations

- Requires an existing Premiere transcript on the selected clip.
- Starts with one selected source clip, one selected sequence, one selected timeline clip item, or the active sequence when no other source is selected.
- Uses exact phrase matching, case-insensitive.
- Multi-phrase `AND` matching expects phrases to appear in order and within roughly 12 seconds of each other.
- Whole-word mode is enabled by default. Disabling it currently allows partial matches for single-word searches.
- Uses subclips even when only a continuous sequence is requested.
- Each subclip is created as its own Premiere undo step, so large runs take a while and are tedious to undo. Runs with more than 50 matches ask for a second click on Create Outputs before starting.
- The locked source keeps the transcript it read when it was locked. If you edit the transcript in Premiere, click Use Selected Clip again to pick up the changes.
- Sequence sources are experimental until verified against real Premiere sequence transcripts and subclip creation.
- The output sequence uses Premiere's default sequence settings, which may not match the source clip's frame rate or frame size. Change it with Sequence > Sequence Settings if needed.
- Output names include a run timestamp so repeated searches do not collide with previous generated items.
- Direct timeline assembly from source clip ranges is a future enhancement.
- Whole-project, bin-wide, multicam, nested sequence, and fuzzy search support are future enhancements.

## Development

Run the release readiness check:

```bash
npm run check
```

Change the version everywhere at once (manifest, package.json, `src/version.js`, and `index.html`):

```bash
npm run set-version -- 1.0.0
```

Run the pure JavaScript transcript tests:

```bash
npm test
```

Premiere integration must be tested inside Premiere through UXP Developer Tool because `require("premierepro")` only exists in the host runtime.

## Troubleshooting

### Plugin Loads In Beta But Not Standard Premiere

The manifest requires Premiere Pro `26.3.0` because v1 depends on `Transcript.hasTranscript()` and `ClipProjectItem.createSubClipAction()`, which Adobe documents as 26.3 APIs. If standard Premiere is below 26.3 and Beta is 26.3 or newer, this Beta-only behavior is expected.

### Panel Says No Clip Selected

The panel checks the active project's Project panel selection first, then (only if that is empty) the selection in each of that project's Project panel views, then selected timeline clip items in the active sequence, then the active sequence itself. Use the Use Selected Clip button to lock the current source before running a search. Reload the plugin after changing `src/premiere-api.js`, then select exactly one clip, one sequence, or one clip item in the active sequence and lock the source again. Detailed selection diagnostics are written to the UXP Developer Tool console (prefixed `[Phrase Selects]`) rather than shown in the panel.

### Panel Shows An Older Build

The panel header shows the plugin version (for example `v1.0.0`). If it does not match `manifest.json`, remove the plugin from UXP Developer Tool, quit Premiere, reopen Premiere, then add this folder again. The asset URLs include cache-busting query strings, but Premiere can still keep an old plugin process alive until restart.

## Adobe API Notes

This MVP uses the current Premiere UXP API shape:

- `require("premierepro")` for the Premiere DOM.
- `ProjectUtils.getSelection(project)` for Project panel selection.
- `ProjectUtils.getProjectViewIds()` and `ProjectUtils.getSelectionFromViewId()` as Project panel selection fallbacks.
- `Sequence.getSelection()` and track item `getProjectItem()` for timeline selection fallback.
- `Sequence.getProjectItem()` for active-sequence source fallback.
- `Transcript.hasTranscript()` and `Transcript.exportToJSON()` for transcript access.
- `ClipProjectItem.createSubClipAction()` inside `Project.executeTransaction()` for subclip creation.
- `Project.createSequence()` and `SequenceEditor.createInsertProjectItemAction()` for sequence assembly.

The most likely live-testing adjustment is transcript JSON parsing, since exported transcript shapes can vary by Premiere version and transcript source. The parser is intentionally tolerant of word-level and segment-level timings.

## References

- [Premiere UXP API overview](https://developer.adobe.com/premiere-pro/uxp/)
- [UXP manifest reference](https://developer.adobe.com/premiere-pro/uxp/plugins/concepts/manifest/)
- [UXP packaging guide](https://developer.adobe.com/photoshop/uxp/2022/guides/distribution/packaging-your-plugin/)
- [UXP distribution options](https://developer.adobe.com/photoshop/uxp/2022/guides/distribution/distribution-options/)
- [Premiere DOM API overview](https://developer.adobe.com/premiere-pro/uxp/ppro-reference/)
- [Transcript API](https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/transcript)
- [ClipProjectItem API](https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/clipprojectitem)
- [Sequence API](https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/sequence)
- [SequenceEditor API](https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/sequenceeditor)

## License

Phrase Selects is released under the [MIT License](LICENSE).
