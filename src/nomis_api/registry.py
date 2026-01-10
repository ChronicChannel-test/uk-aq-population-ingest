from dataclasses import asdict, dataclass
import json
from pathlib import Path
from typing import Iterable


@dataclass(frozen=True)
class DatasetRegistryEntry:
    dataset_id: str
    title: str
    description: str | None
    geo_types: list[str]
    is_population: bool


def write_registry(path: Path, entries: Iterable[DatasetRegistryEntry]) -> None:
    payload = [asdict(entry) for entry in entries]
    path.write_text(json.dumps(payload, indent=2, sort_keys=True))


def read_registry(path: Path) -> list[DatasetRegistryEntry]:
    data = json.loads(path.read_text())
    return [DatasetRegistryEntry(**item) for item in data]
