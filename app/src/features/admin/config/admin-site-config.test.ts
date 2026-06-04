import { describe, expect, it } from "vitest"
import {
  defaultAdminSiteConfigDraft,
  draftToPatch,
  validateDraft,
} from "./admin-site-config"

function draftForRejectReasonTests(
  purchase_reject_reasons: string[],
): ReturnType<typeof defaultAdminSiteConfigDraft> {
  const base = defaultAdminSiteConfigDraft()
  return {
    ...base,
    site_name: "Test",
    email_settings: { ...base.email_settings, enabled: false },
    purchase_reject_reasons,
  }
}

describe("validateDraft purchase_reject_reasons", () => {
  it("rejects duplicate reasons", () => {
    const draft = draftForRejectReasonTests(["Pago duplicado", "Pago duplicado"])
    const result = validateDraft(draft)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      const dupMessage = Object.entries(result.fieldErrors).find(([key]) =>
        key.startsWith("purchase_reject_reasons"),
      )
      expect(dupMessage?.[1]).toMatch(/duplicado/i)
    }
  })

  it("accepts unique reasons", () => {
    const draft = draftForRejectReasonTests(["Motivo uno", "Motivo dos"])
    const result = validateDraft(draft)
    expect(result.ok).toBe(true)
  })

  it("filters empty strings in patch", () => {
    const draft = {
      ...defaultAdminSiteConfigDraft(),
      purchase_reject_reasons: ["  Válido  ", "", "  Otro  "],
    }
    const patch = draftToPatch(draft)
    expect(patch.purchase_reject_reasons).toEqual(["Válido", "Otro"])
  })
})
