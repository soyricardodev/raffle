import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { purchases } from "./purchases"
import { raffles } from "./raffles"
import { users } from "./users"

export const auditEvents = sqliteTable(
  "audit_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    actorUserId: text("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    raffleId: integer("raffle_id").references(() => raffles.id, { onDelete: "set null" }),
    purchaseId: integer("purchase_id").references(() => purchases.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    payload: text("payload"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [
    index("audit_events_raffle_idx").on(t.raffleId),
    index("audit_events_purchase_idx").on(t.purchaseId),
    index("audit_events_created_idx").on(t.createdAt),
  ],
)
