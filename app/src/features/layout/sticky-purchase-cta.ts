/** Footer legal block observed to auto-hide the sticky purchase bar. */
export const PUBLIC_FOOTER_LEGAL_ID = "public-footer-legal"

export const STICKY_PURCHASE_CTA_ATTR = "data-sticky-purchase-cta"

const HEIGHT_VAR = "--sticky-purchase-cta-height"

/** Syncs document state used by global CSS (footer clearance, WhatsApp offset). */
export function setStickyPurchaseCtaActive(active: boolean, heightPx = 0): void {
  if (typeof document === "undefined") return
  const html = document.documentElement
  if (active && heightPx > 0) {
    html.setAttribute(STICKY_PURCHASE_CTA_ATTR, "1")
    html.style.setProperty(HEIGHT_VAR, `${Math.ceil(heightPx)}px`)
  } else {
    html.removeAttribute(STICKY_PURCHASE_CTA_ATTR)
    html.style.setProperty(HEIGHT_VAR, "0px")
  }
}
