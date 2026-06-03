import { Button } from "@/components/ui/button"
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
import { Link } from "@tanstack/react-router"
import { PartyPopper } from "lucide-react"

type PurchaseSuccessDialogProps = {
  result: PurchaseResult | null
  onClose: () => void
}

export function PurchaseSuccessDialog({ result, onClose }: PurchaseSuccessDialogProps) {
  const branding = usePublicBranding()
  const {
    promo,
    whatsappLinkRef,
    copyTickets,
    markWhatsappClicked,
    handleTicketsExpandedChange,
    handleOpenChange,
    trackInstagramClick,
  } = usePurchaseSuccessSheet({
    result,
    purchaseSuccessPromo: branding?.purchaseSuccessPromo,
    onClose,
  })

  return (
    <Sheet open={result != null} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton
        className="flex max-h-[min(92dvh,720px)] flex-col gap-0 rounded-t-2xl p-0 sm:mx-auto sm:max-w-lg"
        aria-describedby={result ? "purchase-success-description" : undefined}
      >
        <SheetHeader className="shrink-0 space-y-1 px-4 pt-4 pb-2 text-center">
          <div
            className="mx-auto flex size-11 items-center justify-center rounded-full bg-emerald-500/15"
            aria-hidden
          >
            <PartyPopper className="size-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <SheetTitle className="text-lg leading-tight">¡Listo, compra registrada!</SheetTitle>
          <SheetDescription id="purchase-success-description" className="text-center">
            Boletos reservados. Guárdalos y verifica cuando sea aprobada.
          </SheetDescription>
        </SheetHeader>

        {result ? (
          <>
            <PurchaseSuccessPromoSection
              promo={promo}
              whatsappLinkRef={whatsappLinkRef}
              onWhatsappClick={() => markWhatsappClicked("drawer")}
              onInstagramClick={trackInstagramClick}
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

        <SheetFooter className="border-border shrink-0 gap-2 border-t px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex-col">
          <Button variant="outline" className="min-h-10 w-full" asChild>
            <Link to="/verificar">Verificar mis boletos</Link>
          </Button>
          <Button variant="ghost" className="h-9 w-full text-sm" onClick={() => handleOpenChange(false)}>
            Cerrar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
