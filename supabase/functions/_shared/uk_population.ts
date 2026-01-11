import Papa from "https://esm.sh/papaparse@5.4.1?target=deno";
import * as XLSX from "https://esm.sh/xlsx@0.18.5?target=deno";

export type CatalogueEntry = {
  geography_level: string;
  geography_vintage: string;
  coverage: string;
  nomis_dataset_api_ref: string | null;
  nomis_dataset_keyfamily_id: string | null;
  nomis_geography_type_code: string | null;
  typical_update_cycle: string | null;
  latest_reference_period_on_nomis: string | null;
  next_release_note: string | null;
  notes: string | null;
  primary_source_org: string | null;
  primary_source_dataset_page: string | null;
  primary_source_download_csv: string | null;
  primary_source_download_xlsx: string | null;
  primary_source_api_example: string | null;
  primary_source_years_available: string | null;
  primary_source_update_frequency: string | null;
  primary_source_notes: string | null;
};

export type IngestOverride = {
  dataset_id: string;
  source_url?: string | null;
  format?: string | null;
  geo_code_column?: string | null;
  time_column?: string | null;
  value_column?: string | null;
  measure_column?: string | null;
  jsonstat_geo_dimension?: string | null;
  jsonstat_time_dimension?: string | null;
  jsonstat_value_dimension?: string | null;
};

const normalizeValue = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  const text = String(value).trim();
  return text.length > 0 ? text : null;
};

export const normalizeCatalogueEntry = (row: Record<string, unknown>): CatalogueEntry => {
  const geography_level = normalizeValue(row.geography_level);
  const geography_vintage = normalizeValue(row.geography_vintage);
  const coverage = normalizeValue(row.coverage);
  if (!geography_level || !geography_vintage || !coverage) {
    throw new Error("Catalogue row missing required fields.");
  }
  return {
    geography_level,
    geography_vintage,
    coverage,
    nomis_dataset_api_ref: normalizeValue(row.nomis_dataset_api_ref),
    nomis_dataset_keyfamily_id: normalizeValue(row.nomis_dataset_keyfamily_id),
    nomis_geography_type_code: normalizeValue(row.nomis_geography_type_code),
    typical_update_cycle: normalizeValue(row.typical_update_cycle),
    latest_reference_period_on_nomis: normalizeValue(row.latest_reference_period_on_nomis),
    next_release_note: normalizeValue(row.next_release_note),
    notes: normalizeValue(row.notes),
    primary_source_org: normalizeValue(row.primary_source_org),
    primary_source_dataset_page: normalizeValue(row.primary_source_dataset_page),
    primary_source_download_csv: normalizeValue(row.primary_source_download_csv),
    primary_source_download_xlsx: normalizeValue(row.primary_source_download_xlsx),
    primary_source_api_example: normalizeValue(row.primary_source_api_example),
    primary_source_years_available: normalizeValue(row.primary_source_years_available),
    primary_source_update_frequency: normalizeValue(row.primary_source_update_frequency),
    primary_source_notes: normalizeValue(row.primary_source_notes),
  };
};

export const parseCatalogueCsv = (csvText: string): CatalogueEntry[] => {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });
  if (parsed.errors?.length) {
    const message = parsed.errors.map((err) => err.message).join("; ");
    throw new Error(`Catalogue CSV parse failed: ${message}`);
  }
  return parsed.data.map((row) => normalizeCatalogueEntry(row));
};

export const assignSourcePrefix = (entry: CatalogueEntry): "nomis" | "nrs" | "nisra" => {
  if (entry.nomis_dataset_api_ref || entry.nomis_dataset_keyfamily_id || entry.nomis_geography_type_code) {
    return "nomis";
  }
  const coverage = entry.coverage.toLowerCase();
  if (coverage.includes("scotland")) {
    return "nrs";
  }
  if (coverage.includes("northern ireland")) {
    return "nisra";
  }
  if (coverage.includes("england") || coverage.includes("wales")) {
    return "nomis";
  }
  return "nomis";
};

export const slugify = (value: string): string => {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
};

export const buildDatasetId = (prefix: string, entry: CatalogueEntry): string => {
  const parts = [
    prefix,
    slugify(entry.geography_level),
    slugify(entry.geography_vintage),
    slugify(entry.coverage),
  ].filter((part) => part.length > 0);
  return parts.join("_");
};

export const pickSourceUrl = (entry: CatalogueEntry): string | null => {
  return entry.primary_source_download_csv ??
    entry.primary_source_download_xlsx ??
    entry.primary_source_api_example ??
    null;
};

export const inferFormat = (url: string): string => {
  const lowered = url.toLowerCase();
  if (lowered.endsWith(".csv")) {
    return "csv";
  }
  if (lowered.endsWith(".xlsx") || lowered.endsWith(".xls")) {
    return "xlsx";
  }
  if (lowered.includes(".json")) {
    return "jsonstat";
  }
  return "csv";
};

