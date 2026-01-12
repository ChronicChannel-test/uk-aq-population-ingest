# NRS / PHS population source notes (Scotland)

## Source overview
- Data comes from National Records of Scotland (NRS) and Public Health Scotland (PHS).
- Sources are listed in the catalogue CSV: `data/uk_population_geography_catalogue.csv`.
- The catalogue includes download URLs for CSV/XLSX (often large files).

## How ingestion works here
- `scripts/nrs_ingest.py` reads the catalogue and ingests Scotland rows.
- It uses `data/uk_population_ingest_config.json` for column overrides and format hints.
- Output tables:
  - `nrs_population_observations`
  - `nrs_ingest_runs`
  - `nrs_ingest_checkpoints`

## Mapping and overrides
- If a dataset has non-standard headers, add overrides in `data/uk_population_ingest_config.json`.
- The ingest attempts to infer `geo_code`, `time`, `value`, and `measure` columns.

## Common gotchas
- CSV/XLSX schemas change between releases.
- Files are large; expect longer ingest times.
- Scotland has multiple geography vintages (2001, 2011, etc.) and the catalogue distinguishes them.

