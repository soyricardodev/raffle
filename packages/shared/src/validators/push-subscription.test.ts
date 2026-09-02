import { describe, expect, it } from "vitest"
import {
  AdminPushBroadcastInput,
  PushInboxReadInput,
  PushSubscribeInput,
} from "./push-subscription"

describe("PushSubscribeInput", () => {
  const keys = {
    p256dh: "p256dh-key-value-at-least-20",
    auth: "auth-secret-xx",
  }

  it("accepts a subscription without identity", () => {
    const parsed = PushSubscribeInput.parse({
      endpoint: "https://push.example.com/sub",
      keys,
    })
    expect(parsed.customerName).toBeUndefined()
    expect(parsed.customerPhone).toBeUndefined()
  })

  it("keeps trimmed name and phone when present", () => {
    const parsed = PushSubscribeInput.parse({
      endpoint: "https://push.example.com/sub",
      keys,
      customerName: "  María Pérez  ",
      customerPhone: " 04121234567 ",
    })
    expect(parsed.customerName).toBe("María Pérez")
    expect(parsed.customerPhone).toBe("04121234567")
  })

  it("drops empty identity fields instead of rejecting", () => {
    const parsed = PushSubscribeInput.parse({
      endpoint: "https://push.example.com/sub",
      keys,
      customerName: "   ",
      customerPhone: "",
    })
    expect(parsed.customerName).toBeUndefined()
    expect(parsed.customerPhone).toBeUndefined()
  })
})

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

describe("PushInboxReadInput", () => {
  it("accepts mark-all", () => {
    expect(
      PushInboxReadInput.parse({
        endpoint: "https://push.example.com/sub",
        all: true,
      }).all,
    ).toBe(true)
  })

  it("rejects a read with neither ids nor all", () => {
    const parsed = PushInboxReadInput.safeParse({
      endpoint: "https://push.example.com/sub",
    })
    expect(parsed.success).toBe(false)
  })
})
