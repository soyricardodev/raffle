import type { EmailBrandingContext } from "../email-branding.server"
import {
  renderEmailDocument,
  renderGreeting,
  renderHeading,
  renderSubtext,
} from "../email-layout"
import type { BuiltEmail, PurchaseEmailContext } from "../email-types"
import { renderPurchaseDetailsSection, renderTicketsSection } from "./shared"

export function buildTestEmail(
  ctx: PurchaseEmailContext,
  branding: EmailBrandingContext,
): BuiltEmail {
  const bodyHtml = [
    renderGreeting(ctx.customerName),
    renderHeading("Correo de prueba", branding.colors),
    renderSubtext("Este es un mensaje de prueba del sistema de rifas. El diseño refleja los correos reales."),
    renderPurchaseDetailsSection(ctx, branding),
    renderTicketsSection(ctx, branding),
  ].join("")

  const html = renderEmailDocument({
    branding,
    heroImageUrl: ctx.raffleImageUrl,
    title: `Email de prueba — ${ctx.raffleName}`,
    preheader: "Mensaje de prueba del sistema",
    bodyHtml,
  })

  return {
    type: "test",
    subject: `Email de prueba — ${ctx.raffleName}`,
    html,
  }
}
