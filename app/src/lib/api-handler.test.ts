import { ValidationError } from "@raffle/shared/errors"
import { describe, expect, it } from "vitest"
import { apiHandlers } from "@/lib/api-handler"

describe("apiHandlers", () => {
  it("returns JSON with message when handler throws ValidationError", async () => {
    const handlers = apiHandlers({
      DELETE: async (): Promise<Response> => {
        throw new ValidationError("No se puede eliminar: este método está asignado a la rifa #20")
      },
    })

    const res = await handlers.DELETE()
    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({
      message: "No se puede eliminar: este método está asignado a la rifa #20",
      code: "VALIDATION_ERROR",
      details: { fieldErrors: undefined },
    })
  })
})
