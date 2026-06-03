import type { EmailBrandingContext } from "../email-branding.server"
import { escapeHtml } from "../email-html"
import {
  renderEmailDocument,
  renderGreeting,
  renderHeading,
  renderStatusBadge,
  renderSubtext,
} from "../email-layout"
import type { BuiltEmail, PurchaseEmailContext } from "../email-types"
import { renderPurchaseDetailsSection, renderTicketsSection } from "./shared"

export function buildStatusUpdateEmail(
  ctx: PurchaseEmailContext,
  branding: EmailBrandingContext,
  status: "approved" | "rejected",
): BuiltEmail {
  const approved = status === "approved"
  const label = approved ? "aprobada" : "rechazada"

  const reasonNote =
    !approved && ctx.notes?.trim()
      ? `<p style="margin:0 0 20px;padding:16px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;color:#991b1b;font-size:14px;line-height:1.5;"><strong>Motivo:</strong> ${escapeHtml(ctx.notes.trim())}</p>`
      : ""

  const badge = approved
    ? renderStatusBadge(
        "Compra aprobada",
        "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
        "rgba(34, 197, 94, 0.35)",
      )
    : renderStatusBadge(
        "Compra rechazada",
        "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
        "rgba(239, 68, 68, 0.35)",
      )

  const bodyHtml = [
    renderGreeting(ctx.customerName),
    renderHeading(approved ? "¡Tu compra fue aprobada!" : "Tu compra fue rechazada", branding.colors),
    renderSubtext(
      approved
        ? "Tus boletos quedaron oficialmente registrados."
        : "No pudimos validar tu pago. Revisa el motivo indicado abajo.",
    ),
    badge,
    reasonNote,
    renderPurchaseDetailsSection(ctx, branding),
    renderTicketsSection(ctx, branding, { includeVerifyCta: approved }),
  ].join("")

  const html = renderEmailDocument({
    branding,
    heroImageUrl: ctx.raffleImageUrl,
    title: `Compra ${label} — ${ctx.raffleName}`,
    preheader: `Compra #${ctx.purchaseId} ${label}`,
    bodyHtml,
  })

  return {
    type: "status_update",
    subject: `Compra ${label} — ${ctx.raffleName}`,
    html,
    metadata: { new_status: status },
  }
}
