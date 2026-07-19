import { sql } from "drizzle-orm"
import { createScriptDb } from "./lib/db"

const db = createScriptDb()

const baseCte = sql`
  SELECT p.customer_name, p.customer_phone, p.customer_phone_normalized, p.status
  FROM purchases p
  INNER JOIN (
    SELECT customer_phone_normalized, MAX(created_at) AS latest_created_at
    FROM purchases
    GROUP BY customer_phone_normalized
  ) latest
    ON latest.customer_phone_normalized = p.customer_phone_normalized
    AND latest.latest_created_at = p.created_at
`

async function count(query: ReturnType<typeof sql>): Promise<number> {
  const result = await db.run(query)
  return Number(result.rows[0]?.n ?? 0)
}

const total = await count(sql`SELECT COUNT(DISTINCT customer_phone_normalized) AS n FROM purchases`)
const exported = await count(sql`SELECT COUNT(*) AS n FROM (${baseCte})`)

const nameIsPhone = await count(sql`
  SELECT COUNT(*) AS n FROM (${baseCte}) b
  WHERE REPLACE(REPLACE(REPLACE(REPLACE(b.customer_name, ' ', ''), '-', ''), '(', ''), ')', '') GLOB '[0-9]*'
    AND LENGTH(REPLACE(REPLACE(REPLACE(REPLACE(b.customer_name, ' ', ''), '-', ''), '(', ''), ')', '')) >= 7
`)

const shortName = await count(sql`
  SELECT COUNT(*) AS n FROM (${baseCte}) b
  WHERE LENGTH(TRIM(b.customer_name)) < 3
`)

const junkName = await count(sql`
  SELECT COUNT(*) AS n FROM (${baseCte}) b
  WHERE TRIM(b.customer_name) GLOB '*asdasd*'
    OR TRIM(b.customer_name) GLOB '*asdf*'
    OR LOWER(TRIM(b.customer_name)) IN ('test', 'prueba', 'xxx', 'aaa', 'none', 'na', 'n/a', '.')
`)

const noAlphaName = await count(sql`
  SELECT COUNT(*) AS n FROM (${baseCte}) b
  WHERE b.customer_name NOT GLOB '*[A-Za-z]*'
    AND b.customer_name NOT GLOB '*[áéíóúñÁÉÍÓÚÑ]*'
`)

const invalidPhone = await count(sql`
  SELECT COUNT(*) AS n FROM (${baseCte}) b
  WHERE LENGTH(REPLACE(b.customer_phone, ' ', '')) < 10
    OR REPLACE(b.customer_phone, ' ', '') NOT GLOB '0*'
`)

const pendingOnly = await count(sql`
  SELECT COUNT(*) AS n FROM (${baseCte}) b
  WHERE b.status = 'pending'
`)

const rejectedOnly = await count(sql`
  SELECT COUNT(*) AS n FROM (${baseCte}) b
  WHERE b.status = 'rejected'
`)

const approved = await count(sql`
  SELECT COUNT(*) AS n FROM (${baseCte}) b
  WHERE b.status = 'approved'
`)

console.log(
  JSON.stringify(
    {
      uniquePhonesInPurchases: total,
      contactsInCurrentExport: exported,
      issues: {
        nameLooksLikePhone: nameIsPhone,
        nameTooShort: shortName,
        junkOrTestNames: junkName,
        nameHasNoLetters: noAlphaName,
        suspiciousPhoneFormat: invalidPhone,
      },
      byLatestPurchaseStatus: {
        approved,
        pending: pendingOnly,
        rejected: rejectedOnly,
      },
    },
    null,
    2,
  ),
)

const samples = await db.run(sql`
  SELECT customer_name, customer_phone, status FROM (${baseCte}) b
  WHERE REPLACE(REPLACE(REPLACE(REPLACE(b.customer_name, ' ', ''), '-', ''), '(', ''), ')', '') GLOB '[0-9]*'
    OR TRIM(b.customer_name) GLOB '*asdasd*'
    OR LENGTH(TRIM(b.customer_name)) < 3
  LIMIT 12
`)
console.log("\nSample problematic rows:")
for (const row of samples.rows) {
  console.log(`  ${JSON.stringify(row)}`)
}

const phoneSamples = await db.run(sql`
  SELECT b.customer_phone, COUNT(*) AS n
  FROM (${baseCte}) b
  WHERE LENGTH(REPLACE(b.customer_phone, ' ', '')) < 10
    OR REPLACE(b.customer_phone, ' ', '') NOT GLOB '0*'
  GROUP BY b.customer_phone
  ORDER BY n DESC
  LIMIT 15
`)
console.log("\nTop suspicious phone values:")
for (const row of phoneSamples.rows) {
  console.log(`  ${JSON.stringify(row)}`)
}

const duplicateNamePhone = await count(sql`
  SELECT COUNT(*) AS n FROM (${baseCte}) b
  WHERE REPLACE(REPLACE(REPLACE(REPLACE(b.customer_name, ' ', ''), '-', ''), '(', ''), ')', '')
    = REPLACE(REPLACE(b.customer_phone, ' ', ''), '-', '')
`)

console.log(`\nName equals phone: ${duplicateNamePhone}`)

const validVeMobile = await count(sql`
  SELECT COUNT(*) AS n FROM (${baseCte}) b
  WHERE REPLACE(b.customer_phone, ' ', '') GLOB '04[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'
    AND LENGTH(REPLACE(b.customer_phone, ' ', '')) = 11
`)

const approvedValidVe = await count(sql`
  SELECT COUNT(*) AS n FROM (${baseCte}) b
  WHERE b.status = 'approved'
    AND REPLACE(b.customer_phone, ' ', '') GLOB '04[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'
    AND LENGTH(REPLACE(b.customer_phone, ' ', '')) = 11
`)

console.log(`Valid VE mobile (04XXXXXXXXX): ${validVeMobile}`)
console.log(`Approved + valid VE mobile: ${approvedValidVe}`)
