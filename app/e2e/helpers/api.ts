import type { APIRequestContext } from "@playwright/test"
import { e2eEnv } from "./env"

export type PurchasePayload = {
  raffleId: number
  customerName: string
  customerPhone: string
  customerEmail: string
  customerCi: string
  customerLocation: string
  rafflePaymentMethodId: number
  paymentReference: string
  ticketQuantity: number
  paymentProofUrl?: string
}

export const DEFAULT_CUSTOMER_LOCATION = "Venezuela, Carabobo"
export const DEFAULT_PAYMENT_PROOF_URL = "/uploads/payments/e2e-proof.jpg"

export async function fetchFirstRafflePaymentMethodId(
  request: APIRequestContext,
  raffleId: number,
): Promise<number> {
  const response = await request.get(`/api/raffles/${raffleId}`)
  if (!response.ok()) {
    throw new Error(`raffle fetch failed: ${response.status()} ${await response.text()}`)
  }
  const data = (await response.json()) as {
    payment_methods?: Array<{ id: number }>
  }
  const id = data.payment_methods?.[0]?.id
  if (!id) throw new Error("No payment methods on raffle — run scripts/seed.ts")
  return id
}

export type PurchaseResult = {
  purchaseId: number
  ticketNumbers: string[]
  isFirstPurchase: boolean
  customerName: string
  raffleName: string
  ticketCount: number
}

export async function fetchFirstActiveRaffle(
  request: APIRequestContext,
): Promise<{ id: number; name: string } | null> {
  const response = await request.get("/api/raffles/first-active")
  if (response.status() === 404) return null
  if (!response.ok()) {
    throw new Error(`first-active failed: ${response.status()} ${await response.text()}`)
  }
  const data = (await response.json()) as { id: number | string; name: string }
  return { id: Number(data.id), name: data.name }
}

export async function createPurchase(
  request: APIRequestContext,
  payload: PurchasePayload,
): Promise<PurchaseResult> {
  const response = await request.post("/api/purchases/", {
    data: {
      customerLocation: DEFAULT_CUSTOMER_LOCATION,
      customerEmail: `buyer-${Date.now()}@e2e.test`,
      customerCi: "V12345678",
      paymentProofUrl: DEFAULT_PAYMENT_PROOF_URL,
      ...payload,
    },
  })
  if (!response.ok()) {
    throw new Error(`create purchase failed: ${response.status()} ${await response.text()}`)
  }
  return (await response.json()) as PurchaseResult
}

export async function setPurchaseStatus(
  request: APIRequestContext,
  purchaseId: number,
  status: "approved" | "rejected",
  notes?: string,
): Promise<void> {
  const data: { status: string; notes?: string } = { status }
  if (notes) data.notes = notes
  const response = await request.put(`/api/admin/purchases/${purchaseId}/status`, {
    data,
  })
  if (!response.ok()) {
    throw new Error(`status update failed: ${response.status()} ${await response.text()}`)
  }
}

const authHeaders = () => ({
  Origin: e2eEnv.baseUrl,
  Referer: `${e2eEnv.baseUrl}/login`,
})

export async function ensureAdminSession(request: APIRequestContext): Promise<void> {
  const signUp = await request.post("/api/auth/sign-up/email", {
    headers: authHeaders(),
    data: {
      email: e2eEnv.adminEmail,
      password: e2eEnv.adminPassword,
      name: "E2E Admin",
    },
  })

  if (signUp.ok()) return

  const signIn = await request.post("/api/auth/sign-in/email", {
    headers: authHeaders(),
    data: {
      email: e2eEnv.adminEmail,
      password: e2eEnv.adminPassword,
    },
  })

  if (!signIn.ok()) {
    throw new Error(
      `admin auth failed (sign-up ${signUp.status()}, sign-in ${signIn.status()}): ${await signIn.text()}`,
    )
  }
}

export async function signInAdmin(request: APIRequestContext): Promise<void> {
  await ensureAdminSession(request)
}

export function uniqueRef(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}