export const inferColumn = (headers: string[], candidates: string[]): string | null => {
  const lowerHeaders = new Map(headers.map((header) => [header.toLowerCase(), header]));
  for (const candidate of candidates) {
    const match = lowerHeaders.get(candidate.toLowerCase());
    if (match) {
      return match;
    }
  }
  for (const header of headers) {
    const lower = header.toLowerCase();
    for (const candidate of candidates) {
      if (lower.includes(candidate.toLowerCase())) {
        return header;
      }
    }
  }
  return null;
};

export const parseReferenceDateFlexible = (value: unknown): string => {
  const text = String(value ?? "").trim();
  if (/^\d{4}$/.test(text)) {
    return `${text}-06-30`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }
  const match = text.match(/(19|20)\d{2}/);
  if (match) {
    return `${match[0]}-06-30`;
  }
  throw new Error(`Unsupported time value: ${text}`);
};

export const fetchCsvRows = async (url: string): Promise<Record<string, unknown>[]> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`CSV request failed (${response.status}): ${url}`);
  }
  const text = await response.text();
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });
  if (parsed.errors?.length) {
    const message = parsed.errors.map((err) => err.message).join("; ");
    throw new Error(`CSV parse failed: ${message}`);
  }
  return parsed.data;
};

export const fetchXlsxRows = async (url: string): Promise<Record<string, unknown>[]> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`XLSX request failed (${response.status}): ${url}`);
  }
  const buffer = await response.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return [];
  }
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(sheet, { defval: null });
};

const buildCategory = (index: Record<string, number> | string[]) => {
  if (Array.isArray(index)) {
    const map = new Map<string, number>();
    index.forEach((key, idx) => map.set(key, idx));
    return { keys: index, indexOf: (key: string) => map.get(key) ?? -1 };
  }
  const entries = Object.entries(index).sort((a, b) => a[1] - b[1]);
  const keys = entries.map(([key]) => key);
  const map = new Map(entries);
  return { keys, indexOf: (key: string) => map.get(key) ?? -1 };
};

export const fetchJsonStatRows = async (
  url: string,
  geoDimension: string,
  timeDimension: string,
  valueDimension?: string | null,
): Promise<Record<string, unknown>[]> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`JSON-stat request failed (${response.status}): ${url}`);
  }
  const payload = await response.json();
  const dataset = payload?.dataset ?? payload;
  const dimension = dataset?.dimension ?? {};
  const ids = dataset?.id ?? [];
  const sizes = dataset?.size ?? [];
  const values = dataset?.value ?? [];

  const idToPos = new Map<string, number>();
  ids.forEach((id: string, idx: number) => idToPos.set(id, idx));
  const geoPos = idToPos.get(geoDimension);
  const timePos = idToPos.get(timeDimension);
  const valuePos = valueDimension ? idToPos.get(valueDimension) : undefined;

  if (geoPos === undefined || timePos === undefined) {
    throw new Error("JSON-stat dimensions not found.");
  }

  const geoCats = buildCategory(dimension[geoDimension]?.category?.index ?? {});
  const timeCats = buildCategory(dimension[timeDimension]?.category?.index ?? {});
  const valueCats = valueDimension
    ? buildCategory(dimension[valueDimension]?.category?.index ?? {})
    : { keys: [null], indexOf: () => 0 };

  const rows: Record<string, unknown>[] = [];
  for (const geo of geoCats.keys) {
    for (const time of timeCats.keys) {
      for (const valueKey of valueCats.keys) {
        const coords = new Array(ids.length).fill(0);
        coords[geoPos] = geoCats.indexOf(geo);
        coords[timePos] = timeCats.indexOf(time);
        if (valuePos !== undefined && valueDimension) {
          coords[valuePos] = valueCats.indexOf(String(valueKey));
        }
        let index = 0;
        for (let i = 0; i < sizes.length; i += 1) {
          index = index * sizes[i] + coords[i];
        }
        const value = values[index];
        const row: Record<string, unknown> = {
          [geoDimension]: geo,
          [timeDimension]: time,
          value,
        };
        if (valuePos !== undefined && valueDimension) {
          row[valueDimension] = valueKey;
        }
        rows.push(row);
      }
    }
  }
  return rows;
};

export const mapRows = (
  rows: Record<string, unknown>[],
  geoType: string,
  datasetId: string,
  geoCodeColumn: string,
  timeColumn: string,
  valueColumn: string,
  measureColumn?: string | null,
): Record<string, unknown>[] => {
  return rows.map((row) => {
    const referenceDate = parseReferenceDateFlexible(row[timeColumn]);
    const populationValue = Number(row[valueColumn]);
    if (!Number.isFinite(populationValue)) {
      throw new Error(`Invalid population value: ${row[valueColumn]}`);
    }
    return {
      geo_type: geoType.trim().toUpperCase(),
      geo_code: String(row[geoCodeColumn] ?? "").trim(),
      reference_date: referenceDate,
      population_value: Math.trunc(populationValue),
      dataset_id: datasetId,
      measure: measureColumn ? row[measureColumn] ?? null : null,
    };
  });
};
