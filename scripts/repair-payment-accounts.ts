/**
 * Repara métodos de pago ya migrados: deduplica catálogo, normaliza cédula de pago móvil,
 * y backfill desde MySQL legacy como fuente de verdad.
 *
 * USO:
 *   SOURCE_DATABASE_URL=mysql://... TARGET_DATABASE_URL=file:./data/raffle.db bun run scripts/repair-payment-accounts.ts
 *   ... bun run scripts/repair-payment-accounts.ts --apply
 */

import { createClient } from "@libsql/client"
import { schema } from "@raffle/shared/db"
import {
  accountInfoCompletenessScore,
  buildPaymentAccountLabel,
  isLegacyMigrationLabel,
  mergeMinTickets,
  normalizeLegacyAccountInfo,
  parseLegacyPaymentMethodId,
  parseRawAccountInfo,
  pickCanonicalAccountId,
  stableAccountInfoKey,
  type PaymentMethod,
} from "@raffle/shared/payment-methods"
import { eq } from "drizzle-orm"
import { drizzle } from "drizzle-orm/libsql"
import mysql from "mysql2/promise"

const SOURCE_URL = process.env.SOURCE_DATABASE_URL ?? process.env.LEGACY_DATABASE_URL
const TARGET_URL = process.env.TARGET_DATABASE_URL ?? process.env.DATABASE_URL
const APPLY = process.argv.includes("--apply")

if (!SOURCE_URL || !TARGET_URL) {
  console.error(
    "❌ Set SOURCE_DATABASE_URL (MySQL) and TARGET_DATABASE_URL (libSQL file: or libsql://)",
  )
  process.exit(1)
}

type MysqlRow = Record<string, unknown>

type LegacyPaymentMethod = {
  id: number
  raffleId: number
  methodType: PaymentMethod
  accountInfo: unknown
  minTickets: number | null
  isActive: boolean
}

type AccountRow = {
  id: number
  label: string
  methodType: PaymentMethod
  accountInfo: string
  isActive: boolean
}

type RpmRow = {
  id: number
  raffleId: number
  accountId: number
  isActive: boolean
  minTickets: number | null
}

type RepairAction =
  | { type: "update_account"; accountId: number; label: string; accountInfo: string }
  | { type: "reassign_rpm"; rpmId: number; fromAccountId: number; toAccountId: number }
  | { type: "merge_rpm"; keepRpmId: number; dropRpmId: number; minTickets: number | null }
  | { type: "update_purchases"; fromRpmId: number; toRpmId: number }
  | { type: "delete_account"; accountId: number }

function resolveNormalizedInfo(
  account: AccountRow,
  legacyById: Map<number, LegacyPaymentMethod>,
): Record<string, string> {
  const legacyId = parseLegacyPaymentMethodId(account.label)
  if (legacyId !== null && legacyById.has(legacyId)) {
    const legacy = legacyById.get(legacyId)!
    return normalizeLegacyAccountInfo(legacy.methodType, legacy.accountInfo)
  }

  const normalizedCurrent = normalizeLegacyAccountInfo(
    account.methodType,
    parseRawAccountInfo(account.accountInfo),
  )

  let best = normalizedCurrent
  let bestScore = accountInfoCompletenessScore(account.methodType, normalizedCurrent)
  const currentKey = stableAccountInfoKey(account.methodType, normalizedCurrent)

  for (const legacy of legacyById.values()) {
    if (legacy.methodType !== account.methodType) continue
    const normalizedLegacy = normalizeLegacyAccountInfo(legacy.methodType, legacy.accountInfo)
    if (stableAccountInfoKey(legacy.methodType, normalizedLegacy) !== currentKey) continue
    const score = accountInfoCompletenessScore(legacy.methodType, normalizedLegacy)
    if (score > bestScore) {
      best = normalizedLegacy
      bestScore = score
    }
  }

  return best
}

