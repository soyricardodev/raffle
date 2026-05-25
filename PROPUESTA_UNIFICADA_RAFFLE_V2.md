# PROPUESTA UNIFICADA — Raffle App v2

**Documento maestro** · Fusión DeepSeek v3 + Composer v2  
**Fecha:** 2026-05-24  
**Repo objetivo:** `raffle-v2/` (nuevo, separado del legacy)

> **Filosofía:** Reescribir el **código**, no la **infraestructura**.  
> **Stack:** TanStack Start · MySQL · Drizzle · Better Auth · Inngest · multer · Docker/GHCR · VPS $10  
> **Sin:** Next.js · libSQL/Turso · R2 · Vercel · Fly

---

## 1. Decisiones cerradas (no reabrir sin ADR)

| Tema | Decisión |
|------|----------|
| Framework | **TanStack Start** (front + back, un repo) |
| BD | **MySQL existente** + Drizzle (`mysql2`) |
| Datos | **Cero ETL** — `drizzle-kit pull` + mismas tablas |
| Uploads | **multer** → `/opt/raffle/uploads` · nginx sirve estáticos |
| Auth | **Better Auth** · cookies httpOnly · RBAC |
| Jobs | **Inngest** · sidecar en docker-compose |
| Email | **Brevo** default · adapter Resend opcional · React Email |
| UI | **shadcn/ui + Tailwind v4** |
| Deploy | **Docker → GHCR → VPS** · nginx reverse proxy |
| Runtime dev | Bun · **prod: Node 22** en container |
| Límite archivo | Componentes **<200** · services **<200** · server fn **<150** |

### Pendiente de decisión (👤 USER)

- [ ] **D-01** `percentage_mode` — ¿implementar en v2 o eliminar del MVP?
- [ ] **D-02** Email prod — ¿Brevo nuevo o mantener Resend ya verificado?
- [ ] **D-03** Nombre GHCR — `ghcr.io/<org>/raffle-v2`

---

## 2. Roles del equipo

| Símbolo | Quién | Responsabilidad principal |
|---------|-------|---------------------------|
| 👤 | **Tú (USER)** | Bootstrap repo, secretos VPS, decisiones negocio, cutover prod, revisión PRs |
| 🟣 | **DeepSeek** | Dominio backend: servicios, server functions, Drizzle, Inngest, email, tests integración |
| 🔵 | **Composer** | Frontend/UX: shadcn, features públicas/admin, Query/Zustand, E2E Playwright, Docker/CI/nginx |
| 🤝 | **Ambos** | Solo tareas marcadas 🤝 · coordinar en comentario de PR · no editar mismos archivos |

### Reglas para agentes

1. **Tomar tareas solo en estado `ready`** (dependencias cumplidas).
2. **Marcar `in_progress` + tu símbolo** al empezar (editar este doc o `TASKS.md`).
3. **Un agente por archivo “owned”** (sección 6) salvo 🤝.
4. **PR pequeño** — una tarea o grupo atómico por PR.
5. **No tocar bootstrap** (sección 4) salvo 👤 lo pida.
6. Referencia legacy: `backend-legacy/` + `frontend-legacy/` = especificación de comportamiento, no código a copiar.

---

## 3. Estructura objetivo del repo

```
raffle-v2/
├── packages/shared/          # 🟣 schema Drizzle, validators Zod, constants, emails
├── app/                      # TanStack Start
│   ├── app/                  # 🔵 rutas UI
│   ├── features/             # 🔵 componentes
│   ├── server/               # 🟣 servicios dominio
│   ├── lib/                  # 🤝 db, auth, env, logger, upload, inngest, email
│   └── stores/               # 🔵 Zustand
├── inngest/                  # 🟣 jobs
├── scripts/                  # 🟣 drizzle-pull, seed
├── nginx/                    # 🔵 ejemplo config
├── docker-compose.yml        # 🔵
├── Dockerfile                # 🔵
├── turbo.json
├── biome.json
└── .github/workflows/        # 🔵
```

---

## 4. Bootstrap — 👤 USER (antes de agentes)

**Objetivo:** Repo mínimo donde `bun dev` arranca TanStack Start vacío pero con monorepo y paths correctos.

