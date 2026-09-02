import { describe, expect, it } from "vitest"
import { resolvePublicSeo } from "@/features/layout/public-seo"

describe("resolvePublicSeo og image fallback", () => {
  it("uses banner then logo when og_image is empty", () => {
    const seo = resolvePublicSeo({
      site_images: {
        banner: "/uploads/site/banner.jpg",
        logo: "/uploads/site/logo.png",
        footer_logo: "",
        official_logos: [],
      },
    })
    expect(seo.ogImage).toBe("/uploads/site/banner.jpg")
  })

  it("uses Yoiber Rifas when SEO title and site name are empty", () => {
    expect(resolvePublicSeo({}).title).toBe("Yoiber Rifas")
  })
})
