# U.S. geodata

This file covers what the server uses to decide where it serves, how to rebuild that data, and what is known to be wrong with what is checked in now.

## Files

| File | Used for | Read by |
|---|---|---|
| `geo/states.json` | Region list for orders (one entry per state or territory), "inside the service area" test for summaries and moderation | `DEPS` in `server.js` (`GEO_REGIONS` overrides the path) |
| `tools/us-region.geojson` | Rectangles of the service area: tile proxy zone from zoom 8 up, 1° squares for the place import, pre-published empty region files | `TILE_ZONES` (`AREA_REGION`) and `PM_ZONES` (`TILE_PMTILES_REGION`) |
| `places.json` | Nearest-place names in summaries; fallback for the service-area test | `PLACES` |

`geo/states.json` format: `[{ "c": "WI", "n": "Wisconsin", "b": [minLat, minLng, maxLat, maxLng], "p": [[[[lng, lat], …]]] }]`. `p` is a MultiPolygon with coordinates rounded to 4 decimals.

## How "inside the service area" is decided

`inArea(lat, lng)` in `server.js` returns true if any of these holds:

1. the point is inside a state or territory outline in `geo/states.json`;
2. the point is inside an imported OSM municipal boundary that carries an official code (only the French `ref:INSEE` is recognized today, so this never matches in the U.S.);
3. the nearest entry in `places.json` is within 6 km and its country code is in `AREA_CC`.

Points outside the area still appear on the live map. They are only left out of day summaries and counted separately, and flagged in moderation.

## Current data (verified)

`geo/states.json` was built on 2026-10-31 from the Census Bureau file `cb_2024_us_state_5m` (cartographic boundary, 1:5,000,000, public domain), converted with `ogr2ogr` and simplified with tolerance 0.004° (about 400 m). It has 56 entries: 50 states, DC, PR, VI, GU, AS and MP, with 26,789 points in total (519 KB). Tested against city centers:

| Point | Result |
|---|---|
| Key West, Galveston, San Juan, Honolulu, El Paso, Miami, Seattle, Manhattan, Brooklyn, Boston, Chicago, Milwaukee, Detroit, San Francisco, Anchorage | inside the right state |
| Guam, St. Thomas, Pago Pago, Saipan | inside the right territory |
| Toronto, Windsor, Tijuana, Madrid | outside (correct) |

Size note: a whole-state order sends that state's outline to phones (`live/ord.json`). Most states are under 25 KB; Alaska is 134 KB because of its coastline and islands.

The earlier interim file (built from a copy of the Leaflet choropleth sample of unverified origin, now removed) missed Key West, Galveston, San Juan, Honolulu and El Paso. It is no longer used.

## Rebuilding from Census boundaries

The Census Bureau's cartographic boundary files are public domain. The 1:5,000,000 state file is detailed enough and small.

1. Download `cb_<year>_us_state_5m.zip` from <https://www.census.gov/geographies/mapping-files/time-series/geo/cartographic-boundary.html>.
2. Convert to GeoJSON (GDAL is in Debian as `gdal-bin`):
   ```bash
   ogr2ogr -f GeoJSON -t_srs EPSG:4326 states.geojson cb_2024_us_state_5m.shp
   ```
3. Build, simplifying to about 400 m (0.004°):
   ```bash
   node tools/build-states.js states.geojson geo/states.json 0.004
   ```
   The tool reads `STUSPS` and `NAME`, keeps the 50 states, DC and the five inhabited territories, and lists anything it skipped.
4. Check the cities in the table above, run `npm test`, and update the source file name, date and counts in this section.

## City-level orders (`GEO_API`)

Orders (curfews, banned areas…) can cover a whole state, or a city when `GEO_API` is set. The server calls a service with the interface of France's `geo.api.gouv.fr`:

```
GET {GEO_API}/communes?nom=<name>&codeDepartement=<state code>&boost=population&limit=10&fields=nom,code,codeDepartement,population,contour&format=json
GET {GEO_API}/communes/<code>?fields=nom,code,codeDepartement,population,contour&format=json
→ [{ "nom": "Madison", "code": "48000", "codeDepartement": "WI", "population": 280305, "contour": <GeoJSON Polygon or MultiPolygon> }]
```

No public U.S. service exposes this interface. Meeting it means serving Census places (TIGER `PLACE` layer) from a small local service. Until then `GEO_API` stays empty, and city-level orders are refused with an explicit error. Lookups by code only accept 5-digit codes; the Census place FIPS code fits.

## Service-area rectangles

`tools/us-region.geojson` is a single Feature with one rectangle per area: continental U.S., Alaska (west of the antimeridian is not covered: the western Aleutians are outside), Hawaii, Puerto Rico and USVI, Guam and the Northern Marianas, American Samoa. At zoom 8 and above, the tile proxy refuses tiles outside these rectangles, which protects the OSM tile servers' usage policy and the server's disk.
