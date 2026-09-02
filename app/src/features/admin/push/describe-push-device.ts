export function describePushDevice(userAgent: string | null | undefined): string {
  const ua = userAgent?.trim() ?? ""
  if (!ua) return "Teléfono"

  const isIos = /iPhone|iPad|iPod/i.test(ua)
  const isAndroid = /Android/i.test(ua)
  const isChrome = /Chrome|CriOS|EdgA/i.test(ua) && !/OPR|Opera/i.test(ua)
  const isSafari = /Safari/i.test(ua) && !/Chrome|CriOS|Chromium|Edg/i.test(ua)
  const isSamsung = /SamsungBrowser/i.test(ua)
  const isFirefox = /Firefox|FxiOS/i.test(ua)

  let device = "Navegador"
  if (isIos) device = /iPad/i.test(ua) ? "iPad" : "iPhone"
  else if (isAndroid) device = "Android"
  else if (/Windows/i.test(ua)) device = "Windows"
  else if (/Macintosh|Mac OS/i.test(ua)) device = "Mac"

  let browser = ""
  if (isSamsung) browser = "Samsung"
  else if (isFirefox) browser = "Firefox"
  else if (isChrome) browser = "Chrome"
  else if (isSafari) browser = "Safari"

  return browser ? `${device} · ${browser}` : device
}
