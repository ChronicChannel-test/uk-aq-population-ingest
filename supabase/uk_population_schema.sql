create table if not exists nomis_population_observations (
  id bigserial primary key,
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
  id bigserial primary key,
  dataset_id text not null unique,
  title text not null,
  description text,
  geo_types text[] not null,
  is_population boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists nomis_ingest_runs (
  id bigserial primary key,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null,
  row_count integer not null default 0,
  notes text
);

create table if not exists nomis_ingest_checkpoints (
  id bigserial primary key,
  dataset_id text not null,
  geo_type text not null,
  last_reference_date date,
  updated_at timestamptz not null default now(),
  unique (dataset_id, geo_type)
);

create table if not exists nomis_geography_catalogue (
  id bigserial primary key,
  geography_level text not null,
  geography_vintage text not null,
  coverage text not null,
  nomis_dataset_api_ref text,
  nomis_dataset_keyfamily_id text,
  nomis_geography_type_code text,
  typical_update_cycle text,
  latest_reference_period_on_nomis text,
  next_release_note text,
  notes text,
  primary_source_org text,
  primary_source_dataset_page text,
  primary_source_download_csv text,
  primary_source_download_xlsx text,
  primary_source_api_example text,
  primary_source_years_available text,
  primary_source_update_frequency text,
  primary_source_notes text
);

alter table nomis_population_observations enable row level security;
alter table nomis_dataset_registry enable row level security;
alter table nomis_ingest_runs enable row level security;
alter table nomis_ingest_checkpoints enable row level security;
alter table nomis_geography_catalogue enable row level security;

create table if not exists nrs_population_observations (
  id bigserial primary key,
  geo_type text not null,
  geo_code text not null,
  reference_date date not null,
  population_value integer not null,
  dataset_id text not null,
  measure text,
  created_at timestamptz not null default now(),
  unique (geo_type, geo_code, reference_date, dataset_id)
);

create index if not exists nrs_population_observations_geo_date_idx
  on nrs_population_observations (geo_type, reference_date);

create table if not exists nrs_dataset_registry (
  id bigserial primary key,
  dataset_id text not null unique,
  title text not null,
  description text,
  geo_types text[] not null,
  is_population boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists nrs_ingest_runs (
  id bigserial primary key,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null,
  row_count integer not null default 0,
  notes text
);

create table if not exists nrs_ingest_checkpoints (
  id bigserial primary key,
  dataset_id text not null,
  geo_type text not null,
  last_reference_date date,
  updated_at timestamptz not null default now(),
  unique (dataset_id, geo_type)
);

create table if not exists nrs_geography_catalogue (
  id bigserial primary key,
  geography_level text not null,
  geography_vintage text not null,
  coverage text not null,
  nomis_dataset_api_ref text,
  nomis_dataset_keyfamily_id text,
  nomis_geography_type_code text,
  typical_update_cycle text,
  latest_reference_period_on_nomis text,
  next_release_note text,
  notes text,
  primary_source_org text,
  primary_source_dataset_page text,
  primary_source_download_csv text,
  primary_source_download_xlsx text,
  primary_source_api_example text,
  primary_source_years_available text,
  primary_source_update_frequency text,
  primary_source_notes text
);

alter table nrs_population_observations enable row level security;
alter table nrs_dataset_registry enable row level security;
alter table nrs_ingest_runs enable row level security;
alter table nrs_ingest_checkpoints enable row level security;
alter table nrs_geography_catalogue enable row level security;

create table if not exists nisra_population_observations (
  id bigserial primary key,
  geo_type text not null,
  geo_code text not null,
  reference_date date not null,
  population_value integer not null,
  dataset_id text not null,
  measure text,
  created_at timestamptz not null default now(),
  unique (geo_type, geo_code, reference_date, dataset_id)
);

create index if not exists nisra_population_observations_geo_date_idx
  on nisra_population_observations (geo_type, reference_date);

create table if not exists nisra_dataset_registry (
  id bigserial primary key,
  dataset_id text not null unique,
  title text not null,
  description text,
  geo_types text[] not null,
  is_population boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists nisra_ingest_runs (
  id bigserial primary key,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null,
  row_count integer not null default 0,
  notes text
);

create table if not exists nisra_ingest_checkpoints (
  id bigserial primary key,
  dataset_id text not null,
  geo_type text not null,
  last_reference_date date,
  updated_at timestamptz not null default now(),
  unique (dataset_id, geo_type)
);

create table if not exists nisra_geography_catalogue (
  id bigserial primary key,
  geography_level text not null,
  geography_vintage text not null,
  coverage text not null,
  nomis_dataset_api_ref text,
  nomis_dataset_keyfamily_id text,
  nomis_geography_type_code text,
  typical_update_cycle text,
  latest_reference_period_on_nomis text,
  next_release_note text,
  notes text,
  primary_source_org text,
  primary_source_dataset_page text,
  primary_source_download_csv text,
  primary_source_download_xlsx text,
  primary_source_api_example text,
  primary_source_years_available text,
  primary_source_update_frequency text,
  primary_source_notes text
);

alter table nisra_population_observations enable row level security;
alter table nisra_dataset_registry enable row level security;
alter table nisra_ingest_runs enable row level security;
alter table nisra_ingest_checkpoints enable row level security;
alter table nisra_geography_catalogue enable row level security;

create or replace view nomis_population_current_observations
with (security_invoker = true) as
select distinct on (geo_type, geo_code, dataset_id)
  id,
  geo_type,
  geo_code,
  reference_date,
  population_value,
  dataset_id,
  measure,
  created_at
from nomis_population_observations
order by geo_type, geo_code, dataset_id, reference_date desc;

create or replace view nomis_population_pcon_2010
with (security_invoker = true) as
select
  id,
  geo_type,
  geo_code,
  reference_date,
  population_value,
  dataset_id,
  measure,
  created_at
from nomis_population_observations
where geo_type = 'PCON'
  and dataset_id = 'NM_2010_1'
  and reference_date between date '2011-06-30' and date '2020-06-30';

create or replace view nomis_population_pcon_2024
with (security_invoker = true) as
select
  id,
  geo_type,
  geo_code,
  reference_date,
  population_value,
  dataset_id,
  measure,
  created_at
from nomis_population_observations
where geo_type = 'PCON'
  and dataset_id = 'NM_2014_1'
  and reference_date between date '2021-06-30' and date '2024-06-30';

create or replace view uk_population_observations
with (security_invoker = true) as
select
  id,
  geo_type,
  geo_code,
  reference_date,
  population_value,
  dataset_id,
  measure,
  created_at
from nomis_population_observations
union all
select
  id,
  geo_type,
  geo_code,
  reference_date,
  population_value,
  dataset_id,
  measure,
  created_at
from nrs_population_observations
union all
select
  id,
  geo_type,
  geo_code,
  reference_date,
  population_value,
  dataset_id,
  measure,
  created_at
from nisra_population_observations;
