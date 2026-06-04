import type { PurchaseDetail } from "@/features/admin/purchases/types"

/** Respuesta GET `/api/admin/purchases/:id`. */
export type PurchaseDetailApi = {
  id: number
  customer_name: string
  customer_phone: string
  customer_email?: string | null
  customer_ci?: string | null
  customer_location?: string | null
  payment_method: string
  payment_reference?: string | null
  payment_proof_url?: string | null
  ticket_quantity: number
  total_amount: number | string
  status: string
  notes?: string | null
  created_at: string | Date
  raffle_name: string
  raffle_tickets_available: number
  ticketNumbers: Array<string>
}

export function mapPurchaseDetailApiToDetail(data: PurchaseDetailApi): PurchaseDetail {
  return {
    id: data.id,
    customer_name: data.customer_name,
    customer_phone: data.customer_phone,
    customer_email: data.customer_email ?? undefined,
    customer_ci: data.customer_ci ?? undefined,
    customer_location: data.customer_location ?? null,
    raffle_name: data.raffle_name,
    raffle_tickets_available: data.raffle_tickets_available,
    ticket_quantity: data.ticket_quantity,
    total_amount: data.total_amount,
    payment_method: data.payment_method,
    status: data.status,
    notes: data.notes ?? undefined,
    created_at:
      typeof data.created_at === "string"
        ? data.created_at
        : new Date(data.created_at).toISOString(),
    payment_reference: data.payment_reference ?? undefined,
    payment_proof_url: data.payment_proof_url,
    ticket_numbers: data.ticketNumbers.join(", "),
    ticketNumbers: data.ticketNumbers,
  }
}

/** Campos a sincronizar tras mutaciones de boletos/estado. */
export function pickPurchaseDetailPatch(data: PurchaseDetailApi): Partial<PurchaseDetail> {
  return {
    status: data.status,
    customer_name: data.customer_name,
    customer_phone: data.customer_phone,
    customer_email: data.customer_email ?? undefined,
    customer_ci: data.customer_ci ?? undefined,
    customer_location: data.customer_location ?? null,
    ticket_quantity: data.ticket_quantity,
    total_amount: data.total_amount,
    ticket_numbers: data.ticketNumbers.join(", "),
    ticketNumbers: data.ticketNumbers,
    raffle_tickets_available: data.raffle_tickets_available,
  }
}
