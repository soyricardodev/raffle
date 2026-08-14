const REMINDER_PREFIX = "ps-promo-remind-"

export function promoReminderStorageKey(purchaseId: number): string {
  return `${REMINDER_PREFIX}${purchaseId}`
}

export function wasPromoReminderShown(purchaseId: number): boolean {
  if (typeof sessionStorage === "undefined") return true
  return sessionStorage.getItem(promoReminderStorageKey(purchaseId)) === "1"
}

export function markPromoReminderShown(purchaseId: number): void {
  if (typeof sessionStorage === "undefined") return
  sessionStorage.setItem(promoReminderStorageKey(purchaseId), "1")
}

export function shouldShowPromoReminder(input: {
  promoEnabled: boolean
  finalizeHref: string
  supportClicked: boolean
  purchaseId: number
}): boolean {
  if (!input.promoEnabled || !input.finalizeHref || input.supportClicked) return false
  return !wasPromoReminderShown(input.purchaseId)
}
