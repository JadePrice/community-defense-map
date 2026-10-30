# Community Defense Map - US Port Summary

## Overview
Forked from Cortege (French protest map) to create a US-focused Community Defense Map emphasizing police and surveillance tracking for community awareness and defense.

## Changes Made

### Branding & Defaults
- Changed app name to "Community Defense Map"
- Set default center to continental US center `[39.8283, -98.5795]` with zoom level 4
- Switched default language to English (en-US) with Spanish priority
- Updated UI titles, manifests, and branding

### Geographic Data
- Replaced French département data with US Census TIGER/Line state boundaries (56 states/territories)
- Replaced French places database with US cities from GeoNames (population ≥50k, 976 cities)
- Updated coordinate defaults and regional logic for US coverage

### Data Sources
- US Census Bureau TIGER/Line for accurate state boundaries
- GeoNames for city/place data
- OpenStreetMap for surveillance cameras and POIs via Overpass API

### Server Configuration
- Default `EVENT_NAME="Community Defense Map"`
- Default `CENTER="39.8283,-98.5795"`, `ZOOM=4`
- GeoJSON files updated for US coverage

## Privacy Considerations
- Focus on tracking police activity and surveillance infrastructure, not protesters
- No accounts required, ephemeral data
- Location data minimized and rounded where applicable
- Emphasis on community defense and civil liberties

## Live Instance
- Running on port 8082: http://100.76.50.38:8082/
- Data directory: /tmp/cortege-manual
