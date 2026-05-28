import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { raffles } from "./raffles"

export const prizes = sqliteTable(
  "prizes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    raffleId: integer("raffle_id")
      .notNull()
      .references(() => raffles.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    imageUrl: text("image_url"),
    position: integer("position").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [index("prizes_raffle_position_idx").on(t.raffleId, t.position)],
)
