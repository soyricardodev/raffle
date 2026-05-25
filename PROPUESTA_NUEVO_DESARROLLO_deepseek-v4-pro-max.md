# PROPUESTA NUEVO DESARROLLO — Raffle App v2

> **Autor:** deepseek-v4-pro-max  
> **Fecha:** Mayo 2026 — v3 (pragmática)  
> **Objetivo:** Reescritura completa del sistema de rifas con todas las features preservadas, cero deuda técnica, arquitectura moderna tipada. **Reusando infraestructura existente:** MySQL, filesystem local, VPS Interserver.  
> **Actualización v3:** MySQL+Drizzle en vez de libSQL, multer en vez de R2, Docker+GHCR para deploy. La migración de infra es cero — solo se reemplaza el código.

> **TL;DR:** TanStack Start + **MySQL** + Drizzle + Inngest + multer local. Un solo codebase, Dockerizado a GHCR, deploy en el VPS actual. Cero migración de datos, cero servicios externos nuevos.

---

## 1. ¿POR QUÉ NO MIGRAR INFRAESTRUCTURA?

La reescritura es de **código**, no de infraestructura. El VPS de $10/mes ya funciona. MySQL ya tiene los datos. Las imágenes ya están en disco. Migrar DB y storage agrega:

- Riesgo de pérdida de datos en el ETL MySQL → libSQL
- Downtime durante la migración de archivos a R2
- Curva de aprendizaje en Turso para el equipo
- Dos sistemas corriendo en paralelo durante la transición

**Decisión:** Drizzle funciona idéntico con MySQL (`mysql2`) que con libSQL. Mismo schema tipado, mismas migraciones, mismas queries. Si en el futuro se quiere migrar a Turso, Drizzle lo hace trivial (cambiar driver, regenerar migraciones). Pero no es necesario hoy.

---

## 2. STACK TECNOLÓGICO FINAL

| Capa | Tecnología | Por qué |
|---|---|---|
| **Framework** | **TanStack Start** | Un solo codebase, server functions tipadas, SSR opcional |
| **Runtime** | **Bun** | Dev, test, build. Docker corre Node en prod |
| **Base de datos** | **MySQL + Drizzle** (`mysql2`) | El mismo MySQL que ya corre en el VPS. Drizzle da tipos, migraciones, relaciones |
| **Auth** | **Better Auth** | Sesiones httpOnly cookies, RBAC, inmune a XSS |
| **Validación** | **Zod** | Schemas compartidos cliente/servidor |
| **Jobs** | **Inngest** | Emails, pausas, scheduler. Cero `setTimeout`. Corre como sidecar en el mismo VPS |
| **Email** | **Brevo** (300/día free) o **Resend** (100/día free, ya configurado) | El que ya tengan andando. Adapter swappeable |
| **Uploads** | **multer** (mismo enfoque) | Ya funciona. Lo limpiamos: middleware tipado, validación Zod, sin magic strings |
| **UI** | **shadcn/ui + Tailwind CSS v4** | Accesible, copiable, profesional |
| **Estado** | **TanStack Query v5 + Zustand** | Server state + client state |
| **Formularios** | **React Hook Form + Zod** | Validación compartida con backend |
| **Tablas admin** | **TanStack Table v8** | Reemplaza 80% del código manual de tablas |
| **Charts admin** | **Recharts** | Ya conocido, mantenido |
| **Testing** | **Vitest + Playwright** | Unitarios + integración + E2E |
| **Lint/Format** | **Biome** | 10x más rápido que ESLint+Prettier |
| **Monorepo** | **Turborepo** | Caché de builds |
| **Deploy** | **Docker → GHCR → VPS** | `docker pull` y `docker compose up -d` |

---

## 3. DOCKER + GHCR — Flujo de Deploy

### 3.1 Dockerfile (multistage)

```dockerfile
# Stage 1: Build
FROM oven/bun:1 AS builder
WORKDIR /app
COPY . .
RUN bun install --frozen-lockfile
RUN bun run build

# Stage 2: Prod (Node para compatibilidad con mysql2 nativo)
FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/.output ./
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "server/index.mjs"]
```

