import { randomUUID } from "node:crypto"
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

/** Admin users — Better Auth compatible (credential en `account`). */
export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    username: text("username").notNull().unique().$defaultFn(randomUUID),
    displayName: text("display_name").notNull().default(""),
    email: text("email").notNull().unique(),
    emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
    image: text("image"),
    role: text("role").notNull().default("customer"),
    status: text("status").notNull().default("active"),
    lastLoginAt: integer("last_login_at", { mode: "timestamp_ms" }),
    preferences: text("preferences"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
  },
  (t) => [index("users_email_idx").on(t.email)],
)
