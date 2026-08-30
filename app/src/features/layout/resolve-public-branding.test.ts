import { describe, expect, it } from "vitest"
import { resolvePublicBranding } from "@/features/layout/use-public-branding"

describe("resolvePublicBranding", () => {
  it("returns null for missing payload", () => {
    expect(resolvePublicBranding(null)).toBeNull()
  })

  it("clones nested objects so mutations do not leak", () => {
    const first = resolvePublicBranding({
      site_info: { site_name: "A", tagline: "B", runlot_id: "" },
      hero_config: { title: "T", subtitle: "S", show_particles: false, how_to_play_label: "" },
    })
    const second = resolvePublicBranding({
      site_info: { site_name: "A", tagline: "B", runlot_id: "" },
      hero_config: { title: "T", subtitle: "S", show_particles: false, how_to_play_label: "" },
    })

    expect(first).not.toBeNull()
    expect(second).not.toBeNull()
    first!.siteInfo.site_name = "mutated"
    expect(second!.siteInfo.site_name).toBe("A")
  })

  it("maps site config fields", () => {
    const branding = resolvePublicBranding({
      site_info: { site_name: "Lotería", tagline: "Premios", runlot_id: "" },
      site_colors: { primary: "#111111", secondary: "#222222", accent: "#333333" },
    })

    expect(branding?.siteInfo.site_name).toBe("Lotería")
    expect(branding?.colors?.primary).toBe("#111111")
    expect(branding?.whatsappEnabled).toBe(false)
  })
})
