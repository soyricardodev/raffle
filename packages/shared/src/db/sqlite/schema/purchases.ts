import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core"
import { sql } from "drizzle-orm"
import { rafflePaymentMethods } from "./raffle-payment-methods"
import { raffles } from "./raffles"

export const purchases = sqliteTable(
  "purchases",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    publicId: text("public_id").notNull().unique(),
    raffleId: integer("raffle_id")
      .notNull()
      .references(() => raffles.id, { onDelete: "cascade" }),
    customerName: text("customer_name").notNull(),
    customerPhone: text("customer_phone").notNull(),
    customerPhoneNormalized: text("customer_phone_normalized").notNull(),
    customerEmail: text("customer_email"),
    customerCi: text("customer_ci"),
    customerLocation: text("customer_location"),
    rafflePaymentMethodId: integer("raffle_payment_method_id").references(
      () => rafflePaymentMethods.id,
      { onDelete: "set null" },
    ),
    paymentMethod: text("payment_method").notNull(),
    paymentReference: text("payment_reference"),
    paymentProofUrl: text("payment_proof_url"),
    ticketQuantity: integer("ticket_quantity").notNull(),
    totalAmountCents: integer("total_amount_cents").notNull(),
    currency: text("currency").notNull(),
    status: text("status").notNull().default("pending"),
    notes: text("notes"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("purchases_raffle_status_idx").on(t.raffleId, t.status),
    index("purchases_raffle_created_idx").on(t.raffleId, t.createdAt),
    index("purchases_phone_norm_idx").on(t.customerPhoneNormalized),
    uniqueIndex("purchases_raffle_payment_ref_uidx")
      .on(t.raffleId, t.paymentReference)
      .where(sql`${t.paymentReference} IS NOT NULL AND ${t.paymentReference} != ''`),
  ],
)
