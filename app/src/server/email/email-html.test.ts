import { describe, expect, it } from "vitest"
import { escapeHtml, toAbsoluteAssetUrl, verifyTicketsUrl } from "./email-html"

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
})
