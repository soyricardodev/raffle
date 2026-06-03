import { describe, expect, it } from "vitest"
import type { SavedBuyerProfile } from "@/features/raffle/purchase-form/buyer-profile-storage"
import { hydrateVerifyFormFromProfile, toVerifyInput } from "@/features/verify/verify-profile"

const profile: SavedBuyerProfile = {
  customerName: "Ricardo Pérez",
  customerPhone: "04121231231",
  customerEmail: "r@example.com",
  ciPrefix: "V",
  ciNumber: "12345678",
  phoneMode: "venezuela",
  locationType: "venezuela",
  selectedState: "Carabobo",
  customLocation: "",
  savedAt: 1,
}

describe("toVerifyInput", () => {
  it("builds phone payload", () => {
    const form = hydrateVerifyFormFromProfile(profile, "phone")
    expect(toVerifyInput(form)).toEqual({ phone: "04121231231" })
  })

  it("builds cedula payload", () => {
    const form = hydrateVerifyFormFromProfile(profile, "cedula")
    expect(toVerifyInput(form)).toEqual({ cedula: "V12345678" })
  })

  it("does not use email text when searching by phone", () => {
    const form = { ...hydrateVerifyFormFromProfile(profile, "phone"), text: "other@mail.com" }
    expect(toVerifyInput(form)).toEqual({ phone: "04121231231" })
  })
})
