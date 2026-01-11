# Schema overview

This document summarizes the Supabase tables used by the UK population ingestion flow.
Tables are grouped by source prefix:

- `nomis_` (England & Wales)
- `nrs_` (Scotland)
- `nisra_` (Northern Ireland)

Each prefix has the same table set, described below.

## <prefix>_population_observations

Stores population observations across supported geo types.

Columns:
- `id` bigserial primary key
- `geo_type` text
- `geo_code` text
- `reference_date` date
- `population_value` integer
- `dataset_id` text
- `measure` text nullable
- `created_at` timestamptz default now()

Constraints and indexes:
- Unique: `(geo_type, geo_code, reference_date, dataset_id)`
- Index: `(geo_type, reference_date)`

## <prefix>_dataset_registry

Stores the dataset registry produced by discovery.

Columns:
- `id` bigserial primary key
- `dataset_id` text unique
- `title` text
- `description` text nullable
- `geo_types` text[]
- `is_population` boolean default true
- `updated_at` timestamptz default now()

## <prefix>_ingest_runs

Tracks ingestion runs (manual or scheduled).

Columns:
- `id` bigserial primary key
- `started_at` timestamptz default now()
- `completed_at` timestamptz nullable
- `status` text
- `row_count` integer default 0
- `notes` text nullable

## <prefix>_ingest_checkpoints

Tracks dataset progress for long-running backfills.

Columns:
- `id` bigserial primary key
- `dataset_id` text
- `geo_type` text
- `last_reference_date` date nullable
- `updated_at` timestamptz default now()

Constraints:
- Unique: `(dataset_id, geo_type)`

## <prefix>_geography_catalogue

Stores geography metadata rows (from `data/uk_population_geography_catalogue.csv`).

Columns:
- `id` bigserial primary key
- `geography_level` text
- `geography_vintage` text
- `coverage` text
- `nomis_dataset_api_ref` text nullable
- `nomis_dataset_keyfamily_id` text nullable
- `nomis_geography_type_code` text nullable
- `typical_update_cycle` text nullable
- `latest_reference_period_on_nomis` text nullable
- `next_release_note` text nullable
- `notes` text nullable
- `primary_source_org` text nullable
- `primary_source_dataset_page` text nullable
- `primary_source_download_csv` text nullable
- `primary_source_download_xlsx` text nullable
- `primary_source_api_example` text nullable
- `primary_source_years_available` text nullable
- `primary_source_update_frequency` text nullable
- `primary_source_notes` text nullable

## Row level security

RLS is enabled on all `nomis_`, `nrs_`, and `nisra_` tables. No policies are defined in this repo,
so access requires the service role unless you add policies.
