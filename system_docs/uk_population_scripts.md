# UK population scripts

This document summarizes the helper scripts in this repo and the scripts planned for future data sources.

## Environment
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SERVICE_KEY` (service role key required for ingestion)

Nomis-specific:
- `NOMIS_BASE_URL` (optional; defaults to `https://www.nomisweb.co.uk/api/v01`)
- `NOMIS_USER` (optional)
- `NOMIS_API_KEY` (optional)

Config files:
- `data/uk_population_ingest_config.json` controls column mappings and overrides for NRS/NISRA sources.

## Current scripts

### `scripts/nomis_discover.py`
Purpose:
- Discover population datasets from the Nomis API.
- Write a registry JSON file for later ingest configuration.

Common commands:
```
python3 scripts/nomis_discover.py
python3 scripts/nomis_discover.py --output data/nomis_dataset_registry.json
```

Outputs:
- `data/nomis_dataset_registry.json` by default (or the path passed to `--output`).

### `scripts/nomis_auth_check.py`
Purpose:
- Compare anonymous vs credentialed responses for a Nomis dataset.
- Spot empty/HTML responses when `NOMIS_USER`/`NOMIS_API_KEY` are set.

Common commands:
```
python3 scripts/nomis_auth_check.py
python3 scripts/nomis_auth_check.py --config data/nomis_population_config.json
```

### `scripts/nomis_ingest.py`
Purpose:
- Ingest population datasets described in a config JSON.
- Upsert rows into the target Supabase table.

Common commands:
```
python3 scripts/nomis_ingest.py
python3 scripts/nomis_ingest.py --config data/nomis_population_config.json
python3 scripts/nomis_ingest.py --table nomis_population_observations
```

Inputs:
- `data/nomis_population_config.json` (or the path passed to `--config`)

Writes to:
- `nomis_population_observations` (or the table passed to `--table`)

### `scripts/uk_population_catalogue_load.py`
Purpose:
- Load `data/uk_population_geography_catalogue.csv` into the source-prefixed
  `*_geography_catalogue` tables.
- Split rows by coverage to `nomis_`, `nrs_`, or `nisra_`.

Common commands:
```
python3 scripts/uk_population_catalogue_load.py
python3 scripts/uk_population_catalogue_load.py --replace
```

Writes to:
- `nomis_geography_catalogue`
- `nrs_geography_catalogue`
- `nisra_geography_catalogue`

### `scripts/nrs_ingest.py`
Purpose:
- Ingest Scotland population data from NRS/PHS sources.
- Pull CSV/XLSX sources listed in the geography catalogue.

Common commands:
```
python3 scripts/nrs_ingest.py
python3 scripts/nrs_ingest.py --config data/uk_population_ingest_config.json
```

Writes to:
- `nrs_population_observations`
- `nrs_ingest_runs`
- `nrs_ingest_checkpoints`

### `scripts/nisra_ingest.py`
Purpose:
- Ingest Northern Ireland population data from NISRA sources.
- Pull CSV/XLSX sources listed in the geography catalogue.

Common commands:
```
python3 scripts/nisra_ingest.py
python3 scripts/nisra_ingest.py --config data/uk_population_ingest_config.json
```

Writes to:
- `nisra_population_observations`
- `nisra_ingest_runs`
- `nisra_ingest_checkpoints`

## Planned scripts (not yet implemented)

### `scripts/uk_population_backfill.py`
Purpose:
- Run a multi-source backfill based on a curated config file.
- Normalize mappings so output matches the shared schema.

Status:
- Not yet implemented.

Inputs (likely):
- `data/uk_population_ingest_config.json`

Writes to:
- `nomis_population_observations`
- `nrs_population_observations`
- `nisra_population_observations`

## Supabase Edge Functions

### `supabase/functions/uk_population_catalogue_load`
Purpose:
- Load the geography catalogue into the source-prefixed `*_geography_catalogue` tables.

Schedule:
- `0 0 1 * *` (monthly on the 1st, UTC).

Required env:
- `UK_POPULATION_CATALOGUE_URL` (public URL to the CSV)

### `supabase/functions/uk_population_external_ingest`
Purpose:
- Ingest NRS/NISRA datasets listed in the catalogue tables.

Schedule:
- `0 1 1 * *` (monthly on the 1st, UTC).

Optional env:
- `UK_POPULATION_INGEST_CONFIG_URL` or `UK_POPULATION_INGEST_CONFIG` (JSON overrides)
- `UK_POPULATION_PREFIXES` (comma-separated list; defaults to `nrs,nisra`)
- `UK_POPULATION_BATCH_SIZE` (defaults to 500 rows per upsert)

### `supabase/functions/nomis_monthly_check`
Purpose:
- Discover and refresh Nomis population datasets in `nomis_dataset_registry`.

Schedule:
- `0 2 1 * *` (monthly on the 1st, UTC).
