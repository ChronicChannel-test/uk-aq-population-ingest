# Cross-repo map: CIC-Test-uk-population-ingest

## Purpose
This repo contains Python scripts and Supabase Edge Functions that ingest UK population datasets from Nomis, NRS, and NISRA into source-prefixed tables in Supabase. It also exposes a read-only population endpoint used by the UI for population overlays.

It depends on schema definitions in the schema repo and shares conventions with the main UK-AQ ingest and history repos for naming and data flow.

## Repo layout
- `README.md`: Quick-start notes and basic ingest flow.
- `scripts/`: CLI entry points (e.g., [scripts/nomis_ingest.py](scripts/nomis_ingest.py), [scripts/nrs_ingest.py](scripts/nrs_ingest.py), [scripts/nisra_ingest.py](scripts/nisra_ingest.py), [scripts/uk_population_catalogue_load.py](scripts/uk_population_catalogue_load.py)).
- `src/nomis_api/`: Core ingest library and Supabase client ([src/nomis_api/uk_population_ingest.py](src/nomis_api/uk_population_ingest.py)).
- `supabase/`: Edge Functions and schema helpers ([supabase/functions/](supabase/functions/), [supabase/uk_population_schema.sql](supabase/uk_population_schema.sql)).
- `data/`: Catalogue/config JSON and CSV inputs used by scripts.
- `docs/`: Ingest and schema docs ([docs/schema.md](docs/schema.md), [docs/ingest_config.md](docs/ingest_config.md)).
- `system_docs/`: Operational notes for scripts/functions ([system_docs/uk_population_scripts.md](system_docs/uk_population_scripts.md), [system_docs/supabase_functions.md](system_docs/supabase_functions.md)).
- `pyproject.toml`, `requirements.txt`: Python packaging/deps.
- `codex/`: Local tooling support files.

## How this repo connects to the other repos
- **Schema repo**: `CIC-test-uk-aq-schema` defines all population tables/views used here.
- **AQ ingest repo**: `CIC-test-uk-aq-ingest` owns the main air-quality ingest and most Edge Functions; this repo provides the population Edge Function consumed by the UI.
- **History repo**: `CIC-test-uk-aq-history` is for long-run/backfill analysis and uses the same schemas (confirm).
- **Webpage repo**: `CIC-test-uk-aq` reads population data via the `uk_aq_population` Edge Function in this repo.

Data flow across repos:
- `CIC-test-uk-aq-schema` defines tables/views/RPC/policies.
- `CIC-test-uk-aq-ingest`, `CIC-test-uk-aq-history`, and this repo write data into those schemas.
- `CIC-test-uk-aq` reads data and calls Edge Functions.
- Edge Functions (if present) live under `/supabase` in the ingest repo; this repo also ships Edge Functions under its own `/supabase` directory.

