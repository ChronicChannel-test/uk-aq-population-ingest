GEO_TYPES = {
    "OA",
    "LSOA",
    "DZ",
    "SA",
    "MSOA",
    "IZ",
    "SOA",
    "PCON",
    "LAD",
}


def normalize_geo_type(value: str) -> str:
    return value.strip().upper()


def is_supported_geo_type(value: str) -> bool:
    return normalize_geo_type(value) in GEO_TYPES
