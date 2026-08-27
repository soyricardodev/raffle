import { describe, expect, it } from "vitest"
import { hasInlineSocialBrandIcon } from "@/features/layout/social-icons"

describe("social-icons", () => {
  it("uses inline brand SVGs for the official social channels", () => {
    expect(hasInlineSocialBrandIcon("telegram")).toBe(true)
    expect(hasInlineSocialBrandIcon("tiktok")).toBe(true)
    expect(hasInlineSocialBrandIcon("instagram")).toBe(true)
    expect(hasInlineSocialBrandIcon("facebook")).toBe(true)
    expect(hasInlineSocialBrandIcon("whatsapp")).toBe(true)
    expect(hasInlineSocialBrandIcon("youtube")).toBe(false)
  })
})
