# Supabase secrets

Use these exact secret names in GitHub and local environments:

- `SUPABASE_URL`
- `SUPABASE_PROJECT_REF`
- `SUPABASE_PUBLISHABLE_DEFAULT_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_ANON_JWT`

## Rotation steps

1. Supabase Dashboard -> Settings -> API -> regenerate anon and service role keys.
2. Supabase Dashboard -> Account Settings -> Access Tokens -> revoke and create a new token.
3. Update your environment variables and GitHub Actions secrets with the new values.

## GitHub Secrets for edge deploy

Required for `.github/workflows/supabase_edge_deploy.yml`:

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_REF`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional (passed through to the function):

- `NOMIS_BASE_URL`
- `NOMIS_USER`
- `NOMIS_API_KEY`
- `NOMIS_DATASET_IDS` (comma-separated)