### 3.2 docker-compose.yml (para el VPS)

```yaml
version: "3.8"
services:
  app:
    image: ghcr.io/tu-usuario/raffle-v2:latest
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=mysql://raffle:password@host.docker.internal:3306/raffle_db
      - JWT_SECRET=${JWT_SECRET}
      - BREVO_API_KEY=${BREVO_API_KEY}
      - INNGEST_EVENT_KEY=${INNGEST_EVENT_KEY}
    volumes:
      - uploads_data:/app/uploads       # Montar mismo volumen que el legacy
      - ./uploads:/app/uploads:ro       # Leer archivos legacy durante migración
    restart: unless-stopped
    extra_hosts:
      - "host.docker.internal:host-gateway"

  inngest:
    image: ghcr.io/tu-usuario/raffle-v2:latest
    command: ["bun", "run", "inngest/start.ts"]
    environment:
      - DATABASE_URL=mysql://raffle:password@host.docker.internal:3306/raffle_db
      - INNGEST_EVENT_KEY=${INNGEST_EVENT_KEY}
      - BREVO_API_KEY=${BREVO_API_KEY}
    restart: unless-stopped
    extra_hosts:
      - "host.docker.internal:host-gateway"

volumes:
  uploads_data:
    driver: local
    driver_opts:
      device: /opt/raffle/uploads
      o: bind
```

### 3.3 GitHub Actions → GHCR

```yaml
# .github/workflows/deploy.yml
name: Build & Deploy
on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install --frozen-lockfile
      - run: bun run lint && bun run typecheck && bun run test
      
      - name: Build Docker image
        run: docker build -t ghcr.io/${{ github.repository }}:${{ github.sha }} .
      
      - name: Push to GHCR
        run: |
          echo "${{ secrets.GITHUB_TOKEN }}" | docker login ghcr.io -u ${{ github.actor }} --password-stdin
          docker push ghcr.io/${{ github.repository }}:${{ github.sha }}
          docker tag ghcr.io/${{ github.repository }}:${{ github.sha }} ghcr.io/${{ github.repository }}:latest
          docker push ghcr.io/${{ github.repository }}:latest
      
      - name: Deploy to VPS
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /opt/raffle-v2
            echo "${{ secrets.GITHUB_TOKEN }}" | docker login ghcr.io -u ${{ github.actor }} --password-stdin
            docker pull ghcr.io/${{ github.repository }}:latest
            docker compose down
            docker compose up -d
            docker image prune -f
```

### 3.4 ¿Por qué GHCR?

- **Gratuito** para repos públicos, incluido en GitHub para privados
- **Sin registro externo** que configurar (Docker Hub, ECR, etc.)
- **El VPS solo necesita `docker login ghcr.io`** una vez con un token
- **Rollback instantáneo**: `docker pull ghcr.io/...:v1.2.3 && docker compose up -d`
- Misma herramienta que ya usan (`docker-compose`), solo cambia el registry source

---

## 4. BASE DE DATOS — MySQL + Drizzle

### 4.1 Lo que se mantiene

- El mismo servidor MySQL en el VPS
- La misma base `raffle_db`
- Los mismos datos (no se migran, se evolucionan con migraciones Drizzle)
- Connection pooling via `mysql2` (igual que ahora, pero tipado)

### 4.2 Lo que cambia

| Legacy | Nuevo |
|---|---|
| Queries SQL crudas en strings | Drizzle query builder tipado |
| `connection.execute(sql, params)` | `db.select().from(table).where(...)` |
| Schema en `database.sql` + parches sueltos | Schema en TypeScript, migraciones con `drizzle-kit` |
| Sin tipos entre DB y código | `SelectRaffle`, `InsertPurchase` inferidos del schema |
| `ENUM` en MySQL | `mysqlEnum` en Drizzle (mismo ENUM de MySQL, nativo) |
| `JSON` type manual | `json("account_info").$type<PaymentInfo>()` |

### 4.3 Estrategia de migración de schema

**No se migran datos.** El schema de Drizzle se genera **a partir del schema actual de MySQL** usando `drizzle-kit pull`:

