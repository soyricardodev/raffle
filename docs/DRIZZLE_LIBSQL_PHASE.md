# Drizzle + libSQL v2 (implementado)

## Estado actual

- **Schema:** `packages/shared/src/db/sqlite/schema/` (12 tablas, tickets sparse).
- **Migraciones:** `packages/shared/drizzle-sqlite/` (`pnpm --filter @raffle/shared db:migrate`).
- **Runtime:** `app/src/lib/db.server.ts` → `@libsql/client` + Drizzle.
- **Auth:** Better Auth `provider: "sqlite"`.
- **Dominio:** repositorios en `app/src/server/repositories/`, servicios sin SQL crudo.
- **ETL:** `scripts/migrate-mysql-to-libsql.ts`.
- **Cutover:** [LIBSQL_CUTOVER_RUNBOOK.md](./LIBSQL_CUTOVER_RUNBOOK.md).

## Modelo de tickets (sparse)

- No se preinsertan filas `available`.
- `purchase_tickets` + `UNIQUE(raffle_id, ticket_number)`.
- Contadores en `raffles`: `tickets_available`, `tickets_reserved`, `tickets_sold`.
- Asignación: random en app + insert con retry; transacciones `immediate`.

## Desarrollo local

```bash
# .env
DATABASE_URL=file:./packages/shared/data/raffle.db

cd packages/shared && pnpm db:migrate
pnpm dev
```

## Tests

```bash
pnpm --filter app test
```

Suites de BD usan SQLite temporal aislado (`app/src/test/db-setup.ts`).

## Criterios de producción

- p95 compra &lt; 500 ms bajo carga objetivo.
- 0 doble-asignación (test de concurrencia).
- `available + reserved + sold = total_tickets` siempre.
