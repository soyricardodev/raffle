import { emailLogs, purchases } from "@raffle/shared/db"
import { and, desc, eq, like, or, sql } from "drizzle-orm"
import { getDb } from "@/lib/db.server"

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
}) {
  const db = getDb()
  await db.insert(emailLogs).values({
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
}

export async function listEmailLogs(params: {
  limit?: number
  page?: number
  status?: string
  search?: string | null
  start?: string | null
  end?: string | null
}) {
  const db = getDb()
  const { limit = 50, page = 1, status = "all", search, start, end } = params
  const safeLimit = Math.min(Math.max(limit, 1), 100)
  const offset = (Math.max(page, 1) - 1) * safeLimit

  const conditions = [sql`1=1`]
  if (status !== "all") {
    conditions.push(eq(emailLogs.status, status))
  }
  if (search?.trim()) {
    const term = `%${search.trim()}%`
    conditions.push(
      or(
        like(emailLogs.subject, term),
        like(emailLogs.recipientEmail, term),
        like(purchases.customerName, term),
      )!,
    )
  }
  if (start) {
    conditions.push(sql`date(${emailLogs.createdAt} / 1000, 'unixepoch') >= ${start}`)
  }
  if (end) {
    conditions.push(sql`date(${emailLogs.createdAt} / 1000, 'unixepoch') <= ${end}`)
  }

  const whereClause = and(...conditions)

  const [countRow] = await db
    .select({ total: sql<number>`count(*)` })
    .from(emailLogs)
    .leftJoin(purchases, eq(emailLogs.purchaseId, purchases.id))
    .where(whereClause)

  const rows = await db
    .select({
      id: emailLogs.id,
      purchase_id: emailLogs.purchaseId,
      recipient_email: emailLogs.recipientEmail,
      email_type: emailLogs.emailType,
      subject: emailLogs.subject,
      status: emailLogs.status,
      sent_at: emailLogs.sentAt,
      created_at: emailLogs.createdAt,
      customer_name: purchases.customerName,
    })
    .from(emailLogs)
    .leftJoin(purchases, eq(emailLogs.purchaseId, purchases.id))
    .where(whereClause)
    .orderBy(desc(emailLogs.createdAt))
    .limit(safeLimit)
    .offset(offset)

  const total = Number(countRow?.total ?? 0)

  return {
    data: rows,
    total,
    hasMore: offset + rows.length < total,
    page,
    limit: safeLimit,
  }
}