```bash
# 1. Conectar Drizzle a la DB existente
# 2. Pull del schema actual
bun run drizzle-kit pull

# 3. Esto genera automáticamente los archivos de schema Drizzle
#    desde las tablas que YA existen en MySQL

# 4. Revisar y ajustar tipos (ej: ENUMs, JSON columns)
# 5. La app v2 usa el mismo schema, mismas tablas, mismos datos
```

**Ventaja:** La app v2 se despliega apuntando a la misma DB. Cero downtime, cero ETL. Si hay que agregar columnas nuevas, se hace con migraciones Drizzle normales que corren antes del deploy.

### 4.4 Schema Drizzle desde MySQL existente

```typescript
// packages/shared/src/db/schema/users.ts
import { mysqlTable, int, varchar, text, timestamp, mysqlEnum } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").primaryKey().autoincrement(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  email: varchar("email", { length: 100 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: mysqlEnum("role", ["admin", "super_admin"]).default("admin").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export const raffles = mysqlTable("raffles", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 200 }).notNull(),
  status: mysqlEnum("status", ["draft", "active", "paused", "finished", "cancelled"]).default("draft"),
  pauseUntil: timestamp("pause_until"),
  pauseReason: mysqlEnum("pause_reason", ["manual", "auto_full", "auto_insufficient", "auto_timeout"]),
  autoPauseEnabled: boolean("auto_pause_enabled").default(true),
  // ... resto de columnas
});
```

### 4.5 Conexión

```typescript
// lib/db.ts
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "@raffle/shared/db/schema";

const connection = mysql.createPool({
  uri: env.DATABASE_URL,         // mysql://user:pass@localhost:3306/raffle_db
  connectionLimit: 10,
});

export const db = drizzle(connection, { schema, mode: "default" });
```

---

## 5. UPLOADS — multer local, igual pero limpio

### 5.1 Lo que se mantiene

- Archivos en `/opt/raffle/uploads/` (misma carpeta del VPS)
- Servidos como estáticos por el mismo servidor
- Docker monta el volumen `uploads_data` del host

### 5.2 Lo que se limpia

| Legacy | Nuevo |
|---|---|
| `config/multer.js` con 100 líneas de configuración ad-hoc | Middleware tipado con `multer` + Zod para validar antes de guardar |
| `uploadRaffleFiles` con campos `prize_image_0` a `prize_image_19` hardcodeados | Upload genérico con array de archivos, sin campos mágicos |
| Validación de MIME manual | Zod schema con `.refine()` para tipo y tamaño |
| Error handler inline en multer config | Middleware `uploadErrorHandler` reutilizable |
| Archivos accesibles públicamente sin auth | Solo `/uploads/payments/` es público. `/uploads/raffles/` y `/uploads/prizes/` también. Admin uploads requieren auth |

### 5.3 Implementación

```typescript
// lib/upload.ts
import multer from "multer";
import path from "path";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Determinar subdirectorio por tipo
    const route = req.originalUrl;
    if (route.includes("/purchases")) cb(null, path.join(UPLOAD_DIR, "payments"));
    else if (route.includes("/raffles")) cb(null, path.join(UPLOAD_DIR, "raffles"));
    else if (route.includes("/config")) cb(null, path.join(UPLOAD_DIR, "config"));
    else cb(null, path.join(UPLOAD_DIR, "misc"));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}`));
  },
});
```

### 5.4 Plan de respaldo de imágenes

Como los archivos viven en el VPS y no en un servicio externo, hay que asegurarlos:

1. **Volumen Docker con bind mount** → los archivos sobreviven redeploys
2. **Backup diario con `rsync`** del VPS a una carpeta local o a S3 (un script de 3 líneas en cron)
3. **Si el VPS crece**: cuando los uploads ocupen >5GB, evaluar migrar a R2 con presigned URLs (un cambio de ~50 líneas en `lib/upload.ts`, el resto del código no se entera)

---

## 6. CONCURRENCIA — `SELECT ... FOR UPDATE` en MySQL

### 6.1 Solución para MySQL (diferente a SQLite)

MySQL soporta `SELECT ... FOR UPDATE` nativamente dentro de transacciones. Esto es superior a `BEGIN IMMEDIATE` de SQLite:

```typescript
// app/api/purchases.ts (server function)
import { db, raffles, tickets, purchases } from "@raffle/shared/db";
import { and, eq, inArray, sql } from "drizzle-orm";
import { v4 as uuid } from "uuid";

