import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core"
import { raffles } from "./raffles"

export const raffleBuyerPresence = sqliteTable(
  "raffle_buyer_presence",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    raffleId: integer("raffle_id")
      .notNull()
      .references(() => raffles.id, { onDelete: "cascade" }),
    clientId: text("client_id").notNull(),
    lastSeenAt: integer("last_seen_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [
    uniqueIndex("raffle_buyer_presence_raffle_client_uidx").on(t.raffleId, t.clientId),
    index("raffle_buyer_presence_raffle_seen_idx").on(t.raffleId, t.lastSeenAt),
  ],
)
