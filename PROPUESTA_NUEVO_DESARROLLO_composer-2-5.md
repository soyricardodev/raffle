# PROPUESTA: Nuevo desarrollo — Plataforma de Rifas v2

**Autor:** Composer 2.5 (revisión v2 — alineada con propuesta pragmática DeepSeek v3)  
**Fecha:** 2026-05-24  
**Estado:** Propuesta técnica para reescritura desde cero  
**Alcance:** Paridad funcional con `backend-legacy` / `frontend-legacy`, arquitectura sana, **misma infraestructura** ($10 VPS InterServer + MySQL + uploads en disco).

> **TL;DR:** TanStack Start + **MySQL** + Drizzle + Inngest + multer local. Un solo codebase, Docker → GHCR → VPS. Cero migración de datos, cero servicios cloud obligatorios. **No Next.js. No libSQL. No R2.**

---

## 1. Resumen ejecutivo

El legacy demostró que el **producto funciona**. El código demostró que **no es mantenible**.

La primera versión de esta propuesta (Composer v1) pecaba de lo mismo que criticamos al legacy mal hecho: **optimizar para la nube** (Turso, Vercel, Fly, R2) cuando ya existe un VPS de $10/mes con MySQL y las imágenes en disco.

**Esta revisión v2 adopta la filosofía correcta:**

> Reescribir el **código**, no la **infraestructura**.

| Mantener | Reemplazar |
|----------|------------|
| VPS InterServer ($10/mes) | Express + controllers de 2000 líneas |
| MySQL `raffle_db` | SQL crudo sin tipos |
| `/opt/raffle/uploads` en disco | `setTimeout`, `node-cron` frágil |
| Resend o Brevo (adapter) | JWT en localStorage |
| — | React SPA + API separados sin contrato |

---

## 2. ¿Por qué NO migrar infraestructura?

Migrar MySQL → libSQL o uploads → R2 agrega:

- Riesgo de pérdida de datos en ETL
- Downtime moviendo archivos
- Dos sistemas en paralelo durante transición
- Coste cognitivo sin beneficio a escala de rifas VE

**Drizzle funciona idéntico con MySQL (`mysql2`).** Si algún día se quiere Turso, se cambia el driver. Hoy no hace falta.

---

## 3. Stack tecnológico final

| Capa | Tecnología | Por qué |
|------|------------|---------|
| **Framework único** | **TanStack Start** | Front + back en un repo; server functions tipadas; SSR opcional para landing; **no Next.js** |
| **Runtime dev** | **Bun** | Install, dev, test rápidos |
| **Runtime prod** | **Node 22** (Docker) | Compatibilidad estable con `mysql2` nativo |
| **Base de datos** | **MySQL + Drizzle** (`mysql2`) | La misma DB del VPS |
| **Auth** | **Better Auth** | Cookies httpOnly, RBAC, inmune a XSS |
| **Validación** | **Zod** | Schemas compartidos cliente/servidor |
| **Jobs** | **Inngest** | Emails, pausas, scheduler; sidecar en docker-compose del VPS |
| **Email** | **Brevo** (300/día free) o **Resend** (si ya configurado) | Adapter intercambiable + React Email |
| **Uploads** | **multer** → disco local | Misma carpeta del VPS; nginx sirve estáticos |
| **UI** | **shadcn/ui + Tailwind CSS v4** | Accesible, profesional, mantenible |
| **Estado** | **TanStack Query v5 + Zustand** | Server state + config global del sitio |
| **Formularios** | **React Hook Form + Zod** | Misma validación que server functions |
| **Tablas admin** | **TanStack Table v8** | Reemplaza tablas manuales de 2000 líneas |
| **Charts** | **Recharts** | Ya conocido del equipo |
| **Testing** | **Vitest + Playwright** | Unit + integración + E2E |
| **Lint/Format** | **Biome** | Rápido, un solo tool |
| **Monorepo** | **Turborepo** | `packages/shared` + app TanStack Start |
| **Deploy** | **Docker → GHCR → VPS** | `docker compose pull && up -d` |
| **Proxy** | **nginx** (en el VPS, fuera del container) | SSL, gzip, `/uploads` estáticos, reverse proxy a `:3000` |

