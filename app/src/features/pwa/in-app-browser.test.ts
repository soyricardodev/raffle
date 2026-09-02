import { describe, expect, it } from "vitest"
import {
  androidChromeIntentUrl,
  detectInAppBrowserKind,
  detectPhoneType,
  inAppSourceLabel,
  isInAppBrowser,
} from "./in-app-browser"

describe("in-app browser detection", () => {
  it("detects Instagram Android", () => {
    const ua = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Instagram 300.0.0.0.0"
    expect(isInAppBrowser(ua)).toBe(true)
    expect(detectInAppBrowserKind(ua)).toBe("instagram")
    expect(detectPhoneType(ua)).toBe("android")
    expect(inAppSourceLabel("instagram")).toBe("Instagram")
  })

  it("detects Instagram iOS", () => {
    const ua =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Instagram 300.0.0.0.0"
    expect(detectInAppBrowserKind(ua)).toBe("instagram")
    expect(detectPhoneType(ua)).toBe("ios")
  })

  it("does not flag regular Chrome", () => {
    const ua =
      "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
    expect(isInAppBrowser(ua)).toBe(false)
    expect(detectPhoneType(ua)).toBe("android")
  })

  it("builds a Chrome intent URL", () => {
    const intent = androidChromeIntentUrl("https://rifas.example/rifa/1?utm=ig")
    expect(intent).toContain("intent://rifas.example/rifa/1?utm=ig")
    expect(intent).toContain("package=com.android.chrome")
  })
})
