import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

export const emailRecipientVerifications = sqliteTable(
  "email_recipient_verifications",
  {
    email: text("email").primaryKey(),
    provider: text("provider").notNull(),
    state: text("state").notNull(),
    reason: text("reason"),
    score: integer("score"),
    checkedAt: integer("checked_at", { mode: "timestamp_ms" }).notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
  },
  (t) => [index("email_recipient_verifications_expires_idx").on(t.expiresAt)],
)

export const emailSuppressions = sqliteTable(
  "email_suppressions",
  {
    email: text("email").primaryKey(),
    source: text("source").notNull(),
    reason: text("reason").notNull(),
    providerMessageId: text("provider_message_id"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
  },
  (t) => [index("email_suppressions_source_idx").on(t.source)],
)
