import { describe, expect, it } from "bun:test"
import { mergeSenderConfig, pickSenderFromEnv } from "./email-env"

describe("email-env", () => {
  it("reads sender aliases from legacy env keys", () => {
    expect(
      pickSenderFromEnv({
        RESEND_FROM_EMAIL: "hola@yoiberifas.com",
        FROM_NAME: "Yoiberifas",
        REPLY_TO: "soporte@yoiberifas.com",
      }),
    ).toEqual({
      fromEmail: "hola@yoiberifas.com",
      fromName: "Yoiberifas",
      replyTo: "soporte@yoiberifas.com",
    })
  })

  it("ignores onboarding fallback from db settings", () => {
    expect(
      mergeSenderConfig(
        { fromEmail: "onboarding@resend.dev", fromName: "Rifas Premium" },
        { fromEmail: "hola@yoiberifas.com" },
      ),
    ).toEqual({
      fromEmail: "hola@yoiberifas.com",
      fromName: "Rifas Premium",
    })
  })
})
