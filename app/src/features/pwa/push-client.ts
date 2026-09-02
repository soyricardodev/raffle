import {
  loadPushIdentityHint,
  type PushIdentityHint,
  pickPushIdentityHint,
  savePushIdentityHint,
} from "@/features/pwa/push-identity"
import { planPushSync } from "@/features/pwa/push-sync"
import { notificationPermission } from "@/features/pwa/pwa-capability"
import { readPwaStorage, writePwaStorage } from "@/features/pwa/pwa-storage"
import { loadSavedBuyerProfile } from "@/features/raffle/purchase-form/buyer-profile-storage"

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const raw = atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; ++i) output[i] = raw.charCodeAt(i)
  return output
}

export type PushConfig = {
  enabled: boolean
  vapidPublicKey: string | null
}

export async function fetchPushConfig(): Promise<PushConfig> {
  const res = await fetch("/api/push/config")
  if (!res.ok) return { enabled: false, vapidPublicKey: null }
  return (await res.json()) as PushConfig
}

export async function registerPushServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null
  return navigator.serviceWorker.register("/sw.js", { scope: "/" })
}

export async function subscribeToPush(
  registration: ServiceWorkerRegistration,
  vapidPublicKey: string,
): Promise<PushSubscription> {
  const existing = await registration.pushManager.getSubscription()
  if (existing) return existing
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
  })
}

export async function persistPushSubscription(
  subscription: PushSubscription,
  identity?: PushIdentityHint,
): Promise<void> {
  const json = subscription.toJSON()
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
    throw new Error("Suscripción incompleta")
  }
  const hint = pickPushIdentityHint(identity, loadPushIdentityHint(), loadSavedBuyerProfile())
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      ...(hint?.customerName ? { customerName: hint.customerName } : {}),
      ...(hint?.customerPhone ? { customerPhone: hint.customerPhone } : {}),
    }),
  })
  if (!res.ok) {
    throw new Error("No se pudo guardar la suscripción")
  }
}

export async function attachPushIdentity(identity: PushIdentityHint): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return
  const registration = await navigator.serviceWorker.ready.catch(() => null)
  const live = registration ? await registration.pushManager.getSubscription() : null
  if (!live) return
  await persistPushSubscription(live, identity)
}

export function rememberPushIdentity(identity: {
  customerName: string
  customerPhone: string
}): void {
  savePushIdentityHint(identity)
  void attachPushIdentity(identity).catch(() => {})
}

export async function deleteStoredPushEndpoint(endpoint: string): Promise<void> {
  await fetch("/api/push/subscribe", {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ endpoint }),
    keepalive: true,
  }).catch(() => {})
}

export async function syncPushSubscription(): Promise<{
  permission: NotificationPermission | "unsupported"
  subscribed: boolean
  resetNotifySnooze: boolean
}> {
  const permission = notificationPermission()
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return { permission, subscribed: false, resetNotifySnooze: false }
  }

  const stored = readPwaStorage()
  const registration = await navigator.serviceWorker.ready.catch(() => null)
  const live = registration ? await registration.pushManager.getSubscription() : null
  const plan = planPushSync({
    permission,
    liveEndpoint: live?.endpoint ?? null,
    storedEndpoint: stored.subscribedEndpoint,
  })

  if (plan.removeEndpoint) {
    await deleteStoredPushEndpoint(plan.removeEndpoint)
  }
  if (plan.persistLive && live) {
    await persistPushSubscription(live).catch(() => {})
  }

  writePwaStorage({
    subscribedEndpoint: plan.subscribed && live ? live.endpoint : null,
    ...(plan.resetNotifySnooze ? { notifyDismissedAt: null } : {}),
  })

  return {
    permission,
    subscribed: plan.subscribed,
    resetNotifySnooze: plan.resetNotifySnooze,
  }
}

export async function enablePushNotifications(vapidPublicKey: string): Promise<PushSubscription> {
  const permission = await Notification.requestPermission()
  if (permission !== "granted") {
    throw new Error("permission-denied")
  }
  const registration = await registerPushServiceWorker()
  if (!registration) throw new Error("no-service-worker")
  await navigator.serviceWorker.ready
  const subscription = await subscribeToPush(registration, vapidPublicKey)
  await persistPushSubscription(subscription)
  return subscription
}
