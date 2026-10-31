# Divergence from Cortège

Community Defense Map is a separate project built on the code of [Cortège](https://github.com/n-e-r-u/cortege) at upstream commit `e87a4f8` (Cortège 2.8.1, 2026-10-29). This file records what differs, what is still inherited and French-specific, and what an operator has to do when upgrading an existing instance.

`CHANGELOG.md` is upstream's history up to 2.8.1 and is kept as-is. The `version` in `package.json` is still upstream's.

## Identity

- Name, mark, icons, social card and colors are this project's own. The sources are in `tools/brand/`, and `node tools/brand/render.js` re-renders the PNGs. It needs Playwright with Chromium, a development-only tool that is not an app dependency.
- The upstream author's Instagram, site, Ko-fi and press kit are removed. The `BRAND_*` variables default to empty, and donation buttons appear only when `BRAND_KOFI` is set.
- Credit to upstream is a single line in the menu ("Free software (AGPL-3.0), based on Cortège") and a sentence in the legal page's publisher section stating that Cortège's authors do not run or endorse this service.
- The word "Cortège" remains where it is the French noun for a march (category labels such as "Tête de cortège", the march-length text) and in that credit. `Cortège` is also kept on the reserved organizer-name list.
- Internal identifiers keep upstream names so existing installs keep working: `DATA_DIR` default `~/.cortege-data`, the `cortege.db` file, `localStorage` keys `cortege-*`, the `x-cortege-onion` header, and the systemd/backup files under `tools/`.

## Geography and time

| Area | Upstream | Here |
|---|---|---|
| Regions | French départements with outlines, plus overseas départements by commune | U.S. states and territories (`geo/states.json`), built by `tools/build-states.js` |
| Service-area test | `inFrance()`: départements, overseas boxes, French places | `inArea()`: state outlines, `AREA_CC` places |
| Tile proxy zone, place-import squares, region files | France and overseas rectangles, hard-coded | `tools/us-region.geojson` (`AREA_REGION`) |
| City outlines for orders | `geo.api.gouv.fr` | `GEO_API`, empty by default (state-level only) |
| Address search | `countrycodes=fr`, French results | `GEOCODE_CC`, English results |
| Time zone | `Europe/Paris` everywhere | `TIMEZONE` (default `America/Chicago`), served to the browser at `/tz.js` |
| 17 October import | on until 2026-11-01 | off unless `IMPORT_17OCT=1` |
| Legal-team seed list | 8 French teams | empty |

Data limits and the rebuild procedure are in [US_GEODATA.md](US_GEODATA.md).

## Bugs fixed that were introduced by earlier fork commits

- `getReport` aliased SQLite's `rowid` as `oid` (commit `8252180`). Organizers could not extend or edit their own reports, and saving a report wrote the rowid over the real owner. Restored upstream's query.
- The same commit made a confirmed organizer the owner of any anonymous report it confirmed, which let it edit someone else's report. Removed.
- `6d5e195` replaced the département file with state entries that had no polygons, which broke 10 tests and every in-area check. All 46 tests pass again (1 skipped when `osmium` is absent, as upstream).

These are fork-only. Nothing here should be sent upstream as is.

## Translation and U.S. adaptation

All user-facing text lives in `i18n/*.tsv` (source text as the key, then English, Spanish, Arabic), compiled by `node tools/i18n-build.js` into `public/lang/*.json`; CI fails if the compiled files are out of date. Files 11 to 16 and the override file are this project's own:

- `11-cdm.tsv`: text written for this project. Where the page source was written directly in English (the Rights section), the key is the English text and the English column repeats it.
- `12-pages.tsv`: server-rendered public pages.
- `13-public.tsv`: time-slot map page and image, poster, embeddable map.
- `14-server.tsv`: server messages shown to people. Messages that carry a number or a date are worded by the server in the request's language (`X-Lang` sent by the app, else `Accept-Language`).
- `15-legal.tsv`: the legal page, written in English for this project (key = English).
- `16-admin.tsv`: organizer-log action names, shown on the admin page.
- `i18n/us.override.tsv`: replaces the English, Spanish and Arabic of upstream rows without touching upstream's files. Override files load last, and a row whose key no longer exists fails the build, so upstream text changes can't silently drop an adaptation. It holds:
  - U.S. equivalents rather than literal translations: riot police, plainclothes units, SWAT, National Guard, BearCat/MRAP, rubber bullets/flash-bangs; government offices, sheriff's offices, immigration detention; state instead of département; "whole country" instead of "all of France";
  - U.S. example places in placeholders;
  - the mask-law caveat (several states restrict masks at protests);
  - American spelling, generated for 55 rows whose Spanish and Arabic are unchanged.

Checked in a browser with the app set to English, Spanish and Arabic: no French text remains on the main page, and the Rights section is in Spanish and Arabic. In those two languages, the sentences to say to police ("I am going to remain silent", "Am I free to go?", "I do not consent to a search") are kept in English next to the translation.

Needs a native-speaker review before relying on it:

- **Spanish**: upstream's Spanish is Spain Spanish ("mascarilla", "gafas", "instituto", "de paisano"). Rows added or adapted here use neutral Latin American Spanish, so the two registers are now mixed until the rest is reviewed.
- **Arabic**: the new and adapted rows are Modern Standard Arabic written without a native reviewer.
- **Legal claims carried over from earlier fork commits** and now translated as written: "You have the right to make a local phone call" is not a general constitutional right (it depends on state law), and the NLG number below is unconfirmed.

## Server-rendered public pages

`/agenda`, `/arretes`, `/villes`, `/ville/*`, `/manif/*` (day summaries, city pages, CSV) and `/legal-teams` are rendered in one language per instance (`PAGE_LANG`, default `en`) through the same dictionaries as the app. Their own strings are in `i18n/12-pages.tsv`. Dates use the U.S. locale for English and Spanish.

`/droits` is built from the app's Rights tab and translated block by block. Its extraction looked for the French heading "En cas de", which the fork had changed to English, so the page was serving an empty body. It now matches either heading, and a test checks for the content.

The CSV open data uses fixed English column names (`type;category;group;start;end;latitude;longitude;place;confirmations;verified_by_organizer;outcome`), whatever `PAGE_LANG` is. Category names and outcomes in the rows follow `PAGE_LANG`.

Day summaries and admin stories draw a background map from `public/story-map.json`. Upstream's file was a projected outline of France. It is now built from `geo/states.json` by `tools/build-story-map.js` (contiguous U.S., Lambert conic 33°/45°/96° W; projection parameters stored in the file and read by `public/bubble-map.js`). Alaska, Hawaii and the territories fall outside that frame, so their cities appear in the lists under the map but not on it.

## Legal page and admin page

`/legal.html` is now written in English (Spanish and Arabic through `15-legal.tsv`). Its data-handling table states the same facts as upstream's, which match the code; the French framing was removed ("mentions légales", the GDPR "legal basis"), and GeoNames and the Census Bureau are credited. It has not had a legal review. One rule to decide: posting police badge numbers is forbidden (upstream's ban on French police ID numbers carried over), although in the U.S. badge numbers are generally public and used for accountability.

