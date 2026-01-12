import argparse
import csv
import io
import json
from pathlib import Path

import requests

from nomis_api.config import get_settings


DEFAULT_DATASET = "NM_1_1"
DEFAULT_PARAMS = {
    "geography": "2038432081",
    "sex": "7",
    "item": "1",
    "measures": "20100",
    "time": "latest",
}


def load_params(args: argparse.Namespace) -> tuple[str, dict]:
    if args.config:
        payload = json.loads(Path(args.config).read_text())
        if not payload:
            raise ValueError("Config file is empty.")
        entry = payload[0]
        dataset_id = entry.get("dataset_id") or DEFAULT_DATASET
        params = dict(entry.get("params") or {})
        if not params:
            raise ValueError("Config entry is missing params for a Nomis request.")
        return dataset_id, params
    if args.params_file:
        dataset_id = args.dataset
        params = json.loads(Path(args.params_file).read_text())
        return dataset_id, params
    if args.params:
        dataset_id = args.dataset
        params = json.loads(args.params)
        return dataset_id, params
    return DEFAULT_DATASET, dict(DEFAULT_PARAMS)


def fetch_csv(base_url: str, dataset_id: str, params: dict, user: str | None, api_key: str | None) -> requests.Response:
    final_params = dict(params)
    if user:
        final_params["uid"] = user
    if api_key:
        final_params["apikey"] = api_key
    url = f"{base_url.rstrip('/')}/dataset/{dataset_id}.csv"
    response = requests.get(url, params=final_params, timeout=60)
    return response


def summarize(label: str, response: requests.Response) -> None:
    content_type = response.headers.get("content-type", "")
    body = response.text
    first_line = body.splitlines()[0] if body else ""
    print(f"{label}: status={response.status_code} content_type={content_type} bytes={len(body)}")
    if first_line:
        print(f"{label}: first_line={first_line[:200]}")
    if "<html" in body[:200].lower():
        print(f"{label}: warning=html_response")
    elif body:
        reader = csv.DictReader(io.StringIO(body))
        if not reader.fieldnames:
            print(f"{label}: warning=no_csv_headers")


def main() -> None:
    parser = argparse.ArgumentParser(description="Check Nomis UID/API key behavior against a dataset.")
    parser.add_argument("--dataset", default=DEFAULT_DATASET, help="Nomis dataset ID.")
    parser.add_argument("--params", help="JSON string of Nomis query params.")
    parser.add_argument(
        "--params-file",
        type=Path,
        help="Path to a JSON file containing Nomis query params.",
    )
    parser.add_argument(
        "--config",
        type=Path,
        help="Path to a Nomis ingest config (uses the first entry's dataset_id/params).",
    )
    args = parser.parse_args()

    dataset_id, params = load_params(args)
    settings = get_settings()

    if not settings.nomis_user or not settings.nomis_api_key:
        print("NOMIS_USER or NOMIS_API_KEY not set. Running anonymous check only.")

    anon_response = fetch_csv(settings.nomis_base_url, dataset_id, params, None, None)
    summarize("anonymous", anon_response)

    if settings.nomis_user and settings.nomis_api_key:
        cred_response = fetch_csv(
            settings.nomis_base_url, dataset_id, params, settings.nomis_user, settings.nomis_api_key
        )
        summarize("with_credentials", cred_response)
        if cred_response.ok and not cred_response.text.strip():
            print(
                "with_credentials: warning=empty_body (check Nomis key/signature or try anonymous access)"
            )


if __name__ == "__main__":
    main()