### Por qué TanStack Start y no Next.js

- Un solo framework full-stack sin convenciones propietarias de Vercel.
- File-based routing con **TanStack Router** (tipado de params y search).
- Server functions nativas — no hace falta Hono separado ni `apps/api`.
- El equipo ya usa React; la curva es menor que adoptar App Router + Server Actions + middleware edge.
- Deploy en **tu VPS con Docker**, no atado a hosting específico.

### Por qué no Hono + Vite separados (Composer v1)

Correcto en arquitectura, incorrecto en ops para este proyecto: dos procesos, dos deploys, CORS, proxy duplicado. TanStack Start unifica.

---

## 4. Costos

| Servicio | Costo |
|----------|-------|
| VPS InterServer (3 slices) | **$10/mes** (ya se paga) |
| MySQL | Incluido en VPS |
| Uploads en disco | Incluido en VPS |
| Brevo / Resend | **$0** en free tier |
| Inngest | **$0** (1 evento/seg free) |
| GHCR | **$0** (GitHub) |
| GitHub Actions | **$0** (minutes incluidos) |
| **Total adicional** | **$0** |

---

## 5. Estructura del proyecto

```
raffle-v2/
├── packages/
│   └── shared/
│       ├── src/
│       │   ├── db/
│       │   │   ├── schema/       # mysqlTable — generado con drizzle-kit pull
│       │   │   ├── relations.ts
│       │   │   └── index.ts
│       │   ├── validators/       # Zod
│       │   ├── types/
│       │   ├── constants/
│       │   └── emails/           # React Email templates
│       ├── drizzle.config.ts
│       └── package.json
│
├── app/                          # TanStack Start
│   ├── app.config.ts
│   ├── app/
│   │   ├── __root.tsx            # QueryClient, Auth, theme, site config
│   │   ├── (public)/
│   │   │   ├── _layout.tsx
│   │   │   ├── index.tsx         # Landing
│   │   │   ├── rifa.$id.tsx
│   │   │   └── verificar.tsx
│   │   ├── (auth)/
│   │   │   ├── login.tsx
│   │   │   └── admin/
│   │   │       ├── _layout.tsx   # Sidebar + RBAC guard
│   │   │       ├── index.tsx     # Dashboard
│   │   │       ├── rifas/
│   │   │       ├── ventas/
│   │   │       ├── analytics.tsx
│   │   │       ├── boletos.tsx
│   │   │       ├── config.tsx
│   │   │       └── emails.tsx    # Legacy nunca enrutó esto — aquí sí
│   │   └── api/                  # Server functions / route handlers
│   │       ├── purchases.ts
│   │       ├── raffles.ts
│   │       ├── tickets.ts
│   │       ├── config.ts
│   │       ├── auth.ts
│   │       └── uploads.ts
│   ├── features/                 # Componentes <200 líneas
│   │   ├── purchase/
│   │   ├── raffle-card/
│   │   ├── ticket-verifier/
│   │   ├── admin/
│   │   └── ui/                   # shadcn
│   ├── server/                   # Servicios de dominio (sin HTTP)
│   │   ├── ticket.service.ts
│   │   ├── purchase.service.ts
│   │   ├── pause.service.ts
│   │   ├── raffle.service.ts
│   │   └── analytics.service.ts
│   ├── lib/
│   │   ├── db.ts
│   │   ├── auth.ts
│   │   ├── inngest.ts
│   │   ├── email.ts
│   │   ├── upload.ts
│   │   ├── env.ts                # Zod — fail fast al boot
│   │   └── logger.ts             # Pino
│   └── stores/
│       └── site-config.ts
│
├── inngest/
│   ├── email-send.ts
│   ├── raffle-auto-pause.ts
│   ├── raffle-finalize-expired.ts
│   ├── raffle-process-paused.ts
│   └── cleanup-reserved.ts
│
├── scripts/
│   ├── drizzle-pull.ts
│   └── seed.ts
│
├── docker-compose.yml
├── Dockerfile
├── nginx/
│   └── raffle.conf.example       # SSL + /uploads + proxy_pass
├── turbo.json
├── biome.json
└── .github/workflows/deploy.yml
```

