import { randomUUID } from "node:crypto"
import {
  fromCents,
  normalizePhone,
  purchases,
  purchaseTickets,
  raffles,
  ticketNumberToString,
} from "@raffle/shared/db"
import { isSqliteUniqueViolation } from "@raffle/shared/db"
import { PaymentReferenceDuplicateError } from "@raffle/shared/errors"
import type { RecentPurchaseDbRow } from "@raffle/shared/public-recent-purchase"
import type { PaymentMethod, PurchaseStatus } from "@raffle/shared/validators"
import { isDollarMethod } from "@raffle/shared/validators"
import { and, desc, eq, inArray, like, or, sql } from "drizzle-orm"
import { type DbTransaction, getDb } from "@/lib/db.server"

export type PurchaseRow = typeof purchases.$inferSelect

export async function existsPaymentReference(
  tx: DbTransaction,
  raffleId: number,
  reference: string,
): Promise<boolean> {
  const trimmed = reference.trim()
  if (!trimmed) return false
  const [row] = await tx
    .select({ id: purchases.id })
    .from(purchases)
    .where(and(eq(purchases.raffleId, raffleId), eq(purchases.paymentReference, trimmed)))
    .limit(1)
  return Boolean(row)
}

export async function insertPurchase(
  tx: DbTransaction,
  data: {
    raffleId: number
    customerId?: number | null
    customerName: string
    customerPhone: string
    customerEmail: string
    customerCi: string
    customerLocation: string
    rafflePaymentMethodId?: number | null
    paymentMethod: PaymentMethod
    paymentReference: string
    paymentProofUrl?: string | null
    ticketQuantity: number
    totalAmountCents: number
    currency: string
    promotionId?: number | null
    originalUnitPriceCents?: number | null
    discountUnitCents?: number | null
    finalUnitPriceCents?: number | null
    status?: PurchaseStatus
  },
): Promise<number> {
  try {
    const [row] = await tx
      .insert(purchases)
      .values({
        publicId: randomUUID(),
        raffleId: data.raffleId,
        customerId: data.customerId ?? null,
        customerName: data.customerName.substring(0, 200),
        customerPhone: data.customerPhone.substring(0, 20),
        customerPhoneNormalized: normalizePhone(data.customerPhone),
        customerEmail: data.customerEmail.substring(0, 100),
        customerCi: data.customerCi.substring(0, 20),
        customerLocation: data.customerLocation.substring(0, 100),
        rafflePaymentMethodId: data.rafflePaymentMethodId ?? null,
        paymentMethod: data.paymentMethod,
        paymentReference: data.paymentReference.substring(0, 100),
        paymentProofUrl: data.paymentProofUrl ?? null,
        ticketQuantity: data.ticketQuantity,
        totalAmountCents: data.totalAmountCents,
        currency: data.currency,
        promotionId: data.promotionId ?? null,
        originalUnitPriceCents: data.originalUnitPriceCents ?? null,
        discountUnitCents: data.discountUnitCents ?? null,
        finalUnitPriceCents: data.finalUnitPriceCents ?? null,
        status: data.status ?? "pending",
      })
      .returning({ id: purchases.id })

    return row!.id
  } catch (error) {
    if (isSqliteUniqueViolation(error)) {
      const ref = data.paymentReference.trim()
      if (ref) {
        throw new PaymentReferenceDuplicateError(ref, data.raffleId)
      }
    }
    throw error
  }
}

export type PurchaseWithRaffleContext = PurchaseRow & {
  raffleStatus: string
  autoPauseEnabled: boolean
  pauseReason: string | null
  priceBsCents: number
  priceUsdCents: number
}

export async function findPurchaseForUpdate(
  tx: DbTransaction,
  purchaseId: number,
): Promise<PurchaseWithRaffleContext | undefined> {
  const [row] = await tx
    .select({
      purchase: purchases,
      raffleStatus: raffles.status,
      autoPauseEnabled: raffles.autoPauseEnabled,
      pauseReason: raffles.pauseReason,
      priceBsCents: raffles.priceBsCents,
      priceUsdCents: raffles.priceUsdCents,
    })
    .from(purchases)
    .innerJoin(raffles, eq(purchases.raffleId, raffles.id))
    .where(eq(purchases.id, purchaseId))
    .limit(1)

  if (!row) return undefined
  return {
    ...row.purchase,
    raffleStatus: row.raffleStatus,
    autoPauseEnabled: row.autoPauseEnabled,
    pauseReason: row.pauseReason,
    priceBsCents: row.priceBsCents,
    priceUsdCents: row.priceUsdCents,
  }
}

