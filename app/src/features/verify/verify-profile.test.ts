import { describe, expect, it } from "vitest"
import type { SavedBuyerProfile } from "@/features/raffle/purchase-form/buyer-profile-storage"
import {
  hydrateVerifyFormFromProfile,
  parseVerifyRouteSearch,
  toVerifyInput,
} from "@/features/verify/verify-profile"

const profile: SavedBuyerProfile = {
  customerName: "Ricardo Pérez",
  customerPhone: "04121231231",
  customerEmail: "r@example.com",
  ciPrefix: "V",
  ciNumber: "12345678",
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

describe("parseVerifyRouteSearch", () => {
  it("prefers phone over ticket when both are present", () => {
    const parsed = parseVerifyRouteSearch({
      phone: "04120001111",
      ticket: "9999",
      auto: true,
    })
    expect(parsed?.form.method).toBe("phone")
    expect(parsed?.form.phone).toBe("04120001111")
    expect(parsed?.autoSearch).toBe(true)
  })

  it("parses cedula into prefix and number", () => {
    const parsed = parseVerifyRouteSearch({ cedula: "V-12.345.678" })
    expect(parsed?.form).toMatchObject({
      method: "cedula",
      ciPrefix: "V",
      ciNumber: "12345678",
    })
  })

  it("parses ticket number search", () => {
    const parsed = parseVerifyRouteSearch({ ticket: "0042" })
    expect(parsed?.form.method).toBe("ticket")
    expect(parsed?.form.text).toBe("0042")
  })

  it("parses email search", () => {
    const parsed = parseVerifyRouteSearch({ email: "buyer@example.com" })
    expect(parsed?.form.method).toBe("email")
    expect(toVerifyInput(parsed!.form)).toEqual({ email: "buyer@example.com" })
  })
})
