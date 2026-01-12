from dataclasses import dataclass
import os


@dataclass(frozen=True)
class Settings:
    nomis_base_url: str
    nomis_user: str | None
    nomis_api_key: str | None
    supabase_url: str | None
    supabase_service_key: str | None


def get_settings() -> Settings:
    return Settings(
        nomis_base_url=os.getenv("NOMIS_BASE_URL", "https://www.nomisweb.co.uk/api/v01"),
        nomis_user=os.getenv("NOMIS_USER"),
        nomis_api_key=os.getenv("NOMIS_API_KEY"),
        supabase_url=os.getenv("SUPABASE_URL"),
        supabase_service_key=os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY"),
    )
