import { useCallback, useEffect, useRef, useState } from "react"
import {
  enablePushNotifications,
  fetchPushConfig,
  registerPushServiceWorker,
  syncPushSubscription,
} from "@/features/pwa/push-client"
import {
  type BeforeInstallPromptEvent,
  detectPwaPlatform,
  iosNeedsInstallForPush,
  isStandaloneDisplay,
  notificationPermission,
} from "@/features/pwa/pwa-capability"
import {
  PWA_INSTALL_AFTER_NOTIFY_LINE,
  PWA_INSTALL_CTA,
  PWA_INSTALL_IOS_LINE,
  PWA_INSTALL_LINE,
  PWA_INSTALL_TITLE,
  PWA_NOTIFY_BLOCKED_DONE,
  PWA_NOTIFY_CTA,
  PWA_NOTIFY_LINE,
  PWA_NOTIFY_TITLE,
} from "@/features/pwa/pwa-copy"
import {
  INSTALL_COOLDOWN_MS,
  NOTIFY_COOLDOWN_MS,
  readPwaStorage,
  wasDismissedRecently,
  writePwaStorage,
} from "@/features/pwa/pwa-storage"

const SHEET_DELAY_MS = 2800
const STANDALONE_SHEET_DELAY_MS = 600

export type PwaEngageCopy = {
  title: string
  description: string
  primaryLabel: string
  primaryKind: "notify" | "install"
}

export type PwaSheetKind = "notify" | "install"

