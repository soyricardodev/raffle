import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { trackPurchaseSuccessEvent } from "@/features/raffle/purchase-form/purchase-success-analytics"
import { purchaseSuccessFinalizeCopy } from "@/features/raffle/purchase-form/purchase-success-copy"
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
  whatsappEnabled?: boolean
  onClose: () => void
}

export function usePurchaseSuccessSheet({
  result,
  purchaseSuccessPromo,
  social,
  whatsappEnabled = false,
  onClose,
}: UsePurchaseSuccessSheetParams) {
  const promo = resolvePurchaseSuccessPromo({
    promo: purchaseSuccessPromo,
    social,
    purchase: result,
    whatsappEnabled,
  })
  const [supportClicked, setSupportClicked] = useState(false)
  const supportLinkRef = useRef<HTMLAnchorElement>(null)
  const openedPurchaseIdRef = useRef<number | null>(null)

  const finalizeHref = promo.supportFinalizeHref

  useEffect(() => {
    setSupportClicked(false)
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
    if (!result || !promo.shouldShow || !promo.supportFinalizeHref) return
    const timer = window.setTimeout(() => {
      supportLinkRef.current?.focus({ preventScroll: true })
    }, 150)
    return () => window.clearTimeout(timer)
  }, [result?.purchaseId, promo.shouldShow, promo.supportFinalizeHref])

  const copyTickets = useCallback(async () => {
    if (!result) return
    await navigator.clipboard.writeText(result.ticketNumbers.join(", "))
    trackPurchaseSuccessEvent("copy_tickets", {
      purchaseId: result.purchaseId,
      ticketCount: result.ticketNumbers.length,
    })
    toast.success("Boletos copiados al portapapeles")
  }, [result])

  const markSupportClicked = useCallback(
    (source: "drawer" | "reminder_toast") => {
      if (!result) return
      setSupportClicked(true)
      const event = promo.supportKind === "whatsapp" ? "whatsapp_cta_click" : "telegram_cta_click"
      trackPurchaseSuccessEvent(event, {
        purchaseId: result.purchaseId,
        ticketCount: result.ticketNumbers.length,
        source,
      })
    },
    [result, promo.supportKind],
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
          finalizeHref,
          supportClicked,
          purchaseId: result.purchaseId,
        })
      ) {
        markPromoReminderShown(result.purchaseId)
        const reminder = purchaseSuccessFinalizeCopy(promo.supportLabel)
        toast(reminder.reminderTitle, {
          description: reminder.reminderDescription,
          duration: 10_000,
          action: {
            label: reminder.reminderAction,
            onClick: () => {
              markSupportClicked("reminder_toast")
              window.open(finalizeHref, "_blank", "noopener,noreferrer")
            },
          },
        })
      }

      onClose()
    },
    [
      result,
      promo.shouldShow,
      promo.supportLabel,
      finalizeHref,
      supportClicked,
      markSupportClicked,
      onClose,
    ],
  )

  return {
    promo,
    supportLinkRef,
    copyTickets,
    markSupportClicked,
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
