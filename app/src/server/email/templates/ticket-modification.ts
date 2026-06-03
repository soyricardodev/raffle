import type { EmailBrandingContext } from "../email-branding.server"
import {
  renderEmailDocument,
  renderGreeting,
  renderHeading,
  renderStatusBadge,
  renderSubtext,
} from "../email-layout"
import type { BuiltEmail, PurchaseEmailContext } from "../email-types"
import { renderPurchaseDetailsSection } from "./shared"

export function buildTicketModificationEmail(
  ctx: PurchaseEmailContext,
  branding: EmailBrandingContext,
  modification: "add" | "remove",
  quantity: number,
): BuiltEmail {
  const isAdd = modification === "add"
  const verb = isAdd ? "agregados" : "removidos"

  const bodyHtml = [
    renderGreeting(ctx.customerName),
    renderHeading(isAdd ? "Boletos agregados a tu compra" : "Boletos removidos de tu compra", branding.colors),
    renderSubtext(
      `Se ${verb} ${quantity} boleto(s) en tu compra #${ctx.purchaseId}.`,
    ),
    renderStatusBadge(
      isAdd ? `+${quantity} boleto(s) agregado(s)` : `-${quantity} boleto(s) removido(s)`,
      isAdd
        ? "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)"
        : "linear-gradient(135deg, #f59e0b 0%, #f97316 100%)",
      isAdd ? "rgba(34, 197, 94, 0.35)" : "rgba(245, 158, 11, 0.35)",
    ),
    renderPurchaseDetailsSection(ctx, branding),
  ].join("")

  const html = renderEmailDocument({
    branding,
    heroImageUrl: ctx.raffleImageUrl,
    title: `Boletos ${verb} — ${ctx.raffleName}`,
    preheader: `Compra #${ctx.purchaseId}: boletos ${verb}`,
    bodyHtml,
  })

  return {
    type: "ticket_modification",
    subject: `Boletos ${verb} — ${ctx.raffleName}`,
    html,
    metadata: { modification, quantity },
  }
}
