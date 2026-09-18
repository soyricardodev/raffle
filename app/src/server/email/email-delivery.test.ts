import { beforeEach, describe, expect, it, vi } from "vitest"

const { sendEmail, insertEmailLog, evaluate } = vi.hoisted(() => ({
  sendEmail: vi.fn(),
  insertEmailLog: vi.fn().mockResolvedValue(42),
  evaluate: vi.fn(),
}))

vi.mock("./email.service", () => ({ sendEmail }))
vi.mock("./recipient-safety", () => ({
  getRecipientSafetyService: () => ({ evaluate }),
}))
vi.mock("../repositories/email-logs.repository", () => ({ insertEmailLog }))

import { deliverAndLogEmail } from "./email-delivery"

describe("deliverAndLogEmail recipient safety", () => {
  beforeEach(() => {
    sendEmail.mockReset()
    insertEmailLog.mockClear()
    evaluate.mockReset()
  })

  it("does not call the email provider when the recipient is blocked", async () => {
    evaluate.mockResolvedValue({
      allowed: false,
      email: "missing@example.com",
      state: "undeliverable",
      reason: "rejected_email",
      source: "provider",
    })

    const result = await deliverAndLogEmail({
      to: "missing@example.com",
      built: {
        type: "purchase_confirmation",
        subject: "Purchase confirmed",
        html: "<p>Confirmed</p>",
      },
      purchaseId: 10,
    })

    expect(sendEmail).not.toHaveBeenCalled()
    expect(insertEmailLog).toHaveBeenCalledWith(
      expect.objectContaining({ status: "blocked", recipientEmail: "missing@example.com" }),
    )
    expect(result).toMatchObject({ success: false, blocked: true, logId: 42 })
  })

  it("sends to the normalized address after a safe decision", async () => {
    evaluate.mockResolvedValue({
      allowed: true,
      email: "buyer@gmail.com",
      state: "deliverable",
      reason: "accepted_email",
      source: "provider",
    })
    sendEmail.mockResolvedValue({ success: true, providerMessageId: "message-1" })

    const result = await deliverAndLogEmail({
      to: "buyer@gmail.con",
      built: {
        type: "purchase_confirmation",
        subject: "Purchase confirmed",
        html: "<p>Confirmed</p>",
      },
    })

    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "buyer@gmail.com" }))
    expect(result.success).toBe(true)
  })
})
