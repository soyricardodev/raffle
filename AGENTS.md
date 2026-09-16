# AGENTS.md — Raffle v2

## Reglas para agentes

### Mobile first

El **99.9% de los usuarios usa teléfono**. Diseñar y optimizar siempre para móvil primero:

- Priorizar layouts, touch targets y navegación en pantallas pequeñas
- Evitar controles anchos o de 3+ opciones en headers/toolbars; preferir un botón compacto
- Desktop es secundario: no agregar complejidad de UI solo por pantallas grandes
- Probar mentalmente (y en E2E cuando aplique) en viewport móvil antes que desktop

### Rutas nuevas: regenerar `routeTree.gen.ts`, nunca usar `as never`

`app/src/routeTree.gen.ts` está **commiteado** y el plugin de TanStack lo regenera en
cada build. Si agregas una ruta y el typecheck dice que no existe en
`FileRoutesByPath`, el problema es que el árbol está viejo, no los tipos.

El generador lee el id de la ruta del AST y **exige un string literal**. Un cast
`as never` satisface al type checker y rompe el build, tumbando el release:

```typescript
// ✅ correcto
export const Route = createFileRoute("/api/admin/emails/bulk-resend")({
  server: { handlers: { ... } },
})
```

```typescript
// ❌ el build falla con:
// "expected route id to be a string literal or plain template literal"
export const Route = createFileRoute("/api/admin/emails/bulk-resend" as never)({
```

La solución es correr `pnpm build` (o `vite dev`) para regenerar el árbol y
commitear `routeTree.gen.ts` junto al archivo de la ruta. Verifícalo con un build
local antes de pushear: el CI usa `pnpm build` y ahí revienta.

### TypeScript: cómo correr el typecheck

`tsgo` **no existe en npm** (`npx tsgo` devuelve 404). El binario vive en el
paquete `@typescript/native-preview`, así que mientras no se agregue como
devDependency el typecheck real es:

```bash
pnpm --filter app exec tsc --noEmit
```

Hay un error preexistente en `app/src/features/raffle/purchase-form/PurchaseForm.tsx`
(`ticketNumbers` readonly vs `string[]`), ajeno a los cambios nuevos.

### Estructura

```
raffle-v2/
├── packages/shared/    # Drizzle schema, Zod validators, errors, emails
├── app/src/server/     # domain services
├── app/src/routes/api/ # API server functions
├── app/src/lib/        # db, auth, upload
├── app/src/features/   # UI components
├── app/src/stores/     # Zustand stores
├── scripts/            # seed, migration
├── inngest/            # background jobs
```

Legacy (`backend-legacy/`, `frontend-legacy/`) es solo referencia de comportamiento. No copiar código.

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
