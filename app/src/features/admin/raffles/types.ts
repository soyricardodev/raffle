import type { CreateRaffleInput } from "@raffle/shared/validators"
import type { PaymentMethodDraft } from "@/features/admin/PaymentMethodsEditor"

export type RaffleRow = {
  id: number
  name: string
  status: string
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
  methods: Array<PaymentMethodDraft>
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
  methods: [],
})
