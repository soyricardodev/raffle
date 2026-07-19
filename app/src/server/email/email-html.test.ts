import { describe, expect, it } from "vitest"
import {
  buildRejectionSupportWhatsAppMessage,
  escapeHtml,
  toAbsoluteAssetUrl,
  verifyTicketsUrl,
} from "./email-html"

describe("email-html", () => {
  it("escapes HTML entities", () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;",
    )
  })

  it("toAbsoluteAssetUrl leaves https URLs unchanged", () => {
    expect(toAbsoluteAssetUrl("https://cdn.example/logo.png", "https://app.example")).toBe(
      "https://cdn.example/logo.png",
    )
  })

  it("toAbsoluteAssetUrl prefixes relative paths", () => {
    expect(toAbsoluteAssetUrl("/uploads/site/a.jpg", "https://app.example")).toBe(
      "https://app.example/uploads/site/a.jpg",
    )
  })

  it("toAbsoluteAssetUrl returns null for empty", () => {
    expect(toAbsoluteAssetUrl("", "https://app.example")).toBeNull()
  })

  it("verifyTicketsUrl encodes phone", () => {
    expect(verifyTicketsUrl("https://app.example", "0414 1234567")).toBe(
      "https://app.example/verificar?phone=0414%201234567",
    )
  })

  it("buildRejectionSupportWhatsAppMessage includes order details and rejection reason", () => {
    expect(
      buildRejectionSupportWhatsAppMessage({
        customerName: "María Pérez",
        customerPhone: "04141234567",
        customerCi: "V-12345678",
        purchaseId: 42,
        raffleName: "Rifa Test",
        notes: "Pago duplicado",
      }),
    ).toBe(
      [
        "Hola, necesito ayuda con mi compra rechazada.",
        "",
        "Compra: #42",
        "Nombre: María Pérez",
        "Cédula: V-12345678",
        "Teléfono: 04141234567",
        "Rifa: Rifa Test",
        "Motivo: Pago duplicado",
        "",
        "Por favor ayúdame a resolver el problema de mi pago. Gracias.",
      ].join("\n"),
    )
  })

  it("buildRejectionSupportWhatsAppMessage omits optional fields when empty", () => {
    expect(
      buildRejectionSupportWhatsAppMessage({
        customerName: "María",
        customerPhone: "",
        customerCi: null,
        purchaseId: 42,
        raffleName: "Rifa Test",
        notes: "   ",
      }),
    ).toBe(
      [
        "Hola, necesito ayuda con mi compra rechazada.",
        "",
        "Compra: #42",
        "Nombre: María",
        "Rifa: Rifa Test",
        "",
        "Por favor ayúdame a resolver el problema de mi pago. Gracias.",
      ].join("\n"),
    )
  })
})