### Checklist bootstrap (👤 USER)

| ID | Tarea | DoD |
|----|-------|-----|
| **B-01** | Crear repo Git `raffle-v2` | Repo remoto en GitHub |
| **B-02** | `create-tanstack-start` (template oficial) en `/app` | `bun dev` → página default carga |
| **B-03** | Turborepo root: `turbo.json`, workspaces `app` + `packages/shared` | `bun install` en root OK |
| **B-04** | Biome + TS strict root (`tsconfig.json` base) | `bun run lint` pasa (aunque vacío) |
| **B-05** | `packages/shared/package.json` + exports vacíos (`db`, `validators`) | Import `@raffle/shared` resuelve |
| **B-06** | `.env.example` con variables (sección 5) | Documentado |
| **B-07** | Copia local MySQL o túnel al VPS dev | `DATABASE_URL` funciona desde tu máquina |
| **B-08** | Carpetas vacías creadas: `app/server/`, `app/features/`, `inngest/`, `scripts/` | Estructura sección 3 |
| **B-09** | Commit inicial `chore: bootstrap tanstack start monorepo` | Push a `main` |
| **B-10** | Rotar secretos legacy (JWT, Resend si expuesta) | Fuera de scope v2 pero urgente |

**Señal “agentes pueden empezar”:** B-01…B-09 ✅ + mensaje en chat con URL repo y rama `main`.

### Lo que NO hace el bootstrap (lo hacen agentes)

- Drizzle pull, Better Auth, servicios, UI, Docker, tests

---

## 5. Variables de entorno

```env
# .env.example
DATABASE_URL=mysql://user:pass@localhost:3306/raffle_db
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000
APP_URL=http://localhost:3000
UPLOAD_DIR=./uploads
EMAIL_PROVIDER=brevo          # brevo | resend | noop
BREVO_API_KEY=
RESEND_API_KEY=
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=
NODE_ENV=development
LOG_LEVEL=info
TZ=America/Caracas            # solo display; BD en UTC
```

**T-ENV** 🔵 Composer — `app/lib/env.ts` validación Zod fail-fast (depende B-09).

---

## 6. Mapa de ownership (evitar conflictos)

| Path | Owner |
|------|-------|
| `packages/shared/src/db/**` | 🟣 DeepSeek |
| `packages/shared/src/validators/**` | 🟣 DeepSeek (🔵 puede proponer schemas UI-only en PR separado) |
| `packages/shared/src/emails/**` | 🟣 DeepSeek |
| `packages/shared/src/constants/**` | 🤝 |
| `app/server/**` | 🟣 DeepSeek |
| `app/app/api/**` (server functions) | 🟣 DeepSeek |
| `inngest/**` | 🟣 DeepSeek |
| `scripts/**` | 🟣 DeepSeek |
| `app/lib/db.ts`, `auth.ts`, `email.ts`, `inngest.ts`, `upload.ts` | 🟣 DeepSeek |
| `app/lib/env.ts`, `logger.ts` | 🔵 Composer |
| `app/app/**` (rutas UI, no api) | 🔵 Composer |
| `app/features/**` | 🔵 Composer |
| `app/stores/**` | 🔵 Composer |
| `Dockerfile`, `docker-compose.yml`, `.github/**`, `nginx/**` | 🔵 Composer |
| `app/app/__root.tsx` | 🤝 (providers: Query + Auth + theme) |

---

## 7. Tablero de tareas

**Estados:** `blocked` → `ready` → `in_progress` → `review` → `done`

### Leyenda assignee

- 👤 USER · 🟣 DeepSeek · 🔵 Composer · 🤝 Ambos

---

### FASE 0 — Fundación (Semana 1)

