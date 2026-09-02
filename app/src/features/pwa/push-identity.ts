export type PushIdentityHint = {
  customerName?: string
  customerPhone?: string
}

const STORAGE_KEY = "raffle.push-identity.v1"

export function pickPushIdentityHint(
  ...sources: Array<{ customerName?: string; customerPhone?: string } | null | undefined>
): PushIdentityHint | undefined {
  for (const source of sources) {
    const customerName = source?.customerName?.trim()
    const customerPhone = source?.customerPhone?.trim()
    if (!customerName && !customerPhone) continue
    return {
      ...(customerName ? { customerName } : {}),
      ...(customerPhone ? { customerPhone } : {}),
    }
  }
  return undefined
}

export function parsePushIdentityHint(raw: string | null): PushIdentityHint | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as {
      v?: number
      customerName?: unknown
      customerPhone?: unknown
    }
    if (parsed.v !== 1) return null
    return (
      pickPushIdentityHint({
        customerName: typeof parsed.customerName === "string" ? parsed.customerName : undefined,
        customerPhone: typeof parsed.customerPhone === "string" ? parsed.customerPhone : undefined,
      }) ?? null
    )
  } catch {
    return null
  }
}

export function loadPushIdentityHint(): PushIdentityHint | null {
  if (typeof window === "undefined") return null
  return parsePushIdentityHint(window.localStorage.getItem(STORAGE_KEY))
}

export function savePushIdentityHint(hint: { customerName: string; customerPhone: string }): void {
  if (typeof window === "undefined") return
  const next = pickPushIdentityHint(hint)
  if (!next) return
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      v: 1,
      customerName: next.customerName ?? "",
      customerPhone: next.customerPhone ?? "",
    }),
  )
}
