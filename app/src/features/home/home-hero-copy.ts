import type { HeroConfig, SiteInfo } from "@/stores/site-config"

/** Evita titulares partidos tipo "¡GANA" + "AHORA!" del legacy hero_config. */
export function getHomeHeadline(siteInfo: SiteInfo, hero: HeroConfig) {
  const rawTitle = hero.title.trim()
  const subline = (hero.subtitle.trim() || siteInfo.tagline.trim()) || "Participa en rifas seguras en línea"

  const titleIsFragment =
    rawTitle.length > 0 && rawTitle.length < 14 && !rawTitle.includes(" ") && rawTitle !== siteInfo.site_name

  if (!rawTitle || titleIsFragment) {
    return {
      headline: siteInfo.site_name || "Rifas",
      subline,
    }
  }

  return {
    headline: rawTitle,
    subline,
  }
}
