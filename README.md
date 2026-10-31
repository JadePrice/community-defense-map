# Community Defense Map

A crowd-sourced, real-time map of police activity and surveillance infrastructure in the United States. No accounts, no cookies, no analytics. Reports expire on their own.

Community Defense Map is its own project, run by its own operators. It is built on the code of [Cortège](https://github.com/n-e-r-u/cortege), a French protest map, under the AGPL-3.0. The authors of Cortège do not run, maintain or endorse this service. What changed, and what is still inherited and French-specific, is listed in [docs/DIVERGENCE.md](docs/DIVERGENCE.md).

Status: **beta**, version `1.0.0-beta.1`. The data and translations below have not had native-speaker or legal review (see DIVERGENCE.md).

## What it does

- **Live reports** of police presence, units, roadblocks, kettles, arrests and crowd-control weapons, confirmed or contested by other people nearby, and expiring after minutes.
- **Surveillance infrastructure**: cameras and automated license plate readers from OpenStreetMap (DeFlock tagging), with facing direction when tagged.
- **Places**: jails and prisons, sheriff's offices, government offices, courts, hospitals, pharmacies and drinking water, imported monthly from OpenStreetMap.
- **ICE detention sites**: places where ICE has held people since January 2025, from the Deportation Data Project, with facility type, days used, people held and field office. Sites the dataset leaves untyped are listed in [docs/ICE_GENERIC_SITES.md](docs/ICE_GENERIC_SITES.md).
- **Know your rights**: U.S. guidance aligned with ACLU and NLG material. General information only, not legal advice.
- **Offline-capable** progressive web app; English by default, with Spanish, French and Arabic.

## Privacy model

Inherited from Cortège and unchanged here:

- IP addresses and device identifiers are never stored. Only HMACs are kept, with keys that rotate every 6 hours (network) and every day at 04:00 in `TIMEZONE` (device). Old keys are deleted, so two days cannot be linked.
- Admin and organizer keys are stored as hashes and compared in constant time.
- An emergency wipe deletes the keys and all live data.

The host, or anyone who controls the server, can still read whatever is live on it at that moment. See the privacy section of `/legal.html`.

## Running

Requires Node.js 22.13 or later (it uses `node:sqlite`). There are no npm dependencies.

```bash
npm start
```

```bash
npm test
```

Deployment notes (systemd, reverse proxy, firewall) are in [docs/INSTALLATION.md](docs/INSTALLATION.md). That file is inherited from upstream and is still in French.

## Configuration

All configuration is through environment variables. The ones that matter for a U.S. instance:

| Variable | Default | Purpose |
|---|---|---|
| `PORT`, `HOST` | `8080`, all interfaces | Listen address. Bind to localhost behind a reverse proxy. |
| `DATA_DIR` | `~/.cortege-data` | Database and keys. The directory name is kept from upstream so existing data is not orphaned. |
| `ADMIN_KEY` | empty (admin off) | At least 12 characters. |
| `PUBLIC_URL` | empty | Canonical public URL, e.g. `https://map.example.org`. When empty, derived from the request `Host` header. |
| `SOURCE_URL` | this repository | Link to the source of the running code (AGPL-3.0 §13). Point it at your fork if you change the code. |
| `CONTACT_EMAIL`, `HOST_INFO` | empty | Shown on the legal page; `CONTACT_EMAIL` is also the Web Push contact. |
| `TIMEZONE` | `America/Chicago` | IANA zone for day boundaries, event and order times, archives, and key rotation. |
| `PAGE_LANG` | `en` | Language of the server-rendered public pages (`/agenda`, `/droits`, `/manif/…`): `en`, `es`, `ar` or `fr`. The app itself follows each visitor's language. |
| `CENTER`, `ZOOM` | `39.8283,-98.5795`, `4` | Initial map view. |
| `EVENT_NAME` | `Police & surveillance, live` | Subtitle under the name; a dated admin banner replaces it. |
| `DISABLED_CATS` | empty | Comma-separated report categories to refuse. See below. |
| `GEO_REGIONS` | `geo/states.json` | Region outlines (see [docs/US_GEODATA.md](docs/US_GEODATA.md)). |
| `AREA_REGION` | `tools/us-region.geojson` | Service-area rectangles: tile proxy zone, place-import squares, pre-published region files. |
| `AREA_CC` | `US,PR,VI,GU,AS,MP` | Country codes in `places.json` that count as inside the service area. |
| `GEOCODE_CC` | `us,pr,vi,gu,as,mp` | Nominatim country filter for address search. |
| `GEO_API` | empty | City-outline service for city-level orders. Empty: orders cover whole states only. |
| `TILE_URL`, `TILE_UA` | OSM, `CommunityDefenseMap/1.0 (+SOURCE_URL)` | Tile source and the User-Agent sent to OSM services. |
| `TILE_PMTILES`, `TILE_PMTILES_REGION` | empty, `tools/us-region.geojson` | Self-hosted vector tiles and the area they cover. |
| `ICE_FACILITIES` | `geo/ice-facilities.csv` | ICE detention sites, built by `tools/ice-facilities.py` (see `docs/DIVERGENCE.md`). Imported at startup when the file changes. |
| `BRAND_KOFI` | empty | Donation link. Donation buttons stay hidden while empty. |
| `BRAND_HANDLE`, `BRAND_INSTAGRAM`, `BRAND_SITE` | empty | Optional social links used on posters and generated images. |
| `VIOLENCE_URL` | empty | Overrides the "report police violence" link (the page defaults to the ACLU). |
| `IMPORT_17OCT` | off | Upstream's French event import. Leave off. |

Every other variable is inherited from upstream and documented in comments in `server.js`.

### Protester-location features

Cortège maps the head and tail of marches (`cortege`, `queue`) and lets confirmed organizers share a live position (`contact`, and `medic`/`legal`/`presse` beacons). Those features locate protesters, not police. To refuse them on an instance:

```bash
DISABLED_CATS=cortege,queue,contact
```

This is not the default. Deciding it is a policy question for whoever runs the instance.

## Data sources

| Data | Source | License |
|---|---|---|
| Base map, places, cameras | © OpenStreetMap contributors | ODbL |
| State and territory outlines (`geo/states.json`) | U.S. Census Bureau cartographic boundary file `cb_2024_us_state_5m`, simplified; see [docs/US_GEODATA.md](docs/US_GEODATA.md) | public domain |
| Places of 50,000+ (`places.json`) | GeoNames | CC BY 4.0 |
| ICE detention sites (`geo/ice-facilities.csv`) | ICE data compiled and checked by the [Deportation Data Project](https://github.com/deportationdata/ice-detention-facilities) | CC0 |
| Address search | Nominatim (OSM Foundation), through the server | ODbL, usage policy applies |

## Releases

`CHANGELOG.md` is Cortège's history up to 2.8.1, kept as-is. This project's version is in `package.json` (shown in the menu and at `/api/version`). For a release:

1. Bump `version` in `package.json`.
2. Set the same `version` in `public/nouveautes.json` and replace its entry with what changed, in French (`items`, the source) and in English, Spanish and Arabic (`items_en`, `items_es`, `items_ar`). People who used an earlier version see this "What's new" sheet once; first-time visitors don't.
3. Run `npm test`.

## License

AGPL-3.0-or-later, the same as Cortège. If you run a modified version for others, you must offer them its source: set `SOURCE_URL`.