export async function reserveTicketsAtomically(
  raffleId: number,
  quantity: number
): Promise<string[]> {
  const lockKey = uuid(); // Marca única para esta transacción

  return db.transaction(async (tx) => {
    // 1. Bloquear la rifa para escritura (previene race conditions)
    await tx.execute(
      sql`SELECT id FROM raffles WHERE id = ${raffleId} FOR UPDATE`
    );

    // 2. Verificar estado
    const raffle = await tx.query.raffles.findFirst({
      where: eq(raffles.id, raffleId),
    });

    if (!raffle || raffle.status !== "active") {
      throw new RaffleNotActiveError(raffleId);
    }

    // 3. Contar + seleccionar N tickets aleatorios
    const available = await tx
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
      .for("update"); // Bloquear estas filas también

    if (available.length < quantity) {
      throw new InsufficientTicketsError(available.length, quantity);
    }

    const ticketNumbers = available.map((t) => t.ticketNumber);

    // 4. Marcar como reservados (atómico dentro de la transacción)
    await tx
      .update(tickets)
      .set({ status: "reserved", lockKey })
      .where(
        and(
          eq(tickets.raffleId, raffleId),
          inArray(tickets.ticketNumber, ticketNumbers),
          eq(tickets.status, "available") // Solo si siguen libres
        )
      );

    return ticketNumbers;
  });
}
```

**Por qué esto es correcto:**
1. `SELECT ... FOR UPDATE` en la rifa bloquea escrituras concurrentes en esa fila
2. El `SELECT` de tickets con `.for("update")` bloquea esas filas específicas
3. Todo ocurre dentro de `db.transaction()` — rollback automático si algo falla
4. MySQL maneja el locking a nivel de fila, no de tabla (más eficiente que SQLite)
5. Si dos requests llegan simultáneamente, el segundo espera a que el primero haga commit

**Esto es más robusto que el legacy** que hacía `SELECT → verificar en JS → UPDATE` sin locks.

---

## 7. ESTRUCTURA DEL PROYECTO

```
raffle-v2/
├── packages/
│   └── shared/                    
│       ├── src/
│       │   ├── db/
│       │   │   ├── schema/        # Tablas Drizzle (mysqlTable)
│       │   │   ├── relations.ts   
│       │   │   └── index.ts       
│       │   ├── validators/        # Zod schemas
│       │   ├── types/             # Tipos inferidos
│       │   ├── constants/         
│       │   └── emails/            # React Email templates
│       ├── drizzle.config.ts
│       └── package.json
│
├── app/                           # TanStack Start
│   ├── app.config.ts              
│   ├── app/
│   │   ├── __root.tsx             # Providers: QueryClient, Auth, Theme
│   │   ├── (public)/
│   │   │   ├── _layout.tsx        # Header + Footer públicos
│   │   │   ├── index.tsx          # Landing
│   │   │   ├── rifa.$id.tsx       # Detalle rifa
│   │   │   └── verificar.tsx      # Verificador
│   │   ├── (auth)/
│   │   │   ├── login.tsx          
│   │   │   └── admin/
│   │   │       ├── _layout.tsx    # Sidebar + auth guard
│   │   │       ├── index.tsx      # Dashboard
│   │   │       ├── rifas/
│   │   │       ├── ventas/
│   │   │       ├── analytics.tsx
│   │   │       ├── boletos.tsx
│   │   │       ├── config.tsx
│   │   │       └── emails.tsx
│   │   └── api/                   # Server functions
│   │       ├── purchases.ts
│   │       ├── raffles.ts
│   │       ├── tickets.ts
│   │       ├── config.ts
│   │       ├── auth.ts
│   │       └── uploads.ts
│   ├── features/                  # Componentes pequeños
│   │   ├── purchase/
│   │   ├── raffle-card/
│   │   ├── ticket-verifier/
│   │   ├── admin/
│   │   └── ui/                    # shadcn/ui
│   ├── lib/
│   │   ├── db.ts                  # MySQL + Drizzle
│   │   ├── auth.ts                # Better Auth config
│   │   ├── inngest.ts             
│   │   ├── email.ts               # Adapter
│   │   ├── upload.ts              # multer config
│   │   └── logger.ts              # Pino
│   └── stores/
│       └── site-config.ts         
│
├── inngest/                       # Funciones Inngest
│   ├── email-send.ts
│   ├── raffle-auto-pause.ts
│   ├── raffle-finalize-expired.ts
│   ├── raffle-process-paused.ts
│   └── cleanup-reserved.ts
│
├── scripts/
│   ├── drizzle-pull.ts            # Pull schema from existing MySQL
│   └── seed.ts                    # Datos de prueba para dev
│
├── docker-compose.yml
├── Dockerfile
├── turbo.json
├── biome.json
├── tsconfig.json
├── .env.example
└── .github/workflows/
    └── deploy.yml                 # Build Docker → Push GHCR → Deploy VPS
