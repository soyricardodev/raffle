import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { raffles } from "./raffles"

export const paymentMethods = sqliteTable(
  "payment_methods",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    raffleId: integer("raffle_id")
      .notNull()
      .references(() => raffles.id, { onDelete: "cascade" }),
    methodType: text("method_type").notNull(),
    accountInfo: text("account_info").notNull(),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    minTickets: integer("min_tickets"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [index("payment_methods_raffle_active_idx").on(t.raffleId, t.isActive)],
)
