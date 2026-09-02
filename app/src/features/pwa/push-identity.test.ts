import { describe, expect, it } from "vitest"
import { parsePushIdentityHint, pickPushIdentityHint } from "./push-identity"

describe("pickPushIdentityHint", () => {
  it("returns the first source that has a name or phone", () => {
    expect(
      pickPushIdentityHint(
        { customerName: "  ", customerPhone: "" },
        { customerName: " Ana ", customerPhone: "0412" },
        { customerName: "Otra" },
      ),
    ).toEqual({ customerName: "Ana", customerPhone: "0412" })
  })

  it("skips empty sources and keeps a name without a phone", () => {
    expect(pickPushIdentityHint(null, undefined, { customerName: "Luis" })).toEqual({
      customerName: "Luis",
    })
  })
})

describe("parsePushIdentityHint", () => {
  it("reads a versioned hint", () => {
    expect(
      parsePushIdentityHint(
        JSON.stringify({ v: 1, customerName: "María", customerPhone: "04121234567" }),
      ),
    ).toEqual({ customerName: "María", customerPhone: "04121234567" })
  })

  it("rejects other versions and invalid JSON", () => {
    expect(parsePushIdentityHint(JSON.stringify({ v: 2, customerName: "María" }))).toBeNull()
    expect(parsePushIdentityHint("nope")).toBeNull()
    expect(parsePushIdentityHint(null)).toBeNull()
  })
})
