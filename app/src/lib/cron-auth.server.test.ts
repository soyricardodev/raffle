import { describe, expect, it, vi } from "vitest"

const SECRET = "un-secreto-de-cron-largo"

const { envState } = vi.hoisted(() => ({
  envState: {
    cronSecret: "un-secreto-de-cron-largo" as string | undefined,
    inngestKey: undefined as string | undefined,
  },
}))

vi.mock("@/lib/env", () => ({
  getEnv: () => ({ CRON_SECRET: envState.cronSecret, INNGEST_EVENT_KEY: envState.inngestKey }),
}))

import { isAuthorizedCronRequest } from "./cron-auth.server"

function requestWith(headers: Record<string, string>): Request {
  return new Request("https://example.com/api/cron/test", { method: "POST", headers })
}

describe("isAuthorizedCronRequest", () => {
  it("accepts the explicit x-cron-secret header", () => {
    expect(isAuthorizedCronRequest(requestWith({ "x-cron-secret": SECRET }))).toBe(true)
  })

  it("accepts the bearer header documented in deploy/crontab.example", () => {
    expect(isAuthorizedCronRequest(requestWith({ authorization: `Bearer ${SECRET}` }))).toBe(true)
  })

  it("rejects a wrong, missing or malformed secret", () => {
    expect(isAuthorizedCronRequest(requestWith({ "x-cron-secret": "casi-correcto" }))).toBe(false)
    expect(isAuthorizedCronRequest(requestWith({ authorization: "Basic abc" }))).toBe(false)
    expect(isAuthorizedCronRequest(requestWith({}))).toBe(false)
  })

  it("rejects every call when no secret is configured", () => {
    envState.cronSecret = undefined
    expect(isAuthorizedCronRequest(requestWith({ "x-cron-secret": "cualquiera" }))).toBe(false)
    envState.cronSecret = SECRET
  })
})
