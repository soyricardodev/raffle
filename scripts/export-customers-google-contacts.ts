/**
 * Export raffle buyers (name + phone) to a Google Contacts CSV.
 *
 * Usage:
 *   bun run scripts/export-customers-google-contacts.ts
 *   bun run scripts/export-customers-google-contacts.ts --output ./contacts.csv
 *
 * Sanitizes junk names and invalid Venezuelan mobile numbers, title-cases names,
 * and adds Spanish notes/labels for Google Contacts import.
 *
 * Uses DATABASE_URL / Turso env from app/.env (see scripts/lib/db.ts).
 */

import { mkdir, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { sql } from "drizzle-orm"
import { createScriptDb, resolveDatabaseUrl } from "./lib/db"
import {
  CONTACTS_LABEL,
  formatPurchaseNote,
  PHONE_LABEL,
  sanitizeCustomerName,
  sanitizePhone,
  splitName,
} from "./lib/google-contacts-sanitize"

const DEFAULT_OUTPUT = resolve(process.cwd(), "exports", "google-contacts-customers.csv")
const GOOGLE_CONTACTS_IMPORT_LIMIT = 3000

type RawBuyerRow = {
  customerName: string
  customerPhone: string
  lastPurchaseAt: number
  raffleName: string
}

type ExportContact = {
  firstName: string
  lastName: string
  phone: string
  notes: string
  labels: string
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

function splitOutputPath(outputPath: string, part: number, totalParts: number): string {
  if (totalParts === 1) return outputPath
  const dotIndex = outputPath.lastIndexOf(".")
  if (dotIndex <= 0) return `${outputPath}-part-${part}-of-${totalParts}`
  const base = outputPath.slice(0, dotIndex)
  const ext = outputPath.slice(dotIndex)
  return `${base}-part-${part}-of-${totalParts}${ext}`
}

function parseArgs(argv: string[]): { outputPath: string } {
  const outputFlagIndex = argv.indexOf("--output")
  const outputPath =
    outputFlagIndex >= 0 && argv[outputFlagIndex + 1]
      ? resolve(argv[outputFlagIndex + 1]!)
      : DEFAULT_OUTPUT
  return { outputPath }
}

function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function sanitizeBuyerRow(row: RawBuyerRow): ExportContact | null {
  const phone = sanitizePhone(row.customerPhone)
  if (!phone) return null

  const customerName = sanitizeCustomerName(row.customerName, phone.digits)
  if (!customerName) return null

  const { firstName, lastName } = splitName(customerName)
  return {
    firstName,
    lastName,
    phone: phone.formatted,
    notes: formatPurchaseNote(row.lastPurchaseAt, row.raffleName),
    labels: CONTACTS_LABEL,
  }
}

function toGoogleContactsCsv(rows: ExportContact[]): string {
  const headers = [
    "First Name",
    "Last Name",
    "Phone - Label",
    "Phone - Value",
    "Notes",
    "Labels",
  ]
  const lines = [headers.join(",")]

  for (const row of rows) {
    lines.push(
      [
        escapeCsvField(row.firstName),
        escapeCsvField(row.lastName),
        escapeCsvField(PHONE_LABEL),
        escapeCsvField(row.phone),
        escapeCsvField(row.notes),
        escapeCsvField(row.labels),
      ].join(","),
    )
  }

  return `${lines.join("\r\n")}\r\n`
}

async function fetchBuyers(db: ReturnType<typeof createScriptDb>): Promise<RawBuyerRow[]> {
  const result = await db.run(sql`
    SELECT
      p.customer_name AS customerName,
      p.customer_phone AS customerPhone,
      p.created_at AS lastPurchaseAt,
      r.name AS raffleName
    FROM purchases p
    INNER JOIN raffles r ON r.id = p.raffle_id
    INNER JOIN (
      SELECT customer_phone_normalized, MAX(id) AS latest_id
      FROM purchases
      GROUP BY customer_phone_normalized
    ) latest
      ON latest.customer_phone_normalized = p.customer_phone_normalized
      AND latest.latest_id = p.id
    ORDER BY p.customer_name COLLATE NOCASE ASC, p.customer_phone ASC
  `)

  return result.rows as RawBuyerRow[]
}

async function main() {
  const { outputPath } = parseArgs(process.argv.slice(2))
  const db = createScriptDb()

  console.log(`Database: ${resolveDatabaseUrl()}`)
  const rawBuyers = await fetchBuyers(db)

  if (rawBuyers.length === 0) {
    console.log("No purchases found — nothing to export.")
    return
  }

  const contacts: ExportContact[] = []
  let droppedBadPhone = 0
  let droppedJunkName = 0

  for (const row of rawBuyers) {
    const phone = sanitizePhone(row.customerPhone)
    if (!phone) {
      droppedBadPhone++
      continue
    }

    if (sanitizeCustomerName(row.customerName, phone.digits) === null) {
      droppedJunkName++
      continue
    }

    const sanitized = sanitizeBuyerRow(row)
    if (sanitized) contacts.push(sanitized)
  }

  if (contacts.length === 0) {
    console.log("All contacts were filtered out during sanitization.")
    return
  }

  await mkdir(dirname(outputPath), { recursive: true })

  const parts = chunk(contacts, GOOGLE_CONTACTS_IMPORT_LIMIT)
  const writtenPaths: string[] = []

  for (const [index, partRows] of parts.entries()) {
    const partPath = splitOutputPath(outputPath, index + 1, parts.length)
    await writeFile(partPath, toGoogleContactsCsv(partRows), "utf8")
    writtenPaths.push(partPath)
  }

  console.log(`Raw unique phones: ${rawBuyers.length}`)
  console.log(`Dropped invalid phones: ${droppedBadPhone}`)
  console.log(`Dropped junk names: ${droppedJunkName}`)
  console.log(`Exported ${contacts.length} contacts (${parts.length} file(s)):`)
  for (const path of writtenPaths) {
    console.log(`  - ${path}`)
  }
  if (parts.length > 1) {
    console.log(
      `Import each file separately in Google Contacts (max ${GOOGLE_CONTACTS_IMPORT_LIMIT} contacts per import).`,
    )
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
