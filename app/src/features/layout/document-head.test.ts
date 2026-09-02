import { describe, expect, it } from "vitest"
import { composeDocumentTitle, publicLayoutLoaderData } from "@/features/layout/document-head"
import { PWA_NAME } from "@/features/pwa/pwa-brand"

describe("composeDocumentTitle", () => {
  it("uses Yoiber Rifas as the public site title", () => {
    expect(composeDocumentTitle("", PWA_NAME)).toBe("Yoiber Rifas")
    expect(composeDocumentTitle(PWA_NAME, PWA_NAME)).toBe("Yoiber Rifas")
    expect(composeDocumentTitle("Buscar boletos", PWA_NAME)).toBe("Buscar boletos · Yoiber Rifas")
  })
})

describe("publicLayoutLoaderData", () => {
  it("always brands the public site as Yoiber Rifas", () => {
    expect(publicLayoutLoaderData(null).siteName).toBe("Yoiber Rifas")
  })
})
