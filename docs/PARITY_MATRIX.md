# Matriz de paridad Legacy vs V2

Estados: `hecho` | `parcial` | `faltante`

Última actualización: Better Auth Drizzle mapping + scrypt credential, dashboard `total`/`hasMore`, hero legacy compat, admin GET métodos inactivos, [RUNBOOK.md](./RUNBOOK.md).

## Público

| Feature | Legacy | V2 | Estado | Prioridad |
|---------|--------|-----|--------|-----------|
| Landing hero configurable | Sí | Admin hero_config + site_info/colores | hecho | P1 |
| Compra en home | Sí | Sí (embed PurchaseForm) | hecho | P1 |
| Verificador en home | Sí | Sí (colapsable) | hecho | P1 |
| Progreso vendidos+reservados | Sí | Sí | hecho | P1 |
| Imagen rifa / premios con foto | Sí | Sí | hecho | P2 |
| WhatsApp flotante | Sí | Sí | hecho | P2 |
| In-app browser redirect | Sí | Sí | hecho | P2 |
| Galería finalizadas + links | Sí | Parcial (links a /rifa) | parcial | P2 |
| Pausa countdown overlay | Sí | Sí (PauseBanner) | hecho | P1 |
| Upload comprobante | Sí | Sí | hecho | P1 |
| Ubicación cliente | Flag env | Sí (campo opcional) | hecho | P2 |

## Admin

| Feature | Legacy | V2 | Estado | Prioridad |
|---------|--------|-----|--------|-----------|
| Dashboard KPIs | Por rifa activa | Por rifa + global | hecho | P1 |
| Tabla ventas + filtros | Infinite + sort | Paginación + debounce + cards móvil | hecho | P1 |
| Modal venta acciones | Aprobar/rechazar/recuperar | Aprobar/rechazar en modal | hecho | P1 |
| CRUD rifas | Crear/editar | Crear + editar (métodos inactivos en GET admin) | parcial | P1 |
| Pausa / publish | Sí | Sí (tabla rifas) | hecho | P1 |
| Analytics gráficos | Recharts | Recharts + API analytics | hecho | P1 |
| Boletos explorer | Sí | Sí | hecho | P2 |
| Config tabs completos | 6 tabs | 3 tabs (info, hero, límites) | parcial | P2 |
| Email logs / resend | Sí | Panel básico | parcial | P2 |
| Gestión tickets compra | add/remove/reassign UI | API sí, UI parcial en modal | parcial | P2 |
| Export CSV ventas | Sí | Dashboard + Analytics CSV | hecho | P2 |

## Backend / Ops

| Feature | Legacy | V2 | Estado | Prioridad |
|---------|--------|-----|--------|-----------|
| Compra FOR UPDATE + RAND | Sí | Sí | hecho | — |
| Auto-pausa post-compra | Sí | Sí | hecho | P0 |
| Cron pausas expiradas | Parcial legacy | Scheduler HTTP + RUNBOOK | hecho | P0 |
| Finalizar rifas vencidas | Cron 5min | Scheduler HTTP | hecho | P0 |
| Emails compra/estado | Sí | Sí (adapter) | hecho | P1 |
| Migración tickets legacy | — | Script completo + RUNBOOK | hecho | P0 |
| Rate limit | Parcial | In-memory | parcial | P2 |
| Inngest jobs | — | HTTP cron + doc Inngest | parcial | P2 |
| Drizzle como único acceso | — | Fase documentada | faltante | P3 |
| libSQL / Turso | — | Spike documentado | faltante | P3 |

## Prioridad de cierre pre-producción

1. **P0**: auto-pausa, scheduler, migración tickets, tests concurrencia (requieren `DATABASE_URL`; se omiten en CI sin DB).
2. **P1**: landing conversión, dashboard operativo, analytics, emails, comprobante — **cerrado salvo CRUD rifa avanzado**.
3. **P2**: edit rifa avanzado, config tabs extra, email UI completa, E2E Playwright suite completa con MySQL.
4. **P3**: capa Drizzle + evaluación libSQL con load tests.

## Ops

| Artefacto | Estado |
|-----------|--------|
| [RUNBOOK.md](./RUNBOOK.md) | hecho |
| [.env.example](../.env.example) | hecho |
| [E2E.md](./E2E.md) | hecho |