**Regla de capas:** Server functions <150 líneas → delegan a `server/*.service.ts`. Servicios <200 líneas → extraer helpers puros.

---

## 6. Base de datos — MySQL + Drizzle

### Estrategia: cero migración de datos

```bash
# Conectar Drizzle a la DB existente del VPS (o copia local)
bun run drizzle-kit pull

# Revisar schema generado: ENUMs, JSON, columnas pause/publish
# App v2 apunta a las MISMAS tablas y datos
# Columnas nuevas → drizzle-kit generate + migrate antes del deploy
```

### Lo que cambia vs legacy

| Legacy | v2 |
|--------|-----|
| `connection.execute(sql, params)` | `db.select().from(table).where(...)` |
| `database.sql` + ALTERs sueltos | Schema TS + migraciones versionadas |
| Modelos vacíos (`// modelos en BD`) | Schema Drizzle con relaciones |
| `- INTERVAL 4 HOUR` en SQL | UTC en BD; `America/Caracas` solo en display (`date-fns-tz`) |

### Conexión

```typescript
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "@raffle/shared/db/schema";

const pool = mysql.createPool({
  uri: env.DATABASE_URL, // mysql://user:pass@host.docker.internal:3306/raffle_db
  connectionLimit: 10,
});

export const db = drizzle(pool, { schema, mode: "default" });
```

---

## 7. Concurrencia — `SELECT ... FOR UPDATE`

El legacy hace SELECT → verificar en JS → UPDATE paralelo. Eso es una race condition.

**Solución MySQL (correcta para este dominio):**

```typescript
export async function reserveTicketsAtomically(
  tx: Transaction,
  raffleId: number,
  quantity: number,
  purchaseId: number
): Promise<string[]> {
  // 1. Bloquear fila de rifa
  await tx.execute(
    sql`SELECT id FROM raffles WHERE id = ${raffleId} FOR UPDATE`
  );

  const raffle = await tx.query.raffles.findFirst({
    where: eq(raffles.id, raffleId),
  });

  if (!raffle || raffle.status !== "active") {
    throw new RaffleNotActiveError(raffleId);
  }

  // 2. Seleccionar y bloquear tickets
  const selected = await tx
    .select({ ticketNumber: tickets.ticketNumber })
    .from(tickets)
    .where(
      and(
        eq(tickets.raffleId, raffleId),
        eq(tickets.status, "available")
      )
    )
    .orderBy(sql`RAND()`)
    .limit(quantity)
    .for("update");

  if (selected.length < quantity) {
    throw new InsufficientTicketsError(selected.length, quantity);
  }

  const numbers = selected.map((t) => t.ticketNumber);

  // 3. Reservar — guarda verifica que sigan available
  const result = await tx
    .update(tickets)
    .set({ status: "reserved", purchaseId })
    .where(
      and(
        eq(tickets.raffleId, raffleId),
        inArray(tickets.ticketNumber, numbers),
        eq(tickets.status, "available")
      )
    );

  if (result.rowsAffected !== quantity) {
    throw new ConcurrentPurchaseError();
  }

  return numbers;
}
```

**Tests obligatorios:** 2+ compras simultáneas contra la misma rifa con últimos N tickets — ninguna sobre-asigna.

### Generación de pool de tickets (crear rifa)

No Fisher-Yates de 10.000 strings en memoria (bug legacy). Opciones:

1. **Batch INSERT** con números 0000–9999 shuffled en SQL, o  
2. **Generar N únicos** con loop + Set hasta `total_tickets` (solo al crear, no en cada compra).

---

## 8. Uploads — multer local, limpio

