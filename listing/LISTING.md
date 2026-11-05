# Marketplace Listing

Copy and assets for the Phrase Selects listing in the Adobe Developer Distribution portal (<https://developer.adobe.com/distribute/home>). Each section matches a field in the portal. Limits are from Adobe's [Create a Listing](https://developer.adobe.com/premiere-pro/uxp/plugins/distribution/listing/) page; re-check them in the portal form, which wins if they differ.

Nothing in this folder ships in the plugin.

## Before You Start

- [ ] Publisher profile: public name, marketing website, description, and a 250x250 logo. You can submit it once before approval; later changes mean emailing Adobe. EU trader details are needed or the listing is hidden in the EU.
- [ ] Create New Listing > Creative Cloud desktop plugin > the Premiere card. Copy the plugin ID the portal shows.
- [ ] Build the Marketplace package with that ID (the GitHub build keeps `com.crispenstanbach.phrase-selects`):

```bash
npm run package -- --id <portal-plugin-id>
```

- [ ] Install `release/<portal-plugin-id>_premierepro.ccx` locally and run the smoke test in `README.md` before uploading it. Remove any other Phrase Selects install first, so you know which one you are testing.
- [ ] Choose a support email (the field is required and shown to users) and a publisher website (the GitHub repo works).
- [ ] Push `PRIVACY.md` to `main` and check that the privacy policy URL below opens.

## General

**Public plugin name** (max 45): `Phrase Selects`

**Subtitle** (max 30): `Find phrases, make selects`

**Purchase method:** Free

**Categories** (up to two): Tools & Automation

**Tags:** transcript, selects, subclips, interview, soundbites, editing, search

**Supported languages** (max 1,000): `English`

**Support email** (required): _your choice_

**Help URL:** <https://github.com/cris-pen/phrase-selects#readme>

**Privacy policy URL:** <https://github.com/cris-pen/phrase-selects/blob/main/PRIVACY.md>

**Terms of service URL:** leave empty (optional). The MIT License is at <https://github.com/cris-pen/phrase-selects/blob/main/LICENSE> if you want to link it from the description instead.

## Description

Max 5,000 characters. Paste as plain text.

```text
Phrase Selects finds every time a word or phrase is said in a clip and turns each one into a subclip, ready to cut. Point it at an interview, search for "the best part", and get a bin of subclips plus a sequence with all of them laid end to end.

It works from the transcript Adobe Premiere already made for the clip. Phrase Selects has no network access, so nothing is uploaded anywhere.

HOW IT WORKS
1. Transcribe your clip in Premiere: open Window > Text and transcribe it in the Transcript tab.
2. Select the clip in the Project panel and click Use Selected Clip.
3. Type a word or phrase and press Enter. Every match is listed with its time range.
4. Click Create Outputs.

WHAT YOU GET
- A new bin with one subclip for each match.
- A new sequence with every match laid end to end.
- Both are named after your search and the time of the run, so repeated searches never overwrite each other.
Untick Create continuous sequence if you only want the subclips. The sequence is always built from subclips, so with Create subclips unticked they still go into a bin, named "Source Segments".

SEARCH
- Plain text matches an exact phrase: hot take
- Commas, | or uppercase OR match any of several phrases: cheese, bread
- + or uppercase AND matches phrases said in order, close together, and keeps everything between them: cheese + bread
- Lowercase "and" and "or" are searched as normal words, so "mac and cheese" still works.
- Matching ignores case, and straight and curly apostrophes match each other.
- Whole word only is on by default, so "art" does not match "part".

HANDLES
Add time before and after each match so cuts are not tight on the word. Pick a preset (0 / 0, 0.25 / 0.5, 0.5 / 1, 1 / 1) or type your own, and save your favorite with Set Default.

GOOD TO KNOW
- Requires Adobe Premiere 26.3 or later.
- The clip must already have a Premiere transcript.
- Searches one clip at a time.
- The new sequence uses Premiere's default sequence settings. If they do not match your footage, change them with Sequence > Sequence Settings.
- Runs with more than 50 matches ask for a second click before creating outputs.
- Searching a sequence's transcript is experimental. Search works, but creating outputs from a sequence may not be supported by your version of Premiere.

Open the panel from Window > UXP Plugins > Phrase Selects.

Phrase Selects is free and open source under the MIT License.
```

## Version Details

Release notes for the first Marketplace version (max 1,000):

```text
First Marketplace release. Search a clip's Premiere transcript for words or phrases, then create a subclip for each match and a sequence with all of them in order. Includes any-of and in-order search, adjustable handles with presets, and whole-word matching.
```

## Note To Reviewers

Max 1,000 characters.

```text
Free plugin, no account or credentials needed. Requires Adobe Premiere 26.3+. It uses no network, file system or clipboard access; it only reads a clip's transcript and creates bins, subclips and a sequence in the open project.

To test:
1. Import any clip with clear speech. Open Window > Text and transcribe the clip in the Transcript tab.
2. Open Window > UXP Plugins > Phrase Selects.
3. Select the clip in the Project panel and click Use Selected Clip.
4. Type a word you heard and press Enter. Matches appear with time ranges.
5. Click Create Outputs. A new bin of subclips and a new sequence appear in the Project panel.

Searching a selected sequence is labeled experimental in the description; please test with a clip.
```

## Media

| Field | File | Size |
| --- | --- | --- |
| Icon 48 | `listing/icons/icon-48.png` | 48x48 |
| Icon 96 | `listing/icons/icon-96.png` | 96x96 |
| Icon 192 | `listing/icons/icon-192.png` | 192x192 |
| Publisher logo | `listing/publisher-logo-250.png` (or your own) | 250x250 |
| Screenshot 1 | `listing/screenshots/screenshot-1-search.png` | 1360x800 |
| Screenshot 2 | `listing/screenshots/screenshot-2-handles.png` | 1360x800 |
| Screenshot 3 | `listing/screenshots/screenshot-3-outputs.png` | 1360x800 |

The icons are rendered from `design/icon/phrase-selects-icon.svg`. The screenshots show the panel's real HTML and CSS with a sample interview transcript standing in for Premiere, so they contain no Adobe UI, logos or product names.

## After Approval

- Each new version needs a new `.ccx` built with the same portal ID (`npm run set-version -- <major.minor.patch>`, then `npm run package -- --id <portal-plugin-id>`) and uploaded in the portal with its own release notes.
- Keep the portal ID somewhere safe; every future Marketplace build needs it.
