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
