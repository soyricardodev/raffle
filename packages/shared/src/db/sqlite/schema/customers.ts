import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core"

/** Repeat buyers — linked from purchases; no login in v1. */
export const customers = sqliteTable(
  "customers",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    customerName: text("customer_name").notNull(),
    customerPhone: text("customer_phone").notNull(),
    customerPhoneNormalized: text("customer_phone_normalized").notNull(),
    customerEmail: text("customer_email").notNull(),
    customerCi: text("customer_ci").notNull(),
    customerCiNormalized: text("customer_ci_normalized").notNull(),
    customerLocation: text("customer_location").notNull(),
    locationType: text("location_type").notNull().default("venezuela"),
    venezuelaState: text("venezuela_state"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("customers_phone_ci_uidx").on(t.customerPhoneNormalized, t.customerCiNormalized),
    index("customers_phone_norm_idx").on(t.customerPhoneNormalized),
    index("customers_ci_norm_idx").on(t.customerCiNormalized),
    index("customers_email_idx").on(t.customerEmail),
  ],
)