```

---

## 8. PLAN DE FASES

### Fase 0 — Fundación + Schema (Semana 1)
- [ ] Monorepo Turborepo + Biome + TypeScript strict
- [ ] `drizzle-kit pull` del MySQL existente → schema Drizzle generado automáticamente
- [ ] Ajustar tipos en schema (ENUMs, JSON, defaults)
- [ ] TanStack Start scaffold (layout root + providers)
- [ ] Better Auth setup (login/logout, cookies httpOnly, misma tabla `users`)
- [ ] Dockerfile + docker-compose + GHCR workflow
- [ ] CI: lint, typecheck, test
- [ ] `.env` validado con Zod

**Entregable:** `bun dev` conecta al MySQL existente. Login funcional con los mismos usuarios. Docker build exitoso.

### Fase 1 — Core transaccional (Semanas 2-3)
- [ ] CRUD rifas (server functions + Zod)
- [ ] TicketService: allocate atómico con `SELECT FOR UPDATE`, release
- [ ] PurchaseService: compra con transacción concurrente-safe
- [ ] PauseService: auto/manual/unpause con reglas
- [ ] Tests de integración: 2 compras simultáneas, pausa automática

**Entregable:** API funcional. Tests de concurrencia pasando.

### Fase 2 — Jobs + Email + Uploads (Semana 4)
- [ ] Inngest setup (corre como sidecar en docker-compose)
- [ ] React Email templates (5 tipos, mismo diseño que los del legacy)
- [ ] Email adapter (Brevo o el que ya usen)
- [ ] Outbox pattern + worker Inngest
- [ ] Scheduler: finalizar rifas vencidas, procesar pausas, limpiar reserved
- [ ] multer middleware tipado (reemplaza `config/multer.js`)
- [ ] Admin email logs + resend + test

**Entregable:** Compra exitosa → email llega. Scheduler corriendo en background vía Inngest.

### Fase 3 — Frontend público (Semanas 5-6)
- [ ] Layout público con config dinámica
- [ ] Landing page (rifa activa + finalizadas publicadas)
- [ ] Detalle rifa
- [ ] Purchase wizard componentizado (<200 líneas por archivo)
- [ ] UX pausa con countdown React Query
- [ ] Verificador de tickets
- [ ] In-app browser redirect (React portal)
- [ ] Branding desde site_config → CSS variables

**Entregable:** Flujo de compra completo. Un usuario compra y verifica sus tickets.

### Fase 4 — Admin panel (Semanas 7-8)
- [ ] Layout admin (sidebar responsive, auth guard)
- [ ] Dashboard KPIs
- [ ] Tabla de ventas (TanStack Table: infinite scroll, filtros, sorting, CSV)
- [ ] Modal compra: ver, aprobar, rechazar, reasignar, add/remove tickets
- [ ] CRUD rifas con upload de imágenes (multer local)
- [ ] Analytics (Recharts)
- [ ] Boletos vendidos
- [ ] Configuración del sitio (todos los tabs)
- [ ] Email logs + test + resend
- [ ] Gestión de usuarios (super_admin)
- [ ] Mantenimiento manual

**Entregable:** Admin 100% funcional. Paridad con legacy.

### Fase 5 — Deploy + Cutover (Semanas 9-10)
- [ ] Deploy staging en VPS (puerto diferente)
- [ ] E2E Playwright: compra, rechazo, pausa, admin
- [ ] Pruebas de carga: 50 compras concurrentes
- [ ] Runbook de producción
- [ ] QA checklist completo (sección 9)
- [ ] DNS / puerto cutover. Legacy se apaga.

**Entregable:** v2 en producción.

---

## 9. CHECKLIST DE PARIDAD FUNCIONAL (DoD)

### Público
- [ ] Landing con hero configurable
- [ ] Rifa activa destacada + barra de progreso
- [ ] Galería rifas finalizadas publicadas (paginación)
- [ ] Página detalle rifa `/rifa/$id`
- [ ] Purchase wizard multi-step
- [ ] Métodos de pago dinámicos con `min_tickets`
- [ ] Upload comprobante (multer local)
- [ ] UX pausa con countdown
- [ ] Verificador de boletos (teléfono, CI, email, ticket)
- [ ] In-app browser redirect
- [ ] Branding dinámico desde `site_config`
- [ ] Contacto y redes sociales
- [ ] Textos en español

### Admin
- [ ] Login/logout con sesión httpOnly
- [ ] RBAC: admin vs super_admin
- [ ] Dashboard KPIs + ventas recientes
- [ ] Tabla ventas infinita con filtros y búsqueda
- [ ] Modal venta: tickets, aprobar, rechazar, reasignar, add/remove
- [ ] CRUD rifas con imágenes, premios, métodos de pago
- [ ] Pausa manual, unpause, auto-pause toggle, publish
- [ ] Historial rifas + eliminar (bloquear si tiene compras)
- [ ] Analytics (Recharts)
- [ ] Boletos vendidos
- [ ] Config sitio (todos los tabs)
- [ ] Email logs + reenviar + test
- [ ] Crear usuarios (super_admin)
- [ ] Mantenimiento manual

### Backend / Ops
- [ ] Scheduler finalizar rifas vencidas (Inngest cron)
- [ ] Scheduler procesar pausas expiradas (Inngest cron)
- [ ] Scheduler limpiar reserved expirados (Inngest cron)
- [ ] Todos los tipos de email (5 templates)
- [ ] Rate limiting en server functions públicas
- [ ] Logs estructurados (Pino)
- [ ] Docker build + push a GHCR
- [ ] Deploy con `docker compose up -d` en VPS

---

## 10. COSTOS

| Servicio | Costo |
|---|---|
| **VPS Interserver** (3 slices) | **$10/mes** (ya se paga) |
| **MySQL** | Incluido en VPS |
| **Uploads** | Incluido en VPS (disco) |
| **Brevo** (email) | **$0** (300/día free) |
| **Inngest** (jobs) | **$0** (1 evento/seg free) |
| **GHCR** (container registry) | **$0** (incluido en GitHub) |
| **GitHub Actions** | **$0** (minutes incluidos) |

| **Costo total mensual** | **$10/mes** (lo mismo de siempre) |
|---|---|

No se agrega ni un centavo de infraestructura nueva.

---

## 11. DEUDA TÉCNICA QUE MUERE

| Problema legacy | Solución v2 |
|---|---|
| SQL injection (6 vulnerabilidades) | Drizzle parametriza todo. Zero SQL crudo |
| Race condition en tickets | `SELECT ... FOR UPDATE` en transacción MySQL |
| `JWT_SECRET` hardcodeado | Zod valida `.env` al arranque, fail fast si falta |
| 1950-line controllers | Server functions <150 líneas + servicios extraídos |
| Modelos vacíos (`// modelos en BD`) | Schema Drizzle real, tipado, con relaciones |
| `setTimeout` fire-and-forget | Inngest durable functions con retries |
| `ORDER BY RAND()` sin lock | `ORDER BY RAND()` dentro de `FOR UPDATE` (seguro) |
| `window.location.reload()` | TanStack Query invalidation |
| Componentes de 2000+ líneas | <200 líneas por archivo |
| `document.createElement` en React | React Portal |
| Código comentado (museo) | Git para historia. Cero código muerto |
| Sin tests | Vitest + Playwright desde día 1 |
| Errores genéricos | Errores de dominio tipados con código |
| Config duplicada en 15 lugares | Zustand store + CSS variables |
| `console.log` con PII y emojis | Pino structured logging, IDs no PII |
| Emojis en lógica de negocio | Solo en UI, separados de servicios |
| `- INTERVAL 4 HOUR` hardcodeado | UTC en DB, `America/Caracas` solo en display vía `date-fns-tz` |
| `ENUM` en DB difíciles de migrar | Siguen siendo ENUM (MySQL nativo), pero Drizzle los maneja con tipo |