| Legacy | v2 |
|--------|-----|
| 50 MB límite | **5 MB** imagen/PDF |
| `prize_image_0`…`19` hardcode | Array `prizeImages[]` |
| Config multer 100 líneas ad-hoc | `lib/upload.ts` tipado + middleware error handler |
| Servido por Express | **nginx** `alias /opt/raffle/uploads/` (más eficiente) |

Docker monta bind volume:

```yaml
volumes:
  - /opt/raffle/uploads:/app/uploads
```

**Backup:** cron diario `rsync` del directorio uploads. Si crece >5 GB, evaluar R2 (cambio localizado en `lib/upload.ts`).

---

## 9. Jobs — Inngest en el mismo VPS

| Función | Trigger | Reemplaza |
|---------|---------|-----------|
| `email/send-confirmation` | Post-compra | setTimeout + email roto |
| `email/send-status-update` | Approve/reject | código comentado legacy |
| `email/send-ticket-modification` | Add/remove tickets | único email que funcionaba |
| `email/send-reassign` | Reassign rejected | código comentado legacy |
| `raffle/check-auto-pause` | Post-compra, post-admin | setTimeout × 5 |
| `raffle/finalize-expired` | Cron 5 min | node-cron parcial |
| `raffle/process-paused` | Cron 1 min | nunca conectado en legacy |
| `maintenance/cleanup-reserved` | Cron 30 min | no existía — reservas huérfanas |

**docker-compose:** servicio `app` + servicio `inngest` (misma imagen, distinto command).

**Nota Composer:** Si Inngest cloud no es deseable a largo plazo, la tabla `job_outbox` en MySQL + worker Node es fallback de ~100 líneas. Inngest gana en retries/observabilidad; el outbox gana en cero dependencia externa. Para v2, **Inngest free tier es suficiente**; documentar outbox como plan B en ADR.

---

## 10. Email

**Default:** Brevo (300 emails/día gratis).  
**Si Resend ya está verificado en prod:** mantener via `EMAIL_PROVIDER=resend`.

```
packages/shared/src/emails/     # React Email (.tsx)
app/lib/email/
  ├── port.ts                   # interface EmailPort
  ├── brevo.adapter.ts
  ├── resend.adapter.ts
  └── noop.adapter.ts           # dev
```

Los 5 tipos del legacy deben **funcionar todos** — no repetir el error de dejar confirmación/status comentados.

---

## 11. Deploy — Docker + GHCR + nginx

### Flujo

```
git push main
  → GitHub Actions: lint, typecheck, test
  → docker build → push ghcr.io/.../raffle-v2:latest
  → SSH VPS: docker pull && docker compose up -d
  → nginx ya apunta a :3000
```

### nginx (en el host, recomendado)

```nginx
server {
    listen 443 ssl;
    server_name rifas.example.com;

    location /uploads/ {
        alias /opt/raffle/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        client_max_body_size 6m;
    }
}
```

**Ventaja vs legacy:** uploads no pasan por Node; menos RAM en el slice de $10.

### Cutover sin downtime de datos

1. Deploy v2 en **puerto 3001** (staging en mismo VPS).  
2. QA checklist completo contra **misma DB** (solo lectura primero, luego writes en staging).  
3. Cambiar nginx upstream 5000/3000 legacy → 3000 v2.  
4. Apagar container legacy. **Mismos datos, mismas URLs de uploads.**

---

## 12. Seguridad (lecciones del legacy)

| Bug legacy | Fix v2 |
|------------|--------|
| JWT `'your-secret-key'` fallback | Zod env; proceso no arranca sin secret |
| Resend key en repo | Solo env |
| `GET /top-clients` público | Solo admin + RBAC |
| Email routes sin auth | Better Auth en todas las server functions admin |
| Cualquier admin crea users | Solo `super_admin` |
| PII en console.log | Pino con `purchaseId`, no nombres |
| Rutas Express `/:id` antes de `/admin/*` | TanStack Router: rutas explícitas, prefijo `/admin/` |
| Token en localStorage | Cookie httpOnly |

**Rate limits en server functions públicas:** compra 3/min/IP, verify 10/min/IP, login 5/min/IP.

---

## 13. Frontend — mejoras concretas

