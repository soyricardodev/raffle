import { index, integer, sqliteTable, uniqueIndex } from "drizzle-orm/sqlite-core"
import { paymentAccounts } from "./payment-accounts"
import { raffles } from "./raffles"

export const rafflePaymentMethods = sqliteTable(
  "raffle_payment_methods",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    raffleId: integer("raffle_id")
      .notNull()
      .references(() => raffles.id, { onDelete: "cascade" }),
    accountId: integer("account_id")
      .notNull()
      .references(() => paymentAccounts.id, { onDelete: "restrict" }),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    minTickets: integer("min_tickets"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [
    uniqueIndex("raffle_payment_methods_raffle_account_uidx").on(t.raffleId, t.accountId),
    index("raffle_payment_methods_raffle_active_idx").on(t.raffleId, t.isActive),
  ],
)
