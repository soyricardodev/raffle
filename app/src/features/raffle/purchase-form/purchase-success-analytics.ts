import type {
  PurchaseSuccessAnalyticsEvent,
  PurchaseSuccessAnalyticsInput,
} from "@raffle/shared/validators/purchase-success-analytics"

const SESSION_KEY = "raffle_purchase_success_analytics_session_id"
const ANALYTICS_URL = "/api/purchase-success/analytics"

function getOrCreateSessionId(): string {
  if (typeof sessionStorage === "undefined") return ""
  let id = sessionStorage.getItem(SESSION_KEY)
  if (!id) {
    id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `s-${Date.now()}`
    sessionStorage.setItem(SESSION_KEY, id)
  }
  return id
}

export function trackPurchaseSuccessEvent<E extends PurchaseSuccessAnalyticsEvent>(
  event: E,
  properties: Extract<PurchaseSuccessAnalyticsInput, { event: E }>["properties"],
) {
  if (typeof window === "undefined") return

  const payload = JSON.stringify({
    event,
    properties,
    sessionId: getOrCreateSessionId(),
  })

  const blob = new Blob([payload], { type: "application/json" })

  if (navigator.sendBeacon?.(ANALYTICS_URL, blob)) {
    return
  }

  void fetch(ANALYTICS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => {
    /* analytics must not break UX */
  })
}
