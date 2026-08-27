export type PurchaseRow = {
  id: number
  public_id?: string
  raffle_id?: number
  customer_name: string
  customer_phone: string
  customer_email?: string | null
  customer_ci?: string | null
  customer_location?: string | null
  raffle_name: string
  ticket_quantity: number
  total_amount: number | string
  total_amount_cents?: number
  currency?: string
  payment_method: string
  payment_reference?: string | null
  payment_payer_name?: string | null
  payment_proof_url?: string | null
  notes?: string | null
  status: string
  created_at: string | Date
  updated_at?: string | Date
  ticket_numbers?: string
}

export type PurchaseDetail = PurchaseRow & {
  customer_email?: string | null
  customer_ci?: string | null
  customer_location?: string | null
  payment_reference?: string | null
  payment_payer_name?: string | null
  payment_proof_url?: string | null
  /** Desde detalle API; preferir sobre `ticket_numbers` CSV */
  ticketNumbers?: Array<string>
  /** Stock disponible en la rifa (solo tras cargar detalle admin) */
  raffle_tickets_available?: number
}
