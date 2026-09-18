import { EMAIL_LOG_EXPORT_MAX } from "@raffle/shared/admin/email-list-filters"
import { emailLogs, purchases } from "@raffle/shared/db"
import type { EmailType } from "@raffle/shared/validators"
import { and, asc, desc, eq, inArray, isNotNull, like, not, or, sql } from "drizzle-orm"
import { getDb } from "@/lib/db.server"

export type EmailLogStatus = "pending" | "sent" | "failed" | "error" | "blocked"

export type EmailLogListParams = {
  limit?: number
  page?: number
  status?: string
  emailType?: string | null
  search?: string | null
  start?: string | null
  end?: string | null
  purchaseId?: number | null
  sortBy?: "created_at" | "sent_at" | "status"
  sortDir?: "asc" | "desc"
}

export type EmailLogListRow = {
  id: number
  purchase_id: number | null
  recipient_email: string
  email_type: EmailType | string
  subject: string
  status: EmailLogStatus | string
  error_message: string | null
  resend_email_id: string | null
  idempotency_key: string | null
  sent_at: Date | null
  created_at: Date
  updated_at: Date
  customer_name: string | null
  customer_phone: string | null
}

const listSelect = {
  id: emailLogs.id,
  purchase_id: emailLogs.purchaseId,
  recipient_email: emailLogs.recipientEmail,
  email_type: emailLogs.emailType,
  subject: emailLogs.subject,
  status: emailLogs.status,
  error_message: emailLogs.errorMessage,
  resend_email_id: emailLogs.resendEmailId,
  idempotency_key: emailLogs.idempotencyKey,
  sent_at: emailLogs.sentAt,
  created_at: emailLogs.createdAt,
  updated_at: emailLogs.updatedAt,
  customer_name: purchases.customerName,
  customer_phone: purchases.customerPhone,
}

function buildWhereClause(
  params: Pick<
    EmailLogListParams,
    "status" | "emailType" | "search" | "start" | "end" | "purchaseId"
  >,
) {
  const { status = "all", emailType, search, start, end, purchaseId } = params
  const conditions = [sql`1=1`]

  if (status !== "all") {
    conditions.push(eq(emailLogs.status, status))
  }
  if (emailType && emailType !== "all") {
    conditions.push(eq(emailLogs.emailType, emailType))
  }
  if (purchaseId != null && purchaseId > 0) {
    conditions.push(eq(emailLogs.purchaseId, purchaseId))
  }
  if (search?.trim()) {
    const term = `%${search.trim()}%`
    const searchCondition = or(
      like(emailLogs.subject, term),
      like(emailLogs.recipientEmail, term),
      like(purchases.customerName, term),
      like(purchases.customerPhone, term),
    )
    if (searchCondition) conditions.push(searchCondition)
  }
  if (start) {
    conditions.push(sql`date(${emailLogs.createdAt} / 1000, 'unixepoch') >= ${start}`)
  }
  if (end) {
    conditions.push(sql`date(${emailLogs.createdAt} / 1000, 'unixepoch') <= ${end}`)
  }

  return and(...conditions)
}

function orderClause(sortBy: EmailLogListParams["sortBy"], sortDir: EmailLogListParams["sortDir"]) {
  const dir = sortDir === "asc" ? asc : desc
  switch (sortBy) {
    case "sent_at":
      return dir(emailLogs.sentAt)
    case "status":
      return dir(emailLogs.status)
    default:
      return dir(emailLogs.createdAt)
  }
}

export async function insertEmailLog(data: {
  purchaseId?: number | null
  recipientEmail: string
  emailType: string
  subject: string
  status: string
  resendEmailId?: string | null
  errorMessage?: string | null
  metadata?: unknown
  idempotencyKey?: string | null
}): Promise<number> {
  const db = getDb()
  const result = await db
    .insert(emailLogs)
    .values({
      purchaseId: data.purchaseId ?? null,
      recipientEmail: data.recipientEmail,
      emailType: data.emailType,
      subject: data.subject,
      status: data.status,
      resendEmailId: data.resendEmailId ?? null,
      errorMessage: data.errorMessage ?? null,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      idempotencyKey: data.idempotencyKey ?? null,
      sentAt: data.status === "sent" ? new Date() : null,
    })
    .returning({ id: emailLogs.id })

  return result[0]?.id ?? 0
}

