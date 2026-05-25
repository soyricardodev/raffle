import { relations } from "drizzle-orm"
import { emailLogs } from "./email-logs"
import { paymentMethods } from "./payment-methods"
import { prizes } from "./prizes"
import { purchases } from "./purchases"
import { raffles } from "./raffles"
import { siteConfig } from "./site-config"
import { tickets } from "./tickets"
import { users } from "./users"

export const raffleRelations = relations(raffles, ({ many }) => ({
  prizes: many(prizes),
  paymentMethods: many(paymentMethods),
  purchases: many(purchases),
  tickets: many(tickets),
}))

export const prizeRelations = relations(prizes, ({ one }) => ({
  raffle: one(raffles, {
    fields: [prizes.raffleId],
    references: [raffles.id],
  }),
}))

export const paymentMethodRelations = relations(paymentMethods, ({ one }) => ({
  raffle: one(raffles, {
    fields: [paymentMethods.raffleId],
    references: [raffles.id],
  }),
}))

export const purchaseRelations = relations(purchases, ({ one, many }) => ({
  raffle: one(raffles, {
    fields: [purchases.raffleId],
    references: [raffles.id],
  }),
  tickets: many(tickets),
  emailLogs: many(emailLogs),
}))

export const ticketRelations = relations(tickets, ({ one }) => ({
  raffle: one(raffles, {
    fields: [tickets.raffleId],
    references: [raffles.id],
  }),
  purchase: one(purchases, {
    fields: [tickets.purchaseId],
    references: [purchases.id],
  }),
}))

export const emailLogRelations = relations(emailLogs, ({ one }) => ({
  purchase: one(purchases, {
    fields: [emailLogs.purchaseId],
    references: [purchases.id],
  }),
}))

export const userRelations = relations(users, () => ({}))
export const siteConfigRelations = relations(siteConfig, () => ({}))
