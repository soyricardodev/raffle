import { expect } from "@playwright/test"
import {
  createPurchase,
  fetchFirstActiveRaffle,
  fetchFirstRafflePaymentMethodId,
  uniqueRef,
} from "./helpers/api"
import { describeWithDb, test } from "./helpers/fixtures"

describeWithDb("ticket verifier", () => {
  test("API: returns tickets for purchaser phone after purchase", async ({ request }) => {
    const raffle = await fetchFirstActiveRaffle(request)
    test.skip(!raffle, "No active raffle — run scripts/seed.ts")

    const customerPhone = `0414${String(Date.now()).slice(-7)}`

    const rafflePaymentMethodId = await fetchFirstRafflePaymentMethodId(request, raffle.id)

    await createPurchase(request, {
      raffleId: raffle.id,
      customerName: `E2E Verify ${Date.now()}`,
      customerPhone,
      rafflePaymentMethodId,
      paymentReference: uniqueRef("e2e-verify"),
      ticketQuantity: 1,
    })

    const verifyRes = await request.post("/api/tickets/verify", {
      data: { phone: customerPhone },
    })
    expect(verifyRes.ok()).toBeTruthy()
    const tickets = (await verifyRes.json()) as Array<{
      ticket_number: string
      raffle_name: string
    }>
    expect(tickets.length).toBeGreaterThan(0)
    expect(tickets[0]?.raffle_name).toMatch(new RegExp(raffle.name, "i"))
  })
})
