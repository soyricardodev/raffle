import { index, integer, sqliteTable, uniqueIndex } from "drizzle-orm/sqlite-core"
import { pushBroadcasts } from "./push-broadcasts"
import { pushSubscriptions } from "./push-subscriptions"

/** Per-device read receipts for in-app push inbox. */
export const pushInboxReads = sqliteTable(
  "push_inbox_reads",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    subscriptionId: integer("subscription_id")
      .notNull()
      .references(() => pushSubscriptions.id, { onDelete: "cascade" }),
    broadcastId: integer("broadcast_id")
      .notNull()
      .references(() => pushBroadcasts.id, { onDelete: "cascade" }),
    readAt: integer("read_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [
    uniqueIndex("push_inbox_reads_sub_broadcast_uidx").on(t.subscriptionId, t.broadcastId),
    index("push_inbox_reads_sub_idx").on(t.subscriptionId),
  ],
)
