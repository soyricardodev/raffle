import { z } from "zod"

export const RaffleIdInput = z.object({
  id: z.string().min(1),
})

export type RaffleIdInputData = z.infer<typeof RaffleIdInput>

/** TanStack Start RPC shape shared by raffle server functions. */
export function callRaffleIdServerFn<T>(
  fn: (opts: { data: RaffleIdInputData }) => Promise<T>,
  id: string,
): Promise<T> {
  return fn({ data: { id } })
}
