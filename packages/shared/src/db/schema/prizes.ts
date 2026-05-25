import { int, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core"
import { raffles } from "./raffles"

export const prizes = mysqlTable("prizes", {
  id: int("id").primaryKey().autoincrement(),
  raffleId: int("raffle_id")
    .notNull()
    .references(() => raffles.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  imageUrl: varchar("image_url", { length: 500 }),
  position: int("position").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
})
