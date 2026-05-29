import { describe, expect, it } from "vitest"
import { resolveSiteFaviconUrl } from "@/features/layout/public-favicon"

describe("resolveSiteFaviconUrl", () => {
  it("returns site logo URL", () => {
    expect(
      resolveSiteFaviconUrl({
        site_images: {
          banner: "/b.jpg",
          logo: "/logo.png",
          footer_logo: "",
          official_logos: [],
        },
      }),
    ).toBe("/logo.png")
  })

  it("returns empty when logo is missing", () => {
    expect(resolveSiteFaviconUrl({})).toBe("")
  })
})
