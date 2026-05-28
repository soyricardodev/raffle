import { createClient, type Client } from "@libsql/client"
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql"
import { resolveLibsqlDatabaseUrl, schema } from "@raffle/shared/db"

export type ScriptDb = LibSQLDatabase<typeof schema>

export function resolveDatabaseUrl(): string {
  return resolveLibsqlDatabaseUrl()
}

export function createScriptClient(url = resolveDatabaseUrl()): Client {
  return createClient({
    url,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  })
}

export function createScriptDb(url = resolveDatabaseUrl()): ScriptDb {
  return drizzle(createScriptClient(url), { schema })
}
