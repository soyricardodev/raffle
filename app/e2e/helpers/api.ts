import type { APIRequestContext } from "@playwright/test"
import { e2eEnv } from "./env"

export type PurchasePayload = {
  raffleId: number
  customerName: string
  customerPhone: string
  customerEmail?: string
  customerCi?: string
  paymentMethod: string
  paymentReference: string
  ticketQuantity: number
}

export type PurchaseResult = {
  purchaseId: number
  ticketNumbers: string[]
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
    data: payload,
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
): Promise<void> {
  const response = await request.put(`/api/admin/purchases/${purchaseId}/status`, {
    data: { status },
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
