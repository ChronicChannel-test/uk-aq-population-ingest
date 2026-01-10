from dataclasses import dataclass
from datetime import date
import json
from pathlib import Path
from typing import Iterable

from nomis_api.geo import normalize_geo_type
from nomis_api.nomis import NomisClient
from nomis_api.supabase import SupabaseClient


@dataclass(frozen=True)
class DatasetIngestConfig:
    dataset_id: str
    geo_type: str
    geo_code_column: str
    time_column: str
    value_column: str
    measure_column: str | None = None


def parse_reference_date(value: str) -> date:
    value = value.strip()
    if len(value) == 4 and value.isdigit():
        return date(int(value), 6, 30)
    if len(value) == 10 and value[4] == "-" and value[7] == "-":
        year, month, day = value.split("-")
        return date(int(year), int(month), int(day))
    raise ValueError(f"Unsupported time value: {value}")


def load_ingest_configs(path: Path) -> list[DatasetIngestConfig]:
    payload = json.loads(path.read_text())
    return [DatasetIngestConfig(**entry) for entry in payload]


def map_rows(
    rows: Iterable[dict],
    config: DatasetIngestConfig,
) -> list[dict]:
    mapped = []
    for row in rows:
        reference_date = parse_reference_date(row[config.time_column])
        mapped.append(
            {
                "geo_type": normalize_geo_type(config.geo_type),
                "geo_code": row[config.geo_code_column],
                "reference_date": reference_date.isoformat(),
                "population_value": int(float(row[config.value_column])),
                "dataset_id": config.dataset_id,
                "measure": row.get(config.measure_column) if config.measure_column else None,
            }
        )
    return mapped


def ingest_population_dataset(
    nomis_client: NomisClient,
    supabase_client: SupabaseClient,
    config: DatasetIngestConfig,
    table: str,
) -> int:
    rows = nomis_client.fetch_dataset_rows(
        config.dataset_id,
        params={"geography": config.geo_type},
    )
    mapped = map_rows(rows, config)
    if mapped:
        supabase_client.upsert(
            table,
            mapped,
            conflict_columns=["geo_type", "geo_code", "reference_date", "dataset_id"],
        )
    return len(mapped)
