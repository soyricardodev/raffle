# Repositories (libSQL + Drizzle)

Capa de acceso a datos. Los servicios en `app/src/server/*.service.ts` orquestan reglas de negocio; **no usan SQL crudo**.

| Repositorio | Responsabilidad |
|-------------|-----------------|
| `tickets.repository.ts` | Asignación sparse, liberación, estados reserved/sold |
| `purchases.repository.ts` | CRUD compras, listados admin, unicidad `payment_reference` |
| `raffles.repository.ts` | CRUD rifas, contadores, pausa |
| `payment-methods.repository.ts` | Métodos por rifa |
| `settings.repository.ts` | `app_settings` (ex site_config) |
| `email-logs.repository.ts` | Auditoría de emails |
| `analytics.repository.ts` | Agregados dashboard |

Schema: `packages/shared/src/db/sqlite/schema/`. Migraciones: `packages/shared/drizzle-sqlite/`.

Cutover: [docs/LIBSQL_CUTOVER_RUNBOOK.md](../../../../docs/LIBSQL_CUTOVER_RUNBOOK.md).
