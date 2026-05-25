import { int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core"
import { purchases } from "./purchases"

export const emailLogs = mysqlTable("email_logs", {
  id: int("id").primaryKey().autoincrement(),
  purchaseId: int("purchase_id").references(() => purchases.id, {
    onDelete: "set null",
  }),
  recipientEmail: varchar("recipient_email", { length: 255 }).notNull(),
  emailType: mysqlEnum("email_type", [
    "purchase_confirmation",
    "status_update",
    "ticket_modification",
  ]).notNull(),
  subject: varchar("subject", { length: 500 }).notNull(),
  status: mysqlEnum("status", ["sent", "failed", "pending"]).default("pending"),
  resendEmailId: varchar("resend_email_id", { length: 100 }),
  errorMessage: text("error_message"),
  metadata: json("metadata"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
})
