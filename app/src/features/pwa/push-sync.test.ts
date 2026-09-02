import { describe, expect, it } from "vitest"
import { planPushSync } from "./push-sync"

describe("planPushSync", () => {
  it("keeps a live granted subscription and refreshes it", () => {
    expect(
      planPushSync({
        permission: "granted",
        liveEndpoint: "https://push.example/a",
        storedEndpoint: "https://push.example/a",
      }),
    ).toEqual({
      subscribed: true,
      persistLive: true,
      removeEndpoint: null,
      resetNotifySnooze: false,
    })
  })

  it("drops the old endpoint when the browser rotated the subscription", () => {
    expect(
      planPushSync({
        permission: "granted",
        liveEndpoint: "https://push.example/new",
        storedEndpoint: "https://push.example/old",
      }),
    ).toEqual({
      subscribed: true,
      persistLive: true,
      removeEndpoint: "https://push.example/old",
      resetNotifySnooze: false,
    })
  })

  it("removes the stored endpoint when the user turned notifications off", () => {
    expect(
      planPushSync({
        permission: "denied",
        liveEndpoint: null,
        storedEndpoint: "https://push.example/a",
      }),
    ).toEqual({
      subscribed: false,
      persistLive: false,
      removeEndpoint: "https://push.example/a",
      resetNotifySnooze: true,
    })
  })

  it("asks again after a granted subscription disappears", () => {
    expect(
      planPushSync({
        permission: "granted",
        liveEndpoint: null,
        storedEndpoint: "https://push.example/a",
      }),
    ).toEqual({
      subscribed: false,
      persistLive: false,
      removeEndpoint: "https://push.example/a",
      resetNotifySnooze: true,
    })
  })

  it("does not reset snooze for someone who never subscribed", () => {
    expect(
      planPushSync({
        permission: "default",
        liveEndpoint: null,
        storedEndpoint: null,
      }),
    ).toEqual({
      subscribed: false,
      persistLive: false,
      removeEndpoint: null,
      resetNotifySnooze: false,
    })
  })
})
