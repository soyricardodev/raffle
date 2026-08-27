import type { EmailBrandingContext } from "../email-branding.server"
import { escapeHtml } from "../email-html"
import {
  renderInfoRow,
  renderInfoSection,
  renderTicketsBlock,
  renderVerifyCta,
} from "../email-layout"
import { renderEmailTicketGrid } from "../email-ticket-grid"
import type { PurchaseEmailContext } from "../email-types"
import { formatPurchaseTotal } from "../email-types"

export function renderPurchaseDetailsSection(
  ctx: PurchaseEmailContext,
  branding: EmailBrandingContext,
  extraRows: string[] = [],
): string {
  const { colors } = branding
  const totalStyle = `color:${colors.primary};font-size:17px;`

  const rows = [
    renderInfoRow("Compra", `#${ctx.purchaseId}`),
    renderInfoRow(
      "Boletos",
      ctx.ticketNumbers?.length
        ? String(ctx.ticketNumbers.length)
        : String(ctx.ticketQuantity),
    ),
    renderInfoRow("Rifa", escapeHtml(ctx.raffleName)),
    renderInfoRow("Método de pago", escapeHtml(ctx.paymentMethodLabel)),
    ...(ctx.paymentReference?.trim()
      ? [renderInfoRow("Referencia", escapeHtml(ctx.paymentReference.trim()))]
      : []),
    ...(ctx.paymentPayerName?.trim()
      ? [renderInfoRow("Nombre de quien paga", escapeHtml(ctx.paymentPayerName.trim()))]
      : []),
    renderInfoRow("Total", escapeHtml(formatPurchaseTotal(ctx)), totalStyle),
    ...extraRows,
  ].join("")

  return renderInfoSection("Detalles de la compra", rows, colors)
}

export function renderCustomerSection(
  ctx: PurchaseEmailContext,
  branding: EmailBrandingContext,
): string {
  const rows = [
    renderInfoRow("Nombre", escapeHtml(ctx.customerName)),
    renderInfoRow("Teléfono", escapeHtml(ctx.customerPhone)),
    renderInfoRow("Correo", escapeHtml(ctx.customerEmail)),
    ...(ctx.customerCi?.trim()
      ? [renderInfoRow("Cédula", escapeHtml(ctx.customerCi.trim()))]
      : []),
  ].join("")
  return renderInfoSection("Información personal", rows, branding.colors)
}

export function renderTicketsSection(
  ctx: PurchaseEmailContext,
  branding: EmailBrandingContext,
  options?: { includeVerifyCta?: boolean },
): string {
  const tickets = ctx.ticketNumbers ?? []
  const grid =
    tickets.length > 0
      ? renderEmailTicketGrid(tickets, branding.colors)
      : `<p style="margin:0;color:#666;font-size:14px;">Cantidad: <strong>${ctx.ticketQuantity}</strong></p>`

  const block = renderTicketsBlock(
    "Tus números de boletos",
    grid,
    branding.colors,
    tickets.length > 0 ? "Guarda estos números. Son tu participación en el sorteo." : undefined,
  )

  const verify =
    options?.includeVerifyCta !== false && ctx.customerPhone.trim()
      ? renderVerifyCta(branding, ctx.customerPhone)
      : ""

  return `${block}${verify}`
}
