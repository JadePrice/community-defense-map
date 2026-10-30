# Community Defense Map

**Community Defense Map** is a real-time, crowd-sourced map for tracking police activity, surveillance infrastructure, and potential threats to civil liberties across the United States. Forked from [Cortège](https://github.com/n-e-r-u/cortege) (originally a French protest mapping tool).

## Features

- **Real-time tracking** – Crowd-sourced reports of police presence, units, roadblocks, and other enforcement activity
- **Surveillance mapping** – Camera locations (public and private) with direction/facing information when known
- **Privacy-first** – No accounts required, minimal data collection. Reports are ephemeral by design
- **US-focused** – Centered on the continental United States with state/county geographic data from US Census TIGER/Line
- **Offline-capable** – Progressive web app that works in areas with limited connectivity
- **Multilingual** – English (default) with Spanish priority, plus French and Arabic support
- **Know your rights** – US-focused legal information aligned with ACLU/NLG guidance

## Focus

This fork emphasizes **police and surveillance tracking for community defense** rather than broad protest coordination. The goal is to help communities monitor law enforcement activity and surveillance infrastructure while respecting privacy.

## Running

```bash
npm install
npm start
```

Configuration via environment variables:
- `PORT` (default: 8080)
- `HOST` 
- `DATA_DIR` (default: `~/.cortege-data`)
- `EVENT_NAME` (default: "Community Defense Map")
- `CENTER` (default: "39.8283,-98.5795" for US center)
- `ZOOM` (default: 4)
- `ADMIN_KEY` for admin functions

## Data Sources

- **Geography**: US Census Bureau TIGER/Line Shapefiles (states)
- **Places/Cities**: GeoNames database (US cities with population ≥50k)
- **Surveillance/POIs**: OpenStreetMap (via Overpass API or PMTiles)
- **Road routing**: OSRM

## Live Instance

Running on the tailnet at http://100.76.50.38:8082/

## License

AGPL-3.0-or-later
