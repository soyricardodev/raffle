import { normalizePhone, raffles } from "@raffle/shared/db"
import { ValidationError } from "@raffle/shared/errors"
import {
  alertMilestoneKey,
  buildRaffleMilestonePlan,
  buildRafflePromotionPlan,
  crossedSaleAlertKeys,
  highestSaleAlert,
  isAlertAlreadySent,
  keepLatestSaleProgressPerRaffle,
  mergePushMilestones,
  newlyReachedSaleAlerts,
  occupiedTickets,
  type PushAutoAlert,
  type PushBroadcastKind,
  parsePushMilestonesSent,
  promotionPushCopy,
  pushAlertCopy,
  saleProgressPushTag,
  serializePushMilestonesSent,
  soldPercent,
} from "@raffle/shared/push"
import { isValidCustomerPhone } from "@raffle/shared/validators"
import { eq } from "drizzle-orm"
import { describePushDevice } from "@/features/admin/push/describe-push-device"
import { getDb, withImmediateTransaction } from "@/lib/db.server"
import { getEnv } from "@/lib/env"
import { getLogger } from "@/lib/logger"
import * as purchasesRepo from "./repositories/purchases.repository"
import * as pushAutoAlertsRepo from "./repositories/push-auto-alerts.repository"
import * as pushBroadcastsRepo from "./repositories/push-broadcasts.repository"
import * as pushInboxReadsRepo from "./repositories/push-inbox-reads.repository"
import * as pushRepo from "./repositories/push-subscriptions.repository"
import * as promotionsRepo from "./repositories/raffle-promotions.repository"
import * as rafflesRepo from "./repositories/raffles.repository"

const logger = getLogger()
const INBOX_LIMIT = 40

export type PushPayload = {
  title: string
  body: string
  url: string
  tag: string
  icon?: string
}

type WebPushSendResult = { statusCode?: number }

type WebPushClient = {
  setVapidDetails: (subject: string, publicKey: string, privateKey: string) => void
  sendNotification: (
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
    payload: string,
    options?: { TTL?: number; urgency?: string },
  ) => Promise<WebPushSendResult>
}

let webPushClient: WebPushClient | undefined
let webPushClientOverride: WebPushClient | undefined

export function isWebPushConfigured(): boolean {
  const env = getEnv()
  return Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY)
}

export function getVapidPublicKey(): string | null {
  return getEnv().VAPID_PUBLIC_KEY ?? null
}

function vapidSubject(): string {
  const env = getEnv()
  if (env.VAPID_SUBJECT?.trim()) return env.VAPID_SUBJECT.trim()
  try {
    return new URL(env.APP_URL).origin
  } catch {
    return "mailto:noreply@localhost"
  }
}

async function loadWebPush(): Promise<WebPushClient | null> {
  if (!isWebPushConfigured()) return null
  if (webPushClientOverride) return webPushClientOverride
  if (webPushClient) return webPushClient
  const mod = (await import("web-push")) as { default?: WebPushClient } & WebPushClient
  const client = (mod.default ?? mod) as WebPushClient
  const env = getEnv()
  const publicKey = env.VAPID_PUBLIC_KEY
  const privateKey = env.VAPID_PRIVATE_KEY
  if (!publicKey || !privateKey) return null
  client.setVapidDetails(vapidSubject(), publicKey, privateKey)
  webPushClient = client
  return client
}

function appOrigin(): string {
  try {
    return new URL(getEnv().APP_URL).origin
  } catch {
    return ""
  }
}

function absoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl
  const origin = appOrigin()
  if (!origin) return pathOrUrl
  return `${origin}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`
}

function defaultIcon(): string {
  return absoluteUrl("/pwa/icon-192.png")
}

function isGoneStatus(statusCode: number | undefined): boolean {
  return statusCode === 404 || statusCode === 410
}

export async function savePushSubscription(input: {
  endpoint: string
  p256dh: string
  auth: string
  userAgent: string | null
  customerName?: string
  customerPhone?: string
}): Promise<void> {
  await pushRepo.upsertPushSubscription({
    endpoint: input.endpoint,
    p256dh: input.p256dh,
    auth: input.auth,
    userAgent: input.userAgent?.slice(0, 240) ?? null,
    identity: await resolvePushIdentityPatch({
      customerName: input.customerName,
      customerPhone: input.customerPhone,
    }),
  })
}

