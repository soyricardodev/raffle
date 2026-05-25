# TASKS — Raffle v2

Estado vivo del plan unificado. Actualizar al tomar/completar tareas.

**Leyenda:** 👤 USER · 🟣 DeepSeek · 🔵 Composer · `ready` | `in_progress` | `done`

**Inventario técnico:** [`docs/ESTADO.md`](docs/ESTADO.md)

---

## Bootstrap

| ID | Assignee | Estado | Notas |
|----|----------|--------|-------|
| B-01…B-09 | 👤 | `done` | Repo local + app TanStack Start |
| B-10 | 👤 | `ready` | Rotar secretos legacy (urgente) |

## Fase 0

| ID | Tarea | Assignee | Estado | Notas |
|----|-------|----------|--------|-------|
| T-001 | drizzle pull | 🟣 | `done` | Schema manual desde legacy `database.sql` + tablas Better Auth |
| T-002 | Limpiar schema | 🟣 | `done` | ENUMs, JSON, relaciones Drizzle completas |
| T-003 | app/lib/db.ts | 🟣 | `done` | `db.server.ts` + `GET /api/health/db` |
| T-004 | Validators Zod | 🟣 | `done` | `packages/shared/src/validators` |
| T-005 | Errores dominio | 🟣 | `done` | 20+ errores tipados |
| T-006 | env.ts Zod | 🔵 | `done` | `DATABASE_URL` opcional en dev |
| T-007 | logger Pino | 🔵 | `done` | `app/src/lib/logger.ts` |
| T-008 | Better Auth | 🟣 | `done` | `auth.server.ts` + `/api/auth/*` Nitro |
| T-009 | RBAC | 🟣 | `done` | `auth-utils.server.ts` |
| T-010 | shadcn base | 🔵 | `done` | button, input, label, card, dialog |
| T-011 | __root providers | 🤝 | `in_progress` | QueryClient OK · Better Auth UI pendiente |
| T-012 | /login | 🔵 | `in_progress` | UI hecha con stub · wire a Better Auth |
| T-013 | admin layout | 🔵 | `done` | Shell + sidebar + placeholders |
| T-014 | Vitest smoke | 🔵 | `done` | env.test.ts (3 tests) |
| T-015 | Docker | 🔵 | `done` | Dockerfile + compose |
| T-016 | GitHub Actions CI | 🔵 | `done` | push GHCR comentado hasta D-03 |
| T-017 | nginx example | 🔵 | `done` | `nginx/raffle.conf.example` |
| T-018 | Fix `pnpm dev` | 🔵 | `done` | `server.ts` + stub virtual module + vite config Nitro |

## Infra monorepo (Composer)

| Item | Estado |
|------|--------|
| pnpm-workspace + turbo + biome | `done` |
| packages/shared skeleton | `done` |
| .env.example root | `done` |
| Carpetas features/server/inngest/scripts | `done` |

## Fase 1 — Core transaccional

| ID | Tarea | Assignee | Estado | Notas |
|----|-------|----------|--------|-------|
| T-101 | TicketService pool | 🟣 | `done` | `app/server/ticket.service.ts` — `generateTicketNumbers()`, `insertTicketPool()`, `allocateRandomTickets()` con FOR UPDATE |
| T-102 | TicketService.allocate | 🟣 | `done` | Transacción atómica con `SELECT FOR UPDATE` + `ORDER BY RAND() LIMIT n` — race condition resuelta |
| T-103 | TicketService.release | 🟣 | `done` | `releaseTickets()`, `releasePurchaseTickets()`, `getPurchaseTicketNumbers()` |
| T-104 | PauseService | 🟣 | `done` | `app/server/pause.service.ts` — `checkTicketAvailability()`, `checkAutoPause()`, `pauseRaffle()`, `unpauseRaffle()`, `getPauseInfo()`, `processPausedRaffles()` |
| T-105 | RaffleService | 🟣 | `done` | `app/server/raffle.service.ts` — CRUD completo, publish, getPublished, getDashboardStats, delete con validación de compras |
| T-106 | PurchaseService.create | 🟣 | `done` | Transacción completa: lock raffle, validar estado, duplicados, allocate tickets atómico, insert purchase+assign |
| T-107 | PurchaseService ops | 🟣 | `done` | `updatePurchaseStatus()`, `addTicketsToPurchase()`, `removeTicketsFromPurchase()`, `reassignTicketsToPurchase()` — paridad legacy |
| T-108 | API routes | 🟣 | `pending` | Falta crear routes en `app/src/routes/api/` para purchases, raffles, tickets, config |
| T-109 | Rate limit | 🔵 | `blocked` | T-108 |
| T-110 | Tests concurrencia | 🟣 | `pending` | — |
| T-111 | Tests pausa | 🟣 | `pending` | — |
| T-112 | AnalyticsService | 🟣 | `pending` | — |
| T-113 | Timezone utils | 🔵 | `blocked` | — |
| docs/ESTADO.md | `done` |

## Git remotes

| Item | Estado |
|------|--------|
| Remotes viejos | **Ninguno configurado** — listo para `git remote add origin <nuevo-url>` |

## Trabajo sin commit (DeepSeek + fix dev)

Schema, auth, db, API routes, validators, errors, `docs/ESTADO.md`, fix vite — pendiente de commit cuando 👤 lo pida.

---

Ver plan completo: `PROPUESTA_UNIFICADA_RAFFLE_V2.md`
