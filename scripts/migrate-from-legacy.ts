/**
 * Script de migración: legacy MySQL → nuevo schema.
 *
 * Migra datos legacy incluyendo filas individuales de tickets y email_logs.
 *
 * USO:
 *   LEGACY_DATABASE_URL=mysql://... NEW_DATABASE_URL=mysql://... bun run scripts/migrate-from-legacy.ts
 */

import mysql from "mysql2/promise"

const LEGACY_URL = process.env.LEGACY_DATABASE_URL
const NEW_URL = process.env.NEW_DATABASE_URL

if (!LEGACY_URL || !NEW_URL) {
  console.error("❌ Set LEGACY_DATABASE_URL and NEW_DATABASE_URL env vars")
  process.exit(1)
}

async function main() {
  const legacy = mysql.createPool({ uri: LEGACY_URL, connectionLimit: 1 })
  const newDb = mysql.createPool({ uri: NEW_URL, connectionLimit: 1 })

  console.log("🔌 Conectado a legacy y new DB")

  // ─── 1. users ──────────────────────────────────────────────
  const [users] = await legacy.execute("SELECT * FROM users")
  console.log(`👤 Migrando ${(users as unknown[]).length} usuarios...`)
  for (const u of users as Record<string, unknown>[]) {
    await newDb.execute(
      `INSERT IGNORE INTO users (id, username, email, password_hash, role, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [u.id, u.username, u.email, u.password_hash, u.role, u.created_at, u.updated_at],
    )
  }

  // ─── 2. site_config ────────────────────────────────────────
  const [config] = await legacy.execute("SELECT * FROM site_config")
  console.log(`⚙️  Migrando ${(config as unknown[]).length} configs...`)
  for (const c of config as Record<string, unknown>[]) {
    await newDb.execute(
      `INSERT IGNORE INTO site_config (id, config_key, config_value, description, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      [c.id, c.config_key, c.config_value, c.description, c.updated_at],
    )
  }

  // ─── 3. raffles ────────────────────────────────────────────
  const [raffleRows] = await legacy.execute("SELECT * FROM raffles")
  console.log(`🎯 Migrando ${(raffleRows as unknown[]).length} rifas...`)
  for (const r of raffleRows as Record<string, unknown>[]) {
    await newDb.execute(
      `INSERT IGNORE INTO raffles
       (id, name, description, image_url, total_tickets, price_bs, price_usd,
        min_purchase, max_purchase, draw_date, status, pause_until, pause_reason,
        auto_pause_enabled, publish, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        r.id,
        r.name,
        r.description,
        r.image_url,
        r.total_tickets,
        r.price_bs,
        r.price_usd,
        r.min_purchase,
        r.max_purchase,
        r.draw_date,
        r.status,
        r.pause_until,
        r.pause_reason,
        r.auto_pause_enabled ?? true,
        r.publish ?? false,
        r.created_at,
        r.updated_at,
      ],
    )
  }

  // ─── 4. prizes ─────────────────────────────────────────────
  const [prizeRows] = await legacy.execute("SELECT * FROM prizes")
  console.log(`🏆 Migrando ${(prizeRows as unknown[]).length} premios...`)
  for (const p of prizeRows as Record<string, unknown>[]) {
    await newDb.execute(
      `INSERT IGNORE INTO prizes (id, raffle_id, name, description, image_url, position, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [p.id, p.raffle_id, p.name, p.description, p.image_url, p.position, p.created_at],
    )
  }

  // ─── 5. payment_methods ────────────────────────────────────
  const [payRows] = await legacy.execute("SELECT * FROM payment_methods")
  console.log(`💳 Migrando ${(payRows as unknown[]).length} métodos de pago...`)
  for (const m of payRows as Record<string, unknown>[]) {
    await newDb.execute(
      `INSERT IGNORE INTO payment_methods
       (id, raffle_id, method_type, account_info, is_active, min_tickets, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [m.id, m.raffle_id, m.method_type, m.account_info, m.is_active, m.min_tickets, m.created_at],
    )
  }

  // ─── 6. purchases ───────────────────────────────────────────
  const [purchaseRows] = await legacy.execute("SELECT * FROM purchases")
  console.log(`🛒 Migrando ${(purchaseRows as unknown[]).length} compras...`)
  for (const p of purchaseRows as Record<string, unknown>[]) {
    await newDb.execute(
      `INSERT IGNORE INTO purchases
       (id, raffle_id, customer_name, customer_phone, customer_email, customer_ci,
        customer_location, payment_method, payment_reference, payment_proof_url,
        ticket_quantity, total_amount, status, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        p.id,
        p.raffle_id,
        p.customer_name,
        p.customer_phone,
        p.customer_email,
        p.customer_ci,
        p.customer_location,
        p.payment_method,
        p.payment_reference,
        p.payment_proof_url,
        p.ticket_quantity,
        p.total_amount,
        p.status,
        p.notes,
        p.created_at,
        p.updated_at,
      ],
    )
  }

  // ─── 7. tickets ─────────────────────────────────────────────
  const [ticketRows] = await legacy.execute("SELECT * FROM tickets")
  console.log(`🎫 Migrando ${(ticketRows as unknown[]).length} tickets...`)
  let ticketBatch = 0
  for (const t of ticketRows as Record<string, unknown>[]) {
    await newDb.execute(
      `INSERT IGNORE INTO tickets
       (id, raffle_id, ticket_number, status, purchase_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        t.id,
        t.raffle_id,
        String(t.ticket_number).padStart(4, "0"),
        t.status,
        t.purchase_id,
        t.created_at,
        t.updated_at,
      ],
    )
    ticketBatch++
    if (ticketBatch % 5000 === 0) console.log(`   … ${ticketBatch} tickets`)
  }

  // ─── 8. email_logs ─────────────────────────────────────────
  const [emailRows] = await legacy.execute("SELECT * FROM email_logs")
  console.log(`📧 Migrando ${(emailRows as unknown[]).length} logs de email...`)
  for (const e of emailRows as Record<string, unknown>[]) {
    await newDb.execute(
      `INSERT IGNORE INTO email_logs
       (id, purchase_id, recipient_email, email_type, subject, status,
        resend_email_id, error_message, metadata, sent_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        e.id,
        e.purchase_id,
        e.recipient_email,
        e.email_type,
        e.subject,
        e.status,
        e.resend_email_id,
        e.error_message,
        e.metadata,
        e.sent_at,
        e.created_at,
        e.updated_at,
      ],
    )
  }

  console.log(`\n✅ Migración completa (incluye tickets individuales)`)
  await legacy.end()
  await newDb.end()
}

main().catch((err) => {
  console.error("❌ Error:", err)
  process.exit(1)
})
