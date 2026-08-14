export const TELEGRAM_CHANNEL_BANNER_STORAGE_KEY = "raffle:telegram-channel-banner:v1"

export function isTelegramChannelBannerDismissed(): boolean {
  if (typeof window === "undefined") return false
  try {
    return localStorage.getItem(TELEGRAM_CHANNEL_BANNER_STORAGE_KEY) === "1"
  } catch {
    return false
  }
}

export function dismissTelegramChannelBanner(): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(TELEGRAM_CHANNEL_BANNER_STORAGE_KEY, "1")
  } catch {
    // Ignore quota / private-mode failures; the banner can close for this visit.
  }
}

export function shouldShowTelegramChannelBanner(input: {
  dismissed: boolean
  supportKind: "telegram" | "whatsapp"
  supportHref: string
}): boolean {
  return !input.dismissed && input.supportKind === "telegram" && Boolean(input.supportHref)
}
