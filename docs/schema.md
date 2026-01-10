# Supabase schema (nomis_ prefix)

All tables are prefixed with `nomis_` to avoid collisions in the broader database.

## `nomis_population_observations`

Stores population observations for all supported geotypes.

Columns:
- `id` uuid primary key default `gen_random_uuid()`
- `geo_type` text (OA, LSOA, DZ, SA, MSOA, IZ, SOA, PCON, LAD)
- `geo_code` text (GSS code)
- `reference_date` date
- `population_value` integer
- `dataset_id` text (Nomis dataset ID)
- `measure` text nullable
- `created_at` timestamptz default now()

Unique constraint:
- `(geo_type, geo_code, reference_date, dataset_id)`

Indexes:
- `(geo_type, reference_date)`

## `nomis_dataset_registry`

Stores the population dataset registry built by discovery.

Columns:
- `id` uuid primary key default `gen_random_uuid()`
- `dataset_id` text unique
- `title` text
- `description` text nullable
- `geo_types` text[]
- `is_population` boolean
- `updated_at` timestamptz default now()

## `nomis_ingest_runs`

Tracks ingestion runs.

Columns:
- `id` uuid primary key default `gen_random_uuid()`
- `started_at` timestamptz default now()
- `completed_at` timestamptz nullable
- `status` text
- `row_count` integer
- `notes` text nullable

## `nomis_ingest_checkpoints`

Tracks per-dataset ingestion progress for backfills.

Columns:
- `id` uuid primary key default `gen_random_uuid()`
- `dataset_id` text
- `geo_type` text
- `last_reference_date` date nullable
- `updated_at` timestamptz default now()

Unique constraint:
- `(dataset_id, geo_type)`
