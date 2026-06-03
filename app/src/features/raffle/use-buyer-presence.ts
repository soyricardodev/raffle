import { useCallback, useEffect, useMemo } from "react"
import { sendBuyerPresenceHeartbeat } from "@/features/raffle/buyer-presence-queries"

const CLIENT_ID_STORAGE_KEY = "raffle-buyer-client-id"
const HEARTBEAT_INTERVAL_MS = 12_000

function getOrCreateClientId(): string {
  if (typeof window === "undefined") return ""
  try {
    let id = localStorage.getItem(CLIENT_ID_STORAGE_KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(CLIENT_ID_STORAGE_KEY, id)
    }
    return id
  } catch {
    return crypto.randomUUID()
  }
}

type UseBuyerPresenceOptions = {
  raffleId: string | number
  enabled?: boolean
}

/** Registers anonymous presence while the user is on the purchase flow (visible tab). */
export function useBuyerPresence({ raffleId, enabled = true }: UseBuyerPresenceOptions) {
  const clientId = useMemo(() => getOrCreateClientId(), [])
  const raffleIdStr = String(raffleId)

  const sendHeartbeat = useCallback(() => {
    if (!clientId) return
    void sendBuyerPresenceHeartbeat({
      data: { raffleId: raffleIdStr, clientId },
    }).catch(() => {
      /* presence is best-effort */
    })
  }, [clientId, raffleIdStr])

  useEffect(() => {
    if (!enabled || !clientId) return

    const tick = () => {
      if (typeof document !== "undefined" && document.hidden) return
      sendHeartbeat()
    }

    tick()
    const interval = window.setInterval(tick, HEARTBEAT_INTERVAL_MS)
    document.addEventListener("visibilitychange", tick)

    return () => {
      window.clearInterval(interval)
      document.removeEventListener("visibilitychange", tick)
    }
  }, [enabled, clientId, sendHeartbeat])
}