| ID | Tarea | Assignee | Depende | DoD | Estado |
|----|-------|----------|---------|-----|--------|
| B-01…B-09 | Bootstrap (sección 4) | 👤 | — | Checklist bootstrap | `blocked` |
| **T-001** | `drizzle.config.ts` + `drizzle-kit pull` contra MySQL | 🟣 | B-09 | Schema generado en `packages/shared/src/db/schema/` | `blocked` |
| **T-002** | Limpiar schema: ENUMs, JSON types (`account_info`, `site_config`), relations Drizzle | 🟣 | T-001 | `bun run db:studio` o query test OK | `blocked` |
| **T-003** | `app/lib/db.ts` pool mysql2 + export `db` | 🟣 | T-002 | Server function test `SELECT 1` | `blocked` |
| **T-004** | Validators Zod base: enums pago, estados rifa/compra/ticket | 🟣 | T-002 | Export en `@raffle/shared/validators` | `blocked` |
| **T-005** | Errores dominio (`AppError`, `InsufficientTicketsError`, etc.) | 🟣 | — | `packages/shared/src/errors/` | `blocked` |
| **T-006** | `app/lib/env.ts` Zod fail-fast | 🔵 | B-09 | App no arranca sin `DATABASE_URL` | `blocked` |
| **T-007** | `app/lib/logger.ts` Pino | 🔵 | T-006 | JSON logs, sin PII | `blocked` |
| **T-008** | Better Auth: login/logout/session, tabla `users` bcrypt compatible | 🟣 | T-003 | Login admin legacy funciona | `blocked` |
| **T-009** | RBAC helper `requireRole('admin'|'super_admin')` | 🟣 | T-008 | Middleware usable en server fn | `blocked` |
| **T-010** | shadcn init + Tailwind v4 + tema base | 🔵 | B-09 | Button, Input, Dialog instalados | `blocked` |
| **T-011** | `__root.tsx` providers: QueryClient, theme, toast | 🤝 | T-008, T-010 | DevTools opcional | `blocked` |
| **T-012** | Ruta `/login` + redirect admin | 🔵 | T-008, T-010 | Login UI funcional | `blocked` |
| **T-013** | Admin layout shell `_layout.tsx` sidebar vacío | 🔵 | T-012 | `/admin` protegido | `blocked` |
| **T-014** | Vitest setup + 1 test smoke | 🔵 | B-09 | `bun test` en CI | `blocked` |
| **T-015** | Dockerfile multistage + docker-compose skeleton | 🔵 | B-09 | `docker build` OK local | `blocked` |
| **T-016** | GitHub Actions: lint + typecheck + test | 🔵 | T-014, T-015 | Workflow verde en PR | `blocked` |
| **T-017** | `nginx/raffle.conf.example` | 🔵 | — | `/uploads` alias + proxy :3000 | `blocked` |

**Entregable Fase 0:** `bun dev` + login admin + Drizzle conectado + CI verde + Docker build.

---

### FASE 1 — Core transaccional (Semanas 2–3)

| ID | Tarea | Assignee | Depende | DoD | Estado |
|----|-------|----------|---------|-----|--------|
| **T-101** | `TicketService`: generar pool rifa (sin Fisher-Yates 10k) | 🟣 | T-003 | Test unit: N tickets únicos 4 dígitos | `blocked` |
| **T-102** | `TicketService.allocate`: transacción `FOR UPDATE` + RAND | 🟣 | T-101, T-005 | Test integración concurrencia | `blocked` |
| **T-103** | `TicketService.release`: reject / remove tickets | 🟣 | T-102 | Tickets vuelven a `available` | `blocked` |
| **T-104** | `PauseService`: auto/manual/unpause/reglas legacy | 🟣 | T-003 | Tests auto_full, auto_insufficient | `blocked` |
| **T-105** | `RaffleService`: CRUD, publish, delete sin compras, estados | 🟣 | T-003, T-004 | Server functions rifas | `blocked` |
| **T-106** | `PurchaseService.create`: transacción completa | 🟣 | T-102, T-104 | Compra pending + tickets reserved | `blocked` |
| **T-107** | `PurchaseService`: approve/reject/reassign/add/remove | 🟣 | T-103, T-106 | Paridad reglas legacy | `blocked` |
| **T-108** | Server functions `/api` purchases, raffles, tickets ( público + admin ) | 🟣 | T-105–T-107 | Rutas ordenadas, Zod input/output | `blocked` |
| **T-109** | Rate limit server fn públicas (compra, verify) | 🔵 | T-108 | 3 req/min compra por IP | `blocked` |
| **T-110** | Tests integración: 2 compras concurrentes misma rifa | 🟣 | T-106 | Nunca over-assign | `blocked` |
| **T-111** | Tests integración: pausa post-compra | 🟣 | T-104, T-106 | Rifa pausa cuando corresponde | `blocked` |
| **T-112** | `AnalyticsService` + queries dashboard | 🟣 | T-003 | KPIs equivalentes legacy | `blocked` |
| **T-113** | Constantes timezone: UTC store, Caracas display helpers | 🔵 | T-004 | `date-fns-tz` utils | `blocked` |