export async function getEmailLogById(id: number): Promise<EmailLogListRow | null> {
  const db = getDb()
  const [row] = await db
    .select(listSelect)
    .from(emailLogs)
    .leftJoin(purchases, eq(emailLogs.purchaseId, purchases.id))
    .where(eq(emailLogs.id, id))
    .limit(1)
  return row ?? null
}

export async function listEmailLogs(params: EmailLogListParams) {
  const db = getDb()
  const { limit = 50, page = 1, sortBy = "created_at", sortDir = "desc" } = params
  const safeLimit = Math.min(Math.max(limit, 1), 100)
  const offset = (Math.max(page, 1) - 1) * safeLimit
  const whereClause = buildWhereClause(params)

  const [countRow] = await db
    .select({ total: sql<number>`count(*)` })
    .from(emailLogs)
    .leftJoin(purchases, eq(emailLogs.purchaseId, purchases.id))
    .where(whereClause)

  const rows = await db
    .select(listSelect)
    .from(emailLogs)
    .leftJoin(purchases, eq(emailLogs.purchaseId, purchases.id))
    .where(whereClause)
    .orderBy(orderClause(sortBy, sortDir))
    .limit(safeLimit)
    .offset(offset)

  const total = Number(countRow?.total ?? 0)

  return {
    data: rows,
    total,
    hasMore: offset + rows.length < total,
    page: Math.max(page, 1),
    limit: safeLimit,
  }
}

export async function listEmailLogsForPurchase(purchaseId: number, limit = 10) {
  return listEmailLogs({
    purchaseId,
    limit,
    page: 1,
    status: "all",
    sortBy: "created_at",
    sortDir: "desc",
  })
}

export type ResendCandidateRow = {
  id: number
  purchase_id: number | null
  recipient_email: string
  email_type: string
  subject: string
  error_message: string | null
}

export const RESEND_BATCH_MAX = 200

const RESENDABLE_EMAIL_TYPES = [
  "purchase_confirmation",
  "status_update",
  "ticket_modification",
  "purchase_reassign",
] as const

/**
 * A failed log is only worth repairing while no resend for the same
 * (customer, purchase) pair has already succeeded. Resends insert a new row, so
 * the original failure never changes — without this check a batch would re-pick
 * the same rows forever.
 */
const pairAlreadyRepaired = sql`exists (
  select 1 from email_logs repaired
  where repaired.purchase_id = ${emailLogs.purchaseId}
    and repaired.recipient_email = ${emailLogs.recipientEmail}
    and repaired.status = 'sent'
    and repaired.idempotency_key like 'resend:%'
)`

/**
 * One email per (customer, purchase). status_update wins because it carries the
 * ticket numbers, the purchase details and the final state, so it supersedes the
 * purchase confirmation.
 */
const pairWinner = sql`${emailLogs.id} = (
  select winner.id from email_logs winner
  where winner.recipient_email = ${emailLogs.recipientEmail}
    and winner.purchase_id = ${emailLogs.purchaseId}
    and winner.status in ('failed', 'error')
    and winner.email_type in ('purchase_confirmation', 'status_update', 'ticket_modification', 'purchase_reassign')
  order by
    case winner.email_type when 'status_update' then 0 else 1 end,
    winner.created_at desc,
    winner.id desc
  limit 1
)`

function resendCandidateWhere(raffleId: number) {
  return and(
    inArray(emailLogs.status, ["failed", "error"]),
    inArray(emailLogs.emailType, [...RESENDABLE_EMAIL_TYPES]),
    isNotNull(emailLogs.purchaseId),
    eq(purchases.raffleId, raffleId),
    pairWinner,
    not(pairAlreadyRepaired),
  )
}

/** Repairs still pending for a raffle, already deduplicated per customer. */
export async function countResendCandidatesForRaffle(raffleId: number): Promise<number> {
  const [row] = await getDb()
    .select({ total: sql<number>`count(*)` })
    .from(emailLogs)
    .innerJoin(purchases, eq(emailLogs.purchaseId, purchases.id))
    .where(resendCandidateWhere(raffleId))

  return Number(row?.total ?? 0)
}

/** Every failed row for a raffle, before dedupe — used only for previews. */
export async function countFailedEmailLogsForRaffle(raffleId: number): Promise<number> {
  const [row] = await getDb()
    .select({ total: sql<number>`count(*)` })
    .from(emailLogs)
    .innerJoin(purchases, eq(emailLogs.purchaseId, purchases.id))
    .where(
      and(
        inArray(emailLogs.status, ["failed", "error"]),
        isNotNull(emailLogs.purchaseId),
        eq(purchases.raffleId, raffleId),
      ),
    )

  return Number(row?.total ?? 0)
}

