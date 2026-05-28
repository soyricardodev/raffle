import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

/** Configuración global versionada (reemplaza site_config KV). */
export const appSettings = sqliteTable("app_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  version: integer("version").notNull().default(1),
  settings: text("settings").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
})
