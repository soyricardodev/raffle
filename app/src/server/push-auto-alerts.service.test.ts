import { beforeAll, describe, expect, it } from "vitest"
import { setupIsolatedTestDatabase } from "@/test/db-setup"
import { reorderAdminPushAutoAlerts } from "./push-auto-alerts.service"
import * as pushAutoAlertsRepo from "./repositories/push-auto-alerts.repository"

describe("push-auto-alerts.service reorder", () => {
  beforeAll(async () => {
    await setupIsolatedTestDatabase()
  })

  it("reorders percent alerts while keeping new_raffle first", async () => {
    const alerts = await pushAutoAlertsRepo.listPushAutoAlerts()
    const pinned = alerts.find((alert) => alert.kind === "new_raffle")
    const percent = alerts
      .filter((alert) => alert.kind === "percent")
      .sort((a, b) => a.sortOrder - b.sortOrder)
    expect(pinned).toBeTruthy()
    expect(percent.length).toBeGreaterThanOrEqual(2)

    const reversed = [...percent].reverse()
    const reordered = await reorderAdminPushAutoAlerts({
      ordered_ids: [pinned!.id, ...reversed.map((alert) => alert.id)],
    })

    expect(reordered[0]?.kind).toBe("new_raffle")
    expect(
      reordered.filter((alert) => alert.kind === "percent").map((alert) => alert.id),
    ).toEqual(reversed.map((alert) => alert.id))
    expect(reordered.filter((alert) => alert.kind === "percent")[0]?.sortOrder).toBe(10)
  })
})
