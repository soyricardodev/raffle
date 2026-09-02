const STORAGE_KEY = "raffle.pwa.v1"

export type PwaStorageState = {
  v: 1
  installDismissedAt: number | null
  notifyDismissedAt: number | null
  subscribedEndpoint: string | null
}

const EMPTY: PwaStorageState = {
  v: 1,
  installDismissedAt: null,
  notifyDismissedAt: null,
  subscribedEndpoint: null,
}

export function parsePwaStorage(raw: string | null): PwaStorageState {
  if (!raw) return { ...EMPTY }
  try {
    const parsed = JSON.parse(raw) as Partial<PwaStorageState>
    if (parsed.v !== 1) return { ...EMPTY }
    return {
      v: 1,
      installDismissedAt:
        typeof parsed.installDismissedAt === "number" ? parsed.installDismissedAt : null,
      notifyDismissedAt:
        typeof parsed.notifyDismissedAt === "number" ? parsed.notifyDismissedAt : null,
      subscribedEndpoint:
        typeof parsed.subscribedEndpoint === "string" ? parsed.subscribedEndpoint : null,
    }
  } catch {
    return { ...EMPTY }
  }
}

export function readPwaStorage(): PwaStorageState {
  if (typeof window === "undefined") return { ...EMPTY }
  return parsePwaStorage(window.localStorage.getItem(STORAGE_KEY))
}

export function writePwaStorage(patch: Partial<Omit<PwaStorageState, "v">>): PwaStorageState {
  const next: PwaStorageState = { ...readPwaStorage(), ...patch, v: 1 }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}

export function wasDismissedRecently(
  at: number | null,
  coolDownMs: number,
  now = Date.now(),
): boolean {
  if (at == null) return false
  return now - at < coolDownMs
}

export const INSTALL_COOLDOWN_MS = 2 * 24 * 60 * 60 * 1000
export const NOTIFY_COOLDOWN_MS = 12 * 60 * 60 * 1000
