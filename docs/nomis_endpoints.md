# Nomis discovery endpoints

These are the Nomis API endpoints used for dataset discovery and codelists. The code defaults to the base URL `https://www.nomisweb.co.uk/api/v01` and builds the following endpoints:

## Dataset catalog

- `GET /dataset.json`
  - Lists datasets with IDs, titles, and descriptions.
  - Used to build the initial population-only candidate list.

## Dataset metadata (SDMX discovery)

- `GET /dataset/{dataset_id}.json`
  - Returns dataset metadata and dimension descriptions.
  - Used to confirm dimensions and measures.

## Geography codelist

- `GET /dataset/{dataset_id}/geography.json`
  - Returns GEOGRAPHY codelist entries for the dataset.
  - Used to filter datasets by supported geo types (OA, LSOA, DZ, SA, MSOA, IZ, SOA, PCON, LAD).

## Dataset data (CSV)

- `GET /dataset/{dataset_id}.csv`
  - Used to retrieve data for ingestion.
  - Standard query parameters include `geography`, `time`, and any dataset-specific dimensions.

> If Nomis changes endpoints or you need alternate SDMX URLs, update `NOMIS_BASE_URL` in the environment and the path templates in `src/nomis_api/nomis.py`.
