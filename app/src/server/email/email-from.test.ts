import { afterEach, describe, expect, it, vi } from "vitest"
import { resetEnvCache } from "@/lib/env"
import { formatEmailFrom } from "./email-from"

const getAppSettingsMock = vi.fn()

vi.mock("@/server/repositories/settings.repository", () => ({
  getAppSettings: (...args: unknown[]) => getAppSettingsMock(...args),
}))

describe("email-from", () => {
  afterEach(() => {
    resetEnvCache()
    getAppSettingsMock.mockReset()
    delete process.env.EMAIL_FROM
    delete process.env.EMAIL_FROM_NAME
    delete process.env.EMAIL_REPLY_TO
  })

  it("formats from with display name", () => {
    expect(formatEmailFrom("Rifas Premium", "hola@yoiberifas.com")).toBe(
      "Rifas Premium <hola@yoiberifas.com>",
    )
  })

  it("formats from without display name", () => {
    expect(formatEmailFrom(undefined, "hola@yoiberifas.com")).toBe("hola@yoiberifas.com")
  })
})

describe("resolveEmailSenderConfig", () => {
  afterEach(async () => {
    resetEnvCache()
    getAppSettingsMock.mockReset()
    delete process.env.EMAIL_FROM
    delete process.env.EMAIL_FROM_NAME
    delete process.env.EMAIL_REPLY_TO
    const { invalidateEmailSettingsCache } = await import("./email-settings.server")
    invalidateEmailSettingsCache()
  })

  it("prefers admin email_settings over env", async () => {
    getAppSettingsMock.mockResolvedValue({
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
    })
    process.env.EMAIL_FROM = "otro@example.com"
    resetEnvCache()

    const { resolveEmailSenderConfig } = await import("./email-settings.server")
    expect(await resolveEmailSenderConfig()).toEqual({
      fromEmail: "hola@yoiberifas.com",
      fromName: "Yoiberifas",
      replyTo: "soporte@yoiberifas.com",
    })
  })

  it("falls back to env when db sender is empty", async () => {
    getAppSettingsMock.mockResolvedValue({
      site_info: { site_name: "Rifas" },
      email_settings: {
        enabled: true,
        from_name: "",
        from_email: "",
        reply_to: "",
        send_confirmation: true,
        send_status_updates: true,
        send_modifications: true,
      },
    })
    process.env.EMAIL_FROM = "noreply@rifas.test"
    process.env.EMAIL_FROM_NAME = "Rifas Test"
    resetEnvCache()

    const { resolveEmailSenderConfig } = await import("./email-settings.server")
    expect(await resolveEmailSenderConfig()).toEqual({
      fromEmail: "noreply@rifas.test",
      fromName: "Rifas Test",
      replyTo: undefined,
    })
  })

  it("ignores onboarding fallback from db", async () => {
    getAppSettingsMock.mockResolvedValue({
      email_settings: {
        enabled: true,
        from_name: "Rifas",
        from_email: "onboarding@resend.dev",
        reply_to: "",
        send_confirmation: true,
        send_status_updates: true,
        send_modifications: true,
      },
    })
    process.env.EMAIL_FROM = "hola@yoiberifas.com"
    resetEnvCache()

    const { resolveEmailSenderConfig } = await import("./email-settings.server")
    expect((await resolveEmailSenderConfig()).fromEmail).toBe("hola@yoiberifas.com")
  })
})

describe("shouldSendAutomatedEmail", () => {
  afterEach(async () => {
    getAppSettingsMock.mockReset()
    const { invalidateEmailSettingsCache } = await import("./email-settings.server")
    invalidateEmailSettingsCache()
  })

  it("respects enabled and per-type toggles", async () => {
    const { shouldSendAutomatedEmail, invalidateEmailSettingsCache } = await import(
      "./email-settings.server"
    )

    getAppSettingsMock.mockResolvedValue({
      email_settings: {
        enabled: false,
        from_name: "",
        from_email: "hola@yoiberifas.com",
        reply_to: "",
        send_confirmation: true,
        send_status_updates: true,
        send_modifications: true,
      },
    })
    expect(await shouldSendAutomatedEmail("purchase_confirmation")).toBe(false)

    getAppSettingsMock.mockResolvedValue({
      email_settings: {
        enabled: true,
        from_name: "",
        from_email: "hola@yoiberifas.com",
        reply_to: "",
        send_confirmation: false,
        send_status_updates: true,
        send_modifications: true,
      },
    })
    invalidateEmailSettingsCache()
    expect(await shouldSendAutomatedEmail("purchase_confirmation")).toBe(false)
    expect(await shouldSendAutomatedEmail("status_update")).toBe(true)
  })
})
