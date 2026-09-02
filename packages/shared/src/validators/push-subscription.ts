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

export const AdminPushBroadcastInput = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Escribe un título")
    .max(80, "El título es demasiado largo"),
  body: z
    .string()
    .trim()
    .min(1, "Escribe el mensaje")
    .max(180, "El mensaje es demasiado largo"),
  url: z
    .string()
    .trim()
    .max(500)
    .optional()
    .refine(
      (value) => !value || value.startsWith("/") || /^https:\/\//i.test(value),
      "Usa una ruta del sitio o un link https",
    ),
})
export type AdminPushBroadcastInput = z.infer<typeof AdminPushBroadcastInput>
