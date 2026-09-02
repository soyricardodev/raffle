export type PwaPlatform = "ios" | "android" | "desktop"

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

declare global {
  interface Window {
    __deferredPwaInstall?: BeforeInstallPromptEvent | null
  }
}

export function detectPwaPlatform(userAgent: string, maxTouchPoints = 0): PwaPlatform {
  if (/android/i.test(userAgent)) return "android"
  if (/iPad|iPhone|iPod/.test(userAgent)) return "ios"
  if (/Macintosh/.test(userAgent) && maxTouchPoints > 1) return "ios"
  return "desktop"
}

export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false
  const nav = window.navigator as Navigator & { standalone?: boolean }
  if (nav.standalone) return true
  return window.matchMedia("(display-mode: standalone)").matches
}

export function iosNeedsInstallForPush(platform: PwaPlatform, standalone: boolean): boolean {
  return platform === "ios" && !standalone
}

export function notificationPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported"
  return Notification.permission
}
