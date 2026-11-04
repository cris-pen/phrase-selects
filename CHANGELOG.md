# Changelog

## Unreleased

- Fixed Search Transcript silently doing nothing when the search box was empty or a handle value was invalid; the panel now shows the error.
- Fixed curly apostrophes: transcript words like `don’t` now match `don't` typed in the panel, and vice versa.
- Runs with more than 50 matches now ask for a second click before creating outputs, and the status area shows subclip progress while creating.
- Pressing Enter in the search box now runs the search.
- If subclip creation fails partway through a run, the subclips already made are still moved into the output bin, and the error says how many were created.
- Words in scripts with combining marks (for example Hindi) are no longer split into fragments, and accented letters match whether they are stored precomposed or decomposed.
- Clicking the handle preset that is already active no longer clears the search results.
- Replaced the debug build labels in the panel header with the plugin version, and moved transcript and selection diagnostics to the developer console.
- Clearer messages when nothing is selected, more than one item is selected, or the clip has no transcript.
- Added `npm run build` to package only the runtime files from `dist/`, and `npm run set-version` to update the version everywhere at once.
- `npm run check` now also fails on version drift and leftover debug labels.
- Released under the MIT License.

## 0.1.10

- Added experimental sequence source support for selected Project panel sequences and the active sequence fallback.
- Added source-kind labeling so the panel distinguishes clip sources from sequence sources.
- Increased panel spacing, input height, button height, result padding, and output-option padding for a less cramped layout.

## 0.1.9

- Refined the panel UI with tighter spacing, clearer control grouping, and a `#865cc4` accent system.
- Added a GitHub/share-ready release checklist for packaging `.ccx` installers through UXP Developer Tool.
- Added `npm run check` to validate the manifest, JavaScript syntax, and transcript tests before packaging.

## 0.1.8

- Added multi-term search with OR and ordered AND matching.
- Added handle presets and saved default handles.
- Adjusted sequence assembly to reduce frame-rounding gaps between generated subclips.

## 0.1.7

- Added source locking so repeated searches continue using the original media clip after generated sequences become active.
- Improved repeated-run naming to avoid collisions.
