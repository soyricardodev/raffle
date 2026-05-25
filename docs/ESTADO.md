# ESTADO — Raffle v2

**Última actualización:** 2026-05-24  
**Fuente de verdad** para inventario técnico y qué funciona hoy.

---

## Resumen ejecutivo

| Área | Estado |
|------|--------|
| Monorepo + CI/Docker | ✅ Funcional |
| `pnpm dev` (UI) | ✅ Corregido (ver bugfix abajo) |
| `pnpm build` | ✅ Pasa |
| MySQL / Drizzle | 🟡 Schema + código listos; requiere `DATABASE_URL` |
| Better Auth | 🟡 Backend configurado; login UI aún usa stub dev |
| Servicios dominio (Fase 1) | ⏳ Pendiente |

---

## Bugfix `pnpm dev` (2026-05-24)

**Síntoma:** `Cannot find module 'tanstack-start-injected-head-scripts:v'`

**Causa:** TanStack Start + Nitro en dev importan un módulo virtual que ningún plugin registraba en nuestro stack. Además faltaba `app/server.ts` y `environments.ssr` exigidos por [Nitro + TanStack Start](https://nitro.build).

**Fix aplicado:**

1. `app/server.ts` — entry SSR con `createServerEntry` de `@tanstack/react-start/server-entry`
2. `vite.config.ts` — `environments.ssr.input: ./server.ts`, orden plugins (tanstackStart antes de nitro)
3. `app/vite-plugins/injected-head-scripts-stub.ts` — stub del módulo virtual hasta que upstream lo registre

---

## Commits git

| Commit | Contenido |
|--------|-----------|
| `991b0d3` | Legacy + propuestas + bootstrap TanStack Start |
| `381cea7` | Monorepo, env, logger, shadcn, Vitest, Docker/CI |
| `243c455` | UI pública/admin (stub auth, sin DB) |
| *(sin commit)* | Trabajo DeepSeek Fase 0 + fix dev + docs |

---

## Stack bloqueado

TanStack Start · MySQL · Drizzle · Better Auth · Inngest · multer · Docker/GHCR · VPS

**No:** Next.js · Turso · R2 · Vercel

---

## Estructura del repo

```
raffle/
├── app/                    # TanStack Start
│   ├── server.ts           # Entry SSR (Nitro + TanStack)
│   ├── server/api/         # Rutas Nitro H3 (auth, health)
│   ├── src/lib/            # env, logger, auth*.server.ts, db.server.ts
│   ├── src/routes/         # UI file-based routing
│   └── src/features/       # layouts, auth stub, admin nav
├── packages/shared/        # schema Drizzle, validators, errors
├── backend-legacy/         # Solo referencia
├── frontend-legacy/        # Solo referencia
├── inngest/, scripts/, nginx/
├── TASKS.md                # Tablero vivo por tarea
└── PROPUESTA_UNIFICADA_RAFFLE_V2.md
```

---

## 🟣 DeepSeek — Fase 0 backend (hecho, sin commit)

| ID | Entregable | Archivos clave |
|----|------------|----------------|
| T-001/T-002 | Schema Drizzle desde legacy | `packages/shared/src/db/schema/*.ts`, `relations.ts` |
| T-003 | Pool MySQL + Drizzle | `app/src/lib/db.server.ts` |
| T-004 | Validators Zod | `packages/shared/src/validators/index.ts` |
| T-005 | Errores dominio (20+) | `packages/shared/src/errors/index.ts` |
| T-008 | Better Auth + adapter | `app/src/lib/auth.server.ts`, tablas `session/account/verification` |
| T-009 | RBAC helpers | `app/src/lib/auth-utils.server.ts` |

### Tablas Drizzle (`packages/shared`)

Legacy: `users`, `raffles`, `prizes`, `purchases`, `tickets`, `payment_methods`, `site_config`, `email_logs`  
Better Auth: `session`, `account`, `verification`

### API TanStack Start (`app/src/routes/api/`)

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/auth/*` | ALL | Better Auth (`getAuth().handler`) |
| `/api/health/db` | GET | Health check MySQL (`SELECT 1`) |

> Las rutas Nitro en `app/server/api/` se migraron aquí — es el patrón oficial Nitro + TanStack Start.

---

## 🔵 Composer — UI e infra (hecho)

| ID | Entregable |
|----|------------|
| T-006–T-007 | `env.ts`, `logger.ts` |
| T-010 | shadcn: button, input, label, card, dialog |
| T-012/T-013 | UI `/login`, layout `/admin/*` (placeholders) |
| T-014–T-017 | Vitest, Docker, CI, nginx example |

### Rutas UI

| Ruta | Estado |
|------|--------|
| `/` | Landing placeholder |
| `/verificar` | Shell verificación |
| `/login` | Formulario (stub `sessionStorage`) |
| `/admin/*` | Sidebar + páginas placeholder |

**Auth dev stub:** `app/src/features/auth/auth-client.ts` — cualquier credencial funciona. Reemplazar por `better-auth/react` (T-011).

---

## Variables de entorno

Ver `.env.example` en root.

| Variable | Dev sin MySQL | Prod |
|----------|---------------|------|
| `DATABASE_URL` | Opcional | **Requerida** |
| `BETTER_AUTH_SECRET` | Requerida para auth real (≥32 chars) | Requerida |
| `BETTER_AUTH_URL` / `APP_URL` | Default `http://localhost:3000` | URL pública |
| `EMAIL_PROVIDER` | `noop` default | `brevo` o `resend` |

---

## Qué funciona sin `DATABASE_URL`

- Landing, verificar, admin UI, login stub
- `pnpm dev`, `pnpm build`, `pnpm test`
- `/api/health/db` → responde `{ ok: false, error: "..." }`

## Qué requiere MySQL conectado

- `/api/auth/*` (sign-in real)
- Servicios Fase 1 (tickets, compras, rifas)
- Health check OK

---

## Pendiente inmediato

1. **T-011** — Better Auth provider en `__root.tsx` + wire login UI
2. **Fase 1** — TicketService, PurchaseService, PauseService, RaffleService (DeepSeek)
3. **👤 B-10** — Rotar secretos legacy
4. **👤 D-01…D-03** — Decisiones negocio (ver `PROPUESTA_UNIFICADA_RAFFLE_V2.md`)

---

## Comandos

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm build
pnpm test
pnpm typecheck
```

---

Ver tablero de tareas: [`TASKS.md`](../TASKS.md)  
Ver plan maestro: [`PROPUESTA_UNIFICADA_RAFFLE_V2.md`](../PROPUESTA_UNIFICADA_RAFFLE_V2.md)
