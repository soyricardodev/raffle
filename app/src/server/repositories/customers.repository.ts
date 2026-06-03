import { customers, normalizePhone } from "@raffle/shared/db"
import {
  formatCustomerCi,
  normalizeCustomerCi,
  parseCustomerCi,
} from "@raffle/shared/validators/buyer-identity"
import { and, eq } from "drizzle-orm"
import type { DbTransaction } from "@/lib/db.server"

export type UpsertCustomerInput = {
  customerName: string
  customerPhone: string
  customerEmail: string
  customerCi: string
  customerLocation: string
  locationType: string
  venezuelaState?: string | null
}

function customerCiForStorage(ci: string): string {
  const parsed = parseCustomerCi(ci)
  if (!parsed) return ci.trim().substring(0, 20)
  return formatCustomerCi(parsed.prefix, parsed.number).substring(0, 20)
}

function toCustomerValues(
  input: UpsertCustomerInput,
  phoneNorm: string,
  ciNorm: string,
  ciDisplay: string,
) {
  return {
    customerName: input.customerName.substring(0, 200),
    customerPhone: input.customerPhone.substring(0, 20),
    customerPhoneNormalized: phoneNorm,
    customerEmail: input.customerEmail.substring(0, 100),
    customerCi: ciDisplay,
    customerCiNormalized: ciNorm,
    customerLocation: input.customerLocation.substring(0, 100),
    locationType: input.locationType,
    venezuelaState: input.venezuelaState?.substring(0, 100) ?? null,
  }
}

/**
 * Match repeat buyers on phone + CI together only.
 * Same phone with a different CI (or same CI with a different phone) creates a new row.
 */
export async function findOrCreateCustomer(
  tx: DbTransaction,
  input: UpsertCustomerInput,
): Promise<number> {
  const phoneNorm = normalizePhone(input.customerPhone)
  const ciNorm = normalizeCustomerCi(input.customerCi)
  const ciDisplay = customerCiForStorage(input.customerCi)
  const values = toCustomerValues(input, phoneNorm, ciNorm, ciDisplay)

  const [existing] = await tx
    .select({ id: customers.id })
    .from(customers)
    .where(
      and(
        eq(customers.customerPhoneNormalized, phoneNorm),
        eq(customers.customerCiNormalized, ciNorm),
      ),
    )
    .limit(1)

  if (existing) {
    await tx
      .update(customers)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(customers.id, existing.id))
    return existing.id
  }

  const [row] = await tx.insert(customers).values(values).returning({ id: customers.id })

  return row!.id
}
