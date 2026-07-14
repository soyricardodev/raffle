import { Link } from "@tanstack/react-router"
import { PartyPopper, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { buildVerifyHref } from "@/features/verify/build-verify-href"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { usePublicBranding } from "@/features/layout/use-public-branding"
import { PurchaseSuccessPromoSection } from "@/features/raffle/purchase-form/PurchaseSuccessPromoSection"
import { PurchaseSuccessTickets } from "@/features/raffle/purchase-form/PurchaseSuccessTickets"
import { usePurchaseSuccessSheet } from "@/features/raffle/purchase-form/use-purchase-success-sheet"
import type { PurchaseResult } from "@/features/raffle/types"

type PurchaseSuccessDialogProps = {
  result: PurchaseResult | null
  verifyPhone?: string
  raffleImageUrl?: string | null
  onClose: () => void
}

export function PurchaseSuccessDialog({
  result,
  verifyPhone,
  raffleImageUrl,
  onClose,
}: PurchaseSuccessDialogProps) {
  const branding = usePublicBranding()
  const {
    promo,
    whatsappLinkRef,
    copyTickets,
    markWhatsappClicked,
    handleTicketsExpandedChange,
    handleOpenChange,
    trackInstagramClick,
    trackTiktokClick,
    trackSocialLinkClick,
  } = usePurchaseSuccessSheet({
    result,
    purchaseSuccessPromo: branding?.purchaseSuccessPromo,
    social: branding?.social,
    onClose,
  })

  return (
    <Sheet open={result != null} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton
        className="flex max-h-[min(94dvh,720px)] flex-col gap-0 rounded-t-2xl p-0 sm:mx-auto sm:max-w-lg"
        aria-describedby={result ? "purchase-success-description" : undefined}
      >
        <SheetHeader className="shrink-0 gap-1 px-4 pt-3 pb-2 text-center">
          <div className="relative mx-auto flex size-12 items-center justify-center" aria-hidden>
            <span className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-300 via-pink-400 to-emerald-400 opacity-25 blur-sm" />
            <span className="relative flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 via-pink-500 to-emerald-500 text-white shadow-sm">
              <PartyPopper className="size-5" />
            </span>
            <Sparkles className="absolute -top-1 -right-1 size-4 text-amber-500" />
            <Sparkles className="absolute -bottom-0.5 -left-1 size-3.5 text-pink-500" />
          </div>
          <SheetTitle className="text-base leading-tight">¡Listo, compra registrada!</SheetTitle>
          <SheetDescription id="purchase-success-description" className="text-center text-xs">
            Boletos reservados. Guárdalos y verifica cuando sea aprobada.
          </SheetDescription>
        </SheetHeader>

        {result ? (
          <>
            <PurchaseSuccessPromoSection
              promo={promo}
              whatsappLinkRef={whatsappLinkRef}
              logoSrc={branding?.images.logo}
              raffleImageUrl={raffleImageUrl}
              raffleName={result.raffleName}
              onWhatsappClick={() => markWhatsappClicked("drawer")}
              onInstagramClick={trackInstagramClick}
              onTiktokClick={trackTiktokClick}
              onSocialLinkClick={trackSocialLinkClick}
            />

            <div className="flex min-h-0 flex-1 flex-col px-4 pb-2">
              <PurchaseSuccessTickets
                purchaseId={result.purchaseId}
                ticketNumbers={result.ticketNumbers}
                onCopy={() => void copyTickets()}
                onExpandedChange={handleTicketsExpandedChange}
              />
            </div>
          </>
        ) : null}

        <SheetFooter className="border-border grid shrink-0 grid-cols-[1fr_auto] gap-2 border-t px-4 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
          <Button variant="outline" className="min-h-10" asChild>
            <Link
              {...buildVerifyHref(
                verifyPhone?.trim() ? { phone: verifyPhone.trim(), auto: true } : undefined,
              )}
            >
              Buscar boletos
            </Link>
          </Button>
          <Button
            variant="ghost"
            className="h-10 px-5 text-sm"
            onClick={() => handleOpenChange(false)}
          >
            Cerrar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
