import * as schema from "@raffle/shared/db"
import { drizzle, type MySql2Database } from "drizzle-orm/mysql2"
import mysql from "mysql2/promise"
import { getEnv, requireDatabaseUrl } from "./env"
import { getLogger } from "./logger"

type DrizzleDB = MySql2Database<typeof schema> & { $client: mysql.Pool }

let _db: DrizzleDB | undefined
let _pool: mysql.Pool | undefined

export function getDb(): DrizzleDB {
  if (!_db) {
    const url = requireDatabaseUrl()
    const env = getEnv()

    _pool = mysql.createPool({
      uri: url,
      connectionLimit: 10,
      waitForConnections: true,
      queueLimit: 0,
      charset: "utf8mb4",
    })

    _db = drizzle(_pool, {
      schema,
      mode: "default",
      logger:
        env.LOG_LEVEL === "debug"
          ? {
              logQuery(query: string, params: unknown[]) {
                getLogger().debug({ query, params }, "db:query")
              },
            }
          : undefined,
    }) as DrizzleDB

    getLogger().info("db:connected")
  }
  return _db
}

/** Pool raw para operaciones que necesitan transacciones manuales (FOR UPDATE, etc.) */
export function getPool(): mysql.Pool {
  getDb() // ensure initialized
  return _pool!
}

/** Acceso directo para scripts y tests. Preferir getDb() en server functions. */
export const db = new Proxy({} as DrizzleDB, {
  get(_target, prop) {
    return (getDb() as never)[prop]
  },
})
