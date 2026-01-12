import argparse
from pathlib import Path

from nomis_api.config import get_settings
from nomis_api.supabase import SupabaseClient
from nomis_api.uk_population_ingest import ingest_external_sources


def main() -> None:
    parser = argparse.ArgumentParser(description="Ingest NISRA population datasets.")
    parser.add_argument(
        "--catalogue",
        type=Path,
        default=Path("data/uk_population_geography_catalogue.csv"),
        help="Path to the geography catalogue CSV.",
    )
    parser.add_argument(
        "--config",
        type=Path,
        default=Path("data/uk_population_ingest_config.json"),
        help="Path to the ingest config JSON.",
    )
    args = parser.parse_args()

    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY/SUPABASE_SERVICE_KEY are required")

    client = SupabaseClient(settings.supabase_url, settings.supabase_service_key)
    total_rows, skipped = ingest_external_sources("nisra", args.catalogue, args.config, client)
    print(f"Total rows ingested: {total_rows}")
    if skipped:
        print("Skipped datasets:")
        for item in skipped:
            print(f"- {item}")


if __name__ == "__main__":
    main()
