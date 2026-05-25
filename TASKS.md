# TASKS — Raffle v2

Estado vivo del plan unificado. Actualizar al tomar/completar tareas.

**Leyenda:** 👤 USER · 🟣 DeepSeek · 🔵 Composer · `ready` | `in_progress` | `done`

---

## Bootstrap

| ID | Assignee | Estado | Notas |
|----|----------|--------|-------|
| B-01…B-09 | 👤 | `done` | Repo local + app TanStack Start |
| B-10 | 👤 | `ready` | Rotar secretos legacy (urgente) |

## Fase 0

| ID | Tarea | Assignee | Estado | Notas |
|----|-------|----------|--------|-------|
| T-001 | drizzle pull | 🟣 | `ready` | `packages/shared` listo |
| T-002 | Limpiar schema | 🟣 | `blocked` | T-001 |
| T-003 | app/lib/db.ts | 🟣 | `blocked` | T-002 — **owner DeepSeek, path `app/src/lib/db.ts`** |
| T-004 | Validators Zod | 🟣 | `blocked` | T-002 |
| T-005 | Errores dominio | 🟣 | `ready` | `packages/shared/src/errors/` |
| T-006 | env.ts Zod | 🔵 | `done` | optional DATABASE_URL en dev |
| T-007 | logger Pino | 🔵 | `done` | `app/src/lib/logger.ts` |
| T-008 | Better Auth | 🟣 | `blocked` | T-003 · reemplazar auth-client stub |
| T-009 | RBAC | 🟣 | `blocked` | T-008 |
| T-010 | shadcn base | 🔵 | `done` | button, input, label, card, dialog |
| T-011 | __root providers | 🔵 | `done` | QueryClient + Sonner |
| T-012 | /login | 🔵 | `done` | UI + dev stub (Better Auth T-008 después) |
| T-013 | admin layout | 🔵 | `done` | sidebar + rutas placeholder |
| T-301 | site-config store | 🔵 | `done` | Zustand + CSS vars |
| T-302 | layout público | 🔵 | `done` | header/footer |
| T-303 | landing base | 🔵 | `in_progress` | hero placeholder, falta rifa activa |
| T-308 | verificar | 🔵 | `in_progress` | ruta shell, falta form |
| T-014 | Vitest smoke | 🔵 | `done` | env.test.ts |
| T-015 | Docker | 🔵 | `done` | Dockerfile + compose skeleton |
| T-016 | GitHub Actions CI | 🔵 | `done` | push GHCR comentado hasta D-03 |
| T-017 | nginx example | 🔵 | `done` | `nginx/raffle.conf.example` |

## Infra monorepo (Composer)

| Item | Estado |
|------|--------|
| pnpm-workspace + turbo + biome | `done` |
| packages/shared skeleton | `done` |
| .env.example root | `done` |
| Carpetas features/server/inngest/scripts | `done` |

## Git remotes

| Item | Estado |
|------|--------|
| Remotes viejos | **Ninguno configurado** — listo para `git remote add origin <nuevo-url>` |

---

Ver plan completo: `PROPUESTA_UNIFICADA_RAFFLE_V2.md`