export async function updatePurchaseStatusRow(
  tx: DbTransaction,
  purchaseId: number,
  status: PurchaseStatus,
  notes?: string,
): Promise<void> {
  await tx
    .update(purchases)
    .set({ status, notes: notes ?? null, updatedAt: new Date() })
    .where(eq(purchases.id, purchaseId))
}

export async function updatePurchaseTotals(
  tx: DbTransaction,
  purchaseId: number,
  ticketQuantity: number,
  totalAmountCents: number,
): Promise<void> {
  await tx
    .update(purchases)
    .set({ ticketQuantity, totalAmountCents, updatedAt: new Date() })
    .where(eq(purchases.id, purchaseId))
}

export function pricePerTicketCents(
  paymentMethod: PaymentMethod,
  raffle: { priceBsCents: number; priceUsdCents: number },
) {
  return isDollarMethod(paymentMethod) ? raffle.priceUsdCents : raffle.priceBsCents
}

/** Uses purchase snapshot when present; otherwise base raffle price. */
export function unitPriceCentsForPurchase(
  purchase: Pick<PurchaseRow, "paymentMethod" | "finalUnitPriceCents" | "raffleId"> & {
    priceBsCents?: number
    priceUsdCents?: number
  },
  raffle?: { priceBsCents: number; priceUsdCents: number },
): number {
  if (purchase.finalUnitPriceCents != null) {
    return purchase.finalUnitPriceCents
  }
  if (raffle) {
    return pricePerTicketCents(purchase.paymentMethod as PaymentMethod, raffle)
  }
  if (purchase.priceBsCents != null && purchase.priceUsdCents != null) {
    return pricePerTicketCents(purchase.paymentMethod as PaymentMethod, {
      priceBsCents: purchase.priceBsCents,
      priceUsdCents: purchase.priceUsdCents,
    })
  }
  throw new Error("unitPriceCentsForPurchase: missing price context")
}

export function purchaseCurrency(paymentMethod: PaymentMethod): string {
  return isDollarMethod(paymentMethod) ? "USD" : "VES"
}

export async function getPurchaseById(purchaseId: number) {
  const db = getDb()
  const [row] = await db
    .select({
      purchase: purchases,
      raffleName: raffles.name,
      raffleTicketsAvailable: raffles.ticketsAvailable,
    })
    .from(purchases)
    .innerJoin(raffles, eq(purchases.raffleId, raffles.id))
    .where(eq(purchases.id, purchaseId))
    .limit(1)

  if (!row) return null

  const ticketRows = await db
    .select({ ticketNumber: purchaseTickets.ticketNumber })
    .from(purchaseTickets)
    .where(eq(purchaseTickets.purchaseId, purchaseId))
    .orderBy(purchaseTickets.ticketNumber)

  return {
    ...mapPurchaseLegacy(row.purchase),
    raffle_name: row.raffleName,
    raffle_tickets_available: row.raffleTicketsAvailable,
    ticketNumbers: ticketRows.map((t) => ticketNumberToString(t.ticketNumber)),
  }
}

export function mapPurchaseLegacy(p: PurchaseRow) {
  return {
    id: p.id,
    public_id: p.publicId,
    raffle_id: p.raffleId,
    customer_name: p.customerName,
    customer_phone: p.customerPhone,
    customer_email: p.customerEmail,
    customer_ci: p.customerCi,
    customer_location: p.customerLocation,
    payment_method: p.paymentMethod,
    payment_reference: p.paymentReference,
    payment_proof_url: p.paymentProofUrl,
    ticket_quantity: p.ticketQuantity,
    total_amount: fromCents(p.totalAmountCents),
    total_amount_cents: p.totalAmountCents,
    currency: p.currency,
    status: p.status,
    notes: p.notes,
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  }
}

