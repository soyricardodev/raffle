import { describe, expect, it } from "vitest"
import { VENEZUELA_STATES } from "../validators/index.js"
import {
  VENEZUELA_MUNICIPALITIES,
  VENEZUELA_MUNICIPALITY_COUNTS,
  VENEZUELA_MUNICIPALITY_TOTAL,
  isValidVenezuelaMunicipality,
  municipalitiesForState,
  municipalityPickerLabel,
  normalizeMunicipality,
  singleMunicipalityName,
} from "./venezuela-municipalities.js"

describe("venezuela municipalities dataset", () => {
  it("covers every app state exactly once", () => {
    expect(Object.keys(VENEZUELA_MUNICIPALITIES).sort()).toEqual([...VENEZUELA_STATES].sort())
  })

  it("matches the official 335 municipalities and per-state counts", () => {
    let total = 0
    for (const state of VENEZUELA_STATES) {
      const list = VENEZUELA_MUNICIPALITIES[state] ?? []
      const names = list.map((item) => item.name)
      expect(new Set(names).size, state).toBe(list.length)
      expect(list.length, state).toBe(VENEZUELA_MUNICIPALITY_COUNTS[state])
      total += list.length
    }
    expect(total).toBe(VENEZUELA_MUNICIPALITY_TOTAL)
  })

  it("normalizes seats and aliases to the official municipality name", () => {
    expect(normalizeMunicipality("Distrito Capital", "caracas")).toBe("Libertador")
    expect(normalizeMunicipality("La Guaira", "Vargas")).toBe("Vargas")
    expect(normalizeMunicipality("La Guaira", "la guaira")).toBe("Vargas")
    expect(normalizeMunicipality("Carabobo", "güigüe")).toBe("Carlos Arvelo")
    expect(normalizeMunicipality("Carabobo", "Valencia")).toBe("Valencia")
    expect(normalizeMunicipality("Miranda", "Petare")).toBe("Sucre")
    expect(normalizeMunicipality("Zulia", "unknown")).toBeNull()
  })

  it("scopes shared names like Libertador to the selected state", () => {
    expect(normalizeMunicipality("Distrito Capital", "Libertador")).toBe("Libertador")
    expect(normalizeMunicipality("Carabobo", "Libertador")).toBe("Libertador")
    expect(isValidVenezuelaMunicipality("Carabobo", "Valencia")).toBe(true)
    expect(isValidVenezuelaMunicipality("Zulia", "Valencia")).toBe(false)
  })

  it("returns sorted municipalities and auto-selects single-municipality states", () => {
    expect(municipalitiesForState("Carabobo").map((item) => item.name)).toEqual([
      "Valencia",
      "Guacara",
      "Puerto Cabello",
      "San Diego",
      "Libertador",
      "Los Guayos",
      "Naguanagua",
      "San Joaquín",
      "Diego Ibarra",
      "Bejuma",
      "Carlos Arvelo",
      "Juan José Mora",
      "Miranda",
      "Montalbán",
    ])
    expect(singleMunicipalityName("Distrito Capital")).toBe("Libertador")
    expect(singleMunicipalityName("La Guaira")).toBe("Vargas")
    expect(singleMunicipalityName("Carabobo")).toBeNull()
    expect(municipalitiesForState("Atlantis")).toEqual([])
  })

  it("shows the seat when it differs from the municipality name", () => {
    expect(municipalityPickerLabel({ name: "Girardot", seat: "Maracay" })).toBe("Girardot · Maracay")
    expect(municipalityPickerLabel({ name: "Valencia", seat: "Valencia" })).toBe("Valencia")
  })
})
