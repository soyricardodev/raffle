# E2E tests (Playwright)

Smoke and integration tests for raffle-v2 live in `app/e2e/`. They cover the Phase 5 flows from `PROPUESTA_UNIFICADA_RAFFLE_V2.md`: public pages, purchase, admin approve/reject, and ticket verifier.

## Quick start

```bash
# From repo root (installs Playwright + Chromium on first run)
pnpm install
pnpm --filter app exec playwright install chromium

# Smoke only — no database required
pnpm test:e2e -- --project=smoke

# Full suite (needs libSQL + seed)
cp .env.example app/.env   # DATABASE_URL=file:../packages/shared/data/raffle.db
pnpm db:seed
pnpm test:e2e
```

Run from `app/` with the same commands (`pnpm test:e2e`, etc.).

## What runs when

| Project    | Specs                    | `DATABASE_URL` |
|-----------|--------------------------|----------------|
| `smoke`   | Home, `/verificar`, login UI (login needs DB for auth guard) | Partial without DB |
| `purchase`| Purchase happy path      | Required (skipped if missing) |
| `setup`   | Admin login → storage    | Required (no-op file if missing) |
| `admin`   | Approve / reject         | Required       |
| `verifier`| Verify by phone (API)    | Required       |
| `admin`   | Approve/reject (UI + API)| Requires admin auth setup |

Integration specs use `test.describe.skip` when `DATABASE_URL` is unset, so CI can run smoke without a database.

- **Purchase UI**: uses `data-testid` on payment methods and submit; runs in `purchase` project when DB is available.
- **Admin**: requires working Better Auth login (Fast Login on `/login`). Setup runs `ensureAdminCredentialAccount()`; auth maps `users` → Better Auth `user` in `auth.server.ts`.

## Environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | — | libSQL `file:` o `libsql://`; required for purchase/admin/verifier DB tests |
| `E2E_PORT` | `3100` | Dev server port (avoids clashing with `pnpm dev` on 3000) |
| `E2E_BASE_URL` | `http://localhost:3100` | App URL (Playwright `baseURL` + `webServer`) |
| `E2E_ADMIN_EMAIL` | `admin@rifas.com` | Admin login (seed user) |
| `E2E_ADMIN_PASSWORD` | `admin123` | Admin password (seed) |
| `BETTER_AUTH_SECRET` | dev fallback in config | Auth signing (32+ chars in prod) |
| `BETTER_AUTH_URL` / `APP_URL` | same as `E2E_BASE_URL` | Set by Playwright `webServer` env |
| `EMAIL_PROVIDER` | `noop` | Avoid real email in tests |

`auth.setup.ts` ensures a Better Auth `account` row exists for the seed admin (credential provider) before UI login.

## Fixtures

- **Seed**: `pnpm db:seed` — admin Better Auth, rifa activa (sparse), rifa finalizada demo, `app_settings`, métodos de pago.
- **API helpers**: `app/e2e/helpers/api.ts` — create purchases, approve via admin API (verifier test).
- **DB helper**: `app/e2e/helpers/db.ts` — `ensureAdminCredentialAccount()` for Better Auth compatibility.

## CI suggestion

```yaml
- run: pnpm exec playwright install chromium
- run: pnpm test:e2e -- --project=smoke
  # Optional job with libSQL file DB + pnpm db:seed for full suite
```

## Troubleshooting

- **Admin login fails**: Run seed, then re-run tests. Credential password must be Better Auth scrypt (`hashPassword` in seed / `ensureAdminCredentialAccount`), not bcrypt-only on `account.password`.
- **No active raffle**: Re-run `scripts/seed.ts`.
- **Wrong app on port**: E2E defaults to port **3100** so it does not reuse another service on 3000. Override with `E2E_PORT` / `E2E_BASE_URL` if needed.
- **Port in use**: Change `E2E_PORT` or stop the conflicting process; config uses `reuseExistingServer` locally on the E2E port only.
