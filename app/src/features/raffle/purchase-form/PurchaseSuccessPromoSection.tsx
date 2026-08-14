import type { RefObject } from "react"
import { Button } from "@/components/ui/button"
import type { ResolvedPurchaseSuccessPromo } from "@/features/raffle/purchase-form/resolve-purchase-success-promo"

type PurchaseSuccessPromoSectionProps = {
  promo: ResolvedPurchaseSuccessPromo
  supportLinkRef: RefObject<HTMLAnchorElement | null>
  logoSrc?: string | null
  raffleImageUrl?: string | null
  raffleName?: string
  onSupportClick: () => void
  onInstagramClick: () => void
  onTiktokClick: () => void
  onSocialLinkClick: (id: string) => void
}

export function PurchaseSuccessPromoSection({
  promo,
  supportLinkRef,
  logoSrc,
  raffleImageUrl,
  raffleName,
  onSupportClick,
  onInstagramClick,
  onTiktokClick,
  onSocialLinkClick,
}: PurchaseSuccessPromoSectionProps) {
  if (!promo.shouldShow) return null

  const hasFinalizeCta = Boolean(promo.supportFinalizeHref)
  const finalizeTitle = hasFinalizeCta
    ? "Para finalizar tu compra"
    : "Gracias por participar"
  const finalizeDescription = hasFinalizeCta
    ? `Escríbeme por ${promo.supportLabel} con tu nombre y apellido para guardarte y confirmar tus datos.`
    : "Abajo tienes mis redes oficiales para seguir conectado."
  const trimmedLogoSrc = logoSrc?.trim()
  const trimmedRaffleImageUrl = raffleImageUrl?.trim()
  const coverSrc = trimmedRaffleImageUrl || trimmedLogoSrc || ""
  const showLogoBadge = Boolean(trimmedLogoSrc && trimmedLogoSrc !== coverSrc)
  const displayRaffleName = raffleName?.trim() || "Tu rifa"

  const socialLinks = promo.socialLinks
    .filter((link) => (hasFinalizeCta ? link.id !== promo.supportKind : true))
    .map((link) => {
      if (link.id === "instagram" && promo.instagramHref) {
        return { ...link, href: promo.instagramHref }
      }
      if (link.id === "tiktok" && promo.tiktokHref) return { ...link, href: promo.tiktokHref }
      return link
    })

  return (
    <section
      className="mx-4 mb-2 shrink-0 overflow-hidden rounded-2xl border border-primary/20 bg-card shadow-sm"
      aria-labelledby="purchase-success-promo-title"
    >
      <div className="relative flex items-center gap-3 overflow-hidden bg-gradient-to-br from-amber-300/20 via-background to-sky-500/15 p-3">
        <div className="pointer-events-none absolute -top-8 -right-8 size-20 rounded-full bg-pink-500/15 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-10 left-10 size-24 rounded-full bg-sky-500/15 blur-2xl" />
        <div className="relative size-16 shrink-0 overflow-hidden rounded-2xl border bg-background shadow-sm ring-2 ring-white/70">
          {coverSrc ? (
            <img src={coverSrc} alt="" className="size-full object-cover" width={64} height={64} />
          ) : (
            <span
              className="flex size-full items-center justify-center"
              style={{
                background: `linear-gradient(to bottom right, ${promo.supportBrandColor}, #0d8ecf)`,
              }}
            >
              <img src={promo.supportIconSrc} alt="" className="size-8" width={32} height={32} />
            </span>
          )}
          {showLogoBadge ? (
            <span className="absolute right-0 bottom-0 flex size-6 items-center justify-center rounded-tl-lg bg-background shadow-sm">
              <img src={trimmedLogoSrc} alt="" className="size-5 rounded-sm object-contain" />
            </span>
          ) : null}
        </div>
        <div className="relative min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-1.5">
            <span className="rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-bold tracking-wide text-foreground uppercase shadow-xs">
              Estás comprando
            </span>
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
              Compra registrada
            </span>
          </div>
          <p className="truncate text-base leading-tight font-bold text-foreground">
            {displayRaffleName}
          </p>
          <h3
            id="purchase-success-promo-title"
            className="mt-1 text-sm leading-tight font-semibold text-foreground"
          >
            {finalizeTitle}
          </h3>
          <p className="text-muted-foreground mt-0.5 line-clamp-1 text-xs leading-snug">
            {finalizeDescription}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2 p-3 pt-0">
        {hasFinalizeCta ? (
          <Button
            className="min-h-11 w-full border-0 text-white shadow-sm"
            style={{ backgroundColor: promo.supportBrandColor }}
            asChild
          >
            <a
              ref={supportLinkRef}
              href={promo.supportFinalizeHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Finalizar compra por ${promo.supportLabel}`}
              onClick={onSupportClick}
            >
              <img
                src={promo.supportIconSrc}
                alt=""
                className="mr-2 size-5"
                width={20}
                height={20}
                aria-hidden
              />
              {promo.supportLabel}
            </a>
          </Button>
        ) : null}

        {socialLinks.length > 0 || promo.supportChannelHref ? (
          <div className="flex flex-col gap-2 rounded-xl border border-primary/10 bg-gradient-to-br from-background via-muted/35 to-amber-300/10 p-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm leading-tight font-bold text-foreground">
                  Sígueme en mis redes sociales
                </p>
                <p className="text-muted-foreground text-xs leading-snug">
                  Nuevas rifas, ganadores, dinámicas y avisos oficiales.
                </p>
              </div>
              {promo.supportChannelHref ? (
                <a
                  href={promo.supportChannelHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-foreground underline-offset-4 hover:underline"
                >
                  Canal de {promo.supportLabel}
                </a>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {socialLinks.map((link) => (
                <Button
                  key={link.id}
                  variant="outline"
                  size="icon-sm"
                  className="size-9 rounded-full bg-background shadow-xs hover:-translate-y-0.5 hover:shadow-sm"
                  asChild
                >
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={link.label}
                    title={link.label}
                    onClick={() => {
                      if (link.id === "instagram") onInstagramClick()
                      if (link.id === "tiktok") onTiktokClick()
                      onSocialLinkClick(link.id)
                    }}
                  >
                    {link.iconSrc ? (
                      <img
                        src={link.iconSrc}
                        alt=""
                        className="size-4"
                        width={16}
                        height={16}
                        aria-hidden
                      />
                    ) : (
                      <span className="text-xs font-semibold">{link.label.slice(0, 1)}</span>
                    )}
                  </a>
                </Button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}
