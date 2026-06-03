import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { rafflePaymentMethods } from "./raffle-payment-methods"
import { raffles } from "./raffles"

export const rafflePromotions = sqliteTable(
  "raffle_promotions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    raffleId: integer("raffle_id")
      .notNull()
      .references(() => raffles.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    kind: text("kind").notNull(),
    scope: text("scope").notNull().default("all_methods"),
    rafflePaymentMethodId: integer("raffle_payment_method_id").references(
      () => rafflePaymentMethods.id,
      { onDelete: "cascade" },
    ),
    promoPriceBsCents: integer("promo_price_bs_cents"),
    promoPriceUsdCents: integer("promo_price_usd_cents"),
    discountPercentBps: integer("discount_percent_bps"),
    startsAt: integer("starts_at", { mode: "timestamp_ms" }),
    endsAt: integer("ends_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("raffle_promotions_raffle_active_idx").on(t.raffleId, t.isActive),
    index("raffle_promotions_raffle_method_idx").on(t.rafflePaymentMethodId),
    index("raffle_promotions_starts_idx").on(t.startsAt),
    index("raffle_promotions_ends_idx").on(t.endsAt),
  ],
)
