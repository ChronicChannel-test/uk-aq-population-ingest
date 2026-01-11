# uk-population-ingest

Lightweight ingestion tools for UK population datasets across Nomis, NRS, and NISRA, storing outputs in Supabase with source-prefixed tables.

## Quick start

1. Create tables in Supabase using `sql/uk_population_schema.sql`.
2. Set environment variables:
   - `NOMIS_BASE_URL` (default: `https://www.nomisweb.co.uk/api/v01`)
   - `NOMIS_USER` (optional)
   - `NOMIS_API_KEY` (optional)
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
3. Discover population datasets:
   ```bash
   python scripts/nomis_discover.py
   ```
4. Configure ingest mappings in `data/nomis_population_config.json`.
5. Ingest data:
   ```bash
   python scripts/nomis_ingest.py
   ```

See `docs/` for discovery endpoints and schema details.
