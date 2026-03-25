# Lab 1 — World City Population (1975–2050)

Interactive proportional-symbol map for world city populations (United Nations World Urbanization Prospects, 2025).

## Project goal
This map is designed to show the **spatiotemporal pattern** of large city populations from 1975 to 2050 (including projected years), with interaction focused on:
- year-to-year change (slider + previous/next controls)
- key-year comparison (1975, 2000, 2025, 2050 overlay)
- city-level detail (hover/click info panel + trend chart)
- rank exploration (top-N panel)

## How to run
Because this app uses ES modules, open it through a local web server (not direct `file://`).

Example:
1. In this folder, run `python3 -m http.server 8000`
2. Open `http://localhost:8000`

Additional page:
- `about.html` provides project introduction, data source citation, and summary observations.

## JavaScript module structure
Entry point:
- `js/index.js` → initializes app

Composition root:
- `js/modules/app.js` → wires map, data loading, controllers, and event listeners

Shared constants/utilities:
- `js/modules/constants.js` → years, colors, chart style, highlight style
- `js/modules/utils.js` → radius scale, labels, color interpolation helpers
- `js/modules/data.js` → safe data access + rank lookup construction

UI controllers:
- `js/modules/legend-controller.js` → temporal + proportional symbol legends
- `js/modules/info-controller.js` → city info panel + sparkline-style trend chart
- `js/modules/ranking-controller.js` → top-N ranking panel behavior
- `js/modules/search-controller.js` → city/country search and focus marker

## Data contract (GeoJSON)
Input file: `data/cities_grouped.geojson`

Each feature is expected to include:
- `properties.city` (string)
- `properties.country` (string)
- `properties.city_code` (number)
- `properties.population` (object keyed by year string, value = population)
- `properties.rank` (object keyed by year string, value = global rank)
- `geometry.coordinates` as `[lon, lat]`

## Recent revision notes (2026-03-25)
Addressed review feedback by:
- changing previous/next year controls to **wrap around** timeline ends
- improving dense-area readability with **stronger marker outlines + lower fill opacity**
- adding a concise **Map Story** framing block in the page UI
- expanding project documentation for code organization and maintenance