**Entregable Fase 1:** Compra end-to-end por API + tests concurrencia verdes.

---

### FASE 2 — Jobs, email, uploads (Semana 4)

| ID | Tarea | Assignee | Depende | DoD | Estado |
|----|-------|----------|---------|-----|--------|
| **T-201** | `app/lib/inngest.ts` client + serve route | 🟣 | T-006 | Inngest dev dashboard conecta | `blocked` |
| **T-202** | Job `email/send-confirmation` | 🟣 | T-201, T-106 | Log en `email_logs` | `blocked` |
| **T-203** | Jobs `email/status-update`, `ticket-modification`, `reassign` | 🟣 | T-202 | 5 tipos cubiertos | `blocked` |
| **T-204** | React Email templates × 5 en `packages/shared/src/emails/` | 🟣 | — | Render HTML test snapshot | `blocked` |
| **T-205** | Email adapter Brevo + Resend + noop | 🟣 | T-006 | Swap por env | `blocked` |
| **T-206** | Job `raffle/check-auto-pause` | 🟣 | T-201, T-104 | Trigger post-compra | `blocked` |
| **T-207** | Cron `raffle/finalize-expired` (5 min) | 🟣 | T-201 | Rifas vencidas → finished | `blocked` |
| **T-208** | Cron `raffle/process-paused` (1 min) | 🟣 | T-201 | Unpause/expira pausas | `blocked` |
| **T-209** | Cron `cleanup-reserved` (30 min) | 🟣 | T-201 | Reserved huérfanos liberados | `blocked` |
| **T-210** | `app/lib/upload.ts` multer tipado 5MB | 🟣 | T-006 | jpeg/png/webp/pdf | `blocked` |
| **T-211** | Integrar upload en create purchase + rifas + config | 🟣 | T-210, T-108 | URLs en `/uploads/...` | `blocked` |
| **T-212** | Server fn admin email logs/stats/resend/test | 🟣 | T-203 | RBAC admin | `blocked` |
| **T-213** | docker-compose servicio `inngest` sidecar | 🔵 | T-201, T-015 | `docker compose up` 2 services | `blocked` |
| **T-214** | Documentar backup uploads (`scripts/backup-uploads.sh`) | 🔵 | — | Cron ejemplo en doc | `blocked` |

**Entregable Fase 2:** Compra → email enviado · schedulers corriendo · uploads OK.

---

### FASE 3 — Frontend público (Semanas 5–6)

| ID | Tarea | Assignee | Depende | DoD | Estado |
|----|-------|----------|---------|-----|--------|
| **T-301** | `stores/site-config.ts` Zustand + CSS variables | 🔵 | T-108 | Un fetch, tema global | `blocked` |
| **T-302** | Layout público header/footer/contacto/redes | 🔵 | T-301, T-010 | Responsive | `blocked` |
| **T-303** | Landing `/`: rifa activa + progreso + hero config | 🔵 | T-302, T-108 | Paridad visual razonable | `blocked` |
| **T-304** | Galería rifas publicadas paginada | 🔵 | T-303 | Infinite scroll Query | `blocked` |
| **T-305** | Página `/rifa/$id` detalle + premios | 🔵 | T-302 | — | `blocked` |
| **T-306** | Purchase wizard (componentes <200 líneas c/u) | 🔵 | T-108, T-211 | Multi-step completo | `blocked` |
| **T-307** | `use-pause-timer` + overlay pausa (sin reload) | 🔵 | T-306, T-104 | Query invalidate | `blocked` |
| **T-308** | Verificador `/verificar` | 🔵 | T-108 | Tel/CI/email/ticket | `blocked` |
| **T-309** | Hook in-app browser redirect | 🔵 | T-302 | IG/FB → browser externo | `blocked` |
| **T-310** | Hooks TanStack Query: raffles, purchases, config | 🔵 | T-108 | Sin axios legacy | `blocked` |

