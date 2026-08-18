import { describe, expect, it } from "vitest"
import { parsePurchaseLocationFormState } from "./parse-purchase-location"

describe("parsePurchaseLocationFormState", () => {
  it("reads the three-part Venezuela format", () => {
    expect(parsePurchaseLocationFormState("Venezuela, Carabobo, Valencia")).toEqual({
      locationType: "venezuela",
      selectedState: "Carabobo",
      selectedMunicipality: "Valencia",
      customLocation: "",
    })
  })

  it("keeps legacy two-part Venezuela rows without inventing a municipality", () => {
    expect(parsePurchaseLocationFormState("Venezuela, Carabobo")).toEqual({
      locationType: "venezuela",
      selectedState: "Carabobo",
      selectedMunicipality: "",
      customLocation: "",
    })
  })

  it("treats international text as other", () => {
    expect(parsePurchaseLocationFormState("Colombia, Bogotá")).toEqual({
      locationType: "other",
      selectedState: "",
      selectedMunicipality: "",
      customLocation: "Colombia, Bogotá",
    })
  })
})
