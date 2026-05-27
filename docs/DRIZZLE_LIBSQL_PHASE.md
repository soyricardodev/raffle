# Fase Drizzle real y evaluación libSQL/Turso

## Objetivo

Reducir SQL crudo en `app/src/server/*` y decidir migración de motor solo con datos de concurrencia y costo operativo.

## Fase A — Repositorios (MySQL, sin cambiar motor)

1. Crear `app/src/server/repositories/` por dominio: `raffles`, `tickets`, `purchases`, `analytics`.
2. Mover queries de `purchase.service.ts` y `pause.service.ts` a repositorios.
3. Servicios solo orquestan reglas de negocio y transacciones.
4. Mantener `getPool()` para transacciones `FOR UPDATE` hasta tener patrón Drizzle equivalente probado.

## Fase B — Drizzle Query API

1. Reescribir lecturas simples (listados, config, analytics agregados) con Drizzle.
2. Usar `sql` helper portable donde haga falta raw SQL.
3. Alinear schema TS con migración (`percentage_mode`: eliminar o implementar).

## Fase C — Spike libSQL/Turso

| Área | MySQL actual | Riesgo SQLite/Turso |
|------|--------------|---------------------|
| `FOR UPDATE` | InnoDB row locks | `BEGIN IMMEDIATE`, transacciones cortas |
| `ORDER BY RAND()` | MySQL | `ORDER BY RANDOM()` o selección en app |
| `DATE_SUB`, `CURDATE` | MySQL | `datetime('now', '-30 days')` |
| ENUM | mysqlEnum | TEXT + check en app |
| Concurrencia compra | Probado | **Load test obligatorio** 50+ compras paralelas |
| Better Auth | mysql provider | sqlite provider |

### Criterios de go/no-go

- p95 compra &lt; 500ms en staging con carga objetivo.
- 0 doble-asignación de boletos en test de concurrencia.
- Coste Turso + complejidad &lt; beneficio vs MySQL gestionado.

## Recomendación actual

**No migrar a libSQL antes de paridad funcional y tests en MySQL.** El spike es válido solo después de Fase A/B.