**Entregable Fase 3:** Usuario compra y verifica tickets en UI.

---

### FASE 4 — Admin panel (Semanas 7–8)

| ID | Tarea | Assignee | Depende | DoD | Estado |
|----|-------|----------|---------|-----|--------|
| **T-401** | Dashboard KPIs + ventas recientes | 🔵 | T-112, T-013 | Cards + tabla corta | `blocked` |
| **T-402** | Tabla ventas TanStack Table infinite + filtros + CSV | 🔵 | T-108 | Paridad SalesTable legacy | `blocked` |
| **T-403** | Modal venta: detalle, aprobar, rechazar | 🔵 | T-402, T-107 | Mutations Query | `blocked` |
| **T-404** | Modal reasignar + add/remove tickets | 🔵 | T-403 | Solo reglas legacy | `blocked` |
| **T-405** | `/admin/rifas` listado + filtros + delete | 🔵 | T-105 | — | `blocked` |
| **T-406** | Crear rifa form + uploads premios/métodos pago | 🔵 | T-211, T-405 | Wizard o tabs | `blocked` |
| **T-407** | Editar rifa + pause/unpause/auto-pause/publish UI | 🔵 | T-405, T-104 | — | `blocked` |
| **T-408** | `/admin/analytics` Recharts (componentes separados) | 🔵 | T-112 | BS/USD/métodos | `blocked` |
| **T-409** | `/admin/boletos` explorer | 🔵 | T-108 | — | `blocked` |
| **T-410** | `/admin/config` tabs (general, diseño, social, contacto, email) | 🔵 | T-301, T-211 | — | `blocked` |
| **T-411** | `/admin/emails` logs + resend + test | 🔵 | T-212 | Ruta que legacy no tenía | `blocked` |
| **T-412** | Gestión usuarios super_admin | 🔵 | T-009 | Crear admin | `blocked` |
| **T-413** | Maintenance manual UI | 🔵 | T-207 | Botón finalize/run | `blocked` |

**Entregable Fase 4:** Admin paridad legacy.

---

### FASE 5 — QA, deploy, cutover (Semanas 9–10)

| ID | Tarea | Assignee | Depende | DoD | Estado |
|----|-------|----------|---------|-----|--------|
| **T-501** | Playwright: flujo compra feliz | 🔵 | Fase 3 | CI verde | `blocked` |
| **T-502** | Playwright: admin approve/reject | 🔵 | Fase 4 | CI verde | `blocked` |
| **T-503** | Playwright: pausa countdown | 🔵 | T-307 | — | `blocked` |
| **T-504** | Load test 50 compras concurrentes (script) | 🟣 | T-110 | Documentar resultados | `blocked` |
| **T-505** | GHCR push + deploy workflow SSH VPS | 🔵 | T-015, T-213 | `main` deploy staging | `blocked` |
| **T-506** | Staging VPS puerto 3001 + nginx | 👤 + 🔵 | T-505 | QA URL staging | `blocked` |
| **T-507** | QA checklist sección 8 completo | 👤 | Fase 4 | Todo marcado | `blocked` |
| **T-508** | Runbook producción (`docs/RUNBOOK.md`) | 🔵 | T-505 | Rollback documentado | `blocked` |
| **T-509** | Cutover nginx → v2 apagar legacy | 👤 | T-507 | Prod en v2 | `blocked` |
| **T-510** | ADR-001 + ADR-002 archivados | 🤝 | — | Decisiones registradas | `blocked` |

**Entregable Fase 5:** Producción en v2 · legacy apagado.

---

## 8. Checklist paridad funcional (DoD global)

Marcar en **T-507** (👤 QA final).

### Público
- [ ] Landing hero configurable
- [ ] Rifa activa + progreso (vendidos + reservados)
- [ ] Galería finalizadas publicadas
- [ ] `/rifa/$id`
- [ ] Purchase wizard + min_tickets
- [ ] Upload comprobante
- [ ] Pausa countdown
- [ ] Verificador
- [ ] In-app browser redirect
- [ ] Branding + contacto + redes
- [ ] Español

