# Purchase load testing

## Service-layer (Vitest)

```bash
# 100 concurrent buyers (default)
pnpm test:load

# Custom concurrency
LOAD_TEST_CONCURRENCY=500 pnpm test:load

# 100 + 500 + 1000 in one run
RUN_FULL_LOAD_TESTS=1 pnpm test:load
```

## Script wrapper

```bash
bun run scripts/load-test-purchases.ts
bun run scripts/load-test-purchases.ts 500
bun run scripts/load-test-purchases.ts --full
```

Uses an isolated SQLite file unless `DATABASE_URL` is set.

## Production metrics

Purchase flows emit structured logs:

- `metrics:purchase_attempt`
- `metrics:purchase_success`
- `metrics:purchase_failure`
- `metrics:purchase_rate_limited`
- `metrics:transaction_retry`
- `metrics:ticket_allocation`
- `metrics:timing:*`

Admin ticket changes emit `audit:purchase:*`.

## Environment

| Variable | Purpose |
|----------|---------|
| `TRUST_PROXY` | Trust `X-Forwarded-For` / `X-Real-IP` behind reverse proxy |
| `RATE_LIMIT_PURCHASE_MAX` | Max purchases per IP per window (default 5) |
| `RATE_LIMIT_PURCHASE_WINDOW_MS` | Rate limit window (default 10000) |
| `ALLOW_JSON_PURCHASE` | Allow JSON body on `/api/purchases` in production (e2e only) |
| `LOAD_TEST_SECRET` | Header `x-load-test-secret` for controlled JSON purchases |
| `DISABLE_ORIGIN_GUARD` | Disable admin Origin check (emergency only) |
