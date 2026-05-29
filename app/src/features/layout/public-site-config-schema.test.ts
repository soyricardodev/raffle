import { describe, expect, it } from "vitest"
import { parsePublicSiteConfig } from "@/features/layout/public-site-config-schema"
import { resolvePublicSeo } from "@/features/layout/public-seo"

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

  it("normalizes footer images including official logos", () => {
    const result = parsePublicSiteConfig({
      site_images: {
        banner: "/b.png",
        logo: "/l.png",
        footer_logo: "/f.png",
        official_logos: [{ image: "/tachira.png", alt: "Táchira" }],
      },
    })

    expect(result.site_images?.footer_logo).toBe("/f.png")
    expect(result.site_images?.official_logos).toEqual([
      { image: "/tachira.png", alt: "Táchira" },
    ])
  })

  it("parses legacy site_images without footer fields", () => {
    const result = parsePublicSiteConfig({
      site_images: { banner: "/b.png", logo: "/l.png" },
    })

    expect(result.site_images?.footer_logo).toBe("")
    expect(result.site_images?.official_logos).toEqual([])
  })

  it("parses seo_config", () => {
    const result = parsePublicSiteConfig({
      seo_config: {
        meta_title: "Título SEO",
        meta_description: "Descripción",
        og_image: "https://example.com/og.png",
        canonical_url: "https://example.com",
        indexable: false,
      },
    })

    expect(result.seo_config?.meta_title).toBe("Título SEO")
    expect(result.seo_config?.indexable).toBe(false)
  })

  it("returns empty object for invalid shapes", () => {
    expect(parsePublicSiteConfig({ site_info: "not-an-object" })).toEqual({})
  })
})

describe("resolvePublicSeo", () => {
  it("falls back to site_info when seo fields are empty", () => {
    const seo = resolvePublicSeo({
      site_info: { site_name: "Mi Rifa", tagline: "Gana hoy" },
    })
    expect(seo.title).toBe("Mi Rifa")
    expect(seo.description).toBe("Gana hoy")
  })

  it("prefers seo_config over site_info", () => {
    const seo = resolvePublicSeo({
      site_info: { site_name: "Mi Rifa", tagline: "Gana hoy" },
      seo_config: {
        meta_title: "SEO Title",
        meta_description: "SEO Desc",
        og_image: "",
        canonical_url: "",
        indexable: true,
      },
    })
    expect(seo.title).toBe("SEO Title")
    expect(seo.description).toBe("SEO Desc")
  })
})
