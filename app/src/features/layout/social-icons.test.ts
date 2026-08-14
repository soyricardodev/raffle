import { describe, expect, it } from "vitest"
import { hasInlineSocialBrandIcon } from "@/features/layout/social-icons"

describe("social-icons", () => {
  it("uses inline SVGs only for Telegram and TikTok", () => {
    expect(hasInlineSocialBrandIcon("telegram")).toBe(true)
    expect(hasInlineSocialBrandIcon("tiktok")).toBe(true)
    expect(hasInlineSocialBrandIcon("instagram")).toBe(false)
    expect(hasInlineSocialBrandIcon("facebook")).toBe(false)
    expect(hasInlineSocialBrandIcon("whatsapp")).toBe(false)
  })
})