### Admin
- [ ] Auth httpOnly + RBAC
- [ ] Dashboard
- [ ] Tabla ventas + CSV
- [ ] Modal venta completo
- [ ] CRUD rifas
- [ ] Pausa/publish
- [ ] Analytics
- [ ] Boletos
- [ ] Config tabs
- [ ] Email logs
- [ ] Usuarios super_admin
- [ ] Maintenance

### Ops
- [ ] 3 crons Inngest
- [ ] 5 emails activos
- [ ] Rate limit
- [ ] Pino logs
- [ ] Docker/GHCR
- [ ] Backup uploads

---

## 9. División resumen (quién hace qué)

### 👤 USER (~15% esfuerzo)
- Bootstrap B-01…B-10
- Decisiones D-01, D-02, D-03
- Secretos VPS + GitHub Actions secrets
- Wireframes ligeros (opcional)
- QA manual T-507
- Cutover prod T-509

### 🟣 DeepSeek (~45% esfuerzo)
- **Todo `packages/shared/db` + validators + errors**
- **Todo `app/server/` + server functions API**
- **Todo `inngest/`**
- Servicios: Ticket, Purchase, Pause, Raffle, Analytics
- Better Auth + RBAC backend
- Email templates + adapters + jobs
- multer/upload backend
- Tests integración concurrencia/pausa/compra
- Load test script

### 🔵 Composer (~40% esfuerzo)
- **Todo `app/features/` + rutas UI `app/app/` (excepto api)**
- shadcn + layouts público/admin
- Zustand site config + Query hooks
- Purchase wizard UI + admin tables/charts
- env.ts, logger, rate limit middleware
- Docker, CI, nginx, runbook
- Playwright E2E
- Vitest smoke/setup

---

## 10. Orden recomendado de arranque (post-bootstrap)

```
👤 B-01…B-09
    ├── 🟣 T-001 → T-005 → T-003 → T-008 → T-009
    ├── 🔵 T-006 → T-007 → T-010 → T-014 → T-015 → T-016
    └── 🤝 T-011 → T-012 → T-013

🟣 Fase 1 backend (T-101…T-112)  ||  paralelo  🔵 T-113 (timezone utils)

🟣 Fase 2 (T-201…T-212)          ||  paralelo  🔵 T-213 → T-214

🔵 Fase 3 UI pública (T-301…T-310) — necesita T-108, T-211

🔵 Fase 4 admin (T-401…T-413)

🔵 T-501…T-503  +  🟣 T-504  +  👤🔵 T-505…T-509
```

---

## 11. Comandos útiles (post-bootstrap)

```bash
# Root
bun install
bun dev                    # TanStack Start
bun run lint
bun run typecheck
bun test

# Drizzle (packages/shared)
bun run db:pull            # wrapper drizzle-kit pull
bun run db:generate
bun run db:migrate
bun run db:studio

# Docker
docker build -t raffle-v2:local .
docker compose up -d

# E2E
bun run test:e2e
```

---

## 12. Principios no negociables

1. TS strict · 2. Archivos pequeños · 3. Tests flujos críticos · 4. Pino sin PII · 5. Env Zod · 6. Errores dominio · 7. UTC BD / Caracas UI · 8. WCAG AA · 9. Sin `any` · 10. No nueva infra de pago

---

## 13. Referencias

| Doc | Uso |
|-----|-----|
| `backend-legacy/` | Comportamiento esperado API/reglas |
| `frontend-legacy/` | UX referencia (no copiar código) |
| `PROPUESTA_NUEVO_DESARROLLO_deepseek-v4-pro-max.md` | Detalle Docker, concurrencia SQL |
| `PROPUESTA_NUEVO_DESARROLLO_composer-2-5.md` | Detalle nginx, cutover, seguridad |
| **Este doc** | **Fuente de verdad para tareas y ownership** |

---

## 14. Cómo actualizar este doc

Al completar una tarea, cambiar **Estado** a `done` y añadir PR/commit:

```markdown
| **T-001** | drizzle pull | 🟣 | B-09 | Schema generado | `done` (#12 abc123) |
```

---

*Documento unificado para coordinación USER + DeepSeek + Composer. Empezar por bootstrap 👤, luego agentes en tareas `ready`.*
