import { RaffleFinishedError, RaffleNotActiveError, RafflePausedError } from "@raffle/shared/errors"
import { describe, expect, it } from "vitest"
import {
  assertRaffleOpenForAdminTicketChanges,
  assertRaffleOpenForPublicPurchase,
} from "./raffle-sales-policy"

const future = new Date(Date.now() + 86_400_000)

describe("assertRaffleOpenForPublicPurchase", () => {
  it("allows active raffle", () => {
    expect(() =>
      assertRaffleOpenForPublicPurchase({ status: "active", drawDate: future }, 1),
    ).not.toThrow()
  })

  it("rejects paused raffle", () => {
    expect(() =>
      assertRaffleOpenForPublicPurchase({ status: "paused", drawDate: future }, 1),
    ).toThrow(RafflePausedError)
  })
})

describe("assertRaffleOpenForAdminTicketChanges", () => {
  it("allows paused raffle for admin ticket ops", () => {
    expect(() =>
      assertRaffleOpenForAdminTicketChanges({ status: "paused", drawDate: future }, 1),
    ).not.toThrow()
  })

  it("allows finished raffle for admin ticket ops", () => {
    expect(() =>
      assertRaffleOpenForAdminTicketChanges({ status: "finished", drawDate: future }, 1),
    ).not.toThrow()
  })

  it("rejects cancelled raffle", () => {
    expect(() =>
      assertRaffleOpenForAdminTicketChanges({ status: "cancelled", drawDate: future }, 1),
    ).toThrow(RaffleFinishedError)
  })

  it("rejects draft raffle", () => {
    expect(() =>
      assertRaffleOpenForAdminTicketChanges({ status: "draft", drawDate: future }, 1),
    ).toThrow(RaffleNotActiveError)
  })
})
