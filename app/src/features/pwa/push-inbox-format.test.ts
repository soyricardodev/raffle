import { describe, expect, it } from "vitest"
import {
  buildPreviewInbox,
  formatInboxTime,
  formatUnreadBadge,
  previewAvisosEnabled,
} from "./push-inbox-format"

describe("formatInboxTime", () => {
  const now = Date.parse("2026-09-02T13:00:00.000Z")

  it("uses short spanish labels", () => {
    expect(formatInboxTime(new Date(now - 20_000).toISOString(), now)).toBe("Ahora")
    expect(formatInboxTime(new Date(now - 3 * 60_000).toISOString(), now)).toBe("hace 3 min")
    expect(formatInboxTime(new Date(now - 5 * 60 * 60_000).toISOString(), now)).toBe("hace 5 h")
    expect(formatInboxTime(new Date(now - 26 * 60 * 60_000).toISOString(), now)).toBe("Ayer")
    expect(formatInboxTime(new Date(now - 3 * 24 * 60 * 60_000).toISOString(), now)).toBe(
      "hace 3 días",
    )
  })
})

describe("formatUnreadBadge", () => {
  it("caps at 9+", () => {
    expect(formatUnreadBadge(0)).toBeNull()
    expect(formatUnreadBadge(3)).toBe("3")
    expect(formatUnreadBadge(9)).toBe("9")
    expect(formatUnreadBadge(12)).toBe("9+")
  })
})

describe("previewAvisosEnabled", () => {
  it("only accepts 1/true in development", () => {
    expect(previewAvisosEnabled({ previewAvisos: "1" })).toBe(import.meta.env.DEV)
    expect(previewAvisosEnabled("?previewAvisos=1")).toBe(import.meta.env.DEV)
    expect(previewAvisosEnabled({ previewAvisos: "false" })).toBe(false)
    expect(previewAvisosEnabled({})).toBe(false)
  })
})

describe("buildPreviewInbox", () => {
  it("seeds unread and read sample avisos", () => {
    const inbox = buildPreviewInbox()
    expect(inbox.items).toHaveLength(4)
    expect(inbox.unreadCount).toBe(3)
    expect(inbox.items.some((item) => item.read)).toBe(true)
  })
})
