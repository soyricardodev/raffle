import type { PublicSiteConfigPayload } from "@/features/layout/public-queries"
import type { SiteColors } from "@/stores/site-config"

const DEFAULT_COLORS: SiteColors = {
  primary: "#8B7355",
  secondary: "#F5F5DC",
  accent: "#FFD700",
}

export function brandCssVariables(config: PublicSiteConfigPayload | null | undefined): string {
  const colors = config?.site_colors ?? DEFAULT_COLORS
  return `:root{--brand-primary:${colors.primary};--brand-secondary:${colors.secondary};--brand-accent:${colors.accent}}`
}
