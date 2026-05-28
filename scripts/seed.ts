/**
 * Seed libSQL — datos de desarrollo completos (sparse tickets).
 *
 * USO:
 *   pnpm db:seed
 *   SEED_FORCE=1 pnpm db:seed   # borra datos de negocio y re-seed
 *
 * Requiere migraciones aplicadas: pnpm db:migrate
 */

import { randomUUID } from "node:crypto"
import { hashPassword } from "better-auth/crypto"
import {
  accounts,
  appSettings,
  paymentAccounts,
  rafflePaymentMethods,
  prizes,
  purchaseTickets,
  purchases,
  raffles,
  users,
} from "@raffle/shared/db"
import { createScriptClient, createScriptDb } from "./lib/db"

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@rifas.com"
const ADMIN_USERNAME = process.env.SEED_ADMIN_USERNAME ?? "admin"
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "admin123"
const FORCE = process.env.SEED_FORCE === "1"

async function clearBusinessData(db: ReturnType<typeof createScriptDb>) {
  await db.delete(purchaseTickets)
  await db.delete(purchases)
  await db.delete(rafflePaymentMethods)
  await db.delete(paymentAccounts)
  await db.delete(prizes)
  await db.delete(raffles)
  await db.delete(appSettings)
  await db.delete(accounts)
  await db.delete(users)
}

async function seedAdmin(db: ReturnType<typeof createScriptDb>) {
  const userId = randomUUID()
  const credentialHash = await hashPassword(ADMIN_PASSWORD)

  await db.insert(users).values({
    id: userId,
    username: ADMIN_USERNAME,
    email: ADMIN_EMAIL,
    emailVerified: true,
    role: "super_admin",
  })

  await db.insert(accounts).values({
    id: randomUUID(),
    userId,
    accountId: userId,
    providerId: "credential",
    password: credentialHash,
  })

  console.log(`👤 Admin: ${ADMIN_USERNAME} / ${ADMIN_PASSWORD} (${ADMIN_EMAIL})`)
  return userId
}

async function seedAppSettings(db: ReturnType<typeof createScriptDb>) {
  const settings = {
    site_info: { site_name: "Rifas Premium", tagline: "¡Tu oportunidad de ganar!" },
    site_colors: { primary: "#8B7355", secondary: "#F5F5DC", accent: "#FFD700" },
    hero_config: {
      title: "¡GANA",
      subtitle: "AHORA!",
      show_particles: true,
      main_text: "¡GANA",
      accent_text: "AHORA!",
    },
    social_media: {
      whatsapp: "584121234567",
      instagram: "@rifaspremium",
      facebook: "rifaspremium",
      tiktok: "@rifaspremium",
    },
    contact_info: {
      phone: "0412-1234567",
      email: "contacto@rifas.com",
      address: "Caracas, Venezuela",
    },
    raffle_limits: { max_active: 3, max_finished_display: 10 },
    payment_info: { default_methods: ["pago_movil", "zelle", "bs", "usd"] },
    email_settings: {
      enabled: false,
      from_name: "Rifas Premium",
      from_email: "noreply@rifas.com",
      send_confirmation: false,
    },
  }

  await db.insert(appSettings).values({
    version: 1,
    settings: JSON.stringify(settings),
  })
  console.log(`⚙️  app_settings: ${Object.keys(settings).length} claves`)
}

