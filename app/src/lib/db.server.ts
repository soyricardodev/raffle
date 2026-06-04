import { type Client, createClient } from "@libsql/client"
import { schema } from "@raffle/shared/db"
import { ConcurrentPurchaseError } from "@raffle/shared/errors"
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql"
import { getEnv, requireDatabaseUrl } from "./env"
import { getLogger } from "./logger"

function isRetryableTransactionError(err: unknown): boolean {
  if (err instanceof ConcurrentPurchaseError) return true
  const code =
    err && typeof err === "object" && "code" in err ? String((err as { code: unknown }).code) : ""
  if (code === "CONCURRENT_PURCHASE") return true
  const msg = String(err instanceof Error ? err.message : err).toLowerCase()
  return msg.includes("busy") || msg.includes("locked") || msg.includes("sqlite_busy")
}

export type DrizzleDB = LibSQLDatabase<typeof schema>

let _client: Client | undefined
let _db: DrizzleDB | undefined

function createLibsqlClient(url: string, authToken?: string): Client {
  if (url.startsWith("file:") || url.endsWith(".db")) {
    const fileUrl = url.startsWith("file:") ? url : `file:${url}`
    return createClient({ url: fileUrl })
  }
  return createClient({
    url,
    authToken: authToken ?? undefined,
  })
}

export function getDb(): DrizzleDB {
  if (!_db) {
    const url = requireDatabaseUrl()
    const env = getEnv()
    _client = createLibsqlClient(url, process.env.DATABASE_AUTH_TOKEN)
    void _client.execute("PRAGMA journal_mode = WAL").catch(() => undefined)
    void _client.execute("PRAGMA busy_timeout = 10000").catch(() => undefined)
    _db = drizzle(_client, {
      schema,
      logger:
        env.LOG_LEVEL === "debug"
          ? {
              logQuery(query: string, params: unknown[]) {
                getLogger().debug({ query, params }, "db:query")
              },
            }
          : undefined,
    })
    getLogger().info({ url: url.startsWith("file:") ? url : "remote" }, "db:connected")
  }
  return _db
}

/** @deprecated Usar getDb() y transacciones Drizzle. Mantenido temporalmente para tests en migración. */
export function getPool(): never {
  throw new Error("getPool() fue eliminado. Usa getDb() con repositorios Drizzle (libSQL).")
}

/** Acceso directo para scripts y tests. */
export const db = new Proxy({} as DrizzleDB, {
  get(_target, prop) {
    return (getDb() as never)[prop]
  },
})

export type DbTransaction = Parameters<Parameters<DrizzleDB["transaction"]>[0]>[0]

/** Transacción SQLite con lock inmediato (compras / asignación de tickets). */
export async function withImmediateTransaction<T>(
  fn: (tx: DbTransaction) => Promise<T>,
): Promise<T> {
  return getDb().transaction(fn, { behavior: "immediate" })
}

/** Reintenta transacciones ante busy/conflict de SQLite. */
/** Solo tests: reinicia el singleton entre archivos/suites. */
export function resetDbForTests(): void {
  _db = undefined
  _client = undefined
}

export type TransactionRetryContext = {
  attempt: number
  maxAttempts: number
  error: unknown
}

export type WithRetryTransactionOptions = {
  maxAttempts?: number
  onRetry?: (ctx: TransactionRetryContext) => void
}

export async function withRetryTransaction<T>(
  fn: (tx: DbTransaction) => Promise<T>,
  options: WithRetryTransactionOptions = {},
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 5
  let lastError: unknown
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await withImmediateTransaction(fn)
    } catch (err) {
      lastError = err
      if (!isRetryableTransactionError(err)) {
        throw err
      }
      options.onRetry?.({ attempt: attempt + 1, maxAttempts, error: err })
      await new Promise((r) => setTimeout(r, 15 * (attempt + 1)))
    }
  }
  throw lastError
}
