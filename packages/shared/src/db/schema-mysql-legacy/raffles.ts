import {
  boolean,
  datetime,
  decimal,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core"

export const raffles = mysqlTable("raffles", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  imageUrl: varchar("image_url", { length: 500 }),
  totalTickets: int("total_tickets").notNull(),
  priceBs: decimal("price_bs", { precision: 15, scale: 2 }).notNull(),
  priceUsd: decimal("price_usd", { precision: 10, scale: 2 }).notNull(),
  minPurchase: int("min_purchase").default(1),
  maxPurchase: int("max_purchase").default(10),
  drawDate: datetime("draw_date"),
  daysForDraw: int("days_for_draw"),
  status: mysqlEnum("status", ["draft", "active", "paused", "finished", "cancelled"]).default(
    "draft",
  ),
  pauseUntil: timestamp("pause_until"),
  pauseReason: mysqlEnum("pause_reason", [
    "manual",
    "auto_full",
    "auto_insufficient",
    "auto_timeout",
  ]),
  autoPauseEnabled: boolean("auto_pause_enabled").default(true),
  publish: boolean("publish").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
})
