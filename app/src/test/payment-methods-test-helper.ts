import { eq } from "drizzle-orm"
import { paymentAccounts, rafflePaymentMethods } from "@raffle/shared/db"
import { getDb } from "@/lib/db.server"

export async function seedPagoMovilPaymentMethodForRaffle(raffleId: number): Promise<number> {
  const db = getDb()
  const [account] = await db
    .insert(paymentAccounts)
    .values({
      label: "Test Pago móvil",
      methodType: "pago_movil",
      accountInfo: JSON.stringify({
        bank: "Test",
        phone: "04120000000",
        cedula_type: "V",
        cedula_number: "12345678",
      }),
      isActive: true,
    })
    .returning({ id: paymentAccounts.id })

  const [rpm] = await db
    .insert(rafflePaymentMethods)
    .values({
      raffleId,
      accountId: account!.id,
      isActive: true,
      minTickets: null,
    })
    .returning({ id: rafflePaymentMethods.id })

  return rpm!.id
}

export async function cleanupRafflePaymentTestData(raffleId: number, accountId: number) {
  const db = getDb()
  await db.delete(rafflePaymentMethods).where(eq(rafflePaymentMethods.raffleId, raffleId))
  await db.delete(paymentAccounts).where(eq(paymentAccounts.id, accountId))
}
