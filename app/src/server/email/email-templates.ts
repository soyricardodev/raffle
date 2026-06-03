import type { EmailType } from "@raffle/shared/validators"
import { loadEmailBranding } from "./email-branding.server"
import type { BuiltEmail, EmailBuildOptions, PurchaseEmailContext } from "./email-types"
import { buildStyledEmail } from "./templates"

export { escapeHtml } from "./email-html"
export {
  buildPurchaseEmailContext,
  formatPurchaseTotal,
  type BuiltEmail,
  type EmailBuildOptions,
  type PurchaseEmailContext,
} from "./email-types"

export async function buildEmailForType(
  type: EmailType,
  ctx: PurchaseEmailContext,
  options?: EmailBuildOptions,
): Promise<BuiltEmail> {
  const branding = await loadEmailBranding()
  return buildStyledEmail(type, ctx, branding, options)
}

/** Sample context when no purchase exists (admin test to arbitrary address). */
export async function buildSampleTestEmail(
  type: EmailType,
  to: string,
  options?: { status?: "approved" | "rejected"; modification?: "add" | "remove" },
): Promise<BuiltEmail> {
  const ctx: PurchaseEmailContext = {
    purchaseId: 0,
    customerName: "Cliente de prueba",
    customerEmail: to,
    customerPhone: "04141234567",
    customerCi: "V-12345678",
    ticketQuantity: 3,
    totalAmountCents: 1500,
    paymentMethod: "pago_movil",
    paymentMethodLabel: "Pago móvil",
    paymentReference: "REF-TEST-001",
    raffleName: "Rifa de prueba",
    raffleImageUrl: null,
    status: options?.status === "approved" ? "approved" : "pending",
    ticketNumbers: ["001", "002", "003"],
  }
  if (type === "test") {
    return buildEmailForType("test", ctx)
  }
  return buildEmailForType(type, ctx, options)
}
