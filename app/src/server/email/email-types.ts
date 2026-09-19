import { fromCents } from "@raffle/shared/db"
import { paymentMethodTypeLabel } from "@raffle/shared/payment-methods"
import { type EmailType, isDollarMethod, type PaymentMethod } from "@raffle/shared/validators"

/**
 * Set when one email consolidates every approved purchase of the same customer in a
 * raffle. Without it, customers who bought several times would receive several nearly
 * identical messages, which is the pattern outbound spam filters punish.
 */
export type AggregatedPurchasesSummary = {
  purchaseCount: number
  ticketCount: number
  totalAmountCents: number
  references: Array<string>
}

export type PurchaseEmailContext = {
  purchaseId: number
  customerName: string
  customerEmail: string
  customerPhone: string
  customerCi?: string | null
  ticketQuantity: number
  totalAmountCents: number
  paymentMethod: string
  paymentMethodLabel: string
  paymentReference?: string | null
  paymentPayerName?: string | null
  raffleName: string
  raffleImageUrl?: string | null
  status?: string
  notes?: string | null
  ticketNumbers?: Array<string>
  aggregatedPurchases?: AggregatedPurchasesSummary
}

export type BuiltEmail = {
  type: EmailType
  subject: string
  html: string
  metadata?: Record<string, unknown>
}

export function buildPurchaseEmailContext(
  purchaseId: number,
  row: {
    customerName: string
    customerEmail: string | null
    customerPhone: string
    customerCi?: string | null
    ticketQuantity: number
    totalAmountCents: number
    paymentMethod: string
    paymentReference?: string | null
    paymentPayerName?: string | null
    raffleName: string
    raffleImageUrl?: string | null
    status?: string
    notes?: string | null
  },
  ticketNumbers?: Array<string>,
): PurchaseEmailContext | null {
  const email = row.customerEmail ? String(row.customerEmail).trim() : ""
  if (!email) return null

  const method = row.paymentMethod as PaymentMethod
  return {
    purchaseId,
    customerName: row.customerName,
    customerEmail: email,
    customerPhone: row.customerPhone,
    customerCi: row.customerCi ?? null,
    ticketQuantity: row.ticketQuantity,
    totalAmountCents: row.totalAmountCents,
    paymentMethod: row.paymentMethod,
    paymentMethodLabel: paymentMethodTypeLabel(method),
    paymentReference: row.paymentReference ?? null,
    paymentPayerName: row.paymentPayerName ?? null,
    raffleName: row.raffleName,
    raffleImageUrl: row.raffleImageUrl ?? null,
    status: row.status,
    notes: row.notes ?? null,
    ticketNumbers,
  }
}

export function formatPurchaseTotal(ctx: PurchaseEmailContext): string {
  const method = ctx.paymentMethod as PaymentMethod
  const currency = isDollarMethod(method) ? "USD" : "Bs"
  return `${currency} ${fromCents(ctx.totalAmountCents)}`
}

export type EmailBuildOptions = {
  status?: "approved" | "rejected"
  modification?: "add" | "remove"
  quantity?: number
}
