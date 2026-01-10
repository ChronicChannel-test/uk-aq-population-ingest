from dataclasses import dataclass
from typing import Iterable
import csv
import io

import requests


@dataclass(frozen=True)
class NomisDataset:
    dataset_id: str
    title: str
    description: str | None


class NomisClient:
    def __init__(self, base_url: str, user: str | None = None, api_key: str | None = None) -> None:
        self.base_url = base_url.rstrip("/")
        self.user = user
        self.api_key = api_key

    def list_datasets(self) -> list[NomisDataset]:
        url = f"{self.base_url}/dataset.json"
        response = requests.get(url, timeout=60)
        response.raise_for_status()
        payload = response.json()
        datasets = []
        for entry in payload.get("datasets", []):
            datasets.append(
                NomisDataset(
                    dataset_id=entry.get("id", ""),
                    title=entry.get("title", ""),
                    description=entry.get("description"),
                )
            )
        return datasets

    def get_dataset_metadata(self, dataset_id: str) -> dict:
        url = f"{self.base_url}/dataset/{dataset_id}.json"
        response = requests.get(url, timeout=60)
        response.raise_for_status()
        return response.json()

    def get_geography_codelist(self, dataset_id: str) -> list[dict]:
        url = f"{self.base_url}/dataset/{dataset_id}/geography.json"
        response = requests.get(url, timeout=60)
        response.raise_for_status()
        payload = response.json()
        return payload.get("geographies", [])

    def fetch_dataset_rows(self, dataset_id: str, params: dict) -> Iterable[dict]:
        base_params = dict(params)
        base_params.setdefault("format", "csv")
        if self.user:
            base_params.setdefault("uid", self.user)
        if self.api_key:
            base_params.setdefault("apikey", self.api_key)
        url = f"{self.base_url}/dataset/{dataset_id}.csv"
        response = requests.get(url, params=base_params, timeout=300)
        response.raise_for_status()
        reader = csv.DictReader(io.StringIO(response.text))
        return list(reader)
