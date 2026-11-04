# Changelog

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