### Composición (PurchaseForm legacy 1180 líneas →)

```
features/purchase/
├── PurchaseWizard.tsx           # ~80 líneas
├── TicketQuantitySelector.tsx
├── PaymentMethodSelector.tsx
├── CustomerInfoFields.tsx
├── LocationSelector.tsx
├── PaymentProofUpload.tsx
├── PausedRaffleOverlay.tsx
├── PurchaseSuccessModal.tsx
├── use-purchase-form.ts
└── use-pause-timer.ts           # React Query invalidation, NO reload
```

### Admin

- **TanStack Table** para ventas, boletos, email logs.  
- **Recharts** en componentes separados (`SalesTrendChart.tsx`, `MethodPieChart.tsx`).  
- **Zustand** para `site_config` — un fetch, CSS variables en `:root`.  
- Eliminar `/Secondhome` — un landing; variante hero vía config si hace falta.

### Tipado end-to-end

Server functions exportan input/output Zod. El cliente infiere tipos — sin axios + fetch mezclados como legacy.

---

## 14. Checklist de paridad funcional (DoD)

### Público

- [ ] Landing con hero configurable (partículas/tema desde config)
- [ ] Rifa activa + barra progreso (vendidos + reservados)
- [ ] Galería rifas finalizadas publicadas (paginación)
- [ ] `/rifa/$id` detalle + compra
- [ ] Purchase wizard multi-step
- [ ] Métodos pago con `min_tickets`
- [ ] Upload comprobante (multer)
- [ ] UX pausa countdown (React Query)
- [ ] Verificador (teléfono, CI, email, ticket)
- [ ] In-app browser redirect
- [ ] Branding dinámico + contacto/redes
- [ ] Español

### Admin

- [ ] Login/logout httpOnly + RBAC
- [ ] Dashboard KPIs
- [ ] Tabla ventas infinita + filtros + CSV export
- [ ] Modal: aprobar, rechazar, reasignar, add/remove tickets
- [ ] CRUD rifas + imágenes + premios + métodos pago
- [ ] Pausa manual/unpause/auto-pause/publish
- [ ] Historial + delete (sin compras)
- [ ] Analytics Recharts
- [ ] Boletos vendidos
- [ ] Config (todos los tabs)
- [ ] Email logs + resend + test
- [ ] Crear usuarios (super_admin)
- [ ] Maintenance manual

### Ops

- [ ] Scheduler Inngest (finalize, pause, cleanup reserved)
- [ ] 5 tipos email operativos
- [ ] Docker → GHCR → VPS
- [ ] Backup uploads (rsync cron)
- [ ] Tests: compra concurrente, pausa, auth

---

## 15. Plan de fases

### Fase 0 — Fundación (Semana 1)

- [ ] Turborepo + Biome + TS strict + TanStack Start scaffold
- [ ] `drizzle-kit pull` → schema desde MySQL existente
- [ ] Better Auth (misma tabla `users`, bcrypt compatible)
- [ ] Dockerfile + docker-compose + GHCR workflow
- [ ] `env.ts` Zod + CI lint/typecheck/test
- [ ] nginx example config

**Entregable:** `bun dev` + login contra DB real. Docker build OK.

### Fase 1 — Core transaccional (Semanas 2–3)

- [ ] Servicios: Ticket, Purchase, Pause, Raffle
- [ ] Server functions CRUD + compra
- [ ] Tests integración concurrencia + pausa

**Entregable:** Compra API funcional con tests verdes.

### Fase 2 — Jobs + Email + Uploads (Semana 4)

- [ ] Inngest sidecar + 8 functions
- [ ] React Email × 5 + adapter Brevo/Resend
- [ ] multer tipado + nginx static
- [ ] Admin email logs

**Entregable:** Compra → email llega. Scheduler corre.

### Fase 3 — Frontend público (Semanas 5–6)

- [ ] Layout + landing + detalle rifa
- [ ] Purchase wizard componentizado
- [ ] Verificador + in-app redirect + branding

**Entregable:** Flujo compra E2E manual.

