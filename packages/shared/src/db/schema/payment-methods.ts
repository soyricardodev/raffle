import { boolean, int, json, mysqlEnum, mysqlTable, timestamp } from "drizzle-orm/mysql-core"
import { raffles } from "./raffles"

export const paymentMethods = mysqlTable("payment_methods", {
  id: int("id").primaryKey().autoincrement(),
  raffleId: int("raffle_id")
    .notNull()
    .references(() => raffles.id, { onDelete: "cascade" }),
  methodType: mysqlEnum("method_type", [
    "pago_movil",
    "zinli",
    "zelle",
    "binance",
    "bs",
    "usd",
  ]).notNull(),
  accountInfo: json("account_info").notNull(),
  isActive: boolean("is_active").default(true),
  minTickets: int("min_tickets"),
  createdAt: timestamp("created_at").defaultNow(),
})
