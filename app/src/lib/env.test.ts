import { afterEach, describe, expect, it } from "vitest"
import { getEnv, resetEnvCache } from "./env"

describe("getEnv", () => {
  afterEach(() => {
    resetEnvCache()
  })

  it("throws when DATABASE_URL is missing in production", () => {
    resetEnvCache()
    const previousUrl = process.env.DATABASE_URL
    const previousEnv = process.env.NODE_ENV
    delete process.env.DATABASE_URL
    process.env.NODE_ENV = "production"
    expect(() => getEnv()).toThrow(/DATABASE_URL/)
    process.env.DATABASE_URL = previousUrl
    process.env.NODE_ENV = previousEnv
  })

  it("defaults DATABASE_URL to local sqlite in development when unset", () => {
    resetEnvCache()
    delete process.env.DATABASE_URL
    process.env.NODE_ENV = "development"
    const parsed = getEnv()
    expect(parsed.DATABASE_URL).toMatch(/^file:/)
    expect(parsed.DATABASE_URL).toContain("raffle.db")
  })

  it("parses valid minimal env with libSQL file URL", () => {
    process.env.DATABASE_URL = "file:./packages/shared/data/raffle.db"
    process.env.NODE_ENV = "test"
    process.env.EMAIL_PROVIDER = "noop"
    const parsed = getEnv()
    expect(parsed.DATABASE_URL).toContain("file:")
    expect(parsed.EMAIL_PROVIDER).toBe("noop")
  })

  it("parses libsql remote URL", () => {
    process.env.DATABASE_URL = "libsql://my-db.turso.io"
    process.env.NODE_ENV = "test"
    const parsed = getEnv()
    expect(parsed.DATABASE_URL).toContain("libsql://")
  })

  it("maps legacy mysql DATABASE_URL to libsql file in development", () => {
    process.env.DATABASE_URL = "mysql://root:pass@localhost:3306/legacy"
    process.env.NODE_ENV = "development"
    resetEnvCache()
    const parsed = getEnv()
    expect(parsed.DATABASE_URL).toMatch(/^file:/)
    expect(parsed.DATABASE_URL).not.toContain("mysql:")
  })
})
