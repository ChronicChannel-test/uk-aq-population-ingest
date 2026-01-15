# Supabase Edge Functions

- Deployment: see [.github/workflows/supabase_edge_deploy.yml](.github/workflows/supabase_edge_deploy.yml) for automated deploys of all functions in supabase/functions/.
- Runtime: all functions use Deno with supabase-js v2.45.4.

## Function summaries

### uk_aq_population
- Entry: [supabase/functions/uk_aq_population/index.ts](supabase/functions/uk_aq_population/index.ts)
- Purpose: read-only endpoint that serves population values from view uk_population_observations by geo type and date.
- Query params: geo_type (required), reference_date (optional YYYY-MM-DD; defaults to latest available for the geo_type), limit (optional; defaults 2000, max 20000).
- Dependencies: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (SB_SUPABASE_URL and SB_SERVICE_ROLE_KEY fallbacks); expects REST access to view uk_population_observations.
- Response: JSON payload containing geo_type, resolved reference_date, count, and data array with geo_code, geo_type, reference_date, population_value, dataset_id, measure.

### nomis_monthly_check
- Entry: [supabase/functions/nomis_monthly_check/index.ts](supabase/functions/nomis_monthly_check/index.ts)
- Purpose: discovers population datasets on Nomis and upserts them into nomis_dataset_registry while noting tracked datasets.
- Environment: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_KEY), NOMIS_BASE_URL (default https://www.nomisweb.co.uk/api/v01), NOMIS_DATASET_IDS (comma-separated list of tracked ids).
- Output: summary JSON with checked_at, base_url, registry_count, new_dataset_ids, tracked_dataset_ids, and tracked_missing_from_discovery.

### uk_population_catalogue_load
- Entry: [supabase/functions/uk_population_catalogue_load/index.ts](supabase/functions/uk_population_catalogue_load/index.ts)
- Purpose: loads the geography catalogue CSV into nomis/nrs/nisra geography tables, with optional replacement.
- Environment: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_KEY), UK_POPULATION_CATALOGUE_URL, UK_POPULATION_CATALOGUE_REPLACE (boolean, default true).
- Behavior: DELETEs existing catalogue tables when replace is true; inserts grouped rows per source; responds with loaded_at, catalogue_url, replace flag, and counts per source.

### uk_population_external_ingest
- Entry: [supabase/functions/uk_population_external_ingest/index.ts](supabase/functions/uk_population_external_ingest/index.ts)
- Purpose: ingests external population datasets (currently NRS/NISRA) using the loaded catalogues and optional overrides.
- Environment: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_KEY), UK_POPULATION_INGEST_CONFIG_URL or UK_POPULATION_INGEST_CONFIG (JSON), UK_POPULATION_PREFIXES (default nrs,nisra), UK_POPULATION_BATCH_SIZE (default 500).
- Query params: prefixes (comma-separated subset of nrs,nisra to override env selection).
- Behavior: pulls catalogue entries, fetches source files (csv/xlsx/json-stat), maps columns, upserts into <prefix>_population_observations, updates registry/checkpoints, and records ingest_runs statuses; response summarizes datasets processed and rows ingested.