export async function listResendCandidatesForRaffle(params: {
  raffleId: number
  limit: number
}): Promise<ResendCandidateRow[]> {
  const limit = Math.min(Math.max(params.limit, 1), RESEND_BATCH_MAX)

  return getDb()
    .select({
      id: emailLogs.id,
      purchase_id: emailLogs.purchaseId,
      recipient_email: emailLogs.recipientEmail,
      email_type: emailLogs.emailType,
      subject: emailLogs.subject,
      error_message: emailLogs.errorMessage,
    })
    .from(emailLogs)
    .innerJoin(purchases, eq(emailLogs.purchaseId, purchases.id))
    .where(resendCandidateWhere(params.raffleId))
    .orderBy(asc(emailLogs.id))
    .limit(limit)
}

export async function listEmailLogsForExport(
  params: Pick<
    EmailLogListParams,
    "status" | "emailType" | "search" | "start" | "end" | "purchaseId" | "sortBy" | "sortDir"
  >,
) {
  const db = getDb()
  const whereClause = buildWhereClause(params)
  const sortBy = params.sortBy ?? "created_at"
  const sortDir = params.sortDir ?? "desc"

  const [countRow] = await db
    .select({ total: sql<number>`count(*)` })
    .from(emailLogs)
    .leftJoin(purchases, eq(emailLogs.purchaseId, purchases.id))
    .where(whereClause)

  const total = Number(countRow?.total ?? 0)
  const truncated = total > EMAIL_LOG_EXPORT_MAX

  const rows = await db
    .select(listSelect)
    .from(emailLogs)
    .leftJoin(purchases, eq(emailLogs.purchaseId, purchases.id))
    .where(whereClause)
    .orderBy(orderClause(sortBy, sortDir))
    .limit(EMAIL_LOG_EXPORT_MAX)

  return { data: rows, total, truncated, exported: rows.length }
}

export type EmailLogStats = {
  total: number
  sent: number
  failed: number
  pending: number
  error: number
  blocked: number
  success_rate: number
  failed_last_24h: number
}

export async function getEmailLogStats(
  params: Pick<EmailLogListParams, "search" | "start" | "end" | "emailType" | "purchaseId">,
): Promise<EmailLogStats> {
  const db = getDb()
  const whereClause = buildWhereClause({ ...params, status: "all" })

  const [row] = await db
    .select({
      total: sql<number>`count(*)`,
      sent: sql<number>`sum(case when ${emailLogs.status} = 'sent' then 1 else 0 end)`,
      failed: sql<number>`sum(case when ${emailLogs.status} = 'failed' then 1 else 0 end)`,
      pending: sql<number>`sum(case when ${emailLogs.status} = 'pending' then 1 else 0 end)`,
      error: sql<number>`sum(case when ${emailLogs.status} = 'error' then 1 else 0 end)`,
      blocked: sql<number>`sum(case when ${emailLogs.status} = 'blocked' then 1 else 0 end)`,
      failed_last_24h: sql<number>`sum(case when ${emailLogs.status} in ('failed', 'error') and ${emailLogs.createdAt} >= ${Date.now() - 86_400_000} then 1 else 0 end)`,
    })
    .from(emailLogs)
    .leftJoin(purchases, eq(emailLogs.purchaseId, purchases.id))
    .where(whereClause)

  const total = Number(row?.total ?? 0)
  const sent = Number(row?.sent ?? 0)
  const failed = Number(row?.failed ?? 0)
  const error = Number(row?.error ?? 0)
  const attempted = sent + failed + error

  return {
    total,
    sent,
    failed,
    pending: Number(row?.pending ?? 0),
    error,
    blocked: Number(row?.blocked ?? 0),
    success_rate: attempted > 0 ? Math.round((sent / attempted) * 1000) / 10 : 0,
    failed_last_24h: Number(row?.failed_last_24h ?? 0),
  }
}

export async function getEmailLogMetadata(id: number): Promise<Record<string, unknown> | null> {
  const db = getDb()
  const [row] = await db
    .select({ metadata: emailLogs.metadata })
    .from(emailLogs)
    .where(eq(emailLogs.id, id))
    .limit(1)
  if (!row?.metadata) return null
  try {
    return JSON.parse(row.metadata) as Record<string, unknown>
  } catch {
    return null
  }
}
