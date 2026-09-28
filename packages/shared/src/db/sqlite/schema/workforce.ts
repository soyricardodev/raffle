import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core"
import { raffles } from "./raffles"
import { users } from "./users"

/** Role templates. Permissions are validated against the server-side catalog. */
export const staffRoles = sqliteTable("staff_roles", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  permissions: text("permissions").notNull().default("[]"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
})

/** Additional per-person grants; raffleId=null means every raffle. */
export const staffGrants = sqliteTable(
  "staff_grants",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    permission: text("permission").notNull(),
    raffleId: integer("raffle_id").references(() => raffles.id, { onDelete: "cascade" }),
  },
  (t) => [
    index("staff_grants_user_idx").on(t.userId),
    uniqueIndex("staff_grants_unique_idx").on(t.userId, t.permission, t.raffleId),
  ],
)

export const staffInvitations = sqliteTable(
  "staff_invitations",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    acceptedAt: integer("accepted_at", { mode: "timestamp_ms" }),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [index("staff_invites_user_idx").on(t.userId)],
)

/** Heartbeat deltas are capped, so an idle tab cannot count as worked hours. */
export const staffActivityDays = sqliteTable(
  "staff_activity_days",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    day: text("day").notNull(),
    activeSeconds: integer("active_seconds").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.userId, t.day] })],
)

/** Better Auth database-backed login rate limits. */
export const authRateLimits = sqliteTable("rateLimit", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: integer("lastRequest").notNull(),
})
