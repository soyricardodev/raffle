# TASKS — Raffle v2

Estado vivo del plan unificado. Actualizar al tomar/completar tareas.

**Leyenda:** 👤 USER · 🟣 DeepSeek · 🔵 Composer · `ready` | `in_progress` | `done`

**Inventario técnico:** [`docs/ESTADO.md`](docs/ESTADO.md)

---

## Bootstrap

| ID | Assignee | Estado | Notas |
|----|----------|--------|-------|
| B-01…B-09 | 👤 | `done` | Repo local + app TanStack Start |
| B-10 | 👤 | `ready` | Rotar secretos legacy (urgente). Resend API key hardcodeada en `backend-legacy/services/emailService.js` — revocar y rotar. |

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
| T-011 | __root providers | 🤝 | `done` | QueryClient OK · Better Auth API handler en `/api/auth/*` · Session guard en admin layout · Auth middleware en API routes |
| T-012 | /login | 🔵 | `done` | UI con LoginForm · Wire a Better Auth real vía `authClient.signIn.email()` · DevFastLogin |
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
| T-108 | API routes | 🟣 | `done` | Rutas creadas en `app/src/routes/api/admin/`: purchases (6), raffles (6), config (1), dashboard (1). Todas con `requireAdmin()` middleware. |
| T-109 | Rate limit | 🔵 | `blocked` | T-108 |
| T-110 | Tests concurrencia | 🟣 | `pending` | — |
| T-111 | Tests pausa | 🟣 | `pending` | — |
| T-112 | AnalyticsService | 🟣 | `pending` | — |
| T-113 | Timezone utils | 🔵 | `blocked` | — |
| docs/ESTADO.md | `done` |

## Fase 2 — Jobs / Email / Uploads (próxima)

| ID | Tarea | Assignee | Estado | Notas |
|----|-------|----------|--------|-------|
| T-201 | Email adapter pattern | 🟣 | `done` | `app/src/server/email/` — Noop, Resend, Brevo adapters. Factory según `EMAIL_PROVIDER` env. |
| T-202…T-213 | Jobs Inngest + templates React Email + uploads + admin email routes | 🟣 🔵 | `ready` | Pendiente iniciar |

## Decisiones de negocio (USER)

| ID | Decisión | Estado | Respuesta |
|----|----------|--------|-----------|
| D-01 | `percentage_mode` | `done` | **Eliminar** — código muerto, eliminado de schema/validators/servicio |
| D-02 | Email provider | `done` | **Resend + abstracción** — adapter pattern con Resend, Brevo (skeleton), Noop. Provider-agnostic. |
| D-03 | Imagen GHCR | `done` | `raffle-system-fullstack` |

## Git remotes

| Item | Estado |
|------|--------|
| Remotes viejos | **Ninguno configurado** — listo para `git remote add origin <nuevo-url>` |

---

Ver plan completo: `PROPUESTA_UNIFICADA_RAFFLE_V2.md`
