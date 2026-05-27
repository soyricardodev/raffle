import { getPool } from "@/lib/db.server"

export async function listEmailLogs(limit = 50, page = 1) {
  const pool = getPool()
  const safeLimit = Math.min(Math.max(limit, 1), 100)
  const offset = (Math.max(page, 1) - 1) * safeLimit

  const [rows] = await pool.execute(
    `SELECT e.id, e.purchase_id, e.recipient_email, e.email_type, e.subject,
            e.status, e.sent_at, e.created_at, p.customer_name
     FROM email_logs e
     LEFT JOIN purchases p ON e.purchase_id = p.id
     ORDER BY e.created_at DESC
     LIMIT ? OFFSET ?`,
    [safeLimit, offset],
  )

  const [countRows] = await pool.execute("SELECT COUNT(*) as total FROM email_logs")
  const total = Number((countRows as { total: number }[])[0]?.total ?? 0)

  return { data: rows, total, page, limit: safeLimit }
}
