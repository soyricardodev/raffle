import { z } from "zod"

export const PaymentMethod = z.enum(["pago_movil", "zinli", "zelle", "binance", "bs", "usd"])
export type PaymentMethod = z.infer<typeof PaymentMethod>
