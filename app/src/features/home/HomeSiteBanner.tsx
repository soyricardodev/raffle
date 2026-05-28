import { usePublicBranding } from "@/features/layout/use-public-branding"

export function HomeSiteBanner() {
  const branding = usePublicBranding()
  const banner = branding?.images.banner?.trim()

  if (!banner) return null

  return (
    <figure className="relative -mx-4 aspect-[16/9] w-auto overflow-hidden sm:mx-0 sm:rounded-xl">
      <img
        src={banner}
        alt=""
        className="size-full object-cover"
        fetchPriority="high"
        decoding="async"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"
        aria-hidden
      />
    </figure>
  )
}
