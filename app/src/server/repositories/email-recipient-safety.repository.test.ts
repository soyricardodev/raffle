import { beforeAll, describe, expect, it } from "vitest"
import { setupIsolatedTestDatabase } from "@/test/db-setup"
import {
  getFreshVerification,
  getSuppression,
  suppressRecipient,
  upsertVerification,
} from "./email-recipient-safety.repository"

describe("email recipient safety repository", () => {
  beforeAll(async () => {
    await setupIsolatedTestDatabase()
  })

  it("stores and retrieves a permanent suppression", async () => {
    await suppressRecipient({
      email: "missing@example.com",
      source: "mailbaby",
      reason: "mailbox_not_found",
      providerMessageId: "message-1",
    })

    await expect(getSuppression("missing@example.com")).resolves.toMatchObject({
      source: "mailbaby",
      reason: "mailbox_not_found",
      providerMessageId: "message-1",
    })
  })

  it("returns only unexpired verification results", async () => {
    const checkedAt = new Date("2026-09-18T12:00:00.000Z")
    const expiresAt = new Date("2026-09-19T12:00:00.000Z")
    await upsertVerification({
      email: "valid@example.com",
      provider: "direct-smtp",
      state: "deliverable",
      reason: "accepted_email",
      score: 100,
      checkedAt,
      expiresAt,
    })

    await expect(
      getFreshVerification("valid@example.com", new Date("2026-09-18T13:00:00.000Z")),
    ).resolves.toMatchObject({ state: "deliverable", checkedAt, expiresAt })
    await expect(
      getFreshVerification("valid@example.com", new Date("2026-09-20T00:00:00.000Z")),
    ).resolves.toBeNull()
  })
})
