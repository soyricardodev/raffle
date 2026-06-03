import type { OfficialFooterLogo } from "@raffle/shared/site-config"

/** Default official lottery seals (legacy frontend parity when config has none). */
export const DEFAULT_OFFICIAL_FOOTER_LOGOS: OfficialFooterLogo[] = [
  { image: "/brand/official/tachira.png", alt: "Lotería del Táchira" },
  { image: "/brand/official/supergana.png", alt: "Super Gana" },
  { image: "/brand/official/conalot.png", alt: "CONALOT" },
]

export const DEFAULT_OFFICIAL_FOOTER_HEADING = "Sorteos Oficiales Avalados"

export const DEFAULT_OFFICIAL_FOOTER_DESCRIPTION =
  "Nuestros sorteos se basan en lotería oficial del Estado Táchira"

export function resolveOfficialFooterLogos(
  configured: OfficialFooterLogo[] | undefined,
): OfficialFooterLogo[] {
  const fromConfig = (configured ?? []).filter((logo) => logo.image.trim())
  return fromConfig.length > 0 ? fromConfig : DEFAULT_OFFICIAL_FOOTER_LOGOS
}
