/** Detecta violación de UNIQUE en SQLite/libSQL. */
export function isSqliteUniqueViolation(error: unknown): boolean {
  const msg = String(error instanceof Error ? error.message : error).toLowerCase()
  return (
    msg.includes("unique constraint") ||
    msg.includes("unique violation") ||
    msg.includes("sqlite_constraint_unique") ||
    (msg.includes("constraint failed") && msg.includes("unique"))
  )
}
