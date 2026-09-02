import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core"
import { customers } from "./customers"

/** Web Push subscriptions from the public PWA. Identity is optional and filled in later. */
export const pushSubscriptions = sqliteTable(
  "push_subscriptions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    userAgent: text("user_agent"),
    displayName: text("display_name"),
    customerPhoneNormalized: text("customer_phone_normalized"),
    customerId: integer("customer_id").references(() => customers.id, {
      onDelete: "set null",
    }),
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
    index("push_subscriptions_phone_norm_idx").on(t.customerPhoneNormalized),
  ],
)
