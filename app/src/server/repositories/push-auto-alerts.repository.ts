import { pushAutoAlerts } from "@raffle/shared/db"
import {
  DEFAULT_PUSH_AUTO_ALERTS,
  type PushAutoAlert,
  type PushAutoAlertKind,
} from "@raffle/shared/push"
import { asc, eq } from "drizzle-orm"
import { getDb } from "@/lib/db.server"

export type PushAutoAlertRow = PushAutoAlert

function mapRow(row: typeof pushAutoAlerts.$inferSelect): PushAutoAlertRow {
  return {
    id: row.id,
    kind: row.kind as PushAutoAlertKind,
    triggerPercent: row.triggerPercent,
    title: row.title,
    body: row.body,
    enabled: row.enabled,
    sortOrder: row.sortOrder,
    legacyMilestoneId: row.legacyMilestoneId,
  }
}

export async function countPushAutoAlerts(): Promise<number> {
  const rows = await getDb().select({ id: pushAutoAlerts.id }).from(pushAutoAlerts)
  return rows.length
}

export async function seedDefaultPushAutoAlerts(): Promise<void> {
  const db = getDb()
  for (const alert of DEFAULT_PUSH_AUTO_ALERTS) {
    await db.insert(pushAutoAlerts).values({
      kind: alert.kind,
      triggerPercent: alert.triggerPercent,
      title: alert.title,
      body: alert.body,
      enabled: alert.enabled,
      sortOrder: alert.sortOrder,
      legacyMilestoneId: alert.legacyMilestoneId,
    })
  }
}

export async function ensurePushAutoAlerts(): Promise<void> {
  const count = await countPushAutoAlerts()
  if (count === 0) await seedDefaultPushAutoAlerts()
}

export async function listPushAutoAlerts(): Promise<PushAutoAlertRow[]> {
  await ensurePushAutoAlerts()
  const rows = await getDb()
    .select()
    .from(pushAutoAlerts)
    .orderBy(asc(pushAutoAlerts.sortOrder), asc(pushAutoAlerts.triggerPercent))
  return rows.map(mapRow)
}

export async function findPushAutoAlertById(id: number): Promise<PushAutoAlertRow | undefined> {
  await ensurePushAutoAlerts()
  const [row] = await getDb().select().from(pushAutoAlerts).where(eq(pushAutoAlerts.id, id)).limit(1)
  return row ? mapRow(row) : undefined
}

export async function findEnabledNewRaffleAlert(): Promise<PushAutoAlertRow | undefined> {
  const alerts = await listPushAutoAlerts()
  return alerts.find((alert) => alert.kind === "new_raffle" && alert.enabled)
}

export type PushAutoAlertInsert = {
  kind: PushAutoAlertKind
  triggerPercent?: number | null
  title: string
  body?: string
  enabled?: boolean
  sortOrder?: number
}

export async function insertPushAutoAlert(input: PushAutoAlertInsert): Promise<PushAutoAlertRow> {
  const alerts = await listPushAutoAlerts()
  const maxSort = alerts.reduce((max, row) => Math.max(max, row.sortOrder), 0)
  const [row] = await getDb()
    .insert(pushAutoAlerts)
    .values({
      kind: input.kind,
      triggerPercent: input.kind === "percent" ? (input.triggerPercent ?? null) : null,
      title: input.title,
      body: input.body ?? "",
      enabled: input.enabled ?? true,
      sortOrder: input.sortOrder ?? maxSort + 10,
    })
    .returning()
  if (!row) throw new Error("No se pudo crear el aviso automático")
  return mapRow(row)
}

export type PushAutoAlertUpdate = Partial<{
  triggerPercent: number | null
  title: string
  body: string
  enabled: boolean
  sortOrder: number
}>

export async function updatePushAutoAlert(
  id: number,
  input: PushAutoAlertUpdate,
): Promise<PushAutoAlertRow | undefined> {
  const existing = await findPushAutoAlertById(id)
  if (!existing) return undefined

  const [row] = await getDb()
    .update(pushAutoAlerts)
    .set({
      ...(input.triggerPercent !== undefined ? { triggerPercent: input.triggerPercent } : {}),
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.body !== undefined ? { body: input.body } : {}),
      ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      updatedAt: new Date(),
    })
    .where(eq(pushAutoAlerts.id, id))
    .returning()
  return row ? mapRow(row) : undefined
}

export async function deletePushAutoAlert(id: number): Promise<boolean> {
  const existing = await findPushAutoAlertById(id)
  if (!existing || existing.kind === "new_raffle") return false
  const result = await getDb().delete(pushAutoAlerts).where(eq(pushAutoAlerts.id, id))
  return (result.rowsAffected ?? 0) > 0
}

export async function reorderPushAutoAlerts(orderedIds: readonly number[]): Promise<PushAutoAlertRow[]> {
  const alerts = await listPushAutoAlerts()
  if (orderedIds.length !== alerts.length) {
    throw new Error("La lista de avisos no coincide")
  }

  const byId = new Map(alerts.map((alert) => [alert.id, alert]))
  for (const id of orderedIds) {
    if (!byId.has(id)) throw new Error("Aviso no encontrado")
  }

  for (let index = 0; index < orderedIds.length; index++) {
    const id = orderedIds[index]!
    await getDb()
      .update(pushAutoAlerts)
      .set({ sortOrder: index * 10, updatedAt: new Date() })
      .where(eq(pushAutoAlerts.id, id))
  }

  return listPushAutoAlerts()
}
