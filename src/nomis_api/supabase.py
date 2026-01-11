from dataclasses import dataclass
from typing import Iterable
import requests


@dataclass(frozen=True)
class SupabaseClient:
    base_url: str
    service_key: str

    def upsert(self, table: str, rows: Iterable[dict], conflict_columns: list[str]) -> None:
        url = f"{self.base_url.rstrip('/')}/rest/v1/{table}"
        headers = {
            "apikey": self.service_key,
            "Authorization": f"Bearer {self.service_key}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates",
        }
        params = {"on_conflict": ",".join(conflict_columns)}
        response = requests.post(url, headers=headers, params=params, json=list(rows), timeout=120)
        response.raise_for_status()

    def insert(self, table: str, rows: Iterable[dict], return_rows: bool = False) -> list[dict]:
        url = f"{self.base_url.rstrip('/')}/rest/v1/{table}"
        headers = {
            "apikey": self.service_key,
            "Authorization": f"Bearer {self.service_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation" if return_rows else "return=minimal",
        }
        response = requests.post(url, headers=headers, json=list(rows), timeout=120)
        response.raise_for_status()
        return response.json() if return_rows else []

    def update(self, table: str, filters: dict, payload: dict) -> None:
        url = f"{self.base_url.rstrip('/')}/rest/v1/{table}"
        headers = {
            "apikey": self.service_key,
            "Authorization": f"Bearer {self.service_key}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        }
        response = requests.patch(url, headers=headers, params=filters, json=payload, timeout=120)
        response.raise_for_status()

    def delete(self, table: str, filters: dict) -> None:
        url = f"{self.base_url.rstrip('/')}/rest/v1/{table}"
        headers = {
            "apikey": self.service_key,
            "Authorization": f"Bearer {self.service_key}",
            "Prefer": "return=minimal",
        }
        response = requests.delete(url, headers=headers, params=filters, timeout=120)
        response.raise_for_status()
