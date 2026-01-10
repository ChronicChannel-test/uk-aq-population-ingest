import argparse
from pathlib import Path

from nomis_api.config import get_settings
from nomis_api.discovery import discover_population_datasets
from nomis_api.nomis import NomisClient
from nomis_api.registry import write_registry


def main() -> None:
    parser = argparse.ArgumentParser(description="Discover Nomis population datasets.")
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("data/nomis_dataset_registry.json"),
        help="Path to write the registry JSON.",
    )
    args = parser.parse_args()

    settings = get_settings()
    client = NomisClient(settings.nomis_base_url, settings.nomis_user, settings.nomis_api_key)
    result = discover_population_datasets(client)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    write_registry(args.output, result.registry_entries)
    print(f"Wrote {len(result.registry_entries)} datasets to {args.output}")


if __name__ == "__main__":
    main()
