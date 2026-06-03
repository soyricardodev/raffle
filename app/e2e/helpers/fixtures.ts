import { test as base } from "@playwright/test"
import { hasDatabase } from "./env"

export const test = base

export function describeWithDb(title: string, callback: () => void): void {
  const describeFn = hasDatabase() ? test.describe : test.describe.skip
  describeFn(title, () => {
    test.beforeAll(() => {
      if (!hasDatabase()) {
        test.skip(true, "DATABASE_URL is not set — integration tests skipped")
      }
    })
    callback()
  })
}
