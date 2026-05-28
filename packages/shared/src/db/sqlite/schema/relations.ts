import { relations } from "drizzle-orm"
import { accounts, sessions, verifications } from "./auth"
import { auditEvents } from "./audit-events"
import { emailLogs } from "./email-logs"
import { paymentAccounts } from "./payment-accounts"
import { rafflePaymentMethods } from "./raffle-payment-methods"
import { purchaseTickets } from "./purchase-tickets"
import { purchases } from "./purchases"
import { prizes } from "./prizes"
import { raffles } from "./raffles"
import { users } from "./users"

export const userRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
}))

export const sessionRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}))

export const accountRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}))

export const raffleRelations = relations(raffles, ({ many }) => ({
  prizes: many(prizes),
  rafflePaymentMethods: many(rafflePaymentMethods),
  purchases: many(purchases),
  purchaseTickets: many(purchaseTickets),
}))

export const prizeRelations = relations(prizes, ({ one }) => ({
  raffle: one(raffles, { fields: [prizes.raffleId], references: [raffles.id] }),
}))

export const paymentAccountRelations = relations(paymentAccounts, ({ many }) => ({
  raffleAssignments: many(rafflePaymentMethods),
}))

export const rafflePaymentMethodRelations = relations(rafflePaymentMethods, ({ one }) => ({
  raffle: one(raffles, {
    fields: [rafflePaymentMethods.raffleId],
    references: [raffles.id],
  }),
  account: one(paymentAccounts, {
    fields: [rafflePaymentMethods.accountId],
    references: [paymentAccounts.id],
  }),
}))

export const purchaseRelations = relations(purchases, ({ one, many }) => ({
  raffle: one(raffles, { fields: [purchases.raffleId], references: [raffles.id] }),
  rafflePaymentMethod: one(rafflePaymentMethods, {
    fields: [purchases.rafflePaymentMethodId],
    references: [rafflePaymentMethods.id],
  }),
  tickets: many(purchaseTickets),
  emailLogs: many(emailLogs),
}))

export const purchaseTicketRelations = relations(purchaseTickets, ({ one }) => ({
  raffle: one(raffles, { fields: [purchaseTickets.raffleId], references: [raffles.id] }),
  purchase: one(purchases, {
    fields: [purchaseTickets.purchaseId],
    references: [purchases.id],
  }),
}))

export const emailLogRelations = relations(emailLogs, ({ one }) => ({
  purchase: one(purchases, { fields: [emailLogs.purchaseId], references: [purchases.id] }),
}))

export const auditEventRelations = relations(auditEvents, () => ({}))
export const verificationRelations = relations(verifications, () => ({}))
