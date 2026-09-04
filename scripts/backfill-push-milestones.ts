/**
 * Backfill one-off: marca como YA ENVIADOS los hitos de venta cruzados por el
 * progreso actual de cada rifa, sin enviar ningún push.
 *
 * Evita que rifas importadas o con hitos sin reclamar disparen notificaciones
 * viejas ("¡Última oportunidad!") en su próxima compra.
 *
 * USO:
 *   DATABASE_URL=file:./data/raffle.db bun run scripts/backfill-push-milestones.ts
 */

import { createClient } from "@libsql/client"
import { eq } from "drizzle-orm"
import { drizzle } from "drizzle-orm/libsql"
import { schema } from "@raffle/shared/db"
import {
  crossedSaleAlertKeys,
  mergePushMilestones,
  occupiedTickets,
  parsePushMilestonesSent,
  serializePushMilestonesSent,
  type PushAutoAlert,
  type PushAutoAlertKind,
} from "@raffle/shared/push"

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error("❌ Set DATABASE_URL (file: o libsql://)")
    process.exit(1)
  }

  const client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN })
  const db = drizzle(client, { schema })

  const alerts: PushAutoAlert[] = (await db.select().from(schema.pushAutoAlerts)).map((a) => ({
    ...a,
    kind: a.kind as PushAutoAlertKind,
  }))

  const rows = await db.select().from(schema.raffles)
  let seeded = 0

  for (const r of rows) {
    const already = parsePushMilestonesSent(r.pushMilestonesSent)
    const crossed = crossedSaleAlertKeys(
      occupiedTickets(r.ticketsSold, r.ticketsReserved),
      r.totalTickets,
      already,
      alerts,
    )
    if (crossed.length === 0) continue

    await db
      .update(schema.raffles)
      .set({
        pushMilestonesSent: serializePushMilestonesSent(mergePushMilestones(already, crossed)),
        updatedAt: new Date(),
      })
      .where(eq(schema.raffles.id, r.id))
    seeded++
    console.log(`   ✓ rafa ${r.id} "${r.name}": +${crossed.length} → [${crossed.join(", ")}]`)
  }

  console.log(`\n✅ Backfill completo: ${seeded} rifas con hitos pre-marcados (0 pushes enviados)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
