import { NotFoundError, ValidationError } from "@raffle/shared/errors"
import type { PushAutoAlert } from "@raffle/shared/push"
import type {
  AdminPushAutoAlertCreateInput,
  AdminPushAutoAlertUpdateInput,
  AdminPushAutoAlertsReorderInput,
} from "@raffle/shared/validators"
import * as pushAutoAlertsRepo from "./repositories/push-auto-alerts.repository"

export type AdminPushAutoAlert = PushAutoAlert

function assertUniquePercent(
  alerts: readonly PushAutoAlert[],
  triggerPercent: number,
  excludeId?: number,
): void {
  const duplicate = alerts.find(
    (alert) =>
      alert.id !== excludeId &&
      alert.kind === "percent" &&
      alert.enabled &&
      alert.triggerPercent === triggerPercent,
  )
  if (duplicate) {
    throw new ValidationError(`Ya hay un aviso activo al ${triggerPercent}%`)
  }
}

export async function listAdminPushAutoAlerts(): Promise<AdminPushAutoAlert[]> {
  return pushAutoAlertsRepo.listPushAutoAlerts()
}

export async function createAdminPushAutoAlert(
  input: AdminPushAutoAlertCreateInput,
): Promise<AdminPushAutoAlert> {
  const alerts = await pushAutoAlertsRepo.listPushAutoAlerts()
  if (input.enabled !== false) {
    assertUniquePercent(alerts, input.triggerPercent)
  }
  return pushAutoAlertsRepo.insertPushAutoAlert({
    kind: "percent",
    triggerPercent: input.triggerPercent,
    title: input.title,
    body: input.body,
    enabled: input.enabled ?? true,
  })
}

export async function updateAdminPushAutoAlert(
  id: number,
  input: AdminPushAutoAlertUpdateInput,
): Promise<AdminPushAutoAlert> {
  const existing = await pushAutoAlertsRepo.findPushAutoAlertById(id)
  if (!existing) throw new NotFoundError("Aviso automático no encontrado")

  if (existing.kind === "new_raffle" && input.triggerPercent !== undefined) {
    throw new ValidationError("El aviso de nueva rifa no usa porcentaje")
  }

  const alerts = await pushAutoAlertsRepo.listPushAutoAlerts()
  const nextPercent = input.triggerPercent ?? existing.triggerPercent
  const nextEnabled = input.enabled ?? existing.enabled
  if (
    existing.kind === "percent" &&
    nextEnabled &&
    nextPercent != null &&
    (input.triggerPercent !== undefined || input.enabled === true)
  ) {
    assertUniquePercent(alerts, nextPercent, id)
  }

  const updated = await pushAutoAlertsRepo.updatePushAutoAlert(id, input)
  if (!updated) throw new NotFoundError("Aviso automático no encontrado")
  return updated
}

export async function deleteAdminPushAutoAlert(id: number): Promise<void> {
  const existing = await pushAutoAlertsRepo.findPushAutoAlertById(id)
  if (!existing) throw new NotFoundError("Aviso automático no encontrado")
  if (existing.kind === "new_raffle") {
    throw new ValidationError("El aviso de nueva rifa no se puede eliminar, solo desactivar")
  }
  const deleted = await pushAutoAlertsRepo.deletePushAutoAlert(id)
  if (!deleted) throw new NotFoundError("Aviso automático no encontrado")
}

export async function reorderAdminPushAutoAlerts(
  input: AdminPushAutoAlertsReorderInput,
): Promise<AdminPushAutoAlert[]> {
  const alerts = await pushAutoAlertsRepo.listPushAutoAlerts()
  const pinned = alerts.filter((alert) => alert.kind === "new_raffle")
  const percent = alerts.filter((alert) => alert.kind === "percent")

  if (pinned.length !== 1) {
    throw new ValidationError("Configuración de avisos inválida")
  }

  const pinnedId = pinned[0]!.id
  if (input.ordered_ids[0] !== pinnedId) {
    throw new ValidationError("El aviso al publicar debe quedar primero")
  }

  const percentIds = input.ordered_ids.slice(1)
  const percentIdSet = new Set(percent.map((alert) => alert.id))
  if (percentIds.length !== percent.length) {
    throw new ValidationError("Falta algún aviso por porcentaje")
  }
  for (const id of percentIds) {
    if (!percentIdSet.has(id)) {
      throw new ValidationError("Orden de avisos inválido")
    }
  }

  try {
    return await pushAutoAlertsRepo.reorderPushAutoAlerts(input.ordered_ids)
  } catch {
    throw new ValidationError("No se pudo guardar el orden")
  }
}
