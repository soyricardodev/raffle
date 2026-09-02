import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

export const raffles = sqliteTable(
  "raffles",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    description: text("description"),
    imageUrl: text("image_url"),
    totalTickets: integer("total_tickets").notNull(),
    priceBsCents: integer("price_bs_cents").notNull(),
    priceUsdCents: integer("price_usd_cents").notNull(),
    minPurchase: integer("min_purchase").notNull().default(1),
    maxPurchase: integer("max_purchase").notNull().default(10),
    drawDate: integer("draw_date", { mode: "timestamp_ms" }),
    daysForDraw: integer("days_for_draw"),
    status: text("status").notNull().default("draft"),
    pauseUntil: integer("pause_until", { mode: "timestamp_ms" }),
    pauseReason: text("pause_reason"),
    autoPauseEnabled: integer("auto_pause_enabled", { mode: "boolean" }).notNull().default(true),
    publish: integer("publish", { mode: "boolean" }).notNull().default(false),
    ticketsAvailable: integer("tickets_available").notNull().default(0),
    ticketsReserved: integer("tickets_reserved").notNull().default(0),
    ticketsSold: integer("tickets_sold").notNull().default(0),
    /** JSON string array of sent push milestone ids (new_raffle, sold_10, …). */
    pushMilestonesSent: text("push_milestones_sent").notNull().default("[]"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
  },
  (t) => [index("raffles_status_idx").on(t.status), index("raffles_draw_date_idx").on(t.drawDate)],
)
