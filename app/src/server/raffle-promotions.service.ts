import { RaffleNotFoundError, ValidationError } from "@raffle/shared/errors"
import type {
  CreateRafflePromotionInput,
  UpdateRafflePromotionInput,
} from "@raffle/shared/validators"
import { withImmediateTransaction } from "@/lib/db.server"
import { mergePromotionInput } from "./promotion-input"
import { assertPromotionAgainstBasePrices } from "./promotion-pricing.service"
import * as promotionsRepo from "./repositories/raffle-promotions.repository"
import * as rafflesRepo from "./repositories/raffles.repository"

export async function listRafflePromotions(raffleId: number) {
  const raffle = await rafflesRepo.findRaffleById(raffleId)
  if (!raffle) throw new RaffleNotFoundError(raffleId)
  return promotionsRepo.listPromotionsByRaffleLegacy(raffleId)
}

export async function createRafflePromotion(raffleId: number, input: CreateRafflePromotionInput) {
  const raffle = await rafflesRepo.findRaffleById(raffleId)
  if (!raffle) throw new RaffleNotFoundError(raffleId)

  assertPromotionAgainstBasePrices(input, {
    priceBsCents: raffle.priceBsCents,
    priceUsdCents: raffle.priceUsdCents,
  })

  const id = await withImmediateTransaction((tx) =>
    promotionsRepo.insertPromotion(tx, raffleId, input),
  )

  const created = await promotionsRepo.findPromotionLegacyById(raffleId, id)
  if (!created) throw new ValidationError("No se pudo crear la promoción")
  return created
}

export async function updateRafflePromotion(
  raffleId: number,
  promotionId: number,
  input: UpdateRafflePromotionInput,
) {
  const raffle = await rafflesRepo.findRaffleById(raffleId)
  if (!raffle) throw new RaffleNotFoundError(raffleId)

  const existing = await promotionsRepo.findPromotionById(raffleId, promotionId)
  if (!existing) throw new ValidationError("Promoción no encontrada")

  const merged = mergePromotionInput(existing, input)
  assertPromotionAgainstBasePrices(merged, {
    priceBsCents: raffle.priceBsCents,
    priceUsdCents: raffle.priceUsdCents,
  })

  await withImmediateTransaction((tx) =>
    promotionsRepo.updatePromotionRow(tx, raffleId, promotionId, merged),
  )

  const updated = await promotionsRepo.findPromotionLegacyById(raffleId, promotionId)
  if (!updated) throw new ValidationError("Promoción no encontrada")
  return updated
}

export async function deleteRafflePromotion(raffleId: number, promotionId: number) {
  const existing = await promotionsRepo.findPromotionById(raffleId, promotionId)
  if (!existing) throw new ValidationError("Promoción no encontrada")

  await withImmediateTransaction((tx) =>
    promotionsRepo.deletePromotionRow(tx, raffleId, promotionId),
  )

  return { success: true }
}
