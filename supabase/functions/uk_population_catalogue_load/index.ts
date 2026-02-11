import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import "../_shared/fetch_egress_patch.ts";

import { assignSourcePrefix, parseCatalogueCsv } from "../_shared/uk_population.ts";

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
};

const getEnv = (key: string, fallbackKey?: string) =>
  Deno.env.get(key) ?? (fallbackKey ? Deno.env.get(fallbackKey) : undefined);

const parseBoolean = (value: string | null | undefined, fallback: boolean) => {
  if (!value) {
    return fallback;
  }
  return ["true", "1", "yes", "y"].includes(value.toLowerCase());
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

    const catalogueUrl = getEnv("UK_POPULATION_CATALOGUE_URL");
    if (!catalogueUrl) {
      return new Response(
        JSON.stringify({ error: "Missing UK_POPULATION_CATALOGUE_URL." }),
        { status: 500, headers: jsonHeaders },
      );
    }

    const url = new URL(req.url);
    const replace = parseBoolean(
      url.searchParams.get("replace"),
      parseBoolean(getEnv("UK_POPULATION_CATALOGUE_REPLACE"), true),
    );

    const catalogueResponse = await fetch(catalogueUrl);
    if (!catalogueResponse.ok) {
      throw new Error(`Catalogue request failed (${catalogueResponse.status}).`);
    }
    const csvText = await catalogueResponse.text();
    const entries = parseCatalogueCsv(csvText);

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const tables: Record<string, string> = {
      nomis: "nomis_geography_catalogue",
      nrs: "nrs_geography_catalogue",
      nisra: "nisra_geography_catalogue",
    };

    if (replace) {
      for (const table of Object.values(tables)) {
        const { error } = await supabase.from(table).delete().gt("id", 0);
        if (error) {
          throw new Error(error.message);
        }
      }
    }

    const grouped: Record<string, Record<string, unknown>[]> = {
      nomis: [],
      nrs: [],
      nisra: [],
    };

    for (const entry of entries) {
      const prefix = assignSourcePrefix(entry);
      grouped[prefix].push(entry);
    }

    const inserted: Record<string, number> = {};
    for (const [prefix, rows] of Object.entries(grouped)) {
      if (!rows.length) {
        inserted[prefix] = 0;
        continue;
      }
      const table = tables[prefix];
      const { error } = await supabase.from(table).insert(rows);
      if (error) {
        throw new Error(error.message);
      }
      inserted[prefix] = rows.length;
    }

    return new Response(
      JSON.stringify(
        {
          loaded_at: new Date().toISOString(),
          catalogue_url: catalogueUrl,
          replace,
          inserted,
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