### Fase 4 — Admin (Semanas 7–8)

- [ ] Dashboard, ventas, rifas, analytics, boletos, config, emails, users

**Entregable:** Paridad admin con legacy.

### Fase 5 — Cutover (Semanas 9–10)

- [ ] Staging puerto 3001 en VPS
- [ ] Playwright E2E críticos
- [ ] Load test 50 compras concurrentes
- [ ] nginx cutover + apagar legacy

**Entregable:** v2 en producción. **$10/mes, mismos datos.**

**Total: 10 semanas** (1 dev) / **7–8 semanas** (2 devs).

---

## 16. Deuda técnica que muere

| Legacy | v2 |
|--------|-----|
| 1950-line controllers | Server functions + services <200 líneas |
| Race condition tickets | `FOR UPDATE` transaccional |
| setTimeout post-compra | Inngest |
| window.location.reload | TanStack Query invalidate |
| Componentes 2000+ líneas | Composición <200 |
| 0 tests | Vitest + Playwright |
| Emails comentados/roto | 5 tipos activos |
| EmailLogs sin ruta | `/admin/emails` |
| ENUM role mismatch | Zod + mysqlEnum alineados |
| percentage_mode sin lógica | **Decisión explícita:** implementar o eliminar del MVP |

---

## 17. Principios no negociables

1. TypeScript strict — `noUncheckedIndexedAccess`
2. Componentes **<200 líneas**; server functions **<150**
3. Tests en compra concurrente, pausa, auth, approve/reject
4. Pino — nunca PII en logs
5. Fail fast env (Zod)
6. Errores de dominio tipados (`InsufficientTicketsError`, etc.)
7. UTC en BD; Caracas solo en UI
8. WCAG AA (shadcn + axe en CI)
9. Cero `any` innecesario
10. **No agregar infra de pago** sin justificar vs el VPS actual

---

## 18. Comparativa de propuestas

| Aspecto | Composer v1 (obsoleta) | DeepSeek v3 | **Composer v2 (este doc)** |
|---------|------------------------|-------------|----------------------------|
| Framework | Next.js + Hono | TanStack Start | **TanStack Start** |
| DB | libSQL/Turso | MySQL + Drizzle | **MySQL + Drizzle** |
| Uploads | R2 presigned | multer local | **multer + nginx static** |
| Deploy | Vercel + Fly | Docker/GHCR/VPS | **Docker/GHCR/VPS + nginx** |
| Migración datos | ETL MySQL→libSQL | Cero (drizzle pull) | **Cero (drizzle pull)** |
| Costo | $0–11 extra/mo | $10 total | **$10 total** |
| Jobs | Inngest cloud | Inngest sidecar | **Inngest sidecar (+ outbox plan B)** |

---

## 19. Próximos pasos inmediatos

1. **Rotar secretos legacy** — JWT default, API keys en repo (urgente).
2. **Decidir `percentage_mode`** — implementar o sacar del schema MVP.
3. **Crear repo `raffle-v2`** — Turborepo + TanStack Start scaffold.
4. **`drizzle-kit pull`** contra copia de prod MySQL.
5. **Wireframes** — purchase wizard, dashboard, tabla ventas (3 pantallas).
6. **ADR-001** — "Reescribir código, no infra" (este documento).

---

## 20. Conclusión

La propuesta DeepSeek v3 acertó en lo esencial: **TanStack Start, MySQL, multer, VPS, Docker**. Composer v1 aportaba buenas ideas de dominio y calidad, pero el stack cloud era el enemigo del contexto real.

Esta revisión v2 **fusiona ambas**: pragmatismo infra de DeepSeek + énfasis en tests, nginx, errores de dominio, cutover staging, y plan B outbox de Composer.

El legacy sigue siendo la especificación de **qué** construir. Este documento es **cómo**, sin pagar un centavo más de infraestructura.

---

*Revisión cruzada con `PROPUESTA_NUEVO_DESARROLLO_deepseek-v4-pro-max.md` v3 (pragmática). Sin Next.js. Sin libSQL. Sin R2 obligatorio.*
