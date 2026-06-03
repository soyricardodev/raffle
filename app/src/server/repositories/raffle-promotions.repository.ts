import { fromCents, rafflePromotions } from "@raffle/shared/db"
import type {
  PromotionKind,
  PromotionRecord,
  PromotionScope,
} from "@raffle/shared/promotions/types"
import type { CreateRafflePromotionInput } from "@raffle/shared/validators"
import { discountBpsToPercent, discountPercentToBps } from "@raffle/shared/validators"
import { and, asc, eq } from "drizzle-orm"
import { type DbTransaction, getDb } from "@/lib/db.server"

export type RafflePromotionRow = typeof rafflePromotions.$inferSelect

function mapRow(row: RafflePromotionRow): PromotionRecord {
  return {
    id: row.id,
    raffleId: row.raffleId,
    name: row.name,
    description: row.description,
    isActive: row.isActive,
    kind: row.kind as PromotionKind,
    scope: row.scope as PromotionScope,
    rafflePaymentMethodId: row.rafflePaymentMethodId,
    promoPriceBsCents: row.promoPriceBsCents,
    promoPriceUsdCents: row.promoPriceUsdCents,
    discountPercentBps: row.discountPercentBps,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
  }
}

function inputToInsert(
  raffleId: number,
  input: CreateRafflePromotionInput,
): typeof rafflePromotions.$inferInsert {
  return {
    raffleId,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    isActive: input.is_active ?? true,
    kind: input.kind,
    scope: input.scope ?? "all_methods",
    rafflePaymentMethodId:
      input.scope === "payment_method" ? (input.raffle_payment_method_id ?? null) : null,
    promoPriceBsCents: input.promo_price_bs != null ? Math.round(input.promo_price_bs * 100) : null,
    promoPriceUsdCents:
      input.promo_price_usd != null ? Math.round(input.promo_price_usd * 100) : null,
    discountPercentBps:
      input.discount_percent != null ? discountPercentToBps(input.discount_percent) : null,
    startsAt: input.starts_at ? new Date(input.starts_at) : null,
    endsAt: input.ends_at ? new Date(input.ends_at) : null,
  }
}

export function mapPromotionLegacy(row: RafflePromotionRow) {
  return {
    id: row.id,
    raffle_id: row.raffleId,
    name: row.name,
    description: row.description,
    is_active: row.isActive,
    kind: row.kind as PromotionKind,
    scope: row.scope as PromotionScope,
    raffle_payment_method_id: row.rafflePaymentMethodId,
    promo_price_bs: row.promoPriceBsCents != null ? fromCents(row.promoPriceBsCents) : null,
    promo_price_usd: row.promoPriceUsdCents != null ? fromCents(row.promoPriceUsdCents) : null,
    discount_percent:
      row.discountPercentBps != null ? discountBpsToPercent(row.discountPercentBps) : null,
    starts_at: row.startsAt?.toISOString() ?? null,
    ends_at: row.endsAt?.toISOString() ?? null,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  }
}

export async function listPromotionsByRaffle(
  raffleId: number,
  tx?: DbTransaction,
): Promise<PromotionRecord[]> {
  const db = tx ?? getDb()
  const rows = await db
    .select()
    .from(rafflePromotions)
    .where(eq(rafflePromotions.raffleId, raffleId))
    .orderBy(asc(rafflePromotions.createdAt))
  return rows.map(mapRow)
}

export async function listPromotionsByRaffleLegacy(raffleId: number) {
  const db = getDb()
  const rows = await db
    .select()
    .from(rafflePromotions)
    .where(eq(rafflePromotions.raffleId, raffleId))
    .orderBy(asc(rafflePromotions.createdAt))
  return rows.map(mapPromotionLegacy)
}

export async function findPromotionLegacyById(raffleId: number, promotionId: number) {
  const db = getDb()
  const [row] = await db
    .select()
    .from(rafflePromotions)
    .where(and(eq(rafflePromotions.raffleId, raffleId), eq(rafflePromotions.id, promotionId)))
    .limit(1)
  return row ? mapPromotionLegacy(row) : undefined
}

export async function findPromotionById(
  raffleId: number,
  promotionId: number,
  tx?: DbTransaction,
): Promise<PromotionRecord | undefined> {
  const db = tx ?? getDb()
  const [row] = await db
    .select()
    .from(rafflePromotions)
    .where(and(eq(rafflePromotions.raffleId, raffleId), eq(rafflePromotions.id, promotionId)))
    .limit(1)
  return row ? mapRow(row) : undefined
}

export async function insertPromotion(
  tx: DbTransaction,
  raffleId: number,
  input: CreateRafflePromotionInput,
): Promise<number> {
  const [row] = await tx
    .insert(rafflePromotions)
    .values(inputToInsert(raffleId, input))
    .returning({ id: rafflePromotions.id })
  return row!.id
}

export async function updatePromotionRow(
  tx: DbTransaction,
  raffleId: number,
  promotionId: number,
  input: CreateRafflePromotionInput,
): Promise<void> {
  const existing = await findPromotionById(raffleId, promotionId, tx)
  if (!existing) return

  const patch = inputToInsert(raffleId, input)
  await tx
    .update(rafflePromotions)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(rafflePromotions.raffleId, raffleId), eq(rafflePromotions.id, promotionId)))
}

export async function deletePromotionRow(
  tx: DbTransaction,
  raffleId: number,
  promotionId: number,
): Promise<void> {
  await tx
    .delete(rafflePromotions)
    .where(and(eq(rafflePromotions.raffleId, raffleId), eq(rafflePromotions.id, promotionId)))
}
