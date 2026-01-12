# Population ingest config

`data/nomis_population_config.json` contains an array of dataset ingest definitions. Each entry defines how to map a Nomis dataset into `nomis_population_observations`.

Example entry:

```json
{
  "dataset_id": "PESTOA2021",
  "geo_type": "OA",
  "geo_code_column": "GEOGRAPHY_CODE",
  "time_column": "DATE",
  "value_column": "OBS_VALUE",
  "measure_column": "MEASURES",
  "params": {
    "geography": "TYPE150",
    "gender": "0",
    "age": "0",
    "date": "latest",
    "measures": "20100"
  }
}
```

Fields:
- `dataset_id`: Nomis dataset ID
- `geo_type`: One of OA, LSOA, DZ, SA, MSOA, IZ, SOA, PCON, LAD
- `geo_code_column`: Column name that contains the GSS code
- `time_column`: Column name for the time value (YYYY or YYYY-MM-DD)
- `value_column`: Column name with the population value
- `measure_column`: Optional column name for the measure
- `params`: Optional Nomis query params (use to pin geography/age/sex/date filters)
