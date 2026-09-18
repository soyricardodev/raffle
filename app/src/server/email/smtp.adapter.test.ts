import { afterEach, describe, expect, it, vi } from "vitest"
import { resetEnvCache } from "@/lib/env"
import { SmtpEmailAdapter } from "./smtp.adapter"

const { closeMock, createTransportMock, sendMailMock } = vi.hoisted(() => {
  const sendMailMock = vi.fn()
  const closeMock = vi.fn()
  return {
    closeMock,
    sendMailMock,
    createTransportMock: vi.fn(() => ({ close: closeMock, sendMail: sendMailMock })),
  }
})

vi.mock("nodemailer", () => ({
  default: { createTransport: createTransportMock },
}))

vi.mock("@/server/repositories/settings.repository", () => ({
  getAppSettings: vi.fn().mockResolvedValue({
    site_info: { site_name: "Yoiberifas" },
    email_settings: {
      enabled: true,
      from_name: "Yoiberifas",
      from_email: "tickets@yoiberifas.com",
      reply_to: "soporte@yoiberifas.com",
      send_confirmation: true,
      send_status_updates: true,
      send_modifications: true,
    },
  }),
}))

const BASE_ENV = {
  SMTP_HOST: "relay.mailbaby.net",
  SMTP_USER: "mb84774",
  SMTP_PASS: "relay-secret",
}

const EXTRA_KEYS = [
  "SMTP_PORT",
  "SMTP_SECURE",
  "SMTP_DKIM_DOMAIN",
  "SMTP_DKIM_SELECTOR",
  "SMTP_DKIM_PRIVATE_KEY",
  "SMTP_DKIM_PRIVATE_KEY_PATH",
]

function setEnv(extra: Record<string, string> = {}) {
  Object.assign(process.env, BASE_ENV, extra)
  resetEnvCache()
}

describe("SmtpEmailAdapter", () => {
  afterEach(async () => {
    resetEnvCache()
    closeMock.mockReset()
    sendMailMock.mockReset()
    createTransportMock.mockClear()
    for (const key of [...Object.keys(BASE_ENV), ...EXTRA_KEYS]) {
      delete process.env[key]
    }
    const { invalidateEmailSettingsCache } = await import("./email-settings.server")
    invalidateEmailSettingsCache()
  })

  it("sends through the relay with the sender configured in admin settings", async () => {
    sendMailMock.mockResolvedValue({
      messageId: "<relay-1@yoiberifas.com>",
      rejected: [],
      accepted: ["cliente@test.com"],
    })
    setEnv()

    const adapter = new SmtpEmailAdapter()
    const result = await adapter.send({
      to: "cliente@test.com",
      subject: "Prueba",
      html: "<p>Hola</p>",
      type: "purchase_confirmation",
    })

    expect(createTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({
        host: "relay.mailbaby.net",
        port: 587,
        secure: false,
        auth: { user: "mb84774", pass: "relay-secret" },
        pool: true,
      }),
    )
    expect(sendMailMock).toHaveBeenCalledWith({
      from: "Yoiberifas <tickets@yoiberifas.com>",
      to: "cliente@test.com",
      subject: "Prueba",
      html: "<p>Hola</p>",
      replyTo: "soporte@yoiberifas.com",
    })
    expect(result).toEqual({ success: true, providerMessageId: "<relay-1@yoiberifas.com>" })
  })

  it("signs DKIM when the domain and selector are configured", async () => {
    sendMailMock.mockResolvedValue({ messageId: "<relay-2@yoiberifas.com>", rejected: [] })
    setEnv({
      SMTP_PORT: "2525",
      SMTP_SECURE: "true",
      SMTP_DKIM_DOMAIN: "yoiberifas.com",
      SMTP_DKIM_SELECTOR: "mailbaby",
      SMTP_DKIM_PRIVATE_KEY:
        "-----BEGIN RSA PRIVATE KEY-----\\nkey\\n-----END RSA PRIVATE KEY-----",
    })

    const adapter = new SmtpEmailAdapter()
    await adapter.send({
      to: "cliente@test.com",
      subject: "Prueba",
      html: "<p>Hola</p>",
      type: "status_update",
    })

    expect(createTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({
        port: 2525,
        secure: true,
        dkim: {
          domainName: "yoiberifas.com",
          keySelector: "mailbaby",
          privateKey: "-----BEGIN RSA PRIVATE KEY-----\nkey\n-----END RSA PRIVATE KEY-----",
        },
      }),
    )
  })

  it("omits DKIM when no DKIM env is present", async () => {
    sendMailMock.mockResolvedValue({ messageId: "<relay-3@yoiberifas.com>", rejected: [] })
    setEnv()

    await new SmtpEmailAdapter().send({
      to: "cliente@test.com",
      subject: "Prueba",
      html: "<p>Hola</p>",
      type: "purchase_confirmation",
    })

    expect(createTransportMock).toHaveBeenCalledWith(
      expect.not.objectContaining({ dkim: expect.anything() }),
    )
  })

  it("requires credentials before opening the transport", async () => {
    resetEnvCache()

    await expect(
      new SmtpEmailAdapter().send({
        to: "cliente@test.com",
        subject: "Prueba",
        html: "<p>Hola</p>",
        type: "purchase_confirmation",
      }),
    ).rejects.toThrow(/SMTP_HOST, SMTP_USER y SMTP_PASS/)

    expect(createTransportMock).not.toHaveBeenCalled()
  })

  it("throws EmailSendError when the relay rejects the recipient", async () => {
    sendMailMock.mockResolvedValue({
      messageId: "<relay-4@yoiberifas.com>",
      rejected: ["bad@test.com"],
      accepted: [],
    })
    setEnv()

    await expect(
      new SmtpEmailAdapter().send({
        to: "bad@test.com",
        subject: "Prueba",
        html: "<p>Hola</p>",
        type: "purchase_confirmation",
      }),
    ).rejects.toThrow(/rechazó el destinatario/)
  })

  it("reopens the transport and retries once when the SMTP greeting times out", async () => {
    const greetingTimeout = Object.assign(new Error("Greeting never received"), {
      code: "ETIMEDOUT",
      command: "CONN",
    })
    sendMailMock
      .mockRejectedValueOnce(greetingTimeout)
      .mockResolvedValueOnce({ messageId: "<relay-retry@yoiberifas.com>", rejected: [] })
    setEnv()

    const result = await new SmtpEmailAdapter().send({
      to: "cliente@test.com",
      subject: "Prueba",
      html: "<p>Hola</p>",
      type: "purchase_confirmation",
    })

    expect(closeMock).toHaveBeenCalledOnce()
    expect(createTransportMock).toHaveBeenCalledTimes(2)
    expect(sendMailMock).toHaveBeenCalledTimes(2)
    expect(result).toEqual({
      success: true,
      providerMessageId: "<relay-retry@yoiberifas.com>",
    })
  })

  it("does not retry a relay rejection after the message transaction starts", async () => {
    const relayRejection = Object.assign(new Error("Message failed: 550 rSPAM"), {
      code: "EENVELOPE",
      command: "DATA",
    })
    sendMailMock.mockRejectedValue(relayRejection)
    setEnv()

    await expect(
      new SmtpEmailAdapter().send({
        to: "cliente@test.com",
        subject: "Prueba",
        html: "<p>Hola</p>",
        type: "purchase_confirmation",
      }),
    ).rejects.toThrow(/550 rSPAM/)

    expect(closeMock).not.toHaveBeenCalled()
    expect(createTransportMock).toHaveBeenCalledOnce()
    expect(sendMailMock).toHaveBeenCalledOnce()
  })
})