async function resolvePushIdentityPatch(input: {
  customerName?: string
  customerPhone?: string
}): Promise<pushRepo.PushSubscriptionIdentityPatch | undefined> {
  const displayName = input.customerName?.trim().slice(0, 200) || undefined
  const phoneRaw = input.customerPhone?.trim() || ""
  const phoneNormalized =
    phoneRaw && isValidCustomerPhone(phoneRaw) ? normalizePhone(phoneRaw) : undefined

  if (!displayName && !phoneNormalized) return undefined

  const fromPurchase = phoneNormalized
    ? await purchasesRepo.findLatestBuyerIdentityByPhone(phoneNormalized)
    : null

  const patch: pushRepo.PushSubscriptionIdentityPatch = {}
  const name = displayName ?? fromPurchase?.customerName
  if (name) patch.displayName = name
  if (phoneNormalized) patch.customerPhoneNormalized = phoneNormalized
  if (fromPurchase?.customerId) patch.customerId = fromPurchase.customerId
  return patch
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  await pushRepo.deletePushSubscriptionByEndpoint(endpoint)
}

export type PushInboxItem = {
  id: number
  kind: string
  title: string
  body: string
  url: string
  tag: string
  createdAt: string
  read: boolean
}

export type PushInbox = {
  items: PushInboxItem[]
  unreadCount: number
}

const EMPTY_INBOX: PushInbox = { items: [], unreadCount: 0 }

export async function listPushInbox(endpoint: string): Promise<PushInbox> {
  const subscription = await pushRepo.findPushSubscriptionByEndpoint(endpoint)
  if (!subscription) return EMPTY_INBOX

  await pushRepo.touchPushSubscriptionLastSeen(subscription.id)

  const [rows, readIds, currentRaffle] = await Promise.all([
    pushBroadcastsRepo.listPushBroadcastsSince(subscription.createdAt),
    pushInboxReadsRepo.listReadBroadcastIds(subscription.id),
    rafflesRepo.findFirstActiveOrPaused(),
  ])
  const readSet = new Set(readIds)
  const visible = keepLatestSaleProgressPerRaffle(rows, currentRaffle?.id ?? null)
  const items = visible.slice(0, INBOX_LIMIT).map((row) => ({
    id: row.id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    url: row.url || "/",
    tag: row.tag,
    createdAt: toIso(row.createdAt),
    read: readSet.has(row.id),
  }))
  const unreadCount = visible.reduce((count, row) => count + (readSet.has(row.id) ? 0 : 1), 0)

  return { items, unreadCount }
}

export async function markPushInboxRead(input: {
  endpoint: string
  ids?: number[]
  all?: boolean
}): Promise<PushInbox> {
  const subscription = await pushRepo.findPushSubscriptionByEndpoint(input.endpoint)
  if (!subscription) return EMPTY_INBOX

  if (input.all) {
    const allSince = await pushBroadcastsRepo.listPushBroadcastsSince(subscription.createdAt)
    await pushInboxReadsRepo.markBroadcastsRead({
      subscriptionId: subscription.id,
      broadcastIds: allSince.map((row) => row.id),
    })
  } else if (input.ids?.length) {
    await pushInboxReadsRepo.markBroadcastsRead({
      subscriptionId: subscription.id,
      broadcastIds: input.ids,
    })
  }

  return listPushInbox(input.endpoint)
}

export type AdminPushSubscriber = {
  id: number
  device: string
  displayName: string | null
  createdAt: string
  lastSeenAt: string
}

function toIso(value: Date | number | string): string {
  const date = value instanceof Date ? value : new Date(value)
  return date.toISOString()
}

export type AdminPushPlanRaffle = {
  id: number
  name: string
  status: string
  ticketsSold: number
  totalTickets: number
  soldPercent: number
}

export type AdminPushPlan = {
  raffle: AdminPushPlanRaffle | null
  milestones: ReturnType<typeof buildRaffleMilestonePlan>
  promotions: ReturnType<typeof buildRafflePromotionPlan>
}

export type AdminPushAutoAlert = PushAutoAlert

