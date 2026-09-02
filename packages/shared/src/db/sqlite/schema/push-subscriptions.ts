import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core"

/** Anonymous Web Push subscriptions from the public PWA. */
export const pushSubscriptions = sqliteTable(
  "push_subscriptions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    userAgent: text("user_agent"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    lastSeenAt: integer("last_seen_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [
    uniqueIndex("push_subscriptions_endpoint_uidx").on(t.endpoint),
    index("push_subscriptions_last_seen_idx").on(t.lastSeenAt),
  ],
)
