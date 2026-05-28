import { getHomeHeadline } from "@/features/home/home-hero-copy"
import { usePublicBranding } from "@/features/layout/use-public-branding"

export function HomeHero() {
  const branding = usePublicBranding()

  if (!branding) {
    return (
      <header className="space-y-2 text-center" aria-hidden>
        <div className="bg-muted/60 mx-auto h-8 w-48 max-w-full animate-pulse rounded-md" />
        <div className="bg-muted/40 mx-auto h-4 w-64 max-w-full animate-pulse rounded-md" />
      </header>
    )
  }

  const { headline, subline } = getHomeHeadline(branding.siteInfo, branding.hero)

  if (!headline && !subline) {
    return null
  }

  return (
    <header className="space-y-2 text-center">
      {headline ? (
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
          {headline}
        </h1>
      ) : null}
      {subline ? (
        <p className="text-muted-foreground mx-auto max-w-sm text-sm leading-relaxed">{subline}</p>
      ) : null}
    </header>
  )
}