export async function listAdminPushSubscribers(): Promise<{
  enabled: boolean
  count: number
  subscribers: AdminPushSubscriber[]
  plan: AdminPushPlan
  autoAlerts: AdminPushAutoAlert[]
}> {
  const enabled = isWebPushConfigured()
  const [rows, autoAlerts] = await Promise.all([
    pushRepo.listPushSubscriptionSummaries(),
    pushAutoAlertsRepo.listPushAutoAlerts(),
  ])
  return {
    enabled,
    count: rows.length,
    subscribers: rows.map((row) => ({
      id: row.id,
      device: describePushDevice(row.userAgent),
      displayName: row.displayName?.trim() || null,
      createdAt: toIso(row.createdAt),
      lastSeenAt: toIso(row.lastSeenAt),
    })),
    plan: await loadAdminPushPlan(autoAlerts),
    autoAlerts,
  }
}

async function loadAdminPushPlan(autoAlerts: PushAutoAlert[]): Promise<AdminPushPlan> {
  const raffle = await rafflesRepo.findFirstActiveOrPaused()
  if (!raffle) {
    return { raffle: null, milestones: [], promotions: [] }
  }

  const [broadcastRows, promotions] = await Promise.all([
    pushBroadcastsRepo.listPushBroadcastsByRaffle(raffle.id),
    promotionsRepo.listPromotionsByRaffle(raffle.id),
  ])
  const broadcasts = broadcastRows.map((row) => ({
    kind: row.kind,
    milestoneId: row.milestoneId,
    promotionId: row.promotionId,
    title: row.title,
    body: row.body,
    sent: row.sent,
    createdAt: toIso(row.createdAt),
  }))

  const occupied = occupiedTickets(raffle.ticketsSold, raffle.ticketsReserved)

  return {
    raffle: {
      id: raffle.id,
      name: raffle.name,
      status: raffle.status,
      ticketsSold: occupied,
      totalTickets: raffle.totalTickets,
      soldPercent: soldPercent(occupied, raffle.totalTickets),
    },
    milestones: buildRaffleMilestonePlan({
      raffleName: raffle.name,
      ticketsSold: raffle.ticketsSold,
      ticketsReserved: raffle.ticketsReserved,
      totalTickets: raffle.totalTickets,
      milestonesSent: parsePushMilestonesSent(raffle.pushMilestonesSent),
      broadcasts,
      alerts: autoAlerts,
    }),
    promotions: buildRafflePromotionPlan({
      raffleName: raffle.name,
      promotions: promotions.map((promo) => ({
        id: promo.id,
        name: promo.name,
        isActive: promo.isActive,
      })),
      broadcasts,
    }),
  }
}

export async function sendManualBroadcast(input: {
  title: string
  body: string
  url?: string
}): Promise<{ sent: number; removed: number; total: number }> {
  if (!isWebPushConfigured()) {
    throw new ValidationError("Los avisos no están configurados en el servidor")
  }
  const raffle = await rafflesRepo.findFirstActiveOrPaused()
  return sendAndLog(
    {
      title: input.title,
      body: input.body,
      url: input.url?.trim() || "/",
      tag: `manual-${Date.now()}`,
    },
    { kind: "manual", raffleId: raffle?.id ?? null },
  )
}

export async function sendPushToAll(
  payload: PushPayload,
): Promise<{ sent: number; removed: number; total: number }> {
  const client = await loadWebPush()
  if (!client) {
    logger.warn("push:skip_unconfigured")
    return { sent: 0, removed: 0, total: 0 }
  }

  const rows = await pushRepo.listPushSubscriptions()
  if (rows.length === 0) return { sent: 0, removed: 0, total: 0 }

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url,
    tag: payload.tag,
    icon: payload.icon || defaultIcon(),
  })

  let sent = 0
  let removed = 0
  const staleIds: number[] = []

  const CHUNK = 40
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK)
    const results = await Promise.allSettled(
      chunk.map((row) =>
        client.sendNotification(
          { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
          body,
          { TTL: 60 * 60 * 12, urgency: "high" },
        ),
      ),
    )

    results.forEach((result, index) => {
      const row = chunk[index]
      if (result.status === "fulfilled") {
        sent += 1
        return
      }
      const statusCode =
        result.reason && typeof result.reason === "object" && "statusCode" in result.reason
          ? Number((result.reason as { statusCode: unknown }).statusCode)
          : undefined
      if (isGoneStatus(statusCode) && row) {
        staleIds.push(row.id)
        removed += 1
        return
      }
      logger.warn({ err: result.reason, subscriptionId: row?.id }, "push:send_failed")
    })
  }

  if (staleIds.length > 0) {
    const db = getDb()
    for (const id of staleIds) {
      await pushRepo.deletePushSubscriptionById(db, id)
    }
  }

  logger.info({ sent, removed, total: rows.length, tag: payload.tag }, "push:broadcast")
  return { sent, removed, total: rows.length }
}

