import { int, json, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core"

export const siteConfig = mysqlTable("site_config", {
  id: int("id").primaryKey().autoincrement(),
  configKey: varchar("config_key", { length: 100 }).notNull().unique(),
  configValue: json("config_value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
})
