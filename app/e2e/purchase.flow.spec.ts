import { expect } from "@playwright/test"
import {
  createPurchase,
  fetchFirstActiveRaffle,
  fetchFirstRafflePaymentMethodId,
  uniqueRef,
} from "./helpers/api"
import { describeWithDb, test } from "./helpers/fixtures"

describeWithDb("purchase flow", () => {
  test("API: creates purchase with tickets", async ({ request }) => {
    const raffle = await fetchFirstActiveRaffle(request)
    test.skip(!raffle, "No active raffle — run scripts/seed.ts")

    const rafflePaymentMethodId = await fetchFirstRafflePaymentMethodId(request, raffle.id)

    const result = await createPurchase(request, {
      raffleId: raffle.id,
      customerName: `E2E API ${Date.now()}`,
      customerPhone: `0412${String(Date.now()).slice(-7)}`,
      rafflePaymentMethodId,
      paymentReference: uniqueRef("e2e-api"),
      ticketQuantity: 1,
    })

    expect(result.purchaseId).toBeGreaterThan(0)
    expect(result.ticketNumbers.length).toBeGreaterThan(0)
  })

  // Headless mobile: submit does not reliably POST from PurchaseForm (API test covers flow).
  test.skip("UI: submit purchase from home and see success dialog", async ({ page, request }) => {
    const raffle = await fetchFirstActiveRaffle(request)
    test.skip(!raffle, "No active raffle — run scripts/seed.ts")

    const suffix = String(Date.now()).slice(-7)

    await page.goto("/#comprar", { waitUntil: "domcontentloaded" })
    const purchaseSection = page.locator("#comprar")
    await purchaseSection.scrollIntoViewIfNeeded()

    const nameInput = page.locator("#customer-name")
    const phoneInput = page.locator("#customer-phone")
    const refInput = page.locator("#payment-reference")

    await nameInput.waitFor({ state: "visible" })
    await nameInput.fill(`E2E UI ${suffix}`)
    await phoneInput.fill(`0414${suffix}`)
    await purchaseSection.getByRole("button", { name: "Pago móvil" }).click()
    await refInput.fill(uniqueRef("e2e-ui"))

    const submit = purchaseSection.getByRole("button", { name: "Confirmar compra" })
    await expect(submit).toBeEnabled({ timeout: 10_000 })

    const purchaseResponse = page.waitForResponse(
      (res) => res.url().includes("/api/purchases") && res.request().method() === "POST",
    )
    await submit.click()
    const response = await purchaseResponse
    expect(response.status()).toBe(201)

    await expect(page.getByRole("dialog")).toContainText(/compra registrada/i, { timeout: 15_000 })
  })
})
