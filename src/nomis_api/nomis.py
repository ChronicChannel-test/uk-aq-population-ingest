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

    def _get_auth_params(self) -> dict:
        params = {}
        if self.user:
            params["uid"] = self.user
        if self.api_key:
            params["apikey"] = self.api_key
        return params

    def list_datasets(self) -> list[NomisDataset]:
        url = f"{self.base_url}/dataset.json"
        response = requests.get(url, params=self._get_auth_params(), timeout=60)
        response.raise_for_status()
        if self._looks_like_html(response):
            raise RuntimeError(f"Nomis API returned HTML for {url}. Check authentication.")
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
        response = requests.get(url, params=self._get_auth_params(), timeout=60)
        response.raise_for_status()
        if self._looks_like_html(response):
            raise RuntimeError(f"Nomis API returned HTML for {url}. Check authentication.")
        return response.json()

    def get_geography_codelist(self, dataset_id: str) -> list[dict]:
        url = f"{self.base_url}/dataset/{dataset_id}/geography.json"
        response = requests.get(url, params=self._get_auth_params(), timeout=60)
        response.raise_for_status()
        if self._looks_like_html(response):
            raise RuntimeError(f"Nomis API returned HTML for {url}. Check authentication.")
        payload = response.json()
        return payload.get("geographies", [])

    def fetch_dataset_rows(self, dataset_id: str, params: dict) -> Iterable[dict]:
        url = f"{self.base_url}/dataset/{dataset_id}.csv"
        base_params = {**self._get_auth_params(), **params}

        response = requests.get(url, params=base_params, timeout=300)
        response.raise_for_status()

        used_credentials = "uid" in base_params or "apikey" in base_params
        used_format = "format" in base_params
        if (used_credentials or used_format) and self._should_retry_anonymous(response):
            fallback_params = dict(params)
            fallback_params.pop("uid", None)
            fallback_params.pop("apikey", None)
            fallback_params.pop("format", None)
            response = requests.get(url, params=fallback_params, timeout=300)
            response.raise_for_status()

        if self._looks_like_html(response):
            raise RuntimeError(f"Nomis API returned HTML for dataset {dataset_id}. Check dataset ID/params.")
        if not response.text.strip():
            raise RuntimeError(f"Nomis API returned an empty CSV for dataset {dataset_id}.")

        reader = csv.DictReader(io.StringIO(response.text))
        return list(reader)

    @staticmethod
    def _looks_like_html(response: requests.Response) -> bool:
        content_type = (response.headers.get("content-type") or "").lower()
        if "text/html" in content_type:
            return True
        text = response.text.lstrip().lower()
        return text.startswith("<!doctype html") or text.startswith("<html")

    @classmethod
    def _should_retry_anonymous(cls, response: requests.Response) -> bool:
        if cls._looks_like_html(response):
            return True
        return not response.text.strip()
