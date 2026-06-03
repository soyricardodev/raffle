import { afterEach, describe, expect, it, vi } from "vitest"
import { resetEnvCache } from "@/lib/env"
import { ResendEmailAdapter } from "./resend.adapter"

const sendMock = vi.fn().mockResolvedValue({ data: { id: "msg_test" }, error: null })

vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: sendMock },
  })),
}))

vi.mock("@/server/repositories/settings.repository", () => ({
  getAppSettings: vi.fn().mockResolvedValue({
    site_info: { site_name: "Yoiberifas" },
    email_settings: {
      enabled: true,
      from_name: "Yoiberifas",
      from_email: "hola@yoiberifas.com",
      reply_to: "soporte@yoiberifas.com",
      send_confirmation: true,
      send_status_updates: true,
      send_modifications: true,
    },
  }),
}))

describe("ResendEmailAdapter", () => {
  afterEach(async () => {
    resetEnvCache()
    sendMock.mockClear()
    delete process.env.RESEND_API_KEY
    delete process.env.EMAIL_FROM
    const { invalidateEmailSettingsCache } = await import("./email-settings.server")
    invalidateEmailSettingsCache()
  })

  it("uses configured sender from admin settings", async () => {
    process.env.RESEND_API_KEY = "re_test_key_123456789"
    resetEnvCache()

    const adapter = new ResendEmailAdapter()
    await adapter.send({
      to: "cliente@test.com",
      subject: "Prueba",
      html: "<p>Hola</p>",
      type: "purchase_confirmation",
    })

    expect(sendMock).toHaveBeenCalledWith({
      from: "Yoiberifas <hola@yoiberifas.com>",
      to: "cliente@test.com",
      subject: "Prueba",
      html: "<p>Hola</p>",
      replyTo: "soporte@yoiberifas.com",
    })
  })
})
