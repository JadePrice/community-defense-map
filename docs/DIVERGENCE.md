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

## Still French or France-specific (not done)

Verified by reading the code:

- **Server-rendered pages** (`/agenda`, `/arretes`, `/villes`, `/ville/*`, `/manif/*`, `/droits`, `/legal-teams`) are in French and say "en France" in titles and descriptions. They have no translation layer; `public/lang/*.json` covers only the browser app.
- **Report categories** keep French police units as labels and ids: CRS, BAC/BRAV-M, Sentinelle, BRI/RAID/GIGN, Centaure, LBD. They need a U.S. set; changing ids also means migrating stored reports and archives.
- **Place types** include préfecture, sous-préfecture, gendarmerie and CRA, and the OSM classifier looks for French tags.
- **"Arrêtés"** (prefectoral orders) is a French legal instrument. The U.S. equivalent (curfews, emergency declarations, permit denials) has a different shape.
- **The legal page** (`/legal.html`) is French text structured around French publisher obligations. Only the publisher line has been rewritten.
- **The admin page** and generated images (stories, slot maps, posters) are French-only.
- **`docs/INSTALLATION.md` and `docs/FONCTIONNEMENT.md`** are upstream's French docs. Only the PMTiles region path has been updated.
- **GeoNames attribution** (CC BY 4.0, required for `places.json`) appears in the README but not yet on the legal page. Adding it there needs translated text.

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
