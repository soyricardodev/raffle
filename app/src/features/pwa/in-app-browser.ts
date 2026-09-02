export type PhoneType = "android" | "ios"

export type InAppBrowserKind =
  | "instagram"
  | "facebook"
  | "whatsapp"
  | "tiktok"
  | "twitter"
  | "telegram"
  | "other"

const IN_APP_PATTERNS: Array<{ kind: InAppBrowserKind; pattern: RegExp }> = [
  { kind: "instagram", pattern: /Instagram/i },
  { kind: "facebook", pattern: /FBAN|FBAV|FB_IAB|FB4A|FBIOS|FBSS|Messenger/i },
  { kind: "whatsapp", pattern: /WhatsApp/i },
  { kind: "tiktok", pattern: /TikTok|BytedanceWebview|musical_ly/i },
  { kind: "twitter", pattern: /Twitter|X-Client/i },
  { kind: "telegram", pattern: /Telegram/i },
]

export function detectPhoneType(userAgent: string): PhoneType | null {
  if (/android/i.test(userAgent)) return "android"
  if (/iPad|iPhone|iPod/.test(userAgent)) return "ios"
  return null
}

export function detectInAppBrowserKind(userAgent: string): InAppBrowserKind | null {
  for (const { kind, pattern } of IN_APP_PATTERNS) {
    if (pattern.test(userAgent)) return kind
  }
  return null
}

export function isInAppBrowser(userAgent: string): boolean {
  return detectInAppBrowserKind(userAgent) != null
}

export function inAppSourceLabel(kind: InAppBrowserKind | null): string {
  switch (kind) {
    case "instagram":
      return "Instagram"
    case "facebook":
      return "Facebook"
    case "whatsapp":
      return "WhatsApp"
    case "tiktok":
      return "TikTok"
    case "twitter":
      return "X"
    case "telegram":
      return "Telegram"
    default:
      return "esta app"
  }
}

function targetUrlFromLocation(href: string): {
  hostPath: string
  pathSearch: string
  httpsUrl: string
} {
  const url = new URL(href)
  url.searchParams.delete("redirected")
  const portPart = url.port && url.port !== "80" && url.port !== "443" ? `:${url.port}` : ""
  const hostPath = `${url.hostname}${portPart}`
  const pathSearch = `${url.pathname}${url.search}`
  const httpsUrl = `${url.protocol}//${hostPath}${pathSearch}`
  return { hostPath, pathSearch, httpsUrl }
}

/** Chrome intent URL. Instagram Android honors this more reliably than window.open. */
export function androidChromeIntentUrl(href: string): string {
  const { hostPath, pathSearch, httpsUrl } = targetUrlFromLocation(href)
  const fallback = encodeURIComponent(httpsUrl)
  return `intent://${hostPath}${pathSearch}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${fallback};end`
}

/** Safari scheme used by some iOS in-app browsers. Not reliable in current Instagram. */
export function iosSafariSchemeUrl(href: string): string {
  const { httpsUrl } = targetUrlFromLocation(href)
  return `x-safari-${httpsUrl}`
}

export function copyableHttpsUrl(href: string): string {
  return targetUrlFromLocation(href).httpsUrl
}