---

## 12. PRINCIPIOS NO NEGOCIABLES

1. **TypeScript strict.** `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`
2. **Componentes <200 líneas.** Si crece, composición.
3. **Server functions <150 líneas.** Si crece, servicio en `lib/`.
4. **Tests en flujos críticos.** Compra concurrente, pausa, auth, approve/reject.
5. **Pino logging.** Niveles: `trace`, `debug`, `info`, `warn`, `error`. Nunca PII.
6. **Fail fast en boot.** Zod valida `.env`. Si falta `DATABASE_URL` o `JWT_SECRET`, el proceso no arranca.
7. **Errores de dominio.** `InsufficientTicketsError`, `RaffleNotActiveError`, etc. Con código y status HTTP mapeado.
8. **UTC en DB, timezone en display.** `America/Caracas` solo en `date-fns-tz`.
9. **Accesibilidad WCAG AA.** shadcn/ui lo garantiza. axe-core en CI.
10. **Cero `any`. Cero `as` innecesario.**

---

## 13. COMPARATIVA FINAL

| Aspecto | Legacy | deepseek v3 |
|---|---|---|
| **DB** | MySQL + SQL crudo | **MySQL + Drizzle** (misma DB, queries tipadas) |
| **Uploads** | multer + disco local | **multer + disco local** (mismo enfoque, limpio) |
| **Hosting** | VPS Interserver $10 | **Mismo VPS**, Dockerizado |
| **Deploy** | `git pull && npm start` | **Docker → GHCR → `docker compose up`** |
| **Framework** | Express + React SPA separados | **TanStack Start** (unificado) |
| **Tipado** | JavaScript sin tipos | TypeScript strict end-to-end |
| **Concurrencia** | Race condition | `SELECT FOR UPDATE` |
| **Jobs** | `setTimeout` + `node-cron` | Inngest durable functions |
| **Componentes** | 1180-2171 líneas | <200 líneas |
| **Tests** | 0 | Vitest + Playwright |
| **Logs** | `console.log` con PII | Pino estructurado |
| **Email** | Resend (funciona) | Mismo proveedor, adapter swappeable, React Email templates |
| **Datos** | — | **Misma DB, mismas tablas, mismos datos. Cero migración.** |

---

## 14. PRÓXIMOS PASOS INMEDIATOS

1. **Rotar secretos del legacy** — urgente: JWT default secret, API keys en logs, uploads públicos sin auth.
2. **Crear repo `raffle-v2`** con scaffold de Turborepo + TanStack Start.
3. **`drizzle-kit pull`** de la DB existente para generar el schema inicial.
4. **Probar conexión Drizzle → MySQL** con una query simple desde una server function.
5. **Diseñar wireframes** de 3 pantallas clave (purchase wizard, dashboard, tabla de ventas).
6. **Escribir ADR** documentando las decisiones de este documento.

---

*Documento generado del análisis termonuclear del legacy + revisión cross-proposal con Composer 2.5. Filosofía: reescribir el código, no la infraestructura. Lo que funciona se queda, lo que apesta se reemplaza.*
