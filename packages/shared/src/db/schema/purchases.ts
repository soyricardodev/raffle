import {
  decimal,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core"
import { raffles } from "./raffles"

export const purchases = mysqlTable("purchases", {
  id: int("id").primaryKey().autoincrement(),
  raffleId: int("raffle_id")
    .notNull()
    .references(() => raffles.id, { onDelete: "cascade" }),
  customerName: varchar("customer_name", { length: 200 }).notNull(),
  customerPhone: varchar("customer_phone", { length: 20 }).notNull(),
  customerEmail: varchar("customer_email", { length: 100 }),
  customerCi: varchar("customer_ci", { length: 20 }),
  customerLocation: varchar("customer_location", { length: 100 }),
  paymentMethod: mysqlEnum("payment_method", [
    "pago_movil",
    "zinli",
    "zelle",
    "binance",
    "bs",
    "usd",
  ]).notNull(),
  paymentReference: varchar("payment_reference", { length: 100 }),
  paymentProofUrl: varchar("payment_proof_url", { length: 500 }),
  ticketQuantity: int("ticket_quantity").notNull(),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
})
