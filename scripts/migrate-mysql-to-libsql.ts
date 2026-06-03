/**
 * Migración MySQL (legacy o v2) → libSQL v2 (sparse tickets + centavos).
 *
 * USO:
 *   SOURCE_DATABASE_URL=mysql://... TARGET_DATABASE_URL=file:./data/raffle.db bun run scripts/migrate-mysql-to-libsql.ts
 *
 * Requisitos:
 *   - TARGET vacío o recién migrado con `pnpm --filter @raffle/shared db:migrate`
 *   - Admins deben re-login (se crean users + account Better Auth con password temporal)
 */

import { randomUUID } from "node:crypto"
import { createClient } from "@libsql/client"
import { normalizePhone, schema, ticketNumberToInt, toCents } from "@raffle/shared/db"
import { hashPassword } from "better-auth/crypto"
import { eq } from "drizzle-orm"
import { drizzle } from "drizzle-orm/libsql"
import mysql from "mysql2/promise"

const SOURCE_URL = process.env.SOURCE_DATABASE_URL ?? process.env.LEGACY_DATABASE_URL
const TARGET_URL = process.env.TARGET_DATABASE_URL ?? process.env.DATABASE_URL

if (!SOURCE_URL || !TARGET_URL) {
  console.error(
    "❌ Set SOURCE_DATABASE_URL (MySQL) and TARGET_DATABASE_URL (libSQL file: or libsql://)",
  )
  process.exit(1)
}

const TEMP_ADMIN_PASSWORD = process.env.MIGRATE_ADMIN_PASSWORD ?? "ChangeMeAfterCutover!"

type MysqlRow = Record<string, unknown>

function parseJson(value: unknown): string {
  if (typeof value === "string") return value
  return JSON.stringify(value ?? {})
}

function ticketStatusForPurchase(
  purchaseStatus: string,
  ticketStatus: string,
): "reserved" | "sold" | null {
  if (ticketStatus === "available") return null
  if (purchaseStatus === "approved") return "sold"
  if (ticketStatus === "sold") return "sold"
  return "reserved"
}

