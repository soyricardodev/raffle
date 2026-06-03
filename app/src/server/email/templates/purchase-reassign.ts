import type { EmailBrandingContext } from "../email-branding.server"
import {
  renderEmailDocument,
  renderGreeting,
  renderHeading,
  renderStatusBadge,
  renderSubtext,
} from "../email-layout"
import type { BuiltEmail, PurchaseEmailContext } from "../email-types"
import { renderPurchaseDetailsSection, renderTicketsSection } from "./shared"

export function buildPurchaseReassignEmail(
  ctx: PurchaseEmailContext,
  branding: EmailBrandingContext,
): BuiltEmail {
  const bodyHtml = [
    renderGreeting(ctx.customerName),
    renderHeading("Tus boletos fueron actualizados", branding.colors),
    renderSubtext("Los números asignados a tu compra han cambiado. Revisa los nuevos números abajo."),
    renderStatusBadge(
      "Boletos reasignados",
      "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
      "rgba(59, 130, 246, 0.35)",
    ),
    renderPurchaseDetailsSection(ctx, branding),
    renderTicketsSection(ctx, branding),
  ].join("")

  const html = renderEmailDocument({
    branding,
    heroImageUrl: ctx.raffleImageUrl,
    title: `Boletos reasignados — ${ctx.raffleName}`,
    preheader: `Compra #${ctx.purchaseId}: números actualizados`,
    bodyHtml,
  })

  return {
    type: "purchase_reassign",
    subject: `Boletos reasignados — ${ctx.raffleName}`,
    html,
  }
}
