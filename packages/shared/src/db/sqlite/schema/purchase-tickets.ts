import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core"
import { purchases } from "./purchases"
import { raffles } from "./raffles"

export const purchaseTickets = sqliteTable(
  "purchase_tickets",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    raffleId: integer("raffle_id")
      .notNull()
      .references(() => raffles.id, { onDelete: "cascade" }),
    purchaseId: integer("purchase_id")
      .notNull()
      .references(() => purchases.id, { onDelete: "cascade" }),
    ticketNumber: integer("ticket_number").notNull(),
    status: text("status").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("purchase_tickets_raffle_number_uidx").on(t.raffleId, t.ticketNumber),
    index("purchase_tickets_purchase_idx").on(t.purchaseId),
    index("purchase_tickets_raffle_status_idx").on(t.raffleId, t.status),
  ],
)
