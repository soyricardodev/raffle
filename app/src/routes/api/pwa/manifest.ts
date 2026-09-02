import { createFileRoute } from "@tanstack/react-router"
import {
  applyPublicWhatsAppVisibility,
  parsePublicSiteConfig,
} from "@/features/layout/public-site-config-schema"
import {
  PWA_BACKGROUND,
  PWA_ICON_192,
  PWA_ICON_512,
  PWA_NAME,
  PWA_SHORT_NAME,
  PWA_THEME,
} from "@/features/pwa/pwa-brand"
import { apiHandlers } from "@/lib/api-handler"
import { getEnv } from "@/lib/env"
import { rateLimit } from "@/lib/rate-limit"
import { getSiteConfigMap } from "@/server/site-config.service"

export const Route = createFileRoute("/api/pwa/manifest")({
  server: {
    handlers: apiHandlers({
      GET: async ({ request }) => {
        await rateLimit(request, { windowMs: 60_000, maxRequests: 60, keyPrefix: "pwa-manifest" })
        const origin = new URL(request.url).origin
        const config = applyPublicWhatsAppVisibility(
          parsePublicSiteConfig(await getSiteConfigMap()),
          getEnv().ENABLE_WHATSAPP,
        )
        const description =
          config.site_info?.tagline?.trim() || "Rifas, dinámicas y promociones. Avisos al instante."
        const theme = config.site_colors?.primary?.trim() || PWA_THEME

        const manifest = {
          id: "/",
          name: PWA_NAME,
          short_name: PWA_SHORT_NAME,
          description,
          start_url: "/",
          scope: "/",
          display: "standalone",
          display_override: ["standalone", "browser"],
          orientation: "portrait",
          lang: "es",
          dir: "ltr",
          background_color: PWA_BACKGROUND,
          theme_color: theme,
          categories: ["shopping", "entertainment"],
          icons: [
            {
              src: `${origin}${PWA_ICON_192}`,
              sizes: "192x192",
              type: "image/png",
              purpose: "any",
            },
            {
              src: `${origin}${PWA_ICON_512}`,
              sizes: "512x512",
              type: "image/png",
              purpose: "any",
            },
          ],
        }

        return new Response(JSON.stringify(manifest), {
          headers: {
            "content-type": "application/manifest+json; charset=utf-8",
            "cache-control": "public, max-age=300",
          },
        })
      },
    }),
  },
})
