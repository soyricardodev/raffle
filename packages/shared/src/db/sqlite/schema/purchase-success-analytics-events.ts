import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

export const purchaseSuccessAnalyticsEvents = sqliteTable(
  "purchase_success_analytics_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    eventName: text("event_name").notNull(),
    properties: text("properties"),
    sessionId: text("session_id"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [
    index("purchase_success_analytics_events_name_idx").on(t.eventName),
    index("purchase_success_analytics_events_created_idx").on(t.createdAt),
  ],
)
