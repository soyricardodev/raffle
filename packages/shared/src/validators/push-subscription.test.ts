import { describe, expect, it } from "vitest"
import { AdminPushBroadcastInput } from "./push-subscription"

describe("AdminPushBroadcastInput", () => {
  it("accepts a short title and body", () => {
    const parsed = AdminPushBroadcastInput.parse({
      title: "Nueva rifa",
      body: "Entra ya por tus boletos.",
    })
    expect(parsed.url).toBeUndefined()
  })

  it("rejects a javascript url", () => {
    const parsed = AdminPushBroadcastInput.safeParse({
      title: "Hola",
      body: "Mensaje",
      url: "javascript:alert(1)",
    })
    expect(parsed.success).toBe(false)
  })
})
