# Runbook — Raffle v2 (ops)

## Environment

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | libSQL (`file:…` local o `libsql://…` Turso) |
| `BETTER_AUTH_SECRET` | 32+ random chars (session signing) |
| `BETTER_AUTH_URL` / `APP_URL` | Public app URL (must match browser origin) |
| `CRON_SECRET` | Bearer token for `/api/cron/maintenance` |
| `EMAIL_PROVIDER` | `noop` \| `resend` \| `brevo` |
| `RESEND_API_KEY` / `BREVO_API_KEY` | When email provider is not noop |
| `UPLOAD_DIR` | Local proof uploads (default `./uploads`) |

## Database

```bash
# Migrar + seed desarrollo (SQLite en packages/shared/data/raffle.db)
pnpm db:seed

# Solo migraciones
pnpm db:migrate

# Re-seed forzado (borra datos de negocio)
SEED_FORCE=1 pnpm db:seed
```

Admin por defecto: `admin` / `admin123` (`admin@rifas.com`). Ver `docs/LIBSQL_CUTOVER_RUNBOOK.md` para cutover desde MySQL.

## Cron / maintenance

Scheduler endpoint (same logic as legacy maintenance):

```http
POST /api/cron/maintenance
Authorization: Bearer <CRON_SECRET>
```

Runs: expire pauses, finalize overdue raffles. Configure external cron (VPS, Inngest HTTP, etc.) every 5 minutes in production.

## Email

Set `EMAIL_PROVIDER` and API keys. Use `noop` in dev/E2E. Purchase and status emails go through `app/src/server/purchase-notifications.ts`.

## E2E smoke

```bash
pnpm test:e2e -- --project=smoke
```

Full suite needs `DATABASE_URL`, seed, and `BETTER_AUTH_SECRET` (see [E2E.md](./E2E.md)).

## Pre-production cutover (from PARITY_MATRIX)

1. P0: auto-pause, scheduler, ticket migration script, concurrency tests on staging MySQL.
2. P1: public purchase path, admin dashboard, analytics, emails, proof upload.
3. Run seed + manual smoke: home purchase, admin approve, verifier by phone.
4. Point DNS / reverse proxy to v2; keep legacy read-only until verified.
5. Monitor cron + email logs in admin.

## Troubleshooting auth

- Fast Login fails: re-run seed (creates `account` with scrypt password, not bcrypt).
- Drizzle `user` model: `app/src/lib/auth.server.ts` maps `user` → `users` for Better Auth.