async function sendAndLog(
  payload: PushPayload,
  meta: {
    kind: PushBroadcastKind
    raffleId?: number | null
    milestoneId?: string | null
    promotionId?: number | null
  },
): Promise<{ sent: number; removed: number; total: number }> {
  let broadcastId: number | null = null
  try {
    const inserted = await pushBroadcastsRepo.insertPushBroadcast({
      kind: meta.kind,
      raffleId: meta.raffleId ?? null,
      milestoneId: meta.milestoneId ?? null,
      promotionId: meta.promotionId ?? null,
      title: payload.title,
      body: payload.body,
      url: payload.url,
      tag: payload.tag,
      sent: 0,
      removed: 0,
      total: 0,
    })
    broadcastId = inserted.id
  } catch (err) {
    logger.error({ err, tag: payload.tag, kind: meta.kind }, "push:broadcast_log_failed")
  }

  const result = await sendPushToAll(payload)
  if (broadcastId != null) {
    try {
      await pushBroadcastsRepo.updatePushBroadcastDelivery(broadcastId, result)
    } catch (err) {
      logger.error({ err, tag: payload.tag, kind: meta.kind }, "push:broadcast_delivery_log_failed")
    }
  }
  return result
}

function raffleHomeUrl(raffleId: number): string {
  return absoluteUrl(`/rifa/${raffleId}`)
}

function raffleIcon(imageUrl: string | null | undefined): string {
  if (!imageUrl?.trim()) return defaultIcon()
  return absoluteUrl(imageUrl.trim())
}

export async function notifyNewRaffle(raffleId: number): Promise<void> {
  if (!isWebPushConfigured()) return

  const newRaffleAlert = await pushAutoAlertsRepo.findEnabledNewRaffleAlert()
  if (!newRaffleAlert) return

  const milestoneKey = alertMilestoneKey(newRaffleAlert.id)

  const claimed = await withImmediateTransaction(async (tx) => {
    const [row] = await tx
      .select({
        id: raffles.id,
        name: raffles.name,
        imageUrl: raffles.imageUrl,
        pushMilestonesSent: raffles.pushMilestonesSent,
      })
      .from(raffles)
      .where(eq(raffles.id, raffleId))
      .limit(1)
    if (!row) return null

    const already = parsePushMilestonesSent(row.pushMilestonesSent)
    if (isAlertAlreadySent(newRaffleAlert, already)) return null

    const merged = mergePushMilestones(already, [milestoneKey])
    await tx
      .update(raffles)
      .set({ pushMilestonesSent: serializePushMilestonesSent(merged), updatedAt: new Date() })
      .where(eq(raffles.id, raffleId))

    return row
  })

  if (!claimed) return

  const copy = pushAlertCopy(newRaffleAlert, claimed.name)
  await sendAndLog(
    {
      ...copy,
      url: raffleHomeUrl(raffleId),
      tag: `raffle-${raffleId}-new`,
      icon: raffleIcon(claimed.imageUrl),
    },
    { kind: "milestone", raffleId, milestoneId: milestoneKey },
  )
}

export async function notifySaleMilestones(raffleId: number): Promise<void> {
  if (!isWebPushConfigured()) return

  const saleAlerts = (await pushAutoAlertsRepo.listPushAutoAlerts()).filter(
    (alert) => alert.kind === "percent",
  )

  const claimed = await withImmediateTransaction(async (tx) => {
    const [row] = await tx
      .select({
        id: raffles.id,
        name: raffles.name,
        imageUrl: raffles.imageUrl,
        ticketsSold: raffles.ticketsSold,
        ticketsReserved: raffles.ticketsReserved,
        totalTickets: raffles.totalTickets,
        pushMilestonesSent: raffles.pushMilestonesSent,
      })
      .from(raffles)
      .where(eq(raffles.id, raffleId))
      .limit(1)
    if (!row) return null

    const already = parsePushMilestonesSent(row.pushMilestonesSent)
    const occupied = occupiedTickets(row.ticketsSold, row.ticketsReserved)
    const newly = newlyReachedSaleAlerts(occupied, row.totalTickets, already, saleAlerts)
    const highest = highestSaleAlert(newly)
    if (!highest) return null

    const merged = mergePushMilestones(
      already,
      newly.map((alert) => alertMilestoneKey(alert.id)),
    )
    await tx
      .update(raffles)
      .set({ pushMilestonesSent: serializePushMilestonesSent(merged), updatedAt: new Date() })
      .where(eq(raffles.id, raffleId))

    return { ...row, highest, newly }
  })

  if (!claimed) return

  const copy = pushAlertCopy(claimed.highest, claimed.name)
  const milestoneKey = alertMilestoneKey(claimed.highest.id)
  await sendAndLog(
    {
      ...copy,
      url: raffleHomeUrl(raffleId),
      tag: saleProgressPushTag(raffleId, milestoneKey),
      icon: raffleIcon(claimed.imageUrl),
    },
    { kind: "milestone", raffleId, milestoneId: milestoneKey },
  )
}

