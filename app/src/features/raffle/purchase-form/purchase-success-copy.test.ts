import { describe, expect, it } from "vitest"
import {
  purchaseSuccessFinalizeCopy,
  purchaseSuccessRepeatCopy,
} from "@/features/raffle/purchase-form/purchase-success-copy"

describe("purchaseSuccessFinalizeCopy", () => {
  it("centers the WhatsApp instruction and CTA", () => {
    const copy = purchaseSuccessFinalizeCopy("WhatsApp")
    expect(copy.eyebrow).toBe("Compra registrada")
    expect(copy.title).toBe("Escríbeme por WhatsApp tu nombre y apellido")
    expect(copy.description).toContain("confirmamos tus datos")
    expect(copy.ctaLabel).toBe("Escribir por WhatsApp")
  })

  it("uses the support label for Telegram", () => {
    expect(purchaseSuccessFinalizeCopy("Telegram").title).toBe(
      "Escríbeme por Telegram tu nombre y apellido",
    )
  })
})

describe("purchaseSuccessRepeatCopy", () => {
  it("keeps a short confirmation without a second instruction", () => {
    const copy = purchaseSuccessRepeatCopy()
    expect(copy.title).toBe("Compra registrada")
    expect(copy.description).toBe("Tus boletos ya están reservados.")
  })
})
