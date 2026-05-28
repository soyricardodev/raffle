import type { CreateRaffleInput, RaffleStatus } from "@raffle/shared/validators"

export type PaymentMethodAssignment = {
  account_id: number
  min_tickets: string
  is_active: boolean
}

export type RaffleRow = {
  id: number
  name: string
  status: RaffleStatus
  tickets_sold: number
  total_tickets: number
  sold_percentage: string
  price_bs: number | string
  price_usd: number | string
  draw_date: string | null
  publish?: boolean | number
}

export type PrizeDraft = {
  name: string
  description: string
  position: number
  image_url: string | null
}

export type RaffleFormState = {
  name: string
  description: string
  imageUrl: string | null
  priceBs: string
  priceUsd: string
  minPurchase: string
  maxPurchase: string
  drawDateEnabled: boolean
  drawDate: string
  status: CreateRaffleInput["status"]
  prizes: Array<PrizeDraft>
  assignments: Array<PaymentMethodAssignment>
}

export const defaultPrize = (position = 1): PrizeDraft => ({
  name: "",
  description: "",
  position,
  image_url: null,
})

export const defaultRaffleFormState = (): RaffleFormState => ({
  name: "",
  description: "",
  imageUrl: null,
  priceBs: "50",
  priceUsd: "5",
  minPurchase: "1",
  maxPurchase: "10",
  drawDateEnabled: false,
  drawDate: "",
  status: "draft",
  prizes: [defaultPrize()],
  assignments: [],
})
