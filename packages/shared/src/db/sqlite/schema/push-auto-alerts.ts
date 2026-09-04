import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core"

/** Avisos automáticos configurables (por % de venta o al publicar rifa). */
export const pushAutoAlerts = sqliteTable(
  "push_auto_alerts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    kind: text("kind").notNull().default("percent"),
    triggerPercent: integer("trigger_percent"),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    /** IDs legacy (`sold_10`, `new_raffle`, …) para compatibilidad con rifas existentes. */
    legacyMilestoneId: text("legacy_milestone_id"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("push_auto_alerts_sort_idx").on(t.sortOrder, t.triggerPercent),
    uniqueIndex("push_auto_alerts_legacy_uidx").on(t.legacyMilestoneId),
  ],
)
