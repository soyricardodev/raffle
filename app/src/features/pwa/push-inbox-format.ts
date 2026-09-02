export type PushInboxItem = {
  id: number
  kind: string
  title: string
  body: string
  url: string
  tag: string
  createdAt: string
  read: boolean
}

export type PushInbox = {
  items: PushInboxItem[]
  unreadCount: number
}

export function formatInboxTime(iso: string, now = Date.now()): string {
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return ""
  const diff = Math.max(0, now - then)
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return "Ahora"
  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.floor(hours / 24)
  if (days === 1) return "Ayer"
  if (days < 7) return `hace ${days} días`
  return new Date(iso).toLocaleDateString("es-VE", { day: "numeric", month: "short" })
}

export function formatUnreadBadge(count: number): string | null {
  if (count <= 0) return null
  if (count > 9) return "9+"
  return String(count)
}

export function previewAvisosEnabled(search: unknown): boolean {
  if (!import.meta.env.DEV) return false
  if (typeof search === "string") {
    return /(?:^|[?&])previewAvisos=(1|true)(?:&|$)/i.test(search)
  }
  if (search == null || typeof search !== "object") return false
  const value = (search as { previewAvisos?: unknown }).previewAvisos
  if (value === true || value === 1) return true
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase()
    return normalized === "1" || normalized === "true"
  }
  return false
}

export function buildPreviewInbox(now = Date.now()): PushInbox {
  const item = (
    offsetMs: number,
    patch: Omit<PushInboxItem, "createdAt" | "url" | "tag"> & { url?: string; tag?: string },
  ): PushInboxItem => ({
    url: "/",
    tag: patch.kind,
    createdAt: new Date(now - offsetMs).toISOString(),
    ...patch,
  })

  const items: PushInboxItem[] = [
    item(18 * 60_000, {
      id: -1,
      kind: "manual",
      title: "El sorteo es mañana.",
      body: "Ten tus boletos a la mano y comparte con alguien que aún no se animó.",
      read: false,
    }),
    item(2 * 60 * 60_000, {
      id: -2,
      kind: "milestone",
      title: "Último 50% disponible.",
      body: "La rifa se está yendo. Si ibas a entrar, es ahora.",
      read: false,
    }),
    item(26 * 60 * 60_000, {
      id: -3,
      kind: "promotion",
      title: "Hay una promo.",
      body: "Lleva más boletos por el mismo precio. Vale la pena.",
      read: false,
    }),
    item(3 * 24 * 60 * 60_000, {
      id: -4,
      kind: "milestone",
      title: "Nueva bendición liberada.",
      body: "Ya puedes apartar tus números.",
      read: true,
    }),
  ]

  return {
    items,
    unreadCount: items.filter((row) => !row.read).length,
  }
}
