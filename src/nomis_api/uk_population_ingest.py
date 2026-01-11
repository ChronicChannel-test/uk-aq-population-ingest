from datetime import datetime
from pathlib import Path
import json

from nomis_api.supabase import SupabaseClient
from nomis_api.uk_population import (
    assign_source_prefix,
    build_dataset_id,
    fetch_csv_rows,
    fetch_jsonstat_rows,
    fetch_xlsx_rows,
    infer_column,
    infer_format,
    load_catalogue,
    load_ingest_overrides,
    map_rows,
    pick_source_url,
)


def load_ingest_config(path: Path) -> dict:
    payload = path.read_text()
    return {
        "column_candidates": {
            "geo_code": ["area code", "code", "geography code", "area_code"],
            "time": ["year", "date", "time", "reference_date"],
            "value": ["population", "value", "all persons", "all people", "total"],
            "measure": ["measure", "sex", "age"],
        },
        **(json.loads(payload) if payload else {}),
    }


def start_ingest_run(client: SupabaseClient, table: str, dataset_id: str) -> int | None:
    payload = {"status": "running", "row_count": 0, "notes": f"dataset_id={dataset_id}"}
    rows = client.insert(table, [payload], return_rows=True)
    return rows[0]["id"] if rows else None


def complete_ingest_run(client: SupabaseClient, table: str, run_id: int | None, status: str, row_count: int) -> None:
    if run_id is None:
        return
    payload = {
        "status": status,
        "row_count": row_count,
        "completed_at": datetime.utcnow().isoformat() + "Z",
    }
    client.update(table, {"id": f"eq.{run_id}"}, payload)


def ingest_external_sources(
    prefix: str,
    catalogue_path: Path,
    config_path: Path,
    client: SupabaseClient,
) -> tuple[int, list[str]]:
    entries = load_catalogue(catalogue_path)
    overrides = load_ingest_overrides(config_path)
    config = load_ingest_config(config_path)
    candidates = config.get("column_candidates", {})
    total_rows = 0
    skipped = []

    for entry in entries:
        if assign_source_prefix(entry) != prefix:
            continue
        dataset_id = build_dataset_id(prefix, entry)
        override = overrides.get(dataset_id)
        source_url = override.source_url if override and override.source_url else pick_source_url(entry)
        if not source_url:
            skipped.append(f"{dataset_id}: no source URL")
            continue

        source_format = override.format if override and override.format else infer_format(source_url)
        run_id = start_ingest_run(client, f"{prefix}_ingest_runs", dataset_id)
        try:
            if source_format == "csv":
                rows = fetch_csv_rows(source_url)
            elif source_format == "xlsx":
                rows = fetch_xlsx_rows(source_url)
            elif source_format == "jsonstat":
                if not override or not override.jsonstat_geo_dimension or not override.jsonstat_time_dimension:
                    skipped.append(f"{dataset_id}: missing JSON-stat dimension mapping")
                    complete_ingest_run(client, f"{prefix}_ingest_runs", run_id, "skipped", 0)
                    continue
                rows = fetch_jsonstat_rows(
                    source_url,
                    override.jsonstat_geo_dimension,
                    override.jsonstat_time_dimension,
                    override.jsonstat_value_dimension,
                )
            else:
                skipped.append(f"{dataset_id}: unsupported format {source_format}")
                complete_ingest_run(client, f"{prefix}_ingest_runs", run_id, "skipped", 0)
                continue

            if not rows:
                skipped.append(f"{dataset_id}: no rows")
                complete_ingest_run(client, f"{prefix}_ingest_runs", run_id, "skipped", 0)
                continue

            headers = list(rows[0].keys())
            geo_code_column = (
                override.geo_code_column if override and override.geo_code_column else None
            ) or infer_column(headers, candidates.get("geo_code", []))
            time_column = (
                override.time_column if override and override.time_column else None
            ) or infer_column(headers, candidates.get("time", []))
            value_column = (
                override.value_column if override and override.value_column else None
            ) or infer_column(headers, candidates.get("value", []))
            measure_column = (
                override.measure_column if override and override.measure_column else None
            ) or infer_column(headers, candidates.get("measure", []))

            if not geo_code_column or not time_column or not value_column:
                skipped.append(f"{dataset_id}: missing column mapping")
                complete_ingest_run(client, f"{prefix}_ingest_runs", run_id, "skipped", 0)
                continue

            mapped = map_rows(
                rows,
                entry.geography_level,
                dataset_id,
                geo_code_column,
                time_column,
                value_column,
                measure_column,
            )
            if mapped:
                client.upsert(
                    f"{prefix}_population_observations",
                    mapped,
                    conflict_columns=["geo_type", "geo_code", "reference_date", "dataset_id"],
                )
                total_rows += len(mapped)

            registry_row = {
                "dataset_id": dataset_id,
                "title": f"{entry.geography_level} {entry.geography_vintage} ({entry.coverage})",
                "description": entry.notes or entry.primary_source_notes,
                "geo_types": [entry.geography_level.upper()],
                "is_population": True,
                "updated_at": datetime.utcnow().isoformat() + "Z",
            }
            client.upsert(f"{prefix}_dataset_registry", [registry_row], conflict_columns=["dataset_id"])

            if mapped:
                last_reference_date = max(row["reference_date"] for row in mapped)
                checkpoint_row = {
                    "dataset_id": dataset_id,
                    "geo_type": entry.geography_level.upper(),
                    "last_reference_date": last_reference_date,
                    "updated_at": datetime.utcnow().isoformat() + "Z",
                }
                client.upsert(
                    f"{prefix}_ingest_checkpoints",
                    [checkpoint_row],
                    conflict_columns=["dataset_id", "geo_type"],
                )
            complete_ingest_run(client, f"{prefix}_ingest_runs", run_id, "completed", len(mapped))
        except Exception as exc:
            skipped.append(f"{dataset_id}: {exc}")
            complete_ingest_run(client, f"{prefix}_ingest_runs", run_id, "failed", 0)

    return total_rows, skipped
