import type { EmailBrandingContext } from "../email-branding.server"
import {
  renderEmailDocument,
  renderGreeting,
  renderHeading,
  renderInstructionsBox,
  renderSubtext,
} from "../email-layout"
import type { BuiltEmail, PurchaseEmailContext } from "../email-types"
import {
  renderCustomerSection,
  renderPurchaseDetailsSection,
  renderTicketsSection,
} from "./shared"

export function buildPurchaseConfirmationEmail(
  ctx: PurchaseEmailContext,
  branding: EmailBrandingContext,
): BuiltEmail {
  const bodyHtml = [
    renderGreeting(ctx.customerName),
    renderHeading("¡Compra registrada exitosamente!", branding.colors),
    renderSubtext("Tu participación en la rifa fue registrada. Estos son los detalles:"),
    renderCustomerSection(ctx, branding),
    renderPurchaseDetailsSection(ctx, branding),
    renderTicketsSection(ctx, branding),
    renderInstructionsBox("Próximos pasos", [
      "<strong>Revisión:</strong> Nuestro equipo verificará tu comprobante de pago.",
      "<strong>Aprobación:</strong> Recibirás un correo cuando tu compra sea aprobada.",
      "<strong>Sorteo:</strong> Participarás automáticamente en el sorteo programado.",
    ]),
  ].join("")

  const html = renderEmailDocument({
    branding,
    heroImageUrl: ctx.raffleImageUrl,
    title: `Confirmación de compra — ${ctx.raffleName}`,
    preheader: `Compra #${ctx.purchaseId} registrada — ${ctx.raffleName}`,
    bodyHtml,
  })

  return {
    type: "purchase_confirmation",
    subject: `Confirmación de compra — ${ctx.raffleName}`,
    html,
  }
}
