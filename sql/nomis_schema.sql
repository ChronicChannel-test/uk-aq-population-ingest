create extension if not exists "pgcrypto";

create table if not exists nomis_population_observations (
  id uuid primary key default gen_random_uuid(),
  geo_type text not null,
  geo_code text not null,
  reference_date date not null,
  population_value integer not null,
  dataset_id text not null,
  measure text,
  created_at timestamptz not null default now(),
  unique (geo_type, geo_code, reference_date, dataset_id)
);

create index if not exists nomis_population_observations_geo_date_idx
  on nomis_population_observations (geo_type, reference_date);

create table if not exists nomis_dataset_registry (
  id uuid primary key default gen_random_uuid(),
  dataset_id text not null unique,
  title text not null,
  description text,
  geo_types text[] not null,
  is_population boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists nomis_ingest_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null,
  row_count integer not null default 0,
  notes text
);

create table if not exists nomis_ingest_checkpoints (
  id uuid primary key default gen_random_uuid(),
  dataset_id text not null,
  geo_type text not null,
  last_reference_date date,
  updated_at timestamptz not null default now(),
  unique (dataset_id, geo_type)
);
