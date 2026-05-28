import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { purchases } from "./purchases"

export const emailLogs = sqliteTable(
  "email_logs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    purchaseId: integer("purchase_id").references(() => purchases.id, { onDelete: "set null" }),
    recipientEmail: text("recipient_email").notNull(),
    emailType: text("email_type").notNull(),
    subject: text("subject").notNull(),
    status: text("status").notNull().default("pending"),
    resendEmailId: text("resend_email_id"),
    errorMessage: text("error_message"),
    metadata: text("metadata"),
    idempotencyKey: text("idempotency_key"),
    sentAt: integer("sent_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("email_logs_purchase_idx").on(t.purchaseId),
    index("email_logs_created_idx").on(t.createdAt),
    index("email_logs_idempotency_idx").on(t.idempotencyKey),
  ],
)