async function seedActiveRaffle(db: ReturnType<typeof createScriptDb>) {
  const drawDate = new Date()
  drawDate.setDate(drawDate.getDate() + 15)
  const totalTickets = 1000

  const [raffle] = await db
    .insert(raffles)
    .values({
      name: "Combo Power 2026",
      description: "¡Gana un increíble premio en nuestro sorteo especial!",
      totalTickets,
      priceBsCents: 15000,
      priceUsdCents: 100,
      minPurchase: 1,
      maxPurchase: 10,
      drawDate,
      status: "active",
      autoPauseEnabled: true,
      publish: false,
      ticketsAvailable: totalTickets,
      ticketsReserved: 0,
      ticketsSold: 0,
    })
    .returning({ id: raffles.id })

  const raffleId = raffle!.id

  const prizeRows = [
    ["Primer Premio - Automóvil 0km", "Chevrolet Spark modelo 2026"],
    ["Segundo Premio - Efectivo", "$500 dólares en efectivo"],
    ["Tercer Premio - TV 55\"", "Smart TV Samsung 4K"],
  ]
  for (let i = 0; i < prizeRows.length; i++) {
    await db.insert(prizes).values({
      raffleId,
      name: prizeRows[i]![0]!,
      description: prizeRows[i]![1]!,
      position: i + 1,
    })
  }

  const accounts = [
    {
      label: "Pago móvil principal",
      methodType: "pago_movil" as const,
      accountInfo: {
        bank: "BDV",
        phone: "04125051356",
        cedula_type: "V",
        cedula_number: "12345678",
      },
    },
    {
      label: "Zelle demo",
      methodType: "zelle" as const,
      accountInfo: { email: "demo@rifas.com", holder_name: "Demo Admin" },
    },
    {
      label: "Binance demo",
      methodType: "binance" as const,
      accountInfo: { email: "binance@rifas.com" },
    },
  ]

  for (const acc of accounts) {
    const [row] = await db
      .insert(paymentAccounts)
      .values({
        label: acc.label,
        methodType: acc.methodType,
        accountInfo: JSON.stringify(acc.accountInfo),
        isActive: true,
      })
      .returning({ id: paymentAccounts.id })

    await db.insert(rafflePaymentMethods).values({
      raffleId,
      accountId: row!.id,
      isActive: true,
    })
  }

  console.log(`🎯 Rifa activa id=${raffleId} (${totalTickets} disponibles, sparse)`)
  return raffleId
}

async function seedFinishedRaffle(db: ReturnType<typeof createScriptDb>) {
  const totalTickets = 100

  const [raffle] = await db
    .insert(raffles)
    .values({
      name: "Sorteo Pasado Demo",
      description: "Rifa finalizada para probar listado publicado",
      totalTickets,
      priceBsCents: 5000,
      priceUsdCents: 50,
      minPurchase: 1,
      maxPurchase: 5,
      drawDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      status: "finished",
      autoPauseEnabled: false,
      publish: true,
      ticketsAvailable: totalTickets - 3,
      ticketsReserved: 0,
      ticketsSold: 3,
    })
    .returning({ id: raffles.id })

  const raffleId = raffle!.id

  const [purchase] = await db
    .insert(purchases)
    .values({
      publicId: randomUUID(),
      raffleId,
      customerName: "Comprador Demo",
      customerPhone: "04141234567",
      customerPhoneNormalized: "04141234567",
      customerEmail: "comprador@example.com",
      paymentMethod: "pago_movil",
      paymentReference: "REF-DEMO-001",
      ticketQuantity: 3,
      totalAmountCents: 15000,
      currency: "VES",
      status: "approved",
    })
    .returning({ id: purchases.id })

  for (const n of [1, 42, 99]) {
    await db.insert(purchaseTickets).values({
      raffleId,
      purchaseId: purchase!.id,
      ticketNumber: n,
      status: "sold",
    })
  }

  console.log(`🏁 Rifa finalizada publicada id=${raffleId} (3 tickets sold de muestra)`)
}

async function validateCounters(db: ReturnType<typeof createScriptDb>) {
  const rows = await db
    .select({
      id: raffles.id,
      total: raffles.totalTickets,
      available: raffles.ticketsAvailable,
      reserved: raffles.ticketsReserved,
      sold: raffles.ticketsSold,
    })
    .from(raffles)

  for (const r of rows) {
    const sum = r.available + r.reserved + r.sold
    if (sum !== r.total) {
      throw new Error(`Contadores incoherentes rifa ${r.id}: ${sum} !== ${r.total}`)
    }
  }
}

async function main() {
  const { resolveDatabaseUrl } = await import("./lib/db")
  const url = resolveDatabaseUrl()
  console.log(`🌱 Seed libSQL → ${url}`)

  const client = createScriptClient(url)
  await client.execute("PRAGMA journal_mode = WAL")
  await client.execute("PRAGMA busy_timeout = 10000")
  await client.close()

  const db = createScriptDb(url)

  const existing = await db.select({ id: users.id }).from(users).limit(1)
  if (existing.length > 0 && !FORCE) {
    console.log("ℹ️  BD ya tiene datos. Usa SEED_FORCE=1 para resetear y volver a sembrar.")
    return
  }

  if (FORCE) {
    console.log("🧹 SEED_FORCE: limpiando datos…")
    await clearBusinessData(db)
  }

  await seedAdmin(db)
  await seedAppSettings(db)
  await seedActiveRaffle(db)
  await seedFinishedRaffle(db)
  await validateCounters(db)

  console.log("✅ Seed completo. Sparse model — no hay filas available en purchase_tickets.")
}

main().catch((err) => {
  console.error("❌ Error en seed:", err)
  process.exit(1)
})
