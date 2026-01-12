# NISRA population source notes (Northern Ireland)

## Source overview
- Data comes from NISRA and OpenDataNI (CKAN) and sometimes PxStat APIs.
- Sources are listed in `data/uk_population_geography_catalogue.csv`.
- NISRA has multiple vintages (SA/SOA 2011, DZ/SDZ 2021) and updated XLSX releases.

## How ingestion works here
- `scripts/nisra_ingest.py` reads the catalogue and ingests NI rows.
- It uses `data/uk_population_ingest_config.json` for column overrides and format hints.
- Output tables:
  - `nisra_population_observations`
  - `nisra_ingest_runs`
  - `nisra_ingest_checkpoints`

## Formats and overrides
- CSV, XLSX, and JSON-stat are supported via overrides.
- If the API returns JSON-stat, include dimensions in overrides so the loader can map geo/time/value.

## Common gotchas
- Some series are historic only (mid-2001 to mid-2020); newer data uses DZ/SDZ 2021.
- XLSX files can include multiple geographies in a single sheet.
- CKAN endpoints can change resource IDs; update the catalogue as needed.

