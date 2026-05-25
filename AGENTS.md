# AGENTS.md — Raffle v2

## Reglas para agentes

### TypeScript: ignorar errores de createFileRoute

Cuando TanStack Start no reconoce los tipos de rutas anidadas en `createFileRoute("/api/admin/purchases/$id"...)`, se debe usar cast `as never`:

```typescript
export const PurchaseById = createFileRoute("/api/admin/purchases/$id" as never)({
  server: { handlers: { ... } },
})
```

No pierdas tiempo tratando de hacer que `FileRoutesByPath` reconozca rutas anidadas dentro de un mismo archivo. El cast `as never` es aceptado. Las rutas funcionan en runtime correctamente.

### TypeScript: usar tsgo en vez de tsc

`tsgo` es el nuevo type checker de TypeScript (más rápido, drop-in replacement). Se usa exactamente igual que `tsc`:

```bash
tsgo --noEmit
```

Si no está instalado globalmente, usar `npx tsgo --noEmit` o agregarlo como devDependency.

### Estructura

```
raffle-v2/
├── packages/shared/    # 🟣 DeepSeek — Drizzle schema, Zod validators, errors, emails
├── app/src/server/     # 🟣 DeepSeek — domain services
├── app/src/routes/api/ # 🟣 DeepSeek — API server functions
├── app/src/lib/        # 🟣 DeepSeek — db, auth, upload
├── app/src/features/   # 🔵 Composer — UI components
├── app/src/stores/     # 🔵 Composer — Zustand stores
├── scripts/            # 🟣 DeepSeek — seed, migration
├── inngest/            # 🟣 DeepSeek — background jobs
```

### Ownership

- 🟣 DeepSeek: NO tocar `app/src/features/**`, `app/src/stores/**`, `Dockerfile`, `docker-compose.yml`, `nginx/**`, `.github/**`
- 🔵 Composer: NO tocar `packages/shared/**`, `app/src/server/**`, `app/src/routes/api/**`, `app/src/lib/auth*.ts`, `app/src/lib/db*.ts`, `scripts/**`, `inngest/**`
- 🤝 Ambos: `app/src/routes/__root.tsx` (coordinar cambios)
- Legacy (`backend-legacy/`, `frontend-legacy/`) es solo referencia de comportamiento. No copiar código.

### Commits

- Atómicos por feature/fix
- Mensaje: `type(scope): descripción` — ej: `feat(app): purchase service with FOR UPDATE`
- Un commit por grupo lógico de cambios

### Testing

- `bun test` o `pnpm --filter app test`
- Tests en flujos críticos: compra, pausa, auth
- Vitest para unitarios, Playwright para E2E

### Logging

- Usar `getLogger()` de `@/lib/logger` (Pino)
- Nunca `console.log` en producción
- PII nunca en logs (customer_name, customer_phone, etc.)

### Errores

- Errores de dominio desde `@raffle/shared/errors`
- No lanzar strings ni Error genérico
- Usar `AppError` con `code` y `statusCode`

### Server functions

- Siempre usar `getPool()` o `getDb()` para acceder a la DB
- Transacciones con `conn.beginTransaction()` / `conn.commit()` / `conn.rollback()`
- `FOR UPDATE` en queries de compra para prevenir race conditions
- Rate limiting en endpoints públicos (compra, verify)
