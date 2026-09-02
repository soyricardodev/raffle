import { z } from "zod"

export const PushSubscribeInput = z.object({
  endpoint: z.string().url().max(2048),
  keys: z.object({
    p256dh: z.string().min(20).max(200),
    auth: z.string().min(8).max(100),
  }),
})
export type PushSubscribeInput = z.infer<typeof PushSubscribeInput>

export const PushUnsubscribeInput = z.object({
  endpoint: z.string().url().max(2048),
})
export type PushUnsubscribeInput = z.infer<typeof PushUnsubscribeInput>
