# Nomis population source notes

## What "NM_2014_1" means
- `NM_2014_1` is the Nomis SDMX keyfamily ID for the 2021-based Small Area Population Estimates (SAPE).
- It is not the data year. Actual reference dates come from the `DATE` column (e.g., latest = mid-2024).
- The website dataset ref used in the catalogue is `PESTOA2021`; the API keyfamily is `NM_2014_1`.

## Common dimensions (NM_2014_1)
- `GEOGRAPHY` (e.g., `TYPE172` for PCON 2024 boundaries)
- `GENDER` (e.g., `0` = Total)
- `C_AGE` (e.g., `200` = All Ages)
- `MEASURES` (e.g., `20100` = value)
- `FREQ` (e.g., `A` = annual)

## The `measure` field in `nomis_population_observations`
- Stores the Nomis `MEASURES` dimension value from the API row.
- For totals, this is typically `20100` (value), not a percent.

## PCON boundary vintages and year coverage
- `NM_2010_1` + `TYPE460`: PCON Dec 2010 boundaries, mid-2011 through mid-2020.
- `NM_2014_1` + `TYPE172`: PCON July 2024 boundaries, mid-2021 through mid-2024.
- Nomis does not back-cast 2024 boundaries to earlier years in this dataset family.
- For map display, keep geometry and population aligned by vintage:
  - Use 2010 boundaries for 2011–2020.
  - Use 2024 boundaries for 2021–2024.

## How ingestion works here
- Config lives in `data/nomis_population_config.json`.
- `scripts/nomis_ingest.py` reads configs and upserts into `nomis_population_observations`.
- Each config can include `params` to pin Nomis dimensions (`geography`, `gender`, `c_age`, `freq`, `date`, `measures`).

## Authentication notes
- The code supports `NOMIS_USER` and `NOMIS_API_KEY`, but some datasets return an empty body when credentials are included.
- `NomisClient.fetch_dataset_rows` now retries anonymously if a credentialed call returns HTML or an empty CSV.
- If you need to use credentials, confirm the key/signature setup in Nomis "My Account → Web Services."

## Useful endpoints (Nomis API v01)
- Dataset list (SDMX JSON): `/api/v01/dataset/def.sdmx.json`
- Dataset definition: `/api/v01/dataset/{dataset_id}/def.sdmx.json`
- Geography codelist: `/api/v01/dataset/{dataset_id}/geography.def.sdmx.json`
- Data (CSV): `/api/v01/dataset/{dataset_id}.csv`
