import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import "../_shared/fetch_egress_patch.ts";

import {
  buildDatasetId,
  fetchCsvRows,
  fetchJsonStatRows,
  fetchXlsxRows,
  inferColumn,
  inferFormat,
  mapRows,
  normalizeCatalogueEntry,
  pickSourceUrl,
  type CatalogueEntry,
  type IngestOverride,
} from "../_shared/uk_population.ts";

type IngestConfig = {
  column_candidates: Record<string, string[]>;
  overrides: IngestOverride[];
};

type SupabaseClientLike = ReturnType<typeof createClient<any, "public", any>>;

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

const defaultColumnCandidates = {
  geo_code: ["area code", "code", "geography code", "area_code", "gss code"],
  time: ["year", "date", "time", "reference_date"],
  value: ["population", "value", "all persons", "all people", "total"],
  measure: ["measure", "sex", "age"],
};

const loadConfig = async (): Promise<IngestConfig> => {
  const configUrl = getEnv("UK_POPULATION_INGEST_CONFIG_URL");
  const configRaw = getEnv("UK_POPULATION_INGEST_CONFIG");
  let payload: Partial<IngestConfig> = {};
  if (configUrl) {
    const response = await fetch(configUrl);
    if (!response.ok) {
      throw new Error(`Config request failed (${response.status}).`);
    }
    payload = await response.json();
  } else if (configRaw) {
    payload = JSON.parse(configRaw);
  }
  return {
    column_candidates: {
      ...defaultColumnCandidates,
      ...(payload.column_candidates ?? {}),
    },
    overrides: Array.isArray(payload.overrides) ? payload.overrides : [],
  };
};

const buildOverrideMap = (overrides: IngestOverride[]) => {
  const map = new Map<string, IngestOverride>();
  for (const override of overrides) {
    if (override?.dataset_id) {
      map.set(override.dataset_id, override);
    }
  }
  return map;
};

const startIngestRun = async (
  supabase: SupabaseClientLike,
  table: string,
  datasetId: string,
): Promise<number | null> => {
  const { data, error } = await supabase
    .from(table)
    .insert({ status: "running", row_count: 0, notes: `dataset_id=${datasetId}` })
    .select("id");
  if (error) {
    throw new Error(error.message);
  }
  const rawId = data?.[0]?.id;
  const parsedId = Number(rawId);
  return Number.isFinite(parsedId) ? parsedId : null;
};

const completeIngestRun = async (
  supabase: SupabaseClientLike,
  table: string,
  runId: number | null,
  status: string,
  rowCount: number,
) => {
  if (!runId) {
    return;
  }
  const { error } = await supabase
    .from(table)
    .update({
      status,
      row_count: rowCount,
      completed_at: new Date().toISOString(),
    })
    .eq("id", runId);
  if (error) {
    throw new Error(error.message);
  }
};

const upsertInChunks = async (
  supabase: SupabaseClientLike,
  table: string,
  rows: Record<string, unknown>[],
  onConflict: string,
  batchSize: number,
) => {
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const { error } = await supabase
      .from(table)
      .upsert(chunk, { onConflict });
    if (error) {
      throw new Error(error.message);
    }
  }
};