The admin page and the stories it generates are in English, written directly in the source: `admin.html` sets `data-i18n-lang="en"`, which pins `i18n.js` to English on that page. Values the server stores in French (organizer-log actions, abuse kinds, category and place labels) are not changed; they are translated when displayed, so comparisons in the code still match. The emergency wipe now asks for ERASE (the server also still accepts EFFACER).

## Permanent places (OpenStreetMap import)

The monthly import now downloads one Geofabrik extract per state and territory (51 + Puerto Rico and the U.S. Virgin Islands) instead of the whole U.S. file: each is downloaded, filtered with osmium and deleted before the next, so disk use peaks at the largest state. `GEOFABRIK_URLS` still overrides the list. If one file fails, the others are imported and nothing is deleted that run, so a failed state keeps its existing places instead of losing them. Guam, American Samoa and the Northern Mariana Islands are not in Geofabrik's U.S. folder and are not imported.

Rules (`poiKind()` in `server.js` for the Geofabrik and Overpass sources; `kindOf()` in `tools/pois-worker.js` for the map-file source, which only has names):

| Type | Rule |
|---|---|
| Immigration detention (`cra`) | prison or government office whose name or operator matches Immigration and Customs Enforcement, "ICE" (capitals only), "processing center", "immigration detention/holding" (French "rétention administrative" kept) |
| Jail (`jail`, new) | `amenity=prison` not matched above |
| Government office (`pref`) | `office=government` named "… State Capitol" (French prefectures kept) |
| County government office (`spref`) | `office=government` named "… County … Government/Administration/Board/Commission" |
| Sheriff's office (`gend`) | police whose name or operator contains "Sheriff" (French gendarmerie kept) |
| License plate reader (`alpr`, new) | `man_made=surveillance` + `surveillance:type=ALPR` (DeFlock tagging); manufacturer and operator kept |

A place of the same type and name within about 300 m of one already imported is dropped (some buildings are mapped twice, as an outline and a point).

Plate readers are published in their own region files (`live/l/<region>-a.json`) and shown from neighborhood zoom (15), with their own layer switch; ordinary cameras stay at street zoom (17). Overpass now also requests all prisons, government offices whose name or operator suggests immigration, capitol or county, and plate readers.

## ICE detention sites

OpenStreetMap barely tags immigration detention (none in Wisconsin), and much of it happens in county jails under contract, which no tag shows. Sites come instead from the Deportation Data Project's facilities dataset (CC0): ICE's own facility list, public-records releases and reference datasets, joined by ICE facility code, with locations checked by hand.

