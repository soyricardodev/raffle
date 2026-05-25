/**
 * Seed script — data de ejemplo para desarrollo local.
 *
 * USO:
 *   DATABASE_URL=mysql://root:raffle_dev@localhost:3306/raffle_db bun run scripts/seed.ts
 */

import mysql from "mysql2/promise"
import bcrypt from "bcryptjs"

const DB_URL = process.env.DATABASE_URL ?? "mysql://root:raffle_dev@localhost:3306/raffle_db"

async function main() {
  const pool = mysql.createPool({ uri: DB_URL, connectionLimit: 1 })

  console.log("🌱 Seed: data de ejemplo para raffle-v2")

  // ─── Admin user (password: admin123) ───────────────────────
  const hash = await bcrypt.hash("admin123", 10)
  await pool.execute(
    `INSERT IGNORE INTO users (username, email, password_hash, role)
     VALUES (?, ?, ?, ?)`,
    ["admin", "admin@rifas.com", hash, "super_admin"],
  )
  console.log("👤 admin / admin123 (super_admin)")

  // ─── Rifa activa ──────────────────────────────────────────
  const drawDate = new Date()
  drawDate.setDate(drawDate.getDate() + 15)

  const [raffleResult] = await pool.execute(
    `INSERT INTO raffles
     (name, description, total_tickets, price_bs, price_usd,
      min_purchase, max_purchase, draw_date, status, auto_pause_enabled)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      "Combo Power 2026",
      "¡Gana un increíble premio en nuestro sorteo especial!",
      1000,
      150.0,
      1.0,
      1,
      10,
      drawDate,
      "active",
      true,
    ],
  )
  const raffleId = (raffleResult as { insertId: number }).insertId
  console.log(`🎯 Rifa activa: Combo Power 2026 (1000 tickets) [id=${raffleId}]`)

  // ─── Premios ───────────────────────────────────────────────
  const prizes = [
    ["Primer Premio - Automóvil 0km", "Chevrolet Spark modelo 2026"],
    ["Segundo Premio - Efectivo", "$500 dólares en efectivo"],
    ["Tercer Premio - TV 55\"", "Smart TV Samsung 4K"],
  ]

  for (let i = 0; i < prizes.length; i++) {
    await pool.execute(
      "INSERT INTO prizes (raffle_id, name, description, position) VALUES (?, ?, ?, ?)",
      [raffleId, prizes[i]![0], prizes[i]![1], i + 1],
    )
  }
  console.log(`🏆 ${prizes.length} premios creados`)

  // ─── Métodos de pago ──────────────────────────────────────
  const methods = [
    ["pago_movil", JSON.stringify({ phone: "04125051356", holder: "Cindy Vanessa Ortiz", cedula: "12345678", bank: "Banco de Venezuela" })],
    ["zelle", JSON.stringify({ email: "cindy@email.com", holder: "Cindy Vanessa Ortiz" })],
    ["bs", JSON.stringify({ account: "01020123456789012345", holder: "Cindy Vanessa Ortiz", bank: "Banco de Venezuela" })],
    ["usd", JSON.stringify({ account: "01020123456789012346", holder: "Cindy Vanessa Ortiz", bank: "Banesco" })],
  ]

  for (const [type, info] of methods) {
    await pool.execute(
      "INSERT INTO payment_methods (raffle_id, method_type, account_info) VALUES (?, ?, ?)",
      [raffleId, type, info],
    )
  }
  console.log(`💳 ${methods.length} métodos de pago creados`)

  // ─── Site config básico ────────────────────────────────────
  const configs = [
    ["site_info", { site_name: "Rifas Premium", tagline: "¡Tu oportunidad de ganar!" }],
    ["site_colors", { primary: "#8B7355", secondary: "#F5F5DC", accent: "#FFD700" }],
    ["hero_config", { main_text: "¡GANA", accent_text: "AHORA!", particles_type: "sparkles", particles_count: 20 }],
    ["social_media", { whatsapp: "", instagram: "", facebook: "", tiktok: "" }],
    ["contact_info", { phone: "", email: "", address: "" }],
    ["raffle_limits", { max_active: 3, max_finished_display: 10 }],
    ["payment_info", { default_methods: ["pago_movil", "zelle", "bs", "usd"] }],
    ["email_settings", { enabled: false, from_name: "Rifas Premium", from_email: "", send_confirmation: false }],
  ]

  for (const [key, value] of configs) {
    await pool.execute(
      "INSERT IGNORE INTO site_config (config_key, config_value, description) VALUES (?, ?, ?)",
      [key, JSON.stringify(value), `Config: ${key}`],
    )
  }
  console.log(`⚙️  ${configs.length} configs de sitio creadas`)

  // ─── Generar pool de tickets para la rifa (lite — batch) ──
  const totalTickets = 1000
  console.log(`🎫 Generando ${totalTickets} tickets (0000-0999)...`)

  const batchSize = 500
  for (let i = 0; i < totalTickets; i += batchSize) {
    const batch: (string | number)[][] = []
    for (let j = i; j < Math.min(i + batchSize, totalTickets); j++) {
      batch.push([raffleId, String(j).padStart(4, "0"), "available"])
    }
    const placeholders = batch.map(() => "(?, ?, ?)").join(", ")
    const values = batch.flat()
    await pool.execute(
      `INSERT INTO tickets (raffle_id, ticket_number, status) VALUES ${placeholders}`,
      values,
    )
  }
  console.log("✅ Seed completo. Datos listos para desarrollo.")
  await pool.end()
}

main().catch((err) => {
  console.error("❌ Error en seed:", err)
  process.exit(1)
})
