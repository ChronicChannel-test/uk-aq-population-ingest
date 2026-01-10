from dataclasses import dataclass
import re
from typing import Iterable

from nomis_api.geo import GEO_TYPES, normalize_geo_type
from nomis_api.nomis import NomisClient
from nomis_api.registry import DatasetRegistryEntry


POPULATION_REGEX = re.compile(r"population", re.IGNORECASE)


@dataclass(frozen=True)
class DiscoveryResult:
    registry_entries: list[DatasetRegistryEntry]


def is_population_dataset(title: str, description: str | None) -> bool:
    if POPULATION_REGEX.search(title):
        return True
    if description and POPULATION_REGEX.search(description):
        return True
    return False


def extract_geo_types(geographies: Iterable[dict]) -> list[str]:
    results = []
    for entry in geographies:
        code = entry.get("id") or entry.get("geography_code") or ""
        normalized = normalize_geo_type(code)
        if normalized in GEO_TYPES and normalized not in results:
            results.append(normalized)
    return results


def discover_population_datasets(client: NomisClient) -> DiscoveryResult:
    registry_entries: list[DatasetRegistryEntry] = []
    for dataset in client.list_datasets():
        if not is_population_dataset(dataset.title, dataset.description):
            continue
        geographies = client.get_geography_codelist(dataset.dataset_id)
        geo_types = extract_geo_types(geographies)
        if not geo_types:
            continue
        registry_entries.append(
            DatasetRegistryEntry(
                dataset_id=dataset.dataset_id,
                title=dataset.title,
                description=dataset.description,
                geo_types=geo_types,
                is_population=True,
            )
        )
    return DiscoveryResult(registry_entries=registry_entries)
