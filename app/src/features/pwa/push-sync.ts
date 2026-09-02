export type PushSyncPlan = {
  subscribed: boolean
  persistLive: boolean
  removeEndpoint: string | null
  resetNotifySnooze: boolean
}

export function planPushSync(input: {
  permission: NotificationPermission | "unsupported"
  liveEndpoint: string | null
  storedEndpoint: string | null
}): PushSyncPlan {
  const { permission, liveEndpoint, storedEndpoint } = input

  if (permission === "granted" && liveEndpoint) {
    return {
      subscribed: true,
      persistLive: true,
      removeEndpoint:
        storedEndpoint && storedEndpoint !== liveEndpoint ? storedEndpoint : null,
      resetNotifySnooze: false,
    }
  }

  return {
    subscribed: false,
    persistLive: false,
    removeEndpoint: storedEndpoint ?? liveEndpoint,
    resetNotifySnooze: Boolean(storedEndpoint),
  }
}
