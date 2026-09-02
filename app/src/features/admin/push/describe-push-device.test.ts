import { describe, expect, it } from "vitest"
import { describePushDevice } from "./describe-push-device"

describe("describePushDevice", () => {
  it("labels Android Chrome", () => {
    expect(
      describePushDevice(
        "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126.0.0.0 Mobile Safari/537.36",
      ),
    ).toBe("Android · Chrome")
  })

  it("labels iPhone Safari", () => {
    expect(
      describePushDevice(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1",
      ),
    ).toBe("iPhone · Safari")
  })

  it("falls back when the user agent is missing", () => {
    expect(describePushDevice(null)).toBe("Teléfono")
  })
})