async function main() {
  const mysqlConn = await mysql.createConnection(SOURCE_URL)
  const client = createClient({
    url: TARGET_URL,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  })
  const db = drizzle(client, { schema })

  console.log(`🔧 Reparación de métodos de pago (${APPLY ? "APLICAR" : "dry-run"})\n`)

  const [legacyRows] = await mysqlConn.execute(
    "SELECT id, raffle_id, method_type, account_info, min_tickets, is_active FROM payment_methods",
  )
  const legacyById = new Map<number, LegacyPaymentMethod>()
  for (const row of legacyRows as MysqlRow[]) {
    const id = Number(row.id)
    legacyById.set(id, {
      id,
      raffleId: Number(row.raffle_id),
      methodType: String(row.method_type) as PaymentMethod,
      accountInfo: row.account_info,
      minTickets: row.min_tickets != null ? Number(row.min_tickets) : null,
      isActive: Boolean(row.is_active ?? true),
    })
  }

  const accountRows = await db.select().from(schema.paymentAccounts)
  const rpmRows = await db.select().from(schema.rafflePaymentMethods)

  const accounts: AccountRow[] = accountRows.map((a) => ({
    id: a.id,
    label: a.label,
    methodType: a.methodType as PaymentMethod,
    accountInfo: a.accountInfo,
    isActive: a.isActive,
  }))

  const rpms: RpmRow[] = rpmRows.map((r) => ({
    id: r.id,
    raffleId: r.raffleId,
    accountId: r.accountId,
    isActive: r.isActive,
    minTickets: r.minTickets,
  }))

  const accountsById = new Map(accounts.map((a) => [a.id, a]))
  const normalizedByAccountId = new Map<number, Record<string, string>>()
  for (const account of accounts) {
    normalizedByAccountId.set(account.id, resolveNormalizedInfo(account, legacyById))
  }

  const actions: RepairAction[] = []
  const duplicateGroups = new Map<string, number[]>()

  for (const account of accounts) {
    const normalized = normalizedByAccountId.get(account.id)!
    const key = stableAccountInfoKey(account.methodType, normalized)
    const group = duplicateGroups.get(key) ?? []
    group.push(account.id)
    duplicateGroups.set(key, group)
  }

  const canonicalByAccountId = new Map<number, number>()
  let duplicateAccountCount = 0

  for (const [, group] of duplicateGroups) {
    if (group.length <= 1) {
      canonicalByAccountId.set(group[0]!, group[0]!)
      continue
    }
    duplicateAccountCount += group.length - 1
    const sampleAccount = accountsById.get(group[0]!)!
    const canonicalId = pickCanonicalAccountId(group, (id) =>
      accountInfoCompletenessScore(
        accountsById.get(id)?.methodType ?? sampleAccount.methodType,
        normalizedByAccountId.get(id) ?? {},
      ),
    )
    for (const id of group) {
      canonicalByAccountId.set(id, canonicalId)
    }
  }

  const rpmsByRaffleAccount = new Map<string, RpmRow>()
  for (const rpm of rpms) {
    rpmsByRaffleAccount.set(`${rpm.raffleId}:${rpm.accountId}`, rpm)
  }

  const rpmAccountRemap = new Map<number, number>()
  for (const rpm of rpms) {
    const canonicalAccountId = canonicalByAccountId.get(rpm.accountId) ?? rpm.accountId
    if (canonicalAccountId !== rpm.accountId) {
      rpmAccountRemap.set(rpm.id, canonicalAccountId)
    }
  }

  const rpmsToDrop = new Set<number>()
  const purchaseRpmRemap = new Map<number, number>()
  const sortedRpms = [...rpms].sort((a, b) => a.id - b.id)

  for (const rpm of sortedRpms) {
    const targetAccountId = rpmAccountRemap.get(rpm.id) ?? rpm.accountId
    if (targetAccountId === rpm.accountId) continue

    const conflictKey = `${rpm.raffleId}:${targetAccountId}`
    const existing = rpmsByRaffleAccount.get(conflictKey)

    if (existing && existing.id !== rpm.id && !rpmsToDrop.has(existing.id)) {
      const mergedMin = mergeMinTickets(existing.minTickets, rpm.minTickets)
      actions.push({
        type: "merge_rpm",
        keepRpmId: existing.id,
        dropRpmId: rpm.id,
        minTickets: mergedMin,
      })
      purchaseRpmRemap.set(rpm.id, existing.id)
      rpmsToDrop.add(rpm.id)
      if (mergedMin !== existing.minTickets) {
        existing.minTickets = mergedMin
      }
    } else if (!existing || rpmsToDrop.has(existing.id)) {
      actions.push({
        type: "reassign_rpm",
        rpmId: rpm.id,
        fromAccountId: rpm.accountId,
        toAccountId: targetAccountId,
      })
      rpmsByRaffleAccount.set(conflictKey, { ...rpm, accountId: targetAccountId })
    }
  }

  for (const [fromRpmId, toRpmId] of purchaseRpmRemap) {
    actions.push({ type: "update_purchases", fromRpmId, toRpmId })
  }

  const accountsToKeep = new Set<number>()
  for (const rpm of rpms) {
    if (rpmsToDrop.has(rpm.id)) continue
    const canonicalAccountId = canonicalByAccountId.get(rpm.accountId) ?? rpm.accountId
    accountsToKeep.add(canonicalAccountId)
  }

  for (const account of accounts) {
    const canonicalId = canonicalByAccountId.get(account.id) ?? account.id
    if (canonicalId !== account.id) continue

    const normalized = normalizedByAccountId.get(account.id)!
    const newLabel =
      isLegacyMigrationLabel(account.label) || account.label.trim() === ""
        ? buildPaymentAccountLabel(account.methodType, normalized)
        : account.label
    const newInfo = JSON.stringify(normalized)
    const currentNormalized = normalizeLegacyAccountInfo(
      account.methodType,
      parseRawAccountInfo(account.accountInfo),
    )
    const infoChanged =
      stableAccountInfoKey(account.methodType, currentNormalized) !==
      stableAccountInfoKey(account.methodType, normalized)
    const labelChanged = newLabel !== account.label

    if (infoChanged || labelChanged) {
      actions.push({
        type: "update_account",
        accountId: account.id,
        label: newLabel,
        accountInfo: newInfo,
      })
    }
  }

  for (const account of accounts) {
    const canonicalId = canonicalByAccountId.get(account.id) ?? account.id
    if (account.id === canonicalId) continue
    if (accountsToKeep.has(account.id)) continue
    actions.push({ type: "delete_account", accountId: account.id })
  }

  let cedulaFixed = 0
  for (const account of accounts) {
    const canonicalId = canonicalByAccountId.get(account.id) ?? account.id
    if (account.id !== canonicalId) continue
    if (account.methodType !== "pago_movil") continue
    const before = parseRawAccountInfo(account.accountInfo)
    const after = normalizedByAccountId.get(account.id)!
    if ((!before.cedula_type || !before.cedula_number) && after.cedula_type && after.cedula_number) {
      cedulaFixed++
    }
  }

  console.log("Resumen:")
  console.log(`  Cuentas en libSQL:              ${accounts.length}`)
  console.log(`  Filas legacy MySQL:             ${legacyById.size}`)
  console.log(`  Grupos duplicados (dedup):      ${duplicateAccountCount}`)
  console.log(`  Pago móvil con cédula a corregir: ${cedulaFixed}`)
  console.log(`  Acciones planificadas:          ${actions.length}`)
  console.log("")

  const countByType = actions.reduce<Record<string, number>>((acc, a) => {
    acc[a.type] = (acc[a.type] ?? 0) + 1
    return acc
  }, {})
  for (const [type, count] of Object.entries(countByType)) {
    console.log(`  - ${type}: ${count}`)
  }

  if (!APPLY) {
    console.log("\n⚠️  Dry-run — re-ejecuta con --apply para aplicar cambios")
    await mysqlConn.end()
    return
  }

  console.log("\n📝 Aplicando cambios...")

  await db.transaction(async (tx) => {
    for (const action of actions) {
      switch (action.type) {
        case "update_account":
          await tx
            .update(schema.paymentAccounts)
            .set({
              label: action.label,
              accountInfo: action.accountInfo,
              updatedAt: new Date(),
            })
            .where(eq(schema.paymentAccounts.id, action.accountId))
          break
        case "reassign_rpm":
          await tx
            .update(schema.rafflePaymentMethods)
            .set({ accountId: action.toAccountId })
            .where(eq(schema.rafflePaymentMethods.id, action.rpmId))
          break
        case "merge_rpm":
          await tx
            .update(schema.rafflePaymentMethods)
            .set({ minTickets: action.minTickets })
            .where(eq(schema.rafflePaymentMethods.id, action.keepRpmId))
          await tx
            .delete(schema.rafflePaymentMethods)
            .where(eq(schema.rafflePaymentMethods.id, action.dropRpmId))
          break
        case "update_purchases":
          await tx
            .update(schema.purchases)
            .set({ rafflePaymentMethodId: action.toRpmId })
            .where(eq(schema.purchases.rafflePaymentMethodId, action.fromRpmId))
          break
        case "delete_account":
          await tx.delete(schema.paymentAccounts).where(eq(schema.paymentAccounts.id, action.accountId))
          break
      }
    }
  })

  const remainingAccounts = await db.select({ id: schema.paymentAccounts.id }).from(schema.paymentAccounts)
  console.log(`\n✅ Reparación aplicada — ${remainingAccounts.length} cuentas en catálogo`)

  await mysqlConn.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
