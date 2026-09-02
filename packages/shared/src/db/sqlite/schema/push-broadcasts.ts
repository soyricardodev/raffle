import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { rafflePromotions } from "./raffle-promotions"
import { raffles } from "./raffles"

/** One row per push broadcast that actually went out (milestone, promo, or manual). */
export const pushBroadcasts = sqliteTable(
  "push_broadcasts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    kind: text("kind").notNull(),
    raffleId: integer("raffle_id").references(() => raffles.id, { onDelete: "set null" }),
    milestoneId: text("milestone_id"),
    promotionId: integer("promotion_id").references(() => rafflePromotions.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    url: text("url").notNull().default("/"),
    tag: text("tag").notNull(),
    sent: integer("sent").notNull().default(0),
    removed: integer("removed").notNull().default(0),
    total: integer("total").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [
    index("push_broadcasts_raffle_created_idx").on(t.raffleId, t.createdAt),
    index("push_broadcasts_promotion_idx").on(t.promotionId),
  ],
)