export async function listAdminPurchases(params: {
  limit: number
  page: number
  status?: string
  paymentMethod?: string
  raffleId?: string | null
  search?: string | null
  searchType?: string
  start?: string | null
  end?: string | null
}) {
  const db = getDb()
  const {
    limit,
    page,
    status = "all",
    paymentMethod = "all",
    raffleId,
    search,
    searchType = "all",
    start,
    end,
  } = params
  const safeLimit = Math.max(1, Math.min(Number(limit) || 25, 100))
  const offset = (Math.max(1, Number(page) || 1) - 1) * safeLimit

  const conditions = [sql`1=1`]
  if (status !== "all") conditions.push(eq(purchases.status, status))
  if (paymentMethod !== "all") conditions.push(eq(purchases.paymentMethod, paymentMethod))
  if (raffleId) conditions.push(eq(purchases.raffleId, Number(raffleId)))
  if (search && searchType === "all") {
    const term = `%${search}%`
    conditions.push(
      or(
        like(purchases.customerName, term),
        like(purchases.customerPhone, term),
        like(purchases.customerEmail, term),
        like(purchases.customerCi, term),
        like(purchases.paymentReference, term),
      )!,
    )
  } else if (search && searchType === "name") {
    conditions.push(like(purchases.customerName, `%${search}%`))
  } else if (search && searchType === "phone") {
    conditions.push(like(purchases.customerPhone, `%${search}%`))
  } else if (search && searchType === "email") {
    conditions.push(like(purchases.customerEmail, `%${search}%`))
  } else if (search && searchType === "ci") {
    conditions.push(like(purchases.customerCi, `%${search}%`))
  } else if (search && searchType === "ticket") {
    const term = `%${search}%`
    conditions.push(
      sql`exists (
        select 1 from ${purchaseTickets} pt
        where pt.purchase_id = ${purchases.id}
        and cast(pt.ticket_number as text) like ${term}
      )`,
    )
  }
  if (start) {
    conditions.push(sql`date(${purchases.createdAt} / 1000, 'unixepoch') >= ${start}`)
  }
  if (end) {
    conditions.push(sql`date(${purchases.createdAt} / 1000, 'unixepoch') <= ${end}`)
  }

  const whereClause = and(...conditions)

  const [countRow] = await db
    .select({ total: sql<number>`count(distinct ${purchases.id})` })
    .from(purchases)
    .leftJoin(purchaseTickets, eq(purchases.id, purchaseTickets.purchaseId))
    .where(whereClause)

  const rows = await db
    .select({
      purchase: purchases,
      raffleName: raffles.name,
      ticketNumbers: sql<string>`group_concat(${purchaseTickets.ticketNumber}, ',' order by ${purchaseTickets.ticketNumber})`,
    })
    .from(purchases)
    .innerJoin(raffles, eq(purchases.raffleId, raffles.id))
    .leftJoin(purchaseTickets, eq(purchases.id, purchaseTickets.purchaseId))
    .where(whereClause)
    .groupBy(purchases.id)
    .orderBy(desc(purchases.createdAt))
    .limit(safeLimit)
    .offset(offset)

  const total = Number(countRow?.total ?? 0)
  const data = rows.map((r) => ({
    ...mapPurchaseLegacy(r.purchase),
    raffle_name: r.raffleName,
    ticket_numbers: r.ticketNumbers
      ? r.ticketNumbers
          .split(",")
          .map((n) => ticketNumberToString(Number(n)))
          .join(",")
      : "",
  }))

  return { data, total, hasMore: offset + data.length < total }
}

export async function getClientPurchases(params: {
  status?: string
  raffleId?: number
  limit?: number
}) {
  const db = getDb()
  const limit = params.limit ?? 10

  const conditions = [sql`1=1`]
  if (params.status) conditions.push(eq(purchases.status, params.status))
  if (params.raffleId) conditions.push(eq(purchases.raffleId, params.raffleId))

  const rows = await db
    .select({
      raffle_id: purchases.raffleId,
      customer_name: purchases.customerName,
      customer_ci: purchases.customerCi,
      customer_phone: purchases.customerPhone,
      customer_email: purchases.customerEmail,
      ticket_quantity: sql<number>`sum(${purchases.ticketQuantity})`,
      purchases: sql<number>`count(distinct ${purchases.id})`,
      total: sql<number>`sum(${purchases.totalAmountCents})`,
    })
    .from(purchases)
    .where(and(...conditions))
    .groupBy(
      purchases.customerCi,
      purchases.raffleId,
      purchases.customerName,
      purchases.customerPhone,
      purchases.customerEmail,
    )
    .orderBy(sql`sum(${purchases.totalAmountCents}) desc`)
    .limit(limit)

  return rows.map((r) => ({
    ...r,
    total: fromCents(Number(r.total)),
  }))
}

export async function listRecentPurchaseRows(
  raffleId: number,
  limit = 12,
): Promise<RecentPurchaseDbRow[]> {
  const db = getDb()
  const safeLimit = Math.max(1, Math.min(limit, 30))

  return db
    .select({
      publicId: purchases.publicId,
      customerName: purchases.customerName,
      ticketQuantity: purchases.ticketQuantity,
      status: purchases.status,
      createdAt: purchases.createdAt,
    })
    .from(purchases)
    .where(
      and(eq(purchases.raffleId, raffleId), inArray(purchases.status, ["pending", "approved"])),
    )
    .orderBy(desc(purchases.createdAt))
    .limit(safeLimit)
}

export async function assertUniquePaymentReference(
  tx: DbTransaction,
  raffleId: number,
  reference: string,
): Promise<void> {
  if (!reference?.trim()) return
  if (await existsPaymentReference(tx, raffleId, reference)) {
    throw new PaymentReferenceDuplicateError(reference.trim(), raffleId)
  }
}
