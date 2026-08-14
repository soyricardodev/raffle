/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from "vitest"
import {
  dismissTelegramChannelBanner,
  isTelegramChannelBannerDismissed,
  shouldShowTelegramChannelBanner,
  TELEGRAM_CHANNEL_BANNER_STORAGE_KEY,
} from "@/features/layout/telegram-channel-banner-storage"

describe("telegram-channel-banner-storage", () => {
  afterEach(() => {
    localStorage.removeItem(TELEGRAM_CHANNEL_BANNER_STORAGE_KEY)
  })

  it("shows the banner only for Telegram support that is still open", () => {
    expect(
      shouldShowTelegramChannelBanner({
        dismissed: false,
        supportKind: "telegram",
        supportHref: "https://t.me/yoiberifas",
      }),
    ).toBe(true)
    expect(
      shouldShowTelegramChannelBanner({
        dismissed: true,
        supportKind: "telegram",
        supportHref: "https://t.me/yoiberifas",
      }),
    ).toBe(false)
    expect(
      shouldShowTelegramChannelBanner({
        dismissed: false,
        supportKind: "whatsapp",
        supportHref: "https://wa.me/584121234567",
      }),
    ).toBe(false)
    expect(
      shouldShowTelegramChannelBanner({
        dismissed: false,
        supportKind: "telegram",
        supportHref: "",
      }),
    ).toBe(false)
  })

  it("persists dismissal in localStorage", () => {
    expect(isTelegramChannelBannerDismissed()).toBe(false)
    dismissTelegramChannelBanner()
    expect(isTelegramChannelBannerDismissed()).toBe(true)
    expect(localStorage.getItem(TELEGRAM_CHANNEL_BANNER_STORAGE_KEY)).toBe("1")
  })
})