async function main() {
  const source = await mysql.createConnection(SOURCE_URL)
  const client = createClient({
    url: TARGET_URL.startsWith("file:") ? TARGET_URL : TARGET_URL,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  })
  const db = drizzle(client, { schema })

  console.log("🔌 Conectado a MySQL origen y libSQL destino")

  // ─── site_config → app_settings ───────────────────────────
  const [configRows] = await source.execute("SELECT config_key, config_value FROM site_config")
  const settingsDoc: Record<string, unknown> = {}
  for (const c of configRows as MysqlRow[]) {
    settingsDoc[String(c.config_key)] =
      typeof c.config_value === "string" ? JSON.parse(c.config_value) : c.config_value
  }
  if (Object.keys(settingsDoc).length > 0) {
    await db.insert(schema.appSettings).values({
      version: 1,
      settings: JSON.stringify(settingsDoc),
    })
    console.log(`⚙️  app_settings: ${Object.keys(settingsDoc).length} keys`)
  }

  // ─── users + Better Auth account ──────────────────────────
  const [userRows] = await source.execute("SELECT * FROM users")
  console.log(`👤 Migrando ${(userRows as unknown[]).length} admins (re-login requerido)...`)
  const credentialHash = await hashPassword(TEMP_ADMIN_PASSWORD)

  for (const u of userRows as MysqlRow[]) {
    const userId = randomUUID()
    await db.insert(schema.users).values({
      id: userId,
      username: String(u.username),
      email: String(u.email),
      emailVerified: Boolean(u.email_verified ?? false),
      image: (u.image as string) ?? null,
      role: String(u.role ?? "admin"),
      createdAt: u.created_at ? new Date(String(u.created_at)) : new Date(),
      updatedAt: u.updated_at ? new Date(String(u.updated_at)) : new Date(),
    })

    await db.insert(schema.accounts).values({
      id: randomUUID(),
      userId,
      accountId: userId,
      providerId: "credential",
      password: credentialHash,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }
  console.log(`   Contraseña temporal para todos los admins: ${TEMP_ADMIN_PASSWORD}`)

  // ─── raffles ───────────────────────────────────────────────
  const [raffleRows] = await source.execute("SELECT * FROM raffles")
  console.log(`🎯 Migrando ${(raffleRows as unknown[]).length} rifas...`)

  for (const r of raffleRows as MysqlRow[]) {
    await db.insert(schema.raffles).values({
      id: Number(r.id),
      name: String(r.name),
      description: (r.description as string) ?? null,
      imageUrl: (r.image_url as string) ?? null,
      totalTickets: Number(r.total_tickets),
      priceBsCents: toCents(Number(r.price_bs)),
      priceUsdCents: toCents(Number(r.price_usd)),
      minPurchase: Number(r.min_purchase ?? 1),
      maxPurchase: Number(r.max_purchase ?? 10),
      drawDate: r.draw_date ? new Date(String(r.draw_date)) : null,
      daysForDraw: r.days_for_draw != null ? Number(r.days_for_draw) : null,
      status: String(r.status ?? "draft"),
      pauseUntil: r.pause_until ? new Date(String(r.pause_until)) : null,
      pauseReason: (r.pause_reason as string) ?? null,
      autoPauseEnabled: Boolean(r.auto_pause_enabled ?? true),
      publish: Boolean(r.publish ?? false),
      ticketsAvailable: 0,
      ticketsReserved: 0,
      ticketsSold: 0,
      createdAt: r.created_at ? new Date(String(r.created_at)) : new Date(),
      updatedAt: r.updated_at ? new Date(String(r.updated_at)) : new Date(),
    })
  }

  // ─── prizes, payment_methods ─────────────────────────────
  const [prizeRows] = await source.execute("SELECT * FROM prizes")
  for (const p of prizeRows as MysqlRow[]) {
    await db.insert(schema.prizes).values({
      id: Number(p.id),
      raffleId: Number(p.raffle_id),
      name: String(p.name),
      description: (p.description as string) ?? null,
      imageUrl: (p.image_url as string) ?? null,
      position: Number(p.position),
      createdAt: p.created_at ? new Date(String(p.created_at)) : new Date(),
    })
  }

  const rpmIdByRaffleAndType = new Map<string, number>()
  const [payRows] = await source.execute("SELECT * FROM payment_methods")
  for (const m of payRows as MysqlRow[]) {
    const legacyId = Number(m.id)
    const raffleId = Number(m.raffle_id)
    const methodType = String(m.method_type)
    const [account] = await db
      .insert(schema.paymentAccounts)
      .values({
        label: `${methodType} #${legacyId}`,
        methodType,
        accountInfo: parseJson(m.account_info),
        isActive: Boolean(m.is_active ?? true),
        createdAt: m.created_at ? new Date(String(m.created_at)) : new Date(),
        updatedAt: m.created_at ? new Date(String(m.created_at)) : new Date(),
      })
      .returning({ id: schema.paymentAccounts.id })

    const [rpm] = await db
      .insert(schema.rafflePaymentMethods)
      .values({
        raffleId,
        accountId: account!.id,
        isActive: Boolean(m.is_active ?? true),
        minTickets: m.min_tickets != null ? Number(m.min_tickets) : null,
        createdAt: m.created_at ? new Date(String(m.created_at)) : new Date(),
      })
      .returning({ id: schema.rafflePaymentMethods.id })

    const mapKey = `${raffleId}:${methodType}`
    if (!rpmIdByRaffleAndType.has(mapKey)) {
      rpmIdByRaffleAndType.set(mapKey, rpm!.id)
    }
  }

  // ─── purchases ─────────────────────────────────────────────
  const [purchaseRows] = await source.execute("SELECT * FROM purchases")
  console.log(`🛒 Migrando ${(purchaseRows as unknown[]).length} compras...`)

  for (const p of purchaseRows as MysqlRow[]) {
    const paymentMethod = String(p.payment_method)
    const isUsd = ["zelle", "zinli", "binance", "usd"].includes(paymentMethod)
    const raffleId = Number(p.raffle_id)
    await db.insert(schema.purchases).values({
      id: Number(p.id),
      publicId: randomUUID(),
      raffleId,
      customerName: String(p.customer_name),
      customerPhone: String(p.customer_phone),
      customerPhoneNormalized: normalizePhone(String(p.customer_phone)),
      customerEmail: (p.customer_email as string) ?? null,
      customerCi: (p.customer_ci as string) ?? null,
      customerLocation: (p.customer_location as string) ?? null,
      rafflePaymentMethodId: rpmIdByRaffleAndType.get(`${raffleId}:${paymentMethod}`) ?? null,
      paymentMethod,
      paymentReference: (p.payment_reference as string) ?? null,
      paymentProofUrl: (p.payment_proof_url as string) ?? null,
      ticketQuantity: Number(p.ticket_quantity),
      totalAmountCents: toCents(Number(p.total_amount)),
      currency: isUsd ? "USD" : "VES",
      status: String(p.status ?? "pending"),
      notes: (p.notes as string) ?? null,
      createdAt: p.created_at ? new Date(String(p.created_at)) : new Date(),
      updatedAt: p.updated_at ? new Date(String(p.updated_at)) : new Date(),
    })
  }

  // ─── tickets → purchase_tickets (solo reserved/sold) ───────
  const [ticketRows] = await source.execute(
    "SELECT t.*, p.status as purchase_status FROM tickets t LEFT JOIN purchases p ON t.purchase_id = p.id",
  )
  console.log(`🎫 Compactando tickets (sparse)...`)
  let imported = 0
  let skipped = 0

  const counterByRaffle = new Map<number, { reserved: number; sold: number }>()

  for (const t of ticketRows as MysqlRow[]) {
    const ticketStatus = String(t.status)
    if (ticketStatus === "available") {
      skipped++
      continue
    }
    const purchaseId = t.purchase_id != null ? Number(t.purchase_id) : null
    if (!purchaseId) {
      skipped++
      continue
    }
    const purchaseStatus = String(t.purchase_status ?? "pending")
    const mapped = ticketStatusForPurchase(purchaseStatus, ticketStatus)
    if (!mapped) {
      skipped++
      continue
    }

    const raffleId = Number(t.raffle_id)
    const ticketNumber = ticketNumberToInt(String(t.ticket_number).padStart(4, "0"))

    try {
      await db.insert(schema.purchaseTickets).values({
        raffleId,
        purchaseId,
        ticketNumber,
        status: mapped,
        createdAt: t.created_at ? new Date(String(t.created_at)) : new Date(),
        updatedAt: t.updated_at ? new Date(String(t.updated_at)) : new Date(),
      })
      imported++
      const c = counterByRaffle.get(raffleId) ?? { reserved: 0, sold: 0 }
      if (mapped === "sold") c.sold++
      else c.reserved++
      counterByRaffle.set(raffleId, c)
    } catch {
      console.warn(`   ⚠️  Duplicado omitido raffle=${raffleId} number=${ticketNumber}`)
    }
  }

  // Recalcular contadores por rifa
  for (const r of raffleRows as MysqlRow[]) {
    const id = Number(r.id)
    const total = Number(r.total_tickets)
    const c = counterByRaffle.get(id) ?? { reserved: 0, sold: 0 }
    const reserved = c.reserved
    const sold = c.sold
    const available = Math.max(0, total - reserved - sold)
    await db
      .update(schema.raffles)
      .set({ ticketsAvailable: available, ticketsReserved: reserved, ticketsSold: sold })
      .where(eq(schema.raffles.id, id))
  }

  console.log(`   importados=${imported} omitidos(available/sin compra)=${skipped}`)

  // ─── email_logs ────────────────────────────────────────────
  const [emailRows] = await source.execute("SELECT * FROM email_logs")
  for (const e of emailRows as MysqlRow[]) {
    await db.insert(schema.emailLogs).values({
      id: Number(e.id),
      purchaseId: e.purchase_id != null ? Number(e.purchase_id) : null,
      recipientEmail: String(e.recipient_email),
      emailType: String(e.email_type),
      subject: String(e.subject),
      status: String(e.status ?? "pending"),
      resendEmailId: (e.resend_email_id as string) ?? null,
      errorMessage: (e.error_message as string) ?? null,
      metadata: e.metadata ? parseJson(e.metadata) : null,
      sentAt: e.sent_at ? new Date(String(e.sent_at)) : null,
      createdAt: e.created_at ? new Date(String(e.created_at)) : new Date(),
      updatedAt: e.updated_at ? new Date(String(e.updated_at)) : new Date(),
    })
  }

  await source.end()
  console.log("\n✅ Migración MySQL → libSQL v2 completa")
  console.log(
    "   Siguiente: validar contadores, ejecutar tests, cambiar DATABASE_URL en prod, re-login admin",
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
