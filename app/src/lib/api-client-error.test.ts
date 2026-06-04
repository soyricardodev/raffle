import { describe, expect, it } from "vitest"
import { createNetworkClientError, isNetworkFailure } from "@/lib/api-client-error"

describe("ApiClientError", () => {
  it("createNetworkClientError assigns traceId and retryable", () => {
    const err = createNetworkClientError()
    expect(err.code).toBe("NETWORK_ERROR")
    expect(err.retryable).toBe(true)
    expect(err.traceId).toMatch(/^net-/)
  })
})

describe("isNetworkFailure", () => {
  it("detects failed to fetch", () => {
    expect(isNetworkFailure(new TypeError("Failed to fetch"))).toBe(true)
  })
})
