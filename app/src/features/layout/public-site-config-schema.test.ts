import { describe, expect, it } from "vitest"
import { parsePublicSiteConfig } from "@/features/layout/public-site-config-schema"

describe("parsePublicSiteConfig", () => {
  it("parses valid keys and normalizes hero", () => {
    const result = parsePublicSiteConfig({
      site_info: { site_name: "Rifa X", tagline: "Tag" },
      hero_config: { main_text: "Hola", accent_text: "Mundo", show_particles: true },
    })

    expect(result.site_info?.site_name).toBe("Rifa X")
    expect(result.hero_config?.title).toBe("Hola")
    expect(result.hero_config?.subtitle).toBe("Mundo")
  })

  it("returns empty object for invalid shapes", () => {
    expect(parsePublicSiteConfig({ site_info: "not-an-object" })).toEqual({})
  })
})
