import { createFileRoute, Outlet } from "@tanstack/react-router"
import { brandCssVariables } from "@/features/layout/public-brand-css"
import { resolveSiteFaviconUrl } from "@/features/layout/public-favicon"
import { ensurePublicSiteConfig } from "@/features/layout/public-page-loader"
import { resolvePublicSeo } from "@/features/layout/public-seo"
import { PublicSiteConfigProvider } from "@/features/layout/public-site-config-context"

export const Route = createFileRoute("/_public")({
  loader: async ({ context: { queryClient } }) => {
    const siteConfig = await ensurePublicSiteConfig(queryClient)
    return { siteConfig }
  },
  head: ({ loaderData }) => {
    const seo = resolvePublicSeo(loaderData?.siteConfig)
    const meta: Array<
      { title?: string } | { name: string; content: string } | { property: string; content: string }
    > = []

    if (seo.title) meta.push({ title: seo.title })
    if (seo.description) meta.push({ name: "description", content: seo.description })
    if (!seo.indexable) meta.push({ name: "robots", content: "noindex, nofollow" })
    if (seo.ogImage) {
      meta.push({ property: "og:image", content: seo.ogImage })
      meta.push({ name: "twitter:card", content: "summary_large_image" })
      meta.push({ name: "twitter:image", content: seo.ogImage })
    }
    if (seo.title) {
      meta.push({ property: "og:title", content: seo.title })
      meta.push({ name: "twitter:title", content: seo.title })
    }
    if (seo.description) {
      meta.push({ property: "og:description", content: seo.description })
      meta.push({ name: "twitter:description", content: seo.description })
    }
    if (seo.canonicalUrl) {
      meta.push({ name: "canonical", content: seo.canonicalUrl })
    }

    const favicon = resolveSiteFaviconUrl(loaderData?.siteConfig)
    const links: Array<{ rel: string; href: string }> = []
    if (favicon) {
      links.push({ rel: "icon", href: favicon })
      links.push({ rel: "apple-touch-icon", href: favicon })
    }

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
