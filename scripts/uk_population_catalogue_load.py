import argparse
from pathlib import Path

from nomis_api.config import get_settings
from nomis_api.supabase import SupabaseClient
from nomis_api.uk_population import assign_source_prefix, load_catalogue


def main() -> None:
    parser = argparse.ArgumentParser(description="Load UK population geography catalogue.")
    parser.add_argument(
        "--csv",
        type=Path,
        default=Path("data/uk_population_geography_catalogue.csv"),
        help="Path to the geography catalogue CSV.",
    )
    parser.add_argument(
        "--replace",
        action="store_true",
        help="Delete existing catalogue rows before inserting.",
    )
    args = parser.parse_args()

    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY/SUPABASE_SERVICE_KEY are required")

    supabase_client = SupabaseClient(settings.supabase_url, settings.supabase_service_key)
    entries = load_catalogue(args.csv)

    tables = {
        "nomis": "nomis_geography_catalogue",
        "nrs": "nrs_geography_catalogue",
        "nisra": "nisra_geography_catalogue",
    }
    if args.replace:
        for table in tables.values():
            supabase_client.delete(table, {"id": "gt.0"})

    grouped: dict[str, list[dict]] = {key: [] for key in tables}
    for entry in entries:
        prefix = assign_source_prefix(entry)
        grouped[prefix].append(entry.__dict__)

    for prefix, rows in grouped.items():
        if not rows:
            continue
        table = tables[prefix]
        supabase_client.insert(table, rows)
        print(f"Inserted {len(rows)} rows into {table}.")


if __name__ == "__main__":
    main()
