import { describe, expect, it } from "vitest"
import {
  customerLocationApiError,
  customerLocationFieldError,
  formatCustomerLocation,
} from "./index.js"

describe("formatCustomerLocation", () => {
  it("formats Venezuela state and municipality when required", () => {
    expect(
      formatCustomerLocation({
        locationType: "venezuela",
        selectedState: "Carabobo",
        selectedMunicipality: "Valencia",
        customLocation: "",
        requireMunicipality: true,
      }),
    ).toBe("Venezuela, Carabobo, Valencia")
  })

  it("omits municipality when the feature is off", () => {
    expect(
      formatCustomerLocation({
        locationType: "venezuela",
        selectedState: "Carabobo",
        selectedMunicipality: "Valencia",
        customLocation: "",
        requireMunicipality: false,
      }),
    ).toBe("Venezuela, Carabobo")
  })

  it("keeps the legacy two-part string when municipality is missing", () => {
    expect(
      formatCustomerLocation({
        locationType: "venezuela",
        selectedState: "Carabobo",
        selectedMunicipality: "",
        customLocation: "",
      }),
    ).toBe("Venezuela, Carabobo")
  })

  it("returns empty when Venezuela without state", () => {
    expect(
      formatCustomerLocation({
        locationType: "venezuela",
        selectedState: "",
        selectedMunicipality: "",
        customLocation: "",
      }),
    ).toBe("")
  })

  it("uses custom text for other", () => {
    expect(
      formatCustomerLocation({
        locationType: "other",
        selectedState: "",
        selectedMunicipality: "",
        customLocation: "  Miami, USA  ",
      }),
    ).toBe("Miami, USA")
  })
})

describe("customerLocationFieldError", () => {
  it("requires state for Venezuela", () => {
    expect(
      customerLocationFieldError({
        locationType: "venezuela",
        selectedState: "",
        selectedMunicipality: "",
        customLocation: "",
      }),
    ).toBe("Selecciona tu estado")
  })

  it("requires municipality for Venezuela only when enabled", () => {
    expect(
      customerLocationFieldError({
        locationType: "venezuela",
        selectedState: "Carabobo",
        selectedMunicipality: "",
        customLocation: "",
      }),
    ).toBeUndefined()
    expect(
      customerLocationFieldError({
        locationType: "venezuela",
        selectedState: "Carabobo",
        selectedMunicipality: "",
        customLocation: "",
        requireMunicipality: true,
      }),
    ).toBe("Selecciona tu municipio")
  })

  it("requires text for other country", () => {
    expect(
      customerLocationFieldError({
        locationType: "other",
        selectedState: "",
        customLocation: "  ",
      }),
    ).toBe("Indica país y ciudad")
  })
})

describe("customerLocationApiError", () => {
  it("accepts the three-part Venezuela format when required", () => {
    expect(customerLocationApiError("Venezuela, Carabobo, Valencia", true)).toBeUndefined()
    expect(customerLocationApiError("Venezuela, Distrito Capital, Caracas", true)).toBeUndefined()
  })

  it("allows state-only Venezuela strings when the feature is off", () => {
    expect(customerLocationApiError("Venezuela, Carabobo")).toBeUndefined()
    expect(customerLocationApiError("Caracas")).toBeUndefined()
  })

  it("rejects legacy Venezuela strings without municipality when required", () => {
    expect(customerLocationApiError("Venezuela, Carabobo", true)).toBe("Selecciona tu municipio")
    expect(customerLocationApiError("Caracas", true)).toBe("Selecciona tu municipio")
  })

  it("allows international free text", () => {
    expect(customerLocationApiError("Colombia, Bogotá", true)).toBeUndefined()
  })
})
