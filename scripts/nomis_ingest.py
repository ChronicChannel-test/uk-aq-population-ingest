import argparse
from pathlib import Path

from nomis_api.config import get_settings
from nomis_api.ingest import ingest_population_dataset, load_ingest_configs
from nomis_api.nomis import NomisClient
from nomis_api.supabase import SupabaseClient


def main() -> None:
    parser = argparse.ArgumentParser(description="Ingest Nomis population datasets.")
    parser.add_argument(
        "--config",
        type=Path,
        default=Path("data/nomis_population_config.json"),
        help="Path to the dataset ingest config JSON.",
    )
    parser.add_argument(
        "--table",
        default="nomis_population_observations",
        help="Supabase table name for population observations.",
    )
    args = parser.parse_args()

    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_key:
        raise RuntimeError("SUPABASE_URL and SB_SECRET_KEY are required")

    nomis_client = NomisClient(settings.nomis_base_url, settings.nomis_user, settings.nomis_api_key)
    supabase_client = SupabaseClient(settings.supabase_url, settings.supabase_service_key)

    configs = load_ingest_configs(args.config)
    total_rows = 0
    for config in configs:
        count = ingest_population_dataset(nomis_client, supabase_client, config, args.table)
        total_rows += count
        print(f"Ingested {count} rows for {config.dataset_id} ({config.geo_type})")
    print(f"Total rows ingested: {total_rows}")


if __name__ == "__main__":
    main()
