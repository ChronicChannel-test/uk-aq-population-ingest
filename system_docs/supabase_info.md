# Supabase secrets

Use these exact secret names in GitHub and local environments:

- `SUPABASE_URL`
- `SUPABASE_PROJECT_REF`
- `SB_PUBLISHABLE_DEFAULT_KEY`
- `SB_SECRET_KEY`
- `SUPABASE_ACCESS_TOKEN`

## Rotation steps

1. Supabase Dashboard -> Settings -> API -> rotate API keys (publishable/secret as needed).
2. Supabase Dashboard -> Account Settings -> Access Tokens -> revoke and create a new token.
3. Update your environment variables and GitHub Actions secrets with the new values.

## GitHub Secrets for edge deploy

Required for `.github/workflows/supabase_edge_deploy.yml`:

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_REF`
- `SUPABASE_URL`
- `SB_SECRET_KEY`

Optional (passed through to the function):

- `NOMIS_BASE_URL`
- `NOMIS_USER`
- `NOMIS_API_KEY`
- `NOMIS_DATASET_IDS` (comma-separated)
