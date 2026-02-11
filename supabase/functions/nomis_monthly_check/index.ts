import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import "../_shared/fetch_egress_patch.ts";

type NomisDataset = {
  dataset_id: string;
  title: string;
  description?: string | null;
};

type RegistryEntry = {
  dataset_id: string;
  title: string;
  description: string | null;
  geo_types: string[];
  is_population: boolean;
};

const POPULATION_REGEX = /population/i;
const GEO_TYPES = new Set([
  "OA",
  "LSOA",
  "DZ",
  "SA",
  "MSOA",
  "IZ",
  "SOA",
  "PCON",
  "LAD",
]);

const DEFAULT_BASE_URL = "https://www.nomisweb.co.uk/api/v01";

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
};

const getEnv = (key: string, fallbackKey?: string) =>
  Deno.env.get(key) ?? (fallbackKey ? Deno.env.get(fallbackKey) : undefined);

const parseCsv = (value?: string | null) =>
  (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

const normalizeGeoType = (value: string) => value.trim().toUpperCase();

const extractGeoTypes = (geographies: Array<Record<string, unknown>>) => {
  const results: string[] = [];
  for (const entry of geographies) {
    const raw =
      (entry.id as string | undefined) ??
      (entry.geography_code as string | undefined) ??
      "";
    const normalized = normalizeGeoType(raw);
    if (GEO_TYPES.has(normalized) && !results.includes(normalized)) {
      results.push(normalized);
    }
  }
  return results;
};

const fetchJson = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Nomis request failed (${response.status}): ${url}`);
  }
  return response.json();
};

const listDatasets = async (baseUrl: string): Promise<NomisDataset[]> => {
  const payload = await fetchJson(`${baseUrl}/dataset.json`);
  const datasets = Array.isArray(payload?.datasets) ? payload.datasets : [];
  return datasets.map((entry: Record<string, unknown>) => ({
    dataset_id: String(entry.id ?? ""),
    title: String(entry.title ?? ""),
    description: (entry.description as string | undefined) ?? null,
  }));
};

const listGeographies = async (baseUrl: string, datasetId: string) => {
  const payload = await fetchJson(`${baseUrl}/dataset/${datasetId}/geography.json`);
  return Array.isArray(payload?.geographies) ? payload.geographies : [];
};

const mapWithLimit = async <T, R>(
  items: T[],
  limit: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> => {
  const results: R[] = new Array(items.length);
  let index = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const current = index++;
      results[current] = await mapper(items[current]);
    }
  });
  await Promise.all(workers);
  return results;
};

const discoverPopulationDatasets = async (baseUrl: string): Promise<RegistryEntry[]> => {
  const datasets = await listDatasets(baseUrl);
  const populationDatasets = datasets.filter((dataset) => {
    if (POPULATION_REGEX.test(dataset.title)) {
      return true;
    }
    return dataset.description ? POPULATION_REGEX.test(dataset.description) : false;
  });

  const entries = await mapWithLimit(populationDatasets, 6, async (dataset) => {
    const geographies = await listGeographies(baseUrl, dataset.dataset_id);
    const geo_types = extractGeoTypes(geographies);
    if (geo_types.length === 0) {
      return null;
    }
    return {
      dataset_id: dataset.dataset_id,
      title: dataset.title,
      description: dataset.description ?? null,
      geo_types,
      is_population: true,
    };
  });

  return entries.filter((entry): entry is RegistryEntry => entry !== null);
};

serve(async (req) => {
  try {
    const supabaseUrl = getEnv("SUPABASE_URL");
    const supabaseServiceKey =
      getEnv("SUPABASE_SERVICE_ROLE_KEY") ?? getEnv("SUPABASE_SERVICE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({
          error:
            "Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY/SUPABASE_SERVICE_KEY.",
        }),
        { status: 500, headers: jsonHeaders },
      );
    }

    const baseUrl = getEnv("NOMIS_BASE_URL") ?? DEFAULT_BASE_URL;
    const trackedDatasetIds = parseCsv(getEnv("NOMIS_DATASET_IDS"));

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const existingResponse = await supabase
      .from("nomis_dataset_registry")
      .select("dataset_id");
    if (existingResponse.error) {
      throw new Error(existingResponse.error.message);
    }
    const existingIds = new Set(
      (existingResponse.data ?? []).map((row) => row.dataset_id as string),
    );

    const registryEntries = await discoverPopulationDatasets(baseUrl);

    const now = new Date().toISOString();
    const upsertPayload = registryEntries.map((entry) => ({
      ...entry,
      updated_at: now,
    }));

    if (upsertPayload.length > 0) {
      const upsertResponse = await supabase
        .from("nomis_dataset_registry")
        .upsert(upsertPayload, { onConflict: "dataset_id" });
      if (upsertResponse.error) {
        throw new Error(upsertResponse.error.message);
      }
    }

    const discoveredIds = registryEntries.map((entry) => String(entry.dataset_id));
    const newDatasetIds = discoveredIds.filter((id) => !existingIds.has(id));
    const trackedMissingFromDiscovery = trackedDatasetIds.filter(
      (id) => !discoveredIds.includes(id),
    );

    return new Response(
      JSON.stringify(
        {
          checked_at: now,
          base_url: baseUrl,
          registry_count: registryEntries.length,
          new_dataset_ids: newDatasetIds,
          tracked_dataset_ids: trackedDatasetIds,
          tracked_missing_from_discovery: trackedMissingFromDiscovery,
        },
        null,
        2,
      ),
      { status: 200, headers: jsonHeaders },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
});