const ingestEntry = async (
  supabase: SupabaseClientLike,
  prefix: string,
  entry: CatalogueEntry,
  config: IngestConfig,
  overrides: Map<string, IngestOverride>,
  batchSize: number,
) => {
  const datasetId = buildDatasetId(prefix, entry);
  const override = overrides.get(datasetId);
  const sourceUrl = override?.source_url ?? pickSourceUrl(entry);
  if (!sourceUrl) {
    return { status: "skipped", datasetId, reason: "no source URL" };
  }

  const sourceFormat = override?.format ?? inferFormat(sourceUrl);
  const runId = await startIngestRun(supabase, `${prefix}_ingest_runs`, datasetId);

  try {
    let rows: Record<string, unknown>[];
    if (sourceFormat === "csv") {
      rows = await fetchCsvRows(sourceUrl);
    } else if (sourceFormat === "xlsx") {
      rows = await fetchXlsxRows(sourceUrl);
    } else if (sourceFormat === "jsonstat") {
      if (!override?.jsonstat_geo_dimension || !override?.jsonstat_time_dimension) {
        await completeIngestRun(
          supabase,
          `${prefix}_ingest_runs`,
          runId,
          "skipped",
          0,
        );
        return { status: "skipped", datasetId, reason: "missing JSON-stat dimensions" };
      }
      rows = await fetchJsonStatRows(
        sourceUrl,
        override.jsonstat_geo_dimension,
        override.jsonstat_time_dimension,
        override.jsonstat_value_dimension,
      );
    } else {
      await completeIngestRun(supabase, `${prefix}_ingest_runs`, runId, "skipped", 0);
      return { status: "skipped", datasetId, reason: `unsupported format ${sourceFormat}` };
    }

    if (!rows.length) {
      await completeIngestRun(supabase, `${prefix}_ingest_runs`, runId, "skipped", 0);
      return { status: "skipped", datasetId, reason: "no rows" };
    }

    const headers = Object.keys(rows[0]);
    const geoCodeColumn = override?.geo_code_column ??
      inferColumn(headers, config.column_candidates.geo_code ?? []);
    const timeColumn = override?.time_column ??
      inferColumn(headers, config.column_candidates.time ?? []);
    const valueColumn = override?.value_column ??
      inferColumn(headers, config.column_candidates.value ?? []);
    const measureColumn = override?.measure_column ??
      inferColumn(headers, config.column_candidates.measure ?? []);

    if (!geoCodeColumn || !timeColumn || !valueColumn) {
      await completeIngestRun(supabase, `${prefix}_ingest_runs`, runId, "skipped", 0);
      return { status: "skipped", datasetId, reason: "missing column mapping" };
    }

    const mapped = mapRows(
      rows,
      entry.geography_level,
      datasetId,
      geoCodeColumn,
      timeColumn,
      valueColumn,
      measureColumn,
    );

    if (mapped.length) {
      await upsertInChunks(
        supabase,
        `${prefix}_population_observations`,
        mapped,
        "geo_type,geo_code,reference_date,dataset_id",
        batchSize,
      );
    }

    const registryPayload = {
      dataset_id: datasetId,
      title: `${entry.geography_level} ${entry.geography_vintage} (${entry.coverage})`,
      description: entry.notes ?? entry.primary_source_notes ?? null,
      geo_types: [entry.geography_level.toUpperCase()],
      is_population: true,
      updated_at: new Date().toISOString(),
    };
    const registryResponse = await supabase
      .from(`${prefix}_dataset_registry`)
      .upsert(registryPayload, { onConflict: "dataset_id" });
    if (registryResponse.error) {
      throw new Error(registryResponse.error.message);
    }

    if (mapped.length) {
      const lastReferenceDate = mapped.reduce((latest, row) => {
        const value = String(row.reference_date);
        return value > latest ? value : latest;
      }, String(mapped[0].reference_date));

      const checkpointPayload = {
        dataset_id: datasetId,
        geo_type: entry.geography_level.toUpperCase(),
        last_reference_date: lastReferenceDate,
        updated_at: new Date().toISOString(),
      };
      const checkpointResponse = await supabase
        .from(`${prefix}_ingest_checkpoints`)
        .upsert(checkpointPayload, { onConflict: "dataset_id,geo_type" });
      if (checkpointResponse.error) {
        throw new Error(checkpointResponse.error.message);
      }
    }

    await completeIngestRun(
      supabase,
      `${prefix}_ingest_runs`,
      runId,
      "completed",
      mapped.length,
    );
    return { status: "completed", datasetId, rowCount: mapped.length };
  } catch (error) {
    await completeIngestRun(supabase, `${prefix}_ingest_runs`, runId, "failed", 0);
    const message = error instanceof Error ? error.message : String(error);
    return { status: "failed", datasetId, reason: message };
  }
};

serve(async (req) => {
  try {
    const supabaseUrl = getEnv("SUPABASE_URL");
    const supabaseServiceKey =
      getEnv("SB_SECRET_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({
          error:
            "Missing SUPABASE_URL and SB_SECRET_KEY.",
        }),
        { status: 500, headers: jsonHeaders },
      );
    }

    const url = new URL(req.url);
    const prefixes = parseCsv(url.searchParams.get("prefixes"))
      .map((value) => value.toLowerCase())
      .filter((value) => value === "nrs" || value === "nisra");

    const selectedPrefixes = prefixes.length
      ? prefixes
      : parseCsv(getEnv("UK_POPULATION_PREFIXES"))
        .map((value) => value.toLowerCase())
        .filter((value) => value === "nrs" || value === "nisra");

    const ingestPrefixes = selectedPrefixes.length ? selectedPrefixes : ["nrs", "nisra"];
    const batchSize = Number(getEnv("UK_POPULATION_BATCH_SIZE") ?? 500);

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const config = await loadConfig();
    const overrides = buildOverrideMap(config.overrides);

    const summary: Record<string, unknown> = {};
    for (const prefix of ingestPrefixes) {
      const { data, error } = await supabase.from(`${prefix}_geography_catalogue`).select("*");
      if (error) {
        throw new Error(error.message);
      }
      const entries = (data ?? []).map((row) => normalizeCatalogueEntry(row));
      const results = [];
      let totalRows = 0;
      for (const entry of entries) {
        const result = await ingestEntry(
          supabase,
          prefix,
          entry,
          config,
          overrides,
          batchSize,
        );
        results.push(result);
        if (result.status === "completed") {
          totalRows += result.rowCount ?? 0;
        }
      }
      summary[prefix] = {
        datasets: results.length,
        rows: totalRows,
        results,
      };
    }

    return new Response(
      JSON.stringify(
        {
          ingested_at: new Date().toISOString(),
          prefixes: ingestPrefixes,
          summary,
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
