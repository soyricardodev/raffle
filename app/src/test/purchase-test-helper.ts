import type { CreatePurchaseParams } from "@/server/purchase.service"

export const TEST_PAYMENT_PROOF_URL = "/uploads/payments/test-proof.jpg"

export function withTestBuyerDefaults(
  params: Omit<
    CreatePurchaseParams,
    "customerEmail" | "customerCi" | "paymentProofUrl" | "customerLocation"
  > &
    Partial<
      Pick<
        CreatePurchaseParams,
        "customerEmail" | "customerCi" | "paymentProofUrl" | "customerLocation"
      >
    >,
): CreatePurchaseParams {
  return {
    customerLocation: "Venezuela, Carabobo",
    customerEmail: "comprador@test.local",
    customerCi: "V12345678",
    paymentProofUrl: TEST_PAYMENT_PROOF_URL,
    ...params,
  }
}
