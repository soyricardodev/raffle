import { describe, expect, it } from "vitest"
import {
  aggregateLocationMetrics,
  classifyLocationForAnalytics,
  INTERNATIONAL_LABEL,
  parseCustomerLocation,
  UNKNOWN_LOCATION_LABEL,
} from "./location.js"

describe("parseCustomerLocation", () => {
  it("parses Venezuela state from canonical format", () => {
    expect(parseCustomerLocation("Venezuela, Carabobo")).toEqual({
      kind: "venezuela",
      state: "Carabobo",
      municipality: null,
      raw: "Venezuela, Carabobo",
    })
  })

  it("parses Venezuela state and municipality", () => {
    expect(parseCustomerLocation("Venezuela, Carabobo, Valencia")).toEqual({
      kind: "venezuela",
      state: "Carabobo",
      municipality: "Valencia",
      raw: "Venezuela, Carabobo, Valencia",
    })
  })

  it("normalizes legacy standalone city names", () => {
    expect(parseCustomerLocation("Caracas").state).toBe("Distrito Capital")
    expect(parseCustomerLocation("Vargas").state).toBe("La Guaira")
  })

  it("classifies international locations", () => {
    expect(parseCustomerLocation("Miami, USA")).toEqual({
      kind: "international",
      state: null,
      municipality: null,
      raw: "Miami, USA",
    })
  })
})

describe("classifyLocationForAnalytics", () => {
  it("maps unknown to Sin ubicación", () => {
    expect(classifyLocationForAnalytics(null)).toBe(UNKNOWN_LOCATION_LABEL)
  })

  it("maps international text", () => {
    expect(classifyLocationForAnalytics("Colombia, Bogotá")).toBe(INTERNATIONAL_LABEL)
  })
})

describe("aggregateLocationMetrics", () => {
  it("groups by state and mix", () => {
    const result = aggregateLocationMetrics(
      [
        { location: "Venezuela, Carabobo", count: 2, revenueCents: 2000 },
        { location: "Venezuela, carabobo", count: 1, revenueCents: 1000 },
        { location: "Venezuela, Carabobo, Valencia", count: 1, revenueCents: 500 },
        { location: "Miami, USA", count: 1, revenueCents: 500 },
      ],
      (c) => c / 100,
    )

    expect(result.byState.find((r) => r.label === "Carabobo")).toMatchObject({
      count: 4,
      revenue: 35,
    })
    expect(result.mix).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Venezuela", count: 4 }),
        expect.objectContaining({ label: INTERNATIONAL_LABEL, count: 1 }),
      ]),
    )
  })
})
