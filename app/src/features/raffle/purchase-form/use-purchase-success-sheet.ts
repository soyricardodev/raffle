import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { trackPurchaseSuccessEvent } from "@/features/raffle/purchase-form/purchase-success-analytics"
import {
  markPromoReminderShown,
  shouldShowPromoReminder,
} from "@/features/raffle/purchase-form/purchase-success-reminder"
import { resolvePurchaseSuccessPromo } from "@/features/raffle/purchase-form/resolve-purchase-success-promo"
import type { PurchaseResult } from "@/features/raffle/types"
import type { PurchaseSuccessPromo, SocialMedia } from "@/stores/site-config"

type UsePurchaseSuccessSheetParams = {
  result: PurchaseResult | null
  purchaseSuccessPromo: PurchaseSuccessPromo | undefined
  social: SocialMedia | undefined
  onClose: () => void
}

export function usePurchaseSuccessSheet({
  result,
  purchaseSuccessPromo,
  social,
  onClose,
}: UsePurchaseSuccessSheetParams) {
  const promo = resolvePurchaseSuccessPromo({
    promo: purchaseSuccessPromo,
    social,
    purchase: result,
  })
  const [whatsappClicked, setWhatsappClicked] = useState(false)
  const whatsappLinkRef = useRef<HTMLAnchorElement>(null)
  const openedPurchaseIdRef = useRef<number | null>(null)

  const whatsappReminderHref = promo.whatsappFinalizeHref

  useEffect(() => {
    setWhatsappClicked(false)
  }, [result?.purchaseId])

  useEffect(() => {
    if (!result || openedPurchaseIdRef.current === result.purchaseId) return
    openedPurchaseIdRef.current = result.purchaseId
    trackPurchaseSuccessEvent("purchase_success_open", {
      purchaseId: result.purchaseId,
      ticketCount: result.ticketNumbers.length,
      promoVisible: promo.shouldShow,
    })
  }, [result, promo.shouldShow])

  useEffect(() => {
    if (!result || !promo.shouldShow || !promo.whatsappFinalizeHref) return
    const timer = window.setTimeout(() => {
      whatsappLinkRef.current?.focus({ preventScroll: true })
    }, 150)
    return () => window.clearTimeout(timer)
  }, [result?.purchaseId, promo.shouldShow, promo.whatsappFinalizeHref])

  const copyTickets = useCallback(async () => {
    if (!result) return
    await navigator.clipboard.writeText(result.ticketNumbers.join(", "))
    trackPurchaseSuccessEvent("copy_tickets", {
      purchaseId: result.purchaseId,
      ticketCount: result.ticketNumbers.length,
    })
    toast.success("Boletos copiados al portapapeles")
  }, [result])

  const markWhatsappClicked = useCallback(
    (source: "drawer" | "reminder_toast") => {
      if (!result) return
      setWhatsappClicked(true)
      trackPurchaseSuccessEvent("whatsapp_cta_click", {
        purchaseId: result.purchaseId,
        ticketCount: result.ticketNumbers.length,
        source,
      })
    },
    [result],
  )

  const handleTicketsExpandedChange = useCallback(
    (expanded: boolean) => {
      if (!result) return
      trackPurchaseSuccessEvent(expanded ? "tickets_expand" : "tickets_collapse", {
        purchaseId: result.purchaseId,
        ticketCount: result.ticketNumbers.length,
      })
    },
    [result],
  )

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open || !result) return

      if (
        shouldShowPromoReminder({
          promoEnabled: promo.shouldShow,
          whatsappHref: whatsappReminderHref,
          whatsappClicked,
          purchaseId: result.purchaseId,
        })
      ) {
        markPromoReminderShown(result.purchaseId)
        toast("¿Finalizaste por WhatsApp?", {
          description: "Escríbenos para confirmar tu compra y guardar tus datos.",
          duration: 10_000,
          action: {
            label: "Escribir",
            onClick: () => {
              markWhatsappClicked("reminder_toast")
              window.open(whatsappReminderHref, "_blank", "noopener,noreferrer")
            },
          },
        })
      }

      onClose()
    },
    [result, promo.shouldShow, whatsappReminderHref, whatsappClicked, markWhatsappClicked, onClose],
  )

  return {
    promo,
    whatsappLinkRef,
    copyTickets,
    markWhatsappClicked,
    handleTicketsExpandedChange,
    handleOpenChange,
    trackInstagramClick: useCallback(() => {
      if (!result) return
      trackPurchaseSuccessEvent("instagram_cta_click", { purchaseId: result.purchaseId })
    }, [result]),
    trackTiktokClick: useCallback(() => {
      if (!result) return
      trackPurchaseSuccessEvent("tiktok_cta_click", { purchaseId: result.purchaseId })
    }, [result]),
    trackSocialLinkClick: useCallback(
      (socialId: string) => {
        if (!result) return
        trackPurchaseSuccessEvent("social_cta_click", {
          purchaseId: result.purchaseId,
          socialId,
        })
      },
      [result],
    ),
  }
}
