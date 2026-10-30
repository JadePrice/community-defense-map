# Cortege US Port - Summary

## Objective
- Port Cortege to US/English (with Latino Spanish priority), adapt to US context
- Fix failing tests and bugs, get a live instance on the tailnet
- Prepare universal bug fixes for upstream PRs
- Pivot to gathering proper US data while considering privacy (focus on tracking police, not protesters)

## Requirements
- Default to English (en-US) with es prioritized over fr
- Change map defaults to US center/zoom
- Update protest terminology to US terms
- Adapt Know Your Rights to US constitutional framework (ACLU/NLG)
- Make tests pass where possible
- Only upstream actual bug fixes (not US-specific changes)
- Finding reliable US data is crucial
- Consider privacy: focus on tracking the police and not protesters

## Decisions
- Switched to EN-first i18n with ES priority
- US defaults applied via env vars (`EVENT_NAME="Protest map"`, `CENTER="39.8283,-98.5795"`, `ZOOM=4`) since `server.js` defaults weren't updated in the US port commit
- Split changes: US-specific committed to `main`, universal bug fixes cherry-picked to clean `pr/*` branches created from `origin/main` to avoid leaking US-specific changes
- Restarted server with a fresh `DATA_DIR=/tmp/cortege-manual` after resolving port conflicts

## Completed Work
- Updated `public/i18n.js`, server strings, and made `/droits` locale-agnostic
- Fixed beacon/admin schema, `verifier.js`, `tools/street-route.js`, `tools/i18n-build.js`, `tools/pmtiles-pois.js`, `tools/pois-worker.js`, `test/pmtiles-fixture.js`, and `test/server.test.js`
- Added Hilbert round-trip test and docs (`docs/US_PORT_PLAN.md`, `docs/BEACON_AUDIT_ISSUES.md`, `docs/BEACON_TEST_PLAN.md`, `docs/SESSION_LOG_2026-10-30_cortege_us_port_bugfixes.md`) plus `tools/us-states.geojson`
- Created and pushed clean PR branches from `origin/main`: `pr/beacon-migrations`, `pr/verifier-bugs`, `pr/streetroute-bugs`, `pr/i18n-build-bugs`, `pr/pmtiles-pois-bugs`, `pr/pois-worker-bugs`, `pr/pmtiles-fixture`, `pr/server-test-bugs`
- Restarted Cortege on `0.0.0.0:8082` (PID 1226153), live at `http://100.76.50.38:8082/` with US defaults confirmed via `/api/config`

## Active Work
- Gather proper USA geospatial/police jurisdiction data sources
- Evaluate privacy implications with focus on tracking police, not protesters
- Assess replacement of France-centric geo assets (`geo/departements.json`, `places.json`) for US use

## Next Steps
1. Research reliable US data sources (Census TIGER/Cartographic Boundary Files, state/county boundaries, police jurisdictions) with privacy constraints in mind
2. Evaluate and plan replacement/adaptation of France-centric assets (`geo/departements.json`, `places.json`) for US coverage
3. Design approach to support police-focused tracking without expanding protester tracking
4. Audit diffs for each `pr/*` branch and open upstream PRs for universal bug fixes only
5. Re-run full test suite and triage remaining 3 failures (orga-confirmation flow, cortège flows) - fix only if universal or a direct regression

## Key Files
- `/home/jade/cortege/server.js`: US defaults via env, geo/communes logic, categories/groups
- `/home/jade/cortege/tools/us-states.geojson`: US reference data added
- `/home/jade/cortege/geo/departements.json`: France-specific boundaries (candidate for replacement)
- `/home/jade/cortege/places.json`: France-centric places dataset (candidate for replacement)
- `/home/jade/cortege/docs/US_PORT_PLAN.md`: US port plan
- `/home/jade/cortege/docs/BEACON_AUDIT_ISSUES.md`: Beacon audit
- `/home/jade/cortege/docs/BEACON_TEST_PLAN.md`: Beacon test plan

## Important Context
- Server running with env overrides (commit did not change defaults); using fresh `DATA_DIR=/tmp/cortege-manual`
- Branch hygiene is critical: only universal fixes on clean `pr/*` branches from `origin/main`
- Test baseline: 43 passing, 3 failing (orga-confirmation, cortège flows) - treat cautiously before changing
- Privacy constraint is explicit: focus on tracking the police and not protesters
- Live instance: `http://100.76.50.38:8082/` (tailnet)
