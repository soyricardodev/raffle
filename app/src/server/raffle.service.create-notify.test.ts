import { CreateRaffleInput } from "@raffle/shared/validators"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createRaffle } from "./raffle.service"
import { notifyNewRaffleInBackground } from "./push.service"
import * as rafflesRepo from "./repositories/raffles.repository"

vi.mock("@/lib/db.server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db.server")>()
  return {
    ...actual,
    withImmediateTransaction: vi.fn(async (fn) => fn({} as never)),
  }
})

vi.mock("./repositories/raffles.repository", () => ({
  insertRaffle: vi.fn(),
}))

vi.mock("./push.service", () => ({
  notifyNewRaffleInBackground: vi.fn(),
}))

const baseInput = CreateRaffleInput.parse({
  name: "iPhone 16",
  price_bs: 50,
  price_usd: 5,
})

describe("createRaffle push", () => {
  beforeEach(() => {
    vi.mocked(rafflesRepo.insertRaffle).mockResolvedValue(42)
    vi.mocked(notifyNewRaffleInBackground).mockClear()
  })

  it("notifies subscribers when created as active", async () => {
    await createRaffle({ ...baseInput, status: "active" })
    expect(notifyNewRaffleInBackground).toHaveBeenCalledWith(42)
  })

  it("does not notify when created as draft", async () => {
    await createRaffle({ ...baseInput, status: "draft" })
    expect(notifyNewRaffleInBackground).not.toHaveBeenCalled()
  })
})
