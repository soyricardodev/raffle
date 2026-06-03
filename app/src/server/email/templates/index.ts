import type { EmailType } from "@raffle/shared/validators"
import type { EmailBrandingContext } from "../email-branding.server"
import type { BuiltEmail, EmailBuildOptions, PurchaseEmailContext } from "../email-types"
import { buildPurchaseConfirmationEmail } from "./purchase-confirmation"
import { buildPurchaseReassignEmail } from "./purchase-reassign"
import { buildStatusUpdateEmail } from "./status-update"
import { buildTestEmail } from "./test"
import { buildTicketModificationEmail } from "./ticket-modification"

export function buildStyledEmail(
  type: EmailType,
  ctx: PurchaseEmailContext,
  branding: EmailBrandingContext,
  options?: EmailBuildOptions,
): BuiltEmail {
  switch (type) {
    case "purchase_confirmation":
      return buildPurchaseConfirmationEmail(ctx, branding)
    case "status_update": {
      const status =
        options?.status ?? (ctx.status === "approved" ? "approved" : "rejected")
      return buildStatusUpdateEmail(ctx, branding, status)
    }
    case "ticket_modification":
      return buildTicketModificationEmail(
        ctx,
        branding,
        options?.modification ?? "add",
        options?.quantity ?? 1,
      )
    case "purchase_reassign":
      return buildPurchaseReassignEmail(ctx, branding)
    case "test":
    default:
      return buildTestEmail(ctx, branding)
  }
}