export function notifyNewRaffleInBackground(raffleId: number): void {
  void notifyNewRaffle(raffleId).catch((err) => {
    logger.error({ err, raffleId }, "push:new_raffle_failed")
  })
}

export function notifySaleMilestonesInBackground(raffleId: number): void {
  void notifySaleMilestones(raffleId).catch((err) => {
    logger.error({ err, raffleId }, "push:sale_milestones_failed")
  })
}

/**
 * Marks every sale alert already crossed by the raffle's current progress as
 * sent, WITHOUT sending any push. Used when a raffle enters circulation with
 * pre-existing progress (import/migration or re-activation) so stale
 * milestones never fire as old pushes on the next purchase.
 */
export async function seedPushMilestonesForExistingProgress(raffleId: number): Promise<boolean> {
  const saleAlerts = (await pushAutoAlertsRepo.listPushAutoAlerts()).filter(
    (alert) => alert.kind === "percent",
  )

  const seeded = await withImmediateTransaction(async (tx) => {
    const [row] = await tx
      .select({
        ticketsSold: raffles.ticketsSold,
        ticketsReserved: raffles.ticketsReserved,
        totalTickets: raffles.totalTickets,
        pushMilestonesSent: raffles.pushMilestonesSent,
      })
      .from(raffles)
      .where(eq(raffles.id, raffleId))
      .limit(1)
    if (!row) return false

    const already = parsePushMilestonesSent(row.pushMilestonesSent)
    const crossed = crossedSaleAlertKeys(
      occupiedTickets(row.ticketsSold, row.ticketsReserved),
      row.totalTickets,
      already,
      saleAlerts,
    )
    if (crossed.length === 0) return false

    const merged = mergePushMilestones(already, crossed)
    await tx
      .update(raffles)
      .set({ pushMilestonesSent: serializePushMilestonesSent(merged), updatedAt: new Date() })
      .where(eq(raffles.id, raffleId))
    return true
  })

  if (seeded) {
    logger.info({ raffleId }, "push:milestones_seeded")
  }
  return seeded
}


export async function notifyPromotion(raffleId: number, promotionId: number): Promise<void> {
  if (!isWebPushConfigured()) return

  const existing = await pushBroadcastsRepo.findPushBroadcastByPromotionId(promotionId)
  if (existing) return

  const promo = await promotionsRepo.findPromotionById(raffleId, promotionId)
  if (!promo?.isActive) return

  const raffle = await rafflesRepo.findRaffleById(raffleId)
  if (!raffle) return

  const copy = promotionPushCopy(promo.name, raffle.name)
  await sendAndLog(
    {
      ...copy,
      url: raffleHomeUrl(raffleId),
      tag: `raffle-${raffleId}-promo-${promotionId}`,
      icon: raffleIcon(raffle.imageUrl),
    },
    { kind: "promotion", raffleId, promotionId },
  )
}

export function notifyPromotionInBackground(raffleId: number, promotionId: number): void {
  void notifyPromotion(raffleId, promotionId).catch((err) => {
    logger.error({ err, raffleId, promotionId }, "push:promotion_failed")
  })
}

/** @internal tests */
export function resetWebPushClientForTests(): void {
  webPushClient = undefined
  webPushClientOverride = undefined
}

/** @internal tests */
export function setWebPushClientForTests(client: WebPushClient | undefined): void {
  webPushClientOverride = client
}
