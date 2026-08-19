import { describe, expect, it } from "vitest"
import { resolvePublicSeo } from "@/features/layout/public-seo"
import {
  applyPublicWhatsAppVisibility,
  parsePublicSiteConfig,
} from "@/features/layout/public-site-config-schema"

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
    expect(result.site_images?.official_logos).toEqual([{ image: "/tachira.png", alt: "Táchira" }])
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

  it("parses purchase_success_promo", () => {
    const result = parsePublicSiteConfig({
      purchase_success_promo: {
        enabled: true,
        title: "Únete",
        description: "Dinámicas",
        whatsapp_channel_url: "https://whatsapp.com/channel/x",
        telegram_channel_url: "https://t.me/yoiberrifascanal",
        instagram_url: "@rifas",
        tiktok_url: "@rifas",
      },
    })

    expect(result.purchase_success_promo).toEqual({
      enabled: true,
      title: "Únete",
      description: "Dinámicas",
      whatsapp_channel_url: "https://whatsapp.com/channel/x",
      telegram_channel_url: "https://t.me/yoiberrifascanal",
      instagram_url: "@rifas",
      tiktok_url: "@rifas",
    })
  })

  it("strips WhatsApp from public payload when disabled and fills Telegram fallbacks", () => {
    const result = applyPublicWhatsAppVisibility(
      {
        social_media: {
          whatsapp: "584121234567",
          instagram: "@rifas",
          facebook: "",
          tiktok: "",
          telegram: "",
          support_channel: "whatsapp",
        },
        purchase_success_promo: {
          enabled: true,
          title: "",
          description: "",
          whatsapp_channel_url: "https://whatsapp.com/channel/x",
          telegram_channel_url: "",
          instagram_url: "",
          tiktok_url: "",
        },
      },
      false,
    )

    expect(result.features?.whatsapp_enabled).toBe(false)
    expect(result.social_media?.whatsapp).toBe("")
    expect(result.social_media?.telegram).toBe("yoiberifas")
    expect(result.social_media?.support_channel).toBe("telegram")
    expect(result.purchase_success_promo?.whatsapp_channel_url).toBe("")
    expect(result.purchase_success_promo?.telegram_channel_url).toBe(
      "https://t.me/yoiberrifascanal",
    )
  })

  it("keeps WhatsApp on public payload when env is on and config selects it", () => {
    const result = applyPublicWhatsAppVisibility(
      {
        social_media: {
          whatsapp: "584121234567",
          instagram: "",
          facebook: "",
          tiktok: "",
          telegram: "yoiberifas",
          support_channel: "whatsapp",
        },
      },
      true,
    )

    expect(result.social_media?.whatsapp).toBe("584121234567")
    expect(result.social_media?.support_channel).toBe("whatsapp")
  })
})

describe("resolvePublicSeo", () => {
  it("falls back to site_info when seo fields are empty", () => {
    const seo = resolvePublicSeo({
      site_info: { site_name: "Mi Rifa", tagline: "Gana hoy", runlot_id: "" },
    })
    expect(seo.title).toBe("Mi Rifa")
    expect(seo.description).toBe("Gana hoy")
  })

  it("prefers seo_config over site_info", () => {
    const seo = resolvePublicSeo({
      site_info: { site_name: "Mi Rifa", tagline: "Gana hoy", runlot_id: "" },
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