export function usePwaEngage() {
  const [ready, setReady] = useState(false)
  const [platform, setPlatform] = useState<"ios" | "android" | "desktop">("desktop")
  const [standalone, setStandalone] = useState(false)
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [vapidPublicKey, setVapidPublicKey] = useState<string | null>(null)
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default")
  const [subscribed, setSubscribed] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetIntent, setSheetIntent] = useState<"notify" | "install" | null>(null)
  const [iosGuideOpen, setIosGuideOpen] = useState(false)
  const [bannerVisible, setBannerVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [installAfterNotify, setInstallAfterNotify] = useState(false)
  const sheetTimer = useRef<number | null>(null)
  const snoozedRef = useRef(false)
  const holdUiRef = useRef(false)

  const needsIosInstall = iosNeedsInstallForPush(platform, standalone)
  const canNotifyHere = pushEnabled && permission !== "unsupported" && !needsIosInstall
  const notifyBlocked = permission === "denied"
  const notifyComplete = permission === "granted" && subscribed
  const installAvailable = Boolean(installEvent) && !standalone
  const canOfferInstall = !standalone && (needsIosInstall || installAvailable)

  const sheetKind: "notify" | "install" =
    sheetIntent === "install" && !canOfferInstall
      ? "notify"
      : (sheetIntent ??
        (canOfferInstall && (needsIosInstall || notifyComplete)
          ? "install"
          : canNotifyHere && !notifyComplete
            ? "notify"
            : canOfferInstall
              ? "install"
              : "notify"))

  const copy: PwaEngageCopy =
    sheetKind === "install"
      ? {
          title: PWA_INSTALL_TITLE,
          description: installAfterNotify
            ? PWA_INSTALL_AFTER_NOTIFY_LINE
            : needsIosInstall
              ? PWA_INSTALL_IOS_LINE
              : PWA_INSTALL_LINE,
          primaryLabel: PWA_INSTALL_CTA,
          primaryKind: "install",
        }
      : notifyComplete && standalone
        ? {
            title: "Listo",
            description: "Ya te llegan las notificaciones.",
            primaryLabel: "Entendido",
            primaryKind: "notify",
          }
        : notifyBlocked
          ? {
              title: PWA_NOTIFY_TITLE,
              description:
                platform === "ios"
                  ? "En Ajustes busca Yoiber Rifas y enciende Notificaciones."
                  : "Toca el candado junto a la dirección, luego Notificaciones y Permitir.",
              primaryLabel: PWA_NOTIFY_BLOCKED_DONE,
              primaryKind: "notify",
            }
          : {
              title: PWA_NOTIFY_TITLE,
              description: PWA_NOTIFY_LINE,
              primaryLabel: PWA_NOTIFY_CTA,
              primaryKind: "notify",
            }

  const applySyncedPush = useCallback(
    (synced: { permission: NotificationPermission | "unsupported"; subscribed: boolean; resetNotifySnooze?: boolean }) => {
      setPermission(synced.permission)
      setSubscribed(synced.subscribed)
      setStandalone(isStandaloneDisplay())
      if (synced.resetNotifySnooze) snoozedRef.current = false
    },
    [],
  )

  const refreshPermission = useCallback(() => {
    setPermission(notificationPermission())
    setStandalone(isStandaloneDisplay())
    const stored = readPwaStorage()
    setSubscribed(Boolean(stored.subscribedEndpoint) && notificationPermission() === "granted")
  }, [])

  useEffect(() => {
    setPlatform(detectPwaPlatform(navigator.userAgent, navigator.maxTouchPoints))
    refreshPermission()

    const deferred = window.__deferredPwaInstall
    if (deferred) setInstallEvent(deferred)

    const onInstallable = () => {
      if (window.__deferredPwaInstall) setInstallEvent(window.__deferredPwaInstall)
    }
    const onInstalled = () => {
      setInstallEvent(null)
      window.__deferredPwaInstall = null
      refreshPermission()
    }
    window.addEventListener("pwa:installable", onInstallable)
    window.addEventListener("pwa:installed", onInstalled)
    const onOpenSheet = () => {
      setBannerVisible(false)
      setSheetIntent(null)
      setSheetOpen(true)
    }
    const onOpenIosGuide = () => {
      setSheetOpen(true)
      setIosGuideOpen(true)
    }
    window.addEventListener("pwa:open-sheet", onOpenSheet)
    window.addEventListener("pwa:open-ios-guide", onOpenIosGuide)

    void (async () => {
      const config = await fetchPushConfig().catch(() => ({ enabled: false, vapidPublicKey: null }))
      setPushEnabled(config.enabled)
      setVapidPublicKey(config.vapidPublicKey)
      if ("serviceWorker" in navigator) {
        await registerPushServiceWorker().catch(() => null)
      }
      const synced = await syncPushSubscription().catch(() => null)
      if (synced) applySyncedPush(synced)
      else refreshPermission()
      setReady(true)
    })()

    return () => {
      window.removeEventListener("pwa:installable", onInstallable)
      window.removeEventListener("pwa:installed", onInstalled)
      window.removeEventListener("pwa:open-sheet", onOpenSheet)
      window.removeEventListener("pwa:open-ios-guide", onOpenIosGuide)
    }
  }, [applySyncedPush, refreshPermission])

  useEffect(() => {
    if (!ready) return

    const resync = () => {
      void syncPushSubscription()
        .then(applySyncedPush)
        .catch(() => refreshPermission())
    }

    const onVisible = () => {
      if (document.visibilityState === "visible") resync()
    }
    document.addEventListener("visibilitychange", onVisible)

    let permissionStatus: PermissionStatus | null = null
    if (navigator.permissions?.query) {
      void navigator.permissions
        .query({ name: "notifications" })
        .then((status) => {
          permissionStatus = status
          status.addEventListener("change", resync)
        })
        .catch(() => {})
    }

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "pwa:push-changed") resync()
    }
    navigator.serviceWorker?.addEventListener("message", onMessage)

    return () => {
      document.removeEventListener("visibilitychange", onVisible)
      permissionStatus?.removeEventListener("change", resync)
      navigator.serviceWorker?.removeEventListener("message", onMessage)
    }
  }, [applySyncedPush, ready, refreshPermission])

  useEffect(() => {
    if (!ready) return

    const stored = readPwaStorage()
    const shouldPushHard = standalone && canNotifyHere && !notifyComplete
    const installSnoozed = wasDismissedRecently(stored.installDismissedAt, INSTALL_COOLDOWN_MS)
    const notifySnoozed = wasDismissedRecently(stored.notifyDismissedAt, NOTIFY_COOLDOWN_MS)

    const isAutomation = navigator.webdriver === true
    const wantsSheet =
      !holdUiRef.current &&
      !snoozedRef.current &&
      !isAutomation &&
      (shouldPushHard ||
        (!notifyComplete &&
          (canNotifyHere || canOfferInstall) &&
          !notifySnoozed &&
          !(canOfferInstall && installSnoozed)))

    const wantsBanner =
      !holdUiRef.current && ((!notifyComplete && canNotifyHere) || canOfferInstall)

    if (sheetTimer.current) window.clearTimeout(sheetTimer.current)
    if (wantsSheet) {
      const delay = shouldPushHard ? STANDALONE_SHEET_DELAY_MS : SHEET_DELAY_MS
      sheetTimer.current = window.setTimeout(() => {
        if (snoozedRef.current || document.querySelector('[data-slot="sheet-content"]')) {
          setBannerVisible(true)
          return
        }
        setSheetOpen(true)
      }, delay)
    } else {
      setBannerVisible(wantsBanner)
    }

    return () => {
      if (sheetTimer.current) window.clearTimeout(sheetTimer.current)
    }
  }, [ready, standalone, canNotifyHere, notifyComplete, canOfferInstall])

  const closeSheet = useCallback(
    (snooze: boolean) => {
      if (snooze) snoozedRef.current = true
      setSheetOpen(false)
      setSheetIntent(null)
      setInstallAfterNotify(false)
      setIosGuideOpen(false)
      if (snooze) {
        writePwaStorage(
          needsIosInstall || canOfferInstall
            ? { installDismissedAt: Date.now() }
            : { notifyDismissedAt: Date.now() },
        )
      }
      setBannerVisible(
        !holdUiRef.current && ((!notifyComplete && canNotifyHere) || canOfferInstall),
      )
    },
    [canNotifyHere, canOfferInstall, needsIosInstall, notifyComplete],
  )

  const holdEngageUi = useCallback(() => {
    holdUiRef.current = true
    if (sheetTimer.current) window.clearTimeout(sheetTimer.current)
    setSheetOpen(false)
    setSheetIntent(null)
    setInstallAfterNotify(false)
    setIosGuideOpen(false)
    setBannerVisible(false)
  }, [])

  const releaseEngageUi = useCallback(() => {
    holdUiRef.current = false
    setBannerVisible((!notifyComplete && canNotifyHere) || canOfferInstall)
  }, [canNotifyHere, canOfferInstall, notifyComplete])

  const enableNotifications = useCallback(async () => {
    if (!vapidPublicKey) {
      setError("Las notificaciones no están configuradas todavía.")
      return false
    }
    setBusy(true)
    setError(null)
    try {
      if (notificationPermission() === "denied") {
        const synced = await syncPushSubscription()
        applySyncedPush(synced)
        if (synced.subscribed) {
          setError(null)
          setSheetOpen(false)
          setBannerVisible(false)
          return true
        }
        setError(
          platform === "ios"
            ? "Siguen apagados. En Ajustes, Yoiber Rifas, enciende Notificaciones."
            : "Siguen bloqueados. Toca el candado y permite notificaciones.",
        )
        return false
      }
      const sub = await enablePushNotifications(vapidPublicKey)
      writePwaStorage({ subscribedEndpoint: sub.endpoint, notifyDismissedAt: null })
      refreshPermission()
      setSubscribed(true)
      const stillInBrowser = !isStandaloneDisplay()
      const offerInstall =
        stillInBrowser &&
        (platform === "ios" || Boolean(installEvent ?? window.__deferredPwaInstall))
      if (offerInstall && !holdUiRef.current) {
        setInstallAfterNotify(true)
        setSheetIntent("install")
        setSheetOpen(true)
        setBannerVisible(false)
      } else {
        setInstallAfterNotify(false)
        setSheetIntent(null)
        setSheetOpen(false)
        setBannerVisible(false)
      }
      return true
    } catch (err) {
      refreshPermission()
      if (err instanceof Error && err.message === "permission-denied") {
        setError(
          platform === "ios"
            ? "Siguen apagados. En Ajustes, Yoiber Rifas, enciende Notificaciones."
            : "Siguen bloqueados. Toca el candado y permite notificaciones.",
        )
      } else {
        setError("No se pudieron activar las notificaciones. Intenta de nuevo.")
      }
      return false
    } finally {
      setBusy(false)
    }
  }, [applySyncedPush, installEvent, platform, refreshPermission, vapidPublicKey])

  const promptInstall = useCallback(async () => {
    if (platform === "ios") {
      setIosGuideOpen(true)
      return
    }
    const event = installEvent ?? window.__deferredPwaInstall ?? null
    if (!event) return

    setBusy(true)
    setError(null)
    try {
      await event.prompt()
      const choice = await event.userChoice
      if (choice.outcome === "accepted") {
        setInstallEvent(null)
        window.__deferredPwaInstall = null
        setInstallAfterNotify(false)
        setSheetOpen(false)
        setSheetIntent(null)
        setBannerVisible(false)
      } else {
        writePwaStorage({ installDismissedAt: Date.now() })
      }
    } finally {
      setBusy(false)
    }
  }, [installEvent, platform])

  const openSheet = useCallback(
    (kind?: "notify" | "install") => {
      snoozedRef.current = false
      setError(null)
      if (kind === "install" && !canOfferInstall) {
        if (canNotifyHere && !notifyComplete) {
          setSheetIntent("notify")
          setBannerVisible(false)
          setSheetOpen(true)
        }
        return
      }
      setSheetIntent(kind ?? null)
      setBannerVisible(false)
      setSheetOpen(true)
    },
    [canNotifyHere, canOfferInstall, notifyComplete],
  )

  const runPrimary = useCallback(async () => {
    if (copy.primaryKind === "install") {
      await promptInstall()
      return
    }
    if (notifyComplete) {
      closeSheet(false)
      return
    }
    await enableNotifications()
  }, [closeSheet, copy.primaryKind, enableNotifications, notifyComplete, promptInstall])

  return {
    ready,
    platform,
    standalone,
    installAvailable,
    canOfferInstall,
    needsIosInstall,
    canNotifyHere,
    notifyComplete,
    notifyBlocked,
    pushEnabled,
    permission,
    sheetOpen,
    iosGuideOpen,
    bannerVisible,
    busy,
    error,
    copy,
    sheetKind,
    installAfterNotify,
    setIosGuideOpen,
    runPrimary,
    promptInstall,
    enableNotifications,
    closeSheet,
    openSheet,
    holdEngageUi,
    releaseEngageUi,
  }
}
