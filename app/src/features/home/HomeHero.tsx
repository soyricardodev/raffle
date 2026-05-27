import { useSiteConfig } from "@/stores/site-config"
import { getHomeHeadline } from "@/features/home/home-hero-copy"

export function HomeHero() {
  const { siteInfo, hero } = useSiteConfig()
  const { headline, subline } = getHomeHeadline(siteInfo, hero)

  return (
    <header className="space-y-2 text-center">
      <h1 className="font-heading text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
        {headline}
      </h1>
      <p className="text-muted-foreground mx-auto max-w-sm text-sm leading-relaxed">{subline}</p>
    </header>
  )
}
