import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

export const paymentAccounts = sqliteTable(
  "payment_accounts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    label: text("label").notNull(),
    methodType: text("method_type").notNull(),
    accountInfo: text("account_info").notNull(),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("payment_accounts_method_active_idx").on(t.methodType, t.isActive),
    index("payment_accounts_sort_order_idx").on(t.sortOrder),
  ],
)