## Supabase touchpoints
### Reads
- **PostgREST**: [supabase/functions/uk_aq_population/index.ts](supabase/functions/uk_aq_population/index.ts) reads `uk_population_observations` via `/rest/v1`.
- **PostgREST**: [supabase/functions/uk_population_external_ingest/index.ts](supabase/functions/uk_population_external_ingest/index.ts) selects from `<prefix>_geography_catalogue` tables.
- **PostgREST**: [supabase/functions/nomis_monthly_check/index.ts](supabase/functions/nomis_monthly_check/index.ts) reads `nomis_dataset_registry`.
- **RPC**: none found.
- **Edge Functions**: [supabase/functions/uk_aq_population/index.ts](supabase/functions/uk_aq_population/index.ts) exposes a read-only endpoint for population data.
- **Storage**: none found.
- **Auth**: service-role keys are used in [supabase/functions/*](supabase/functions/) and [src/nomis_api/config.py](src/nomis_api/config.py) (no end-user auth flows).
- **Realtime**: none found.

### Writes
- **PostgREST (scripts)**: [src/nomis_api/supabase.py](src/nomis_api/supabase.py) writes from [scripts/nomis_ingest.py](scripts/nomis_ingest.py), [scripts/nrs_ingest.py](scripts/nrs_ingest.py), [scripts/nisra_ingest.py](scripts/nisra_ingest.py), and [scripts/uk_population_catalogue_load.py](scripts/uk_population_catalogue_load.py).
- **Edge Functions (writes)**:
  - [supabase/functions/uk_population_external_ingest/index.ts](supabase/functions/uk_population_external_ingest/index.ts): upserts `*_population_observations`, `*_dataset_registry`, `*_ingest_runs`, `*_ingest_checkpoints`.
  - [supabase/functions/uk_population_catalogue_load/index.ts](supabase/functions/uk_population_catalogue_load/index.ts): deletes/inserts `*_geography_catalogue`.
  - [supabase/functions/nomis_monthly_check/index.ts](supabase/functions/nomis_monthly_check/index.ts): upserts `nomis_dataset_registry`.
- **Schema links**: see `uk_aq_pop_schema.sql` in the schema repo for all population tables/views.
  - [../../CIC-test-uk-aq-schema/uk-aq-schema/schemas/uk_aq_pop_schema.sql](../../CIC-test-uk-aq-schema/uk-aq-schema/schemas/uk_aq_pop_schema.sql)

### Edge Functions (if applicable)
- **Location**: [supabase/functions/](supabase/functions/)
- **Invocation pattern**: `https://<project_ref>.supabase.co/functions/v1/<function_name>`
- **Functions**:
  - `uk_aq_population` (read-only population view)
  - `uk_population_catalogue_load` (catalogue load)
  - `uk_population_external_ingest` (external ingest)
  - `nomis_monthly_check` (dataset discovery)
- **Public vs user-specific responses**: requests use service-role keys on the server; responses are not user-specific in the function code.

## Running and configuration (NO SECRETS)
- **Env vars (names only)**:
  - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SERVICE_KEY`
  - `SB_SUPABASE_URL`, `SB_SERVICE_ROLE_KEY`
  - `SUPABASE_PROJECT_REF`, `SUPABASE_PUBLISHABLE_DEFAULT_KEY`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_ANON_JWT`
  - `NOMIS_BASE_URL`, `NOMIS_USER`, `NOMIS_API_KEY`, `NOMIS_DATASET_IDS`
  - `UK_POPULATION_CATALOGUE_URL`, `UK_POPULATION_CATALOGUE_REPLACE`
  - `UK_POPULATION_INGEST_CONFIG_URL`, `UK_POPULATION_INGEST_CONFIG`, `UK_POPULATION_PREFIXES`, `UK_POPULATION_BATCH_SIZE`
- **Env files**: `.env` exists at repo root (no `.env.example` found).
- **Commands (documented)**:
  - `python3 scripts/nomis_discover.py`
  - `python3 scripts/nomis_auth_check.py`
  - `python3 scripts/nomis_ingest.py`
  - `python3 scripts/uk_population_catalogue_load.py`
  - `python3 scripts/nrs_ingest.py`
  - `python3 scripts/nisra_ingest.py`
  - Edge function schedules: see [system_docs/uk_population_scripts.md](system_docs/uk_population_scripts.md).

## Data model pointers
- Population tables + views (`nomis_*`, `nrs_*`, `nisra_*`, `uk_population_observations`):
  - [../../CIC-test-uk-aq-schema/uk-aq-schema/schemas/uk_aq_pop_schema.sql](../../CIC-test-uk-aq-schema/uk-aq-schema/schemas/uk_aq_pop_schema.sql)

## Egress-relevant notes (FACTUAL, no solutions)
- [supabase/functions/uk_aq_population/index.ts](supabase/functions/uk_aq_population/index.ts) serves up to `limit=20000` rows from `uk_population_observations`.
- [supabase/functions/uk_population_external_ingest/index.ts](supabase/functions/uk_population_external_ingest/index.ts) runs `select('*')` against `<prefix>_geography_catalogue` and fetches full source files (csv/xlsx/json-stat) per dataset.
- [supabase/functions/uk_population_catalogue_load/index.ts](supabase/functions/uk_population_catalogue_load/index.ts) deletes and reloads full `*_geography_catalogue` tables from a CSV URL.
- [scripts/nomis_ingest.py](scripts/nomis_ingest.py), [scripts/nrs_ingest.py](scripts/nrs_ingest.py), and [scripts/nisra_ingest.py](scripts/nisra_ingest.py) fetch full datasets from external sources and upsert into Supabase.

## Archive policy (REQUIRED)
“Archive policy:
- /archive directories may be searched and used as reference.
- Do not modify or delete any existing files in /archive.
- You may add new files to /archive, but never change existing archived content.”

## Permissions (REQUIRED)
- The agent may edit any files without asking for permission, except files under any `/archive` directory.

## WORKING STYLE (IMPORTANT)

- Finish with HUMAN INSTRUCTIONS that say:
  - which files to edit/create (exact paths)
  - which SQL file(s) to run and WHERE (Supabase Dashboard SQL Editor vs migrations)
  - which Edge Function(s) to deploy and WHERE (Supabase Dashboard vs existing workflow)
  - which env vars/secrets must exist (names only; never values)
  - what to verify (logs, response shape/size, caching headers)
- give me commands instead if its applicable, but instructions are preferred.

REQUIRED OUTPUT FORMAT
1) Summary (2–5 bullets)
2) Files changed (paths)
3) Implementation details (short, specific)
4) Supabase steps (instructions only,)
5) Verification checklist (clear pass/fail)
