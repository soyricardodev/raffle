import { EmailType } from "@raffle/shared/validators"
import { z } from "zod"
import type { BuiltEmail } from "./email-types"
import { buildEmailForType, type PurchaseEmailContext } from "./email-templates"
import { RESENDABLE_EMAIL_TYPES } from "./email-delivery"

const EmailLogMetadata = z
  .object({
    new_status: z.enum(["approved", "rejected"]).optional(),
    modification: z.enum(["add", "remove"]).optional(),
    quantity: z.number().int().positive().optional(),
  })
  .passthrough()

export function parseEmailLogType(raw: string):
  | { ok: true; type: z.infer<typeof EmailType> }
  | { ok: false; error: string } {
  const parsed = EmailType.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, error: "Tipo de correo no válido en el registro" }
  }
  if (!RESENDABLE_EMAIL_TYPES.has(parsed.data)) {
    return { ok: false, error: "Tipo de correo no reenviable" }
  }
  return { ok: true, type: parsed.data }
}

export async function buildResendEmail(
  emailType: z.infer<typeof EmailType>,
  ctx: PurchaseEmailContext,
  metadata: Record<string, unknown> | null,
): Promise<BuiltEmail> {
  const meta = EmailLogMetadata.safeParse(metadata ?? {}).data

  switch (emailType) {
    case "status_update": {
      const status =
        meta?.new_status ??
        (ctx.status === "approved" ? "approved" : "rejected")
      return buildEmailForType("status_update", ctx, { status })
    }
    case "ticket_modification":
      return buildEmailForType("ticket_modification", ctx, {
        modification: meta?.modification === "remove" ? "remove" : "add",
        quantity: meta?.quantity ?? 1,
      })
    case "purchase_confirmation":
    case "purchase_reassign":
      return buildEmailForType(emailType, ctx)
    default:
      return buildEmailForType(emailType, ctx)
  }
}
