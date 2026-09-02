import { useEffect } from "react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { usePublicBranding } from "@/features/layout/use-public-branding"
import { PwaPurchaseNudge } from "@/features/pwa/PwaPurchaseNudge"
import { usePwaEngageContext } from "@/features/pwa/pwa-engage-context"
import { PurchaseSuccessPromoSection } from "@/features/raffle/purchase-form/PurchaseSuccessPromoSection"
import { PurchaseSuccessTickets } from "@/features/raffle/purchase-form/PurchaseSuccessTickets"
import {
  purchaseSuccessFinalizeCopy,
  purchaseSuccessRepeatCopy,
} from "@/features/raffle/purchase-form/purchase-success-copy"
import { usePurchaseSuccessSheet } from "@/features/raffle/purchase-form/use-purchase-success-sheet"
import type { PurchaseResult } from "@/features/raffle/types"

type PurchaseSuccessDialogProps = {
  result: PurchaseResult | null
  raffleImageUrl?: string | null
  onClose: () => void
}

export function PurchaseSuccessDialog({
  result,
  raffleImageUrl,
  onClose,
}: PurchaseSuccessDialogProps) {
  const branding = usePublicBranding()
  const engage = usePwaEngageContext()
  const {
    promo,
    supportLinkRef,
    copyTickets,
    markSupportClicked,
    handleTicketsExpandedChange,
    handleOpenChange,
    trackInstagramClick,
    trackTiktokClick,
    trackSocialLinkClick,
  } = usePurchaseSuccessSheet({
    result,
    purchaseSuccessPromo: branding?.purchaseSuccessPromo,
    social: branding?.social,
    whatsappEnabled: branding?.whatsappEnabled,
    onClose,
  })

  useEffect(() => {
    if (!engage) return
    if (result) engage.holdEngageUi()
    else engage.releaseEngageUi()
    return () => engage.releaseEngageUi()
  }, [engage?.holdEngageUi, engage?.releaseEngageUi, result])

  const hasFinalizeCta = Boolean(result && promo.supportFinalizeHref)
  const finalizeCopy = hasFinalizeCta
    ? purchaseSuccessFinalizeCopy(promo.supportLabel)
    : purchaseSuccessRepeatCopy()

  return (
    <Sheet open={result != null} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton
        className="flex max-h-[96dvh] flex-col gap-0 rounded-t-2xl p-0 duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] sm:mx-auto sm:max-w-lg"
        aria-describedby={result ? "purchase-success-description" : undefined}
      >
        <SheetHeader className="shrink-0 gap-2 px-4 pt-5 pr-12 pb-3 text-left">
          {hasFinalizeCta ? (
            <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
              {purchaseSuccessFinalizeCopy(promo.supportLabel).eyebrow}
            </p>
          ) : null}
          <SheetTitle className="text-xl leading-snug font-semibold tracking-tight">
            {finalizeCopy.title}
          </SheetTitle>
          <SheetDescription
            id="purchase-success-description"
            className="text-left text-sm leading-relaxed text-foreground/80"
          >
            {finalizeCopy.description}
          </SheetDescription>
        </SheetHeader>

        {result ? (
          <>
            <PurchaseSuccessPromoSection
              promo={promo}
              supportLinkRef={supportLinkRef}
              onSupportClick={() => markSupportClicked("drawer")}
              onInstagramClick={trackInstagramClick}
              onTiktokClick={trackTiktokClick}
              onSocialLinkClick={trackSocialLinkClick}
              showSocials={false}
            />

            <PwaPurchaseNudge />

            <div className="flex min-h-0 flex-1 flex-col px-4 pt-4 pb-2">
              <PurchaseSuccessTickets
                purchaseId={result.purchaseId}
                raffleName={result.raffleName}
                raffleImageUrl={raffleImageUrl}
                ticketNumbers={result.ticketNumbers}
                onCopy={() => void copyTickets()}
                onExpandedChange={handleTicketsExpandedChange}
              />
            </div>

            <div className="shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <PurchaseSuccessPromoSection
                promo={promo}
                supportLinkRef={supportLinkRef}
                onSupportClick={() => markSupportClicked("drawer")}
                onInstagramClick={trackInstagramClick}
                onTiktokClick={trackTiktokClick}
                onSocialLinkClick={trackSocialLinkClick}
                showCta={false}
              />
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