- `tools/ice-facilities.py <clone of the dataset>` (needs `pyarrow`, run on a workstation) joins `facilities-latest`, the facility types (most recent dated value), and last year's usage counts, and writes `geo/ice-facilities.csv` and `geo/ice-facilities.manifest.json` (source commit and date, SHA-256 of every input and of the output, counts by type, exclusions). Hospitals are excluded: a person treated there doesn't make it a detention site. The dataset types many of them OTHER, so a site is also excluded when the dataset matched it to a Medicare facility, or when its name says hospital (including the truncated "Hos"), medical center, behavioral health or psychiatric. Hospitals whose names say none of that are excluded by code, from a short list in the script (`MEDICAL_CODES`) that records why each was checked; the list is copied to the manifest. Where the dataset gives no specific type, a few are inferred and counted in the manifest: hold rooms from codes ending in HOLD, CBP and BOP from code prefixes, staging facilities, youth facilities, processing centers, county jails and police lockups from names. Sites that match none of these keep the dataset's generic type and are labeled only "Site used by ICE to hold people". The dataset's own type stays in the `type_source` column. Guantánamo Bay Naval Station (type MOC) is included; a small rectangle around it was added to the service area so the map is served there.
- The server imports the CSV at startup when its hash changes, as `src='ice'` rows of type `cra` (`ICE_FACILITIES` points elsewhere). The OpenStreetMap import never touches them; admin corrections are kept.
- An OpenStreetMap jail or immigration site within 250 m of an ICE site is published once, as the ICE site. Two separate places closer than that would be merged.
- The popup states the facility type in plain words (county jail under contract, private contract facility, ICE processing center, hold room…), days used and average and maximum population over the past year, the ICE field office, the address and the dataset date.

The dataset covers facilities that held at least one person from January 2025 onward, so a site may no longer be in use; the days-used figure shows how active it was. To update: pull the dataset, run the script, review the diff of the CSV and the manifest, commit.

## Still French or France-specific (not done)

Verified by reading the code:

- **Report category ids** remain the French ones (`crs`, `bac`, `militaires`, `lbd`…). The labels people see are adapted (above); the ids are internal and stored in reports and archives.
- **Place classification** was checked against Geofabrik's Wisconsin extract (October 2026): 2,108 plate readers, 62 sheriff's offices out of 397 police features, 144 prisons (mostly county jails), the State Capitol (mapped twice, hence the de-duplication). No ICE facility is tagged in Wisconsin, so that rule is untested on real data; ICE often holds people in county jails under contract, which no tag shows. Other states may name things differently.
- **"Arrêtés"** (official orders) keep the French workflow: a state or, with `GEO_API`, a city, plus dates and a source link. Labels are adapted; U.S. orders (curfews, emergency declarations, permit denials) fit the shape but nothing more specific has been done.
- **`docs/INSTALLATION.md` and `docs/FONCTIONNEMENT.md`** are upstream's French docs. Only the PMTiles region path has been updated.
- **Free-text details in the organizer log** that the server composes (for example "retiré par …") stay in French on the admin page; action names are translated.
- **Code comments** in upstream files are in French.

Inferred, not verified:

- The skipped `osmium` test imports a Paris boundary with a French `ref:INSEE` code. It would fail here if `osmium` were installed, because the in-area test no longer treats Paris as inside. It needs a U.S. fixture.
- The NLG hotline shown in the app (`1-888-NLG-ECOL`) is, to my knowledge, NLG's environmental and climate-movement line, not a general mass-defense hotline. Confirm with NLG before relying on it.

## Open policy decision

Head/tail-of-march tracking and organizer live positions locate protesters, not police. They remain enabled by default. `DISABLED_CATS=cortege,queue,contact` turns them off for an instance; see the README.

## Upgrading an existing instance (dry run first)

These are the steps for an instance that ran an earlier fork commit. None of them have been run against the live instance.

1. **Back up** `DATA_DIR` (the SQLite database and the `keys/` directory).
2. **Device-hash rotation.** The daily key period now starts at 04:00 in `TIMEZONE` instead of 02:00 UTC. The first period after the upgrade is shorter or longer by a few hours, and devices may count as new once at that boundary (rate limits and "new device" checks). No stored data is affected.
3. **French legal-team entries** seeded by earlier versions are still in the `legal_dir` table, unvalidated (not public). List them in the admin page and delete them there. The seed does not run again, because `meta.legalseed` is already set.
4. **Reports with a corrupted owner.** Reports saved while the `rowid` bug was live may have a number in `reports.oid` instead of an organizer id. Reports expire within hours, so the simplest fix is to wait. To check:
   ```sql
   SELECT id, oid FROM reports WHERE oid <> '' AND oid NOT GLOB '*[^0-9]*';  -- all digits = a rowid, not an orga id
   ```
5. **Configure** `PUBLIC_URL`, `SOURCE_URL` (if you run a modified copy), `CONTACT_EMAIL` and `TIMEZONE`, and decide `DISABLED_CATS`.
6. **Event-import data.** If the 17 October import ever ran, its French events (source `17oct`) remain until they expire; they can be hidden from the admin page.
