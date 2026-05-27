import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { getPool } from "@/lib/db.server"
import {
  checkTicketAvailability,
  checkAutoPause,
  pauseRaffle,
  unpauseRaffle,
  getPauseInfo,
} from "./pause.service"

const hasDatabase = Boolean(process.env.DATABASE_URL)

describe.skipIf(!hasDatabase)("pause system", () => {
  let raffleId: number

  beforeAll(async () => {
    const pool = getPool()

    const [result] = await pool.execute(
      `INSERT INTO raffles
       (name, description, total_tickets, price_bs, price_usd,
        min_purchase, max_purchase, draw_date, status, auto_pause_enabled)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        "TEST-Pause",
        "Rifa de prueba para tests de pausa",
        10,
        5,
        1,
        2,
        5,
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        "active",
        true,
      ],
    )
    raffleId = (result as { insertId: number }).insertId

    const numbers: number[] = []
    for (let i = 0; i < 10; i++) numbers.push(i + 1)

    const batchSize = 100
    for (let i = 0; i < numbers.length; i += batchSize) {
      const batch = numbers.slice(i, i + batchSize)
      const placeholders = batch.map(() => "(?, ?, ?)").join(", ")
      const values = batch.flatMap((n) => [raffleId, String(n).padStart(4, "0"), "available"])
      await pool.execute(
        `INSERT INTO tickets (raffle_id, ticket_number, status) VALUES ${placeholders}`,
        values,
      )
    }
  })

  afterAll(async () => {
    const pool = getPool()
    await pool.execute("SET FOREIGN_KEY_CHECKS=0")
    await pool.execute("DELETE FROM tickets WHERE raffle_id = ?", [raffleId])
    await pool.execute("DELETE FROM purchases WHERE raffle_id = ?", [raffleId])
    await pool.execute("DELETE FROM raffles WHERE id = ?", [raffleId])
    await pool.execute("SET FOREIGN_KEY_CHECKS=1")
  })

  it("reports initial availability correctly", async () => {
    const av = await checkTicketAvailability(raffleId)
    expect(av.total).toBe(10)
    expect(av.available).toBe(10)
    expect(av.sold).toBe(0)
    expect(av.isFull).toBe(false)
  })

  it("does not trigger auto-pause when tickets are available", async () => {
    const result = await checkAutoPause(raffleId)
    expect(result.needsPause).toBe(false)
    expect(result.availability?.available).toBe(10)
  })

  it("performs manual pause successfully", async () => {
    const result = await pauseRaffle(raffleId, "manual", 10)
    expect(result.success).toBe(true)
    expect(result.pauseUntil).toBeDefined()
    expect(result.reason).toBe("manual")
  })

  it("cannot pause a raffle that is already paused", async () => {
    const result = await pauseRaffle(raffleId, "manual")
    expect(result.success).toBe(false)
  })

  it("unpauses raffle successfully", async () => {
    const result = await unpauseRaffle(raffleId)
    expect(result.success).toBe(true)
    expect(result.message).toContain("reactivada")
  })

  it("returns pause info for active raffle", async () => {
    const info = await getPauseInfo(raffleId)
    if (!info) throw new Error("Pause info returned null")
    expect(info.status).toBe("active")
    expect(info.isPaused).toBe(false)
    expect(info.autoPauseEnabled).toBe(true)
    expect(info.availability.available).toBe(10)
    expect(info.availability.isFull).toBe(false)
  })

  it("triggers auto-pause when all tickets are sold", async () => {
    const pool = getPool()
    await pool.execute(
      "UPDATE tickets SET status = 'sold' WHERE raffle_id = ?",
      [raffleId],
    )

    const checkResult = await checkAutoPause(raffleId)
    expect(checkResult.needsPause).toBe(true)
    expect(checkResult.pauseType).toBe("auto_full")

    await pool.execute(
      "UPDATE tickets SET status = 'available' WHERE raffle_id = ?",
      [raffleId],
    )
  })

  it("triggers auto-pause when available < minPurchase", async () => {
    const pool = getPool()
    await pool.execute(
      "UPDATE tickets SET status = 'available' WHERE raffle_id = ?",
      [raffleId],
    )
    await pool.execute(
      "UPDATE tickets SET status = 'sold' WHERE raffle_id = ? LIMIT 9",
      [raffleId],
    )

    const checkResult = await checkAutoPause(raffleId)
    expect(checkResult.needsPause).toBe(true)
    expect(checkResult.pauseType).toBe("auto_insufficient")

    await pool.execute(
      "UPDATE tickets SET status = 'available' WHERE raffle_id = ?",
      [raffleId],
    )
  })
})
