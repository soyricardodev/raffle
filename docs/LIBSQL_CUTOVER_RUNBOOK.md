# Runbook: cutover MySQL → libSQL v2

## Pre-requisitos

- Backup completo de MySQL (`mysqldump` o snapshot gestionado).
- `TARGET_DATABASE_URL` definido (`file:./data/raffle.db` local o `libsql://…` en Turso).
- Node 20+ y `pnpm install` en el monorepo.

## 1. Crear base libSQL vacía

```bash
cd packages/shared
set DATABASE_URL=file:../../data/raffle.db
pnpm db:migrate
```

En Turso: crear base, copiar URL + token a `DATABASE_URL` y `DATABASE_AUTH_TOKEN`.

## 2. Migrar datos

```bash
set SOURCE_DATABASE_URL=mysql://user:pass@host:3306/raffle_prod
set TARGET_DATABASE_URL=file:./data/raffle.db
set MIGRATE_ADMIN_PASSWORD=NuevaClaveSegura123!
bun run scripts/migrate-mysql-to-libsql.ts
```

Qué hace el script:

- `site_config` → `app_settings` (documento JSON versionado).
- `users` → `users` (text id) + `account` Better Auth (password temporal única).
- Rifas con precios en **centavos** y contadores en cero hasta compactar tickets.
- Solo tickets `reserved`/`sold` → `purchase_tickets` (sparse).
- Recalcula `tickets_available`, `tickets_reserved`, `tickets_sold` por rifa.

**No migra** sesiones activas → admins deben **re-login** con `MIGRATE_ADMIN_PASSWORD`.

## 3. Validación post-migración

```sql
-- Por rifa: invariante de contadores
SELECT id, total_tickets, tickets_available, tickets_reserved, tickets_sold
FROM raffles;

-- Debe cumplir: available + reserved + sold = total_tickets

-- Sin duplicados de boleto
SELECT raffle_id, ticket_number, COUNT(*) FROM purchase_tickets
GROUP BY raffle_id, ticket_number HAVING COUNT(*) > 1;
```

Validación de conteos (MySQL vs SQLite):

```bash
set SOURCE_DATABASE_URL=mysql://...
set TARGET_DATABASE_URL=file:./data/raffle.db
set UPLOAD_DIR=/opt/raffle/uploads
pnpm db:validate:migration
```

Tests automáticos:

```bash
set DATABASE_URL=file:./data/raffle.db
pnpm --filter app test
```

Criterios:

- `purchase concurrency`: 0 doble-asignación, contadores coherentes.
- `pause system`: auto_full / auto_insufficient con contadores.

## 4. Cutover big-bang

1. Poner app en mantenimiento (502 o banner).
2. Ejecutar migración final desde MySQL prod (ventana corta).
3. Actualizar `.env` producción: `DATABASE_URL`, `DATABASE_AUTH_TOKEN` si aplica.
4. Desplegar build con libSQL v2.
5. Verificar `/api/health/db`, login admin, compra de prueba, verificador.
6. Comunicar nueva contraseña admin temporal y forzar cambio.

## 5. Rollback

- Mantener dump MySQL 24–72 h.
- Si falla cutover: revertir `DATABASE_URL` a MySQL y desplegar tag anterior.
- libSQL file: copiar `raffle.db` antes del cutover como snapshot local.

## 6. Operación continua

- Backups: copiar archivo `.db` o usar backups Turso.
- Concurrencia: transacciones `immediate` + retry en compras; monitorear `busy`/`conflict` en logs.
- Migraciones schema: `pnpm --filter @raffle/shared db:generate` + `db:migrate` (carpeta `drizzle-sqlite/`).
