import fs from "node:fs"
import { expect } from "@playwright/test"
import {
  createPurchase,
  fetchFirstActiveRaffle,
  fetchFirstRafflePaymentMethodId,
  setPurchaseStatus,
  uniqueRef,
} from "./helpers/api"
import { e2eEnv } from "./helpers/env"
import { describeWithDb, test } from "./helpers/fixtures"

function hasAdminSession(): boolean {
  try {
    const raw = fs.readFileSync(e2eEnv.adminStoragePath, "utf8")
    const state = JSON.parse(raw) as { cookies?: unknown[] }
    return (state.cookies?.length ?? 0) > 0
  } catch {
    return false
  }
}

describeWithDb("admin purchases", () => {
  test("approve and reject pending purchases from dashboard", async ({ page, request }) => {
    test.skip(
      !hasAdminSession(),
      "Admin session missing — Fast Login / Better Auth must work (see docs/E2E.md)",
    )

    await page.goto("/admin", { waitUntil: "domcontentloaded" })
    await page.waitForURL(/\/(admin|login)/, { timeout: 15_000 })
    test.skip(page.url().includes("/login"), "Admin session expired")

    const raffle = await fetchFirstActiveRaffle(request)
    test.skip(!raffle, "No active raffle — run scripts/seed.ts")

    const approveName = `E2E Approve ${Date.now()}`
    const rejectName = `E2E Reject ${Date.now()}`
    const phoneBase = String(Date.now()).slice(-7)
    const rafflePaymentMethodId = await fetchFirstRafflePaymentMethodId(request, raffle.id)

    const approved = await createPurchase(request, {
      raffleId: raffle.id,
      customerName: approveName,
      customerPhone: `0412${phoneBase}1`,
      rafflePaymentMethodId,
      paymentReference: uniqueRef("e2e-approve"),
      ticketQuantity: 1,
    })

    await createPurchase(request, {
      raffleId: raffle.id,
      customerName: rejectName,
      customerPhone: `0412${phoneBase}2`,
      rafflePaymentMethodId,
      paymentReference: uniqueRef("e2e-reject"),
      ticketQuantity: 1,
    })

    await expect(page).toHaveTitle(/Dashboard/i)
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({
      timeout: 20_000,
    })

    await page.goto("/admin/compras", { waitUntil: "domcontentloaded" })
    await expect(page).toHaveTitle(/Compras/i)

    await page.goto("/admin", { waitUntil: "domcontentloaded" })
    await page.locator("select").nth(1).selectOption("pending")
    await page.getByRole("button", { name: "Actualizar" }).click()

    const approveCard = page.locator(".rounded-xl.border").filter({ hasText: approveName })
    await expect(approveCard).toBeVisible({ timeout: 20_000 })
    const approveResponse = page.waitForResponse(
      (res) =>
        res.url().includes("/api/admin/purchases/") && res.url().includes("/status") && res.ok(),
    )
    await approveCard.getByTitle("Aprobar").click()
    await approveResponse
    await page.getByLabel("Filtrar por estado").selectOption("approved")
    await page.getByRole("button", { name: "Actualizar" }).click()
    const approvedCard = page.locator(".rounded-xl.border").filter({ hasText: approveName })
    await expect(approvedCard).toContainText("Aprobado", { timeout: 15_000 })

    await page.getByLabel("Filtrar por estado").selectOption("pending")
    await page.getByRole("button", { name: "Actualizar" }).click()
    const rejectCard = page.locator(".rounded-xl.border").filter({ hasText: rejectName })
    await expect(rejectCard).toBeVisible()
    const rejectResponse = page.waitForResponse(
      (res) =>
        res.url().includes("/api/admin/purchases/") && res.url().includes("/status") && res.ok(),
    )
    await rejectCard.getByTitle("Rechazar").click()
    await rejectResponse
    await page.getByLabel("Filtrar por estado").selectOption("rejected")
    await page.getByRole("button", { name: "Actualizar" }).click()
    const rejectedCard = page.locator(".rounded-xl.border").filter({ hasText: rejectName })
    await expect(rejectedCard).toContainText("Rechazado", { timeout: 15_000 })

    expect(approved.purchaseId).toBeGreaterThan(0)
  })

  test("API: approve and reject purchase status", async ({ request }) => {
    test.skip(!hasAdminSession(), "Admin session missing")

    const raffle = await fetchFirstActiveRaffle(request)
    test.skip(!raffle, "No active raffle — run scripts/seed.ts")

    const rafflePaymentMethodId = await fetchFirstRafflePaymentMethodId(request, raffle.id)

    const purchase = await createPurchase(request, {
      raffleId: raffle.id,
      customerName: `E2E API Admin ${Date.now()}`,
      customerPhone: `0416${String(Date.now()).slice(-7)}`,
      rafflePaymentMethodId,
      paymentReference: uniqueRef("e2e-admin-api"),
      ticketQuantity: 1,
    })

    await setPurchaseStatus(request, purchase.purchaseId, "approved")
    await setPurchaseStatus(request, purchase.purchaseId, "rejected", "Pago duplicado")
  })

  test("reject approved purchase from detail drawer with duplicate reason", async ({
    page,
    request,
  }) => {
    test.skip(
      !hasAdminSession(),
      "Admin session missing — Fast Login / Better Auth must work (see docs/E2E.md)",
    )

    await page.goto("/admin/compras", { waitUntil: "domcontentloaded" })
    await page.waitForURL(/\/(admin\/compras|login)/, { timeout: 15_000 })
    test.skip(page.url().includes("/login"), "Admin session expired")

    const raffle = await fetchFirstActiveRaffle(request)
    test.skip(!raffle, "No active raffle — run scripts/seed.ts")

    const name = `E2E Reject Approved ${Date.now()}`
    const rafflePaymentMethodId = await fetchFirstRafflePaymentMethodId(request, raffle.id)

    const created = await createPurchase(request, {
      raffleId: raffle.id,
      customerName: name,
      customerPhone: `0414${String(Date.now()).slice(-7)}`,
      rafflePaymentMethodId,
      paymentReference: uniqueRef("e2e-reject-approved"),
      ticketQuantity: 1,
    })

    await setPurchaseStatus(request, created.purchaseId, "approved")

    await page.goto(`/admin/compras?purchase=${created.purchaseId}`, {
      waitUntil: "domcontentloaded",
    })
    await expect(page.getByRole("heading", { name: `Compra #${created.purchaseId}` })).toBeVisible({
      timeout: 20_000,
    })

    await page.getByRole("button", { name: "Rechazar compra" }).first().click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()
    await dialog.getByRole("button", { name: "Usar: Pago duplicado" }).click()

    const rejectResponse = page.waitForResponse(
      (res) =>
        res.url().includes(`/api/admin/purchases/${created.purchaseId}/status`) && res.ok(),
    )
    await dialog.getByRole("button", { name: "Rechazar compra" }).click()
    await rejectResponse

    await expect(page.getByText("Rechazado")).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText("Motivo")).toBeVisible()
    await expect(page.getByText("Pago duplicado")).toBeVisible()
  })
})
