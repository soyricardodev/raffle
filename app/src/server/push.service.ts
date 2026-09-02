import { raffles } from "@raffle/shared/db"
import {
  highestSaleMilestone,
  mergePushMilestones,
  newlyReachedSaleMilestones,
  type PushMilestoneId,
  parsePushMilestonesSent,
  serializePushMilestonesSent,
} from "@raffle/shared/push"
import { eq } from "drizzle-orm"
import { getDb, withImmediateTransaction } from "@/lib/db.server"
import { getEnv } from "@/lib/env"
import { getLogger } from "@/lib/logger"
import * as pushRepo from "./repositories/push-subscriptions.repository"

const logger = getLogger()

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
}): Promise<void> {
  await pushRepo.upsertPushSubscription({
    endpoint: input.endpoint,
    p256dh: input.p256dh,
    auth: input.auth,
    userAgent: input.userAgent?.slice(0, 240) ?? null,
  })
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  await pushRepo.deletePushSubscriptionByEndpoint(endpoint)
}

export async function sendPushToAll(
  payload: PushPayload,
): Promise<{ sent: number; removed: number }> {
  const client = await loadWebPush()
  if (!client) {
    logger.warn("push:skip_unconfigured")
    return { sent: 0, removed: 0 }
  }

  const rows = await pushRepo.listPushSubscriptions()
  if (rows.length === 0) return { sent: 0, removed: 0 }

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
  return { sent, removed }
}

function saleCopy(milestone: PushMilestoneId, raffleName: string): { title: string; body: string } {
  const name = raffleName.trim() || "la rifa"
  switch (milestone) {
    case "new_raffle":
      return {
        title: "¡Nueva rifa al aire!",
        body: `${name}. Entra ya por tus boletos.`,
      }
    case "sold_10":
      return {
        title: "Ya va el 10%",
        body: `${name} se está moviendo. Asegura tus boletos.`,
      }
    case "sold_50":
      return {
        title: "¡Mitad vendida!",
        body: `${name} ya va por el 50%. No te quedes fuera.`,
      }
    case "remaining_10":
      return {
        title: "Queda el 10%",
        body: `Últimos boletos de ${name}. Es ahora o nunca.`,
      }
  }
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
    if (already.includes("new_raffle")) return null

    const merged = mergePushMilestones(already, ["new_raffle"])
    await tx
      .update(raffles)
      .set({ pushMilestonesSent: serializePushMilestonesSent(merged), updatedAt: new Date() })
      .where(eq(raffles.id, raffleId))

    return row
  })

  if (!claimed) return

  const copy = saleCopy("new_raffle", claimed.name)
  await sendPushToAll({
    ...copy,
    url: raffleHomeUrl(raffleId),
    tag: `raffle-${raffleId}-new`,
    icon: raffleIcon(claimed.imageUrl),
  })
}

export async function notifySaleMilestones(raffleId: number): Promise<void> {
  if (!isWebPushConfigured()) return

  const claimed = await withImmediateTransaction(async (tx) => {
    const [row] = await tx
      .select({
        id: raffles.id,
        name: raffles.name,
        imageUrl: raffles.imageUrl,
        ticketsSold: raffles.ticketsSold,
        totalTickets: raffles.totalTickets,
        pushMilestonesSent: raffles.pushMilestonesSent,
      })
      .from(raffles)
      .where(eq(raffles.id, raffleId))
      .limit(1)
    if (!row) return null

    const already = parsePushMilestonesSent(row.pushMilestonesSent)
    const newly = newlyReachedSaleMilestones(row.ticketsSold, row.totalTickets, already)
    const highest = highestSaleMilestone(newly)
    if (!highest) return null

    const merged = mergePushMilestones(already, newly)
    await tx
      .update(raffles)
      .set({ pushMilestonesSent: serializePushMilestonesSent(merged), updatedAt: new Date() })
      .where(eq(raffles.id, raffleId))

    return { ...row, highest, newly }
  })

  if (!claimed) return

  const copy = saleCopy(claimed.highest, claimed.name)
  await sendPushToAll({
    ...copy,
    url: raffleHomeUrl(raffleId),
    tag: `raffle-${raffleId}-${claimed.highest}`,
    icon: raffleIcon(claimed.imageUrl),
  })
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

/** @internal tests */
export function resetWebPushClientForTests(): void {
  webPushClient = undefined
  webPushClientOverride = undefined
}

/** @internal tests */
export function setWebPushClientForTests(client: WebPushClient | undefined): void {
  webPushClientOverride = client
}
