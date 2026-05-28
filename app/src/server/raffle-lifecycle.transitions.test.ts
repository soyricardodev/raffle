import { describe, expect, it, vi } from "vitest"
import { RaffleInvalidTransitionError } from "@raffle/shared/errors"
import { transitionRaffle } from "./raffle-lifecycle.service"
import * as rafflesRepo from "./repositories/raffles.repository"
import * as pauseService from "./pause.service"

vi.mock("./repositories/raffles.repository")
vi.mock("./pause.service")
vi.mock("./raffle.service", () => ({
  publishRaffle: vi.fn(),
}))

describe("transitionRaffle policy", () => {
  it("rejects pause_sales when not active", async () => {
    vi.mocked(rafflesRepo.findRaffleById).mockResolvedValue({
      id: 1,
      status: "draft",
    } as never)

    await expect(
      transitionRaffle(1, { intent: "pause_sales" }),
    ).rejects.toBeInstanceOf(RaffleInvalidTransitionError)
  })

  it("rejects set_status active from paused (must resume_sales)", async () => {
    vi.mocked(rafflesRepo.findRaffleById).mockResolvedValue({
      id: 1,
      status: "paused",
    } as never)

    await expect(
      transitionRaffle(1, { intent: "set_status", status: "active" }),
    ).rejects.toMatchObject({
      code: "RAFFLE_INVALID_TRANSITION",
    })
  })

  it("routes pause_sales through pauseRaffle", async () => {
    vi.mocked(rafflesRepo.findRaffleById).mockResolvedValue({
      id: 1,
      status: "active",
    } as never)
    vi.mocked(pauseService.pauseRaffle).mockResolvedValue({
      success: true,
      message: "ok",
    })

    const result = await transitionRaffle(1, { intent: "pause_sales" })
    expect(pauseService.pauseRaffle).toHaveBeenCalledWith(1, "manual")
    expect(result.status).toBe("paused")
  })
})
