import { describe, expect, it } from "vitest"
import {
  DEFAULT_OFFICIAL_FOOTER_LOGOS,
  resolveOfficialFooterLogos,
} from "@/features/layout/footer-defaults"

describe("resolveOfficialFooterLogos", () => {
  it("returns defaults when config has no logos", () => {
    expect(resolveOfficialFooterLogos([])).toEqual(DEFAULT_OFFICIAL_FOOTER_LOGOS)
    expect(resolveOfficialFooterLogos(undefined)).toEqual(DEFAULT_OFFICIAL_FOOTER_LOGOS)
  })

  it("returns configured logos when at least one has an image", () => {
    const custom = [{ image: "/custom.png", alt: "Custom" }]
    expect(resolveOfficialFooterLogos(custom)).toEqual(custom)
  })

  it("ignores empty image entries and falls back to defaults", () => {
    expect(resolveOfficialFooterLogos([{ image: "  ", alt: "X" }])).toEqual(
      DEFAULT_OFFICIAL_FOOTER_LOGOS,
    )
  })
})
