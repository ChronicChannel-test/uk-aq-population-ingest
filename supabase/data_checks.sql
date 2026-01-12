-- PCON (all years) row count
select count(*) as row_count
from nomis_population_observations
where geo_type = 'PCON'
  and dataset_id = 'NM_2014_1';

-- PCON year range loaded
select
  min(reference_date) as min_date,
  max(reference_date) as max_date
from nomis_population_observations
where geo_type = 'PCON'
  and dataset_id = 'NM_2014_1';

-- PCON latest rows (via the current view)
select
  geo_code,
  reference_date,
  population_value
from nomis_population_current_observations
where geo_type = 'PCON'
  and dataset_id = 'NM_2014_1'
order by geo_code;

-- PCON row count by year
select
  extract(year from reference_date)::int as year,
  count(*) as row_count
from nomis_population_observations
where geo_type = 'PCON'
  and dataset_id = 'NM_2014_1'
group by extract(year from reference_date)
order by year;

-- PCON unique geographies per year
select
  extract(year from reference_date)::int as year,
  count(distinct geo_code) as pcon_count
from nomis_population_observations
where geo_type = 'PCON'
  and dataset_id = 'NM_2014_1'
group by extract(year from reference_date)
order by year;

-- PCON 2010 boundaries (2011-2020)
select
  extract(year from reference_date)::int as year,
  count(*) as row_count,
  count(distinct geo_code) as pcon_count
from nomis_population_pcon_2010
group by extract(year from reference_date)
order by year;

-- PCON 2024 boundaries (2021-2024)
select
  extract(year from reference_date)::int as year,
  count(*) as row_count,
  count(distinct geo_code) as pcon_count
from nomis_population_pcon_2024
group by extract(year from reference_date)
order by year;
