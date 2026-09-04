import type { PushAutoAlert } from "@raffle/shared/push"

export type PushAutoAlertDraft = {
  triggerPercent: string
  title: string
  body: string
  enabled: boolean
}

export function draftFromPushAutoAlert(alert: PushAutoAlert): PushAutoAlertDraft {
  return {
    triggerPercent: alert.triggerPercent != null ? String(alert.triggerPercent) : "",
    title: alert.title,
    body: alert.body,
    enabled: alert.enabled,
  }
}

export function parsePercentDraft(value: string): number | null {
  const percent = Number(value)
  if (!Number.isInteger(percent) || percent < 1 || percent > 100) return null
  return percent
}

/** Otro aviso activo con el mismo % (incluye borradores sin guardar). */
export function findDuplicatePercentAlert(input: {
  alerts: readonly PushAutoAlert[]
  drafts: Readonly<Record<number, PushAutoAlertDraft>>
  percent: number
  excludeId?: number
}): PushAutoAlert | undefined {
  return input.alerts.find((alert) => {
    if (alert.id === input.excludeId) return false
    if (alert.kind !== "percent") return false
    const draft = input.drafts[alert.id] ?? draftFromPushAutoAlert(alert)
    if (!draft.enabled) return false
    const percent = parsePercentDraft(draft.triggerPercent)
    return percent === input.percent
  })
}

export function duplicatePercentMessage(percent: number): string {
  return `Ya hay un aviso activo al ${percent}%`
}

export function orderedAlertIds(alerts: readonly PushAutoAlert[]): number[] {
  const pinned = alerts.filter((alert) => alert.kind === "new_raffle")
  const percent = alerts
    .filter((alert) => alert.kind === "percent")
    .sort((a, b) => a.sortOrder - b.sortOrder)
  return [...pinned, ...percent].map((alert) => alert.id)
}
