import { useEffect, useState } from "react"

const DEFAULT_CONFIG = {
  redirectDelay: 1500,
  androidPackage: "com.android.chrome",
  useDefaultAndroidBrowser: false,
}

function hasRedirected(): boolean {
  if (typeof window === "undefined") return false
  return new URLSearchParams(window.location.search).get("redirected") === "true"
}

function removeRedirectParam(): void {
  const url = new URL(window.location.href)
  url.searchParams.delete("redirected")
  window.history.replaceState({}, "", url.toString())
}

function detectInAppBrowser(): boolean {
  const userAgent = navigator.userAgent || ""
  const inAppPatterns = [
    /Instagram/i,
    /FBAN|FBAV|FB_IAB|FB4A|FBIOS|FBSS|Messenger/i,
    /WhatsApp/i,
    /Twitter/i,
    /TikTok/i,
    /Telegram/i,
  ]
  return inAppPatterns.some((pattern) => pattern.test(userAgent))
}

function detectPhoneType(): "android" | "ios" | null {
  const userAgent = navigator.userAgent
  if (/android/i.test(userAgent)) return "android"
  if (/iPad|iPhone|iPod/.test(userAgent)) return "ios"
  return null
}

function getBaseDomain(): string {
  const { protocol, hostname, port } = window.location
  const portPart = port && port !== "80" && port !== "443" ? `:${port}` : ""
  return `${protocol}//${hostname}${portPart}`
}

function showRedirectMessage(browserName: string, delay: number): void {
  const messageDiv = document.createElement("div")
  messageDiv.style.cssText = `
    position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
    background: #333; color: white; padding: 15px 20px; border-radius: 8px;
    z-index: 10000; font-size: 14px; max-width: 300px; text-align: center;
  `
  messageDiv.textContent = `Redirigiendo a ${browserName}…`
  document.body.appendChild(messageDiv)
  setTimeout(() => messageDiv.remove(), delay)
}

function performRedirect(phoneType: "android" | "ios", config: typeof DEFAULT_CONFIG): void {
  const currentUrl = new URL(window.location.href)
  currentUrl.searchParams.set("redirected", "true")
  const baseDomain = getBaseDomain()
  const targetUrl = baseDomain + currentUrl.pathname + currentUrl.search
  const hostPath = baseDomain.replace(/^https?:\/\//, "")

  let redirectUrl: string | undefined
  if (phoneType === "android") {
    redirectUrl = config.useDefaultAndroidBrowser
      ? `intent://${hostPath}${currentUrl.pathname}${currentUrl.search}#Intent;scheme=https;end`
      : `intent://${hostPath}${currentUrl.pathname}${currentUrl.search}#Intent;scheme=https;package=${config.androidPackage};end`
  } else {
    redirectUrl = `x-safari-${targetUrl}`
  }

  if (redirectUrl) {
    window.location.href = redirectUrl
    setTimeout(() => {
      if (!document.hidden) window.location.href = targetUrl
    }, config.redirectDelay + 1000)
  }
}

/** Redirige usuarios desde WebViews (Instagram, WhatsApp, etc.) al navegador del sistema. */
export function useInAppBrowserRedirect(config: Partial<typeof DEFAULT_CONFIG> = {}) {
  const [isRedirecting, setIsRedirecting] = useState(false)
  const finalConfig = { ...DEFAULT_CONFIG, ...config }

  useEffect(() => {
    if (hasRedirected()) {
      removeRedirectParam()
      return
    }
    if (!detectInAppBrowser()) return
    const phoneType = detectPhoneType()
    if (!phoneType || hasRedirected()) return

    setIsRedirecting(true)
    const browserName = phoneType === "android" ? "Chrome" : "Safari"
    showRedirectMessage(browserName, finalConfig.redirectDelay)
    const timer = setTimeout(() => {
      performRedirect(phoneType, finalConfig)
      setIsRedirecting(false)
    }, finalConfig.redirectDelay)
    return () => clearTimeout(timer)
  }, [finalConfig.androidPackage, finalConfig.redirectDelay, finalConfig.useDefaultAndroidBrowser])

  return { isRedirecting }
}
