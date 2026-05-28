import { createFileRoute, Outlet } from "@tanstack/react-router"
import { brandCssVariables } from "@/features/layout/public-brand-css"
import { ensurePublicSiteConfig } from "@/features/layout/public-page-loader"
import { PublicSiteConfigProvider } from "@/features/layout/public-site-config-context"

export const Route = createFileRoute("/_public")({
  loader: async ({ context: { queryClient } }) => {
    const siteConfig = await ensurePublicSiteConfig(queryClient)
    return { siteConfig }
  },
  head: ({ loaderData }) => {
    const siteName = loaderData?.siteConfig?.site_info?.site_name?.trim()
    const tagline = loaderData?.siteConfig?.site_info?.tagline?.trim()
    return {
      meta: [
        ...(siteName ? [{ title: siteName }] : []),
        ...(tagline ? [{ name: "description", content: tagline }] : []),
      ],
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
