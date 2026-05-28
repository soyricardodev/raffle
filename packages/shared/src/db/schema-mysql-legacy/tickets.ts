import { int, mysqlEnum, mysqlTable, timestamp, unique, varchar } from "drizzle-orm/mysql-core"
import { purchases } from "./purchases"
import { raffles } from "./raffles"

export const tickets = mysqlTable(
  "tickets",
  {
    id: int("id").primaryKey().autoincrement(),
    raffleId: int("raffle_id")
      .notNull()
      .references(() => raffles.id, { onDelete: "cascade" }),
    purchaseId: int("purchase_id").references(() => purchases.id, {
      onDelete: "set null",
    }),
    ticketNumber: varchar("ticket_number", { length: 4 }).notNull(),
    status: mysqlEnum("status", ["available", "reserved", "sold"]).default("available"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  (t) => [unique("unique_raffle_ticket").on(t.raffleId, t.ticketNumber)],
)
