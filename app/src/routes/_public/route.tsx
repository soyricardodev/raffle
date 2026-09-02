import { createFileRoute, Outlet } from "@tanstack/react-router"
import { publicLayoutLoaderData } from "@/features/layout/document-head"
import { brandCssVariables } from "@/features/layout/public-brand-css"
import { resolveSiteFaviconUrl } from "@/features/layout/public-favicon"
import { ensurePublicSiteConfig } from "@/features/layout/public-page-loader"
import { resolvePublicSeo } from "@/features/layout/public-seo"
import { PublicSiteConfigProvider } from "@/features/layout/public-site-config-context"
import { PWA_NAME } from "@/features/pwa/pwa-brand"

export const Route = createFileRoute("/_public")({
  loader: async ({ context: { queryClient } }) => {
    const siteConfig = await ensurePublicSiteConfig(queryClient)
    return publicLayoutLoaderData(siteConfig)
  },
  head: ({ loaderData }) => {
    const seo = resolvePublicSeo(loaderData?.siteConfig)
    const meta: Array<
      { title?: string } | { name: string; content: string } | { property: string; content: string }
    > = [{ title: loaderData?.siteName || PWA_NAME }]

    if (!seo.indexable) meta.push({ name: "robots", content: "noindex, nofollow" })
    if (seo.ogImage) {
      meta.push({ property: "og:image", content: seo.ogImage })
      meta.push({ name: "twitter:card", content: "summary_large_image" })
      meta.push({ name: "twitter:image", content: seo.ogImage })
    }
    if (seo.canonicalUrl) {
      meta.push({ name: "canonical", content: seo.canonicalUrl })
    }

    const favicon = resolveSiteFaviconUrl(loaderData?.siteConfig) || "/pwa/icon-192.png"
    const theme = loaderData?.siteConfig?.site_colors?.primary?.trim() || "#F5C400"
    const links: Array<{ rel: string; href: string }> = [
      { rel: "manifest", href: "/api/pwa/manifest" },
      { rel: "icon", href: favicon },
      { rel: "apple-touch-icon", href: "/pwa/apple-touch.png" },
    ]

    meta.push({ name: "theme-color", content: theme })
    meta.push({ name: "mobile-web-app-capable", content: "yes" })
    meta.push({ name: "apple-mobile-web-app-capable", content: "yes" })
    meta.push({ name: "apple-mobile-web-app-status-bar-style", content: "default" })
    meta.push({ name: "apple-mobile-web-app-title", content: PWA_NAME })

    return {
      meta,
      links,
      style: [{ children: brandCssVariables(loaderData?.siteConfig) }],
    }
  },
  component: PublicShell,
})

function PublicShell() {
  const { siteConfig } = Route.useLoaderData()
  return (
    <PublicSiteConfigProvider value={siteConfig}>
      <Outlet />
    </PublicSiteConfigProvider>
  )
}
