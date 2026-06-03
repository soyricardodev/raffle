import type { SiteColors } from "@raffle/shared/site-config"
import type { EmailBrandingContext } from "./email-branding.server"
import { escapeHtml, toAbsoluteAssetUrl, verifyTicketsUrl } from "./email-html"

export type EmailLayoutOptions = {
  branding: EmailBrandingContext
  heroImageUrl?: string | null
  title: string
  preheader?: string
  bodyHtml: string
}

export function renderInfoRow(label: string, value: string, valueStyle?: string): string {
  const valueAttrs = valueStyle ? ` style="${valueStyle}"` : ""
  return `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid rgba(0,0,0,0.08);color:#555;font-size:14px;font-weight:600;width:42%;vertical-align:top;">
        ${escapeHtml(label)}
      </td>
      <td style="padding:10px 0;border-bottom:1px solid rgba(0,0,0,0.08);color:#333;font-size:14px;font-weight:700;text-align:right;vertical-align:top;"${valueAttrs}>
        ${value}
      </td>
    </tr>
  `.trim()
}

export function renderInfoSection(
  title: string,
  rowsHtml: string,
  colors: SiteColors,
): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${colors.secondary};border-radius:12px;border-left:5px solid ${colors.primary};margin:20px 0;">
      <tr>
        <td style="padding:20px;">
          <p style="margin:0 0 12px;color:${colors.primary};font-size:17px;font-weight:700;">${escapeHtml(title)}</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tbody>${rowsHtml}</tbody>
          </table>
        </td>
      </tr>
    </table>
  `.trim()
}

export function renderStatusBadge(
  label: string,
  gradient: string,
  shadowColor: string,
): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
      <tr>
        <td align="center" style="background:${gradient};color:#ffffff;font-size:16px;font-weight:700;padding:14px 24px;border-radius:999px;box-shadow:0 4px 14px ${shadowColor};">
          ${escapeHtml(label)}
        </td>
      </tr>
    </table>
  `.trim()
}

export function renderPrimaryCta(
  href: string,
  label: string,
  colors: SiteColors,
): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr>
        <td align="center">
          <a href="${escapeHtml(href)}" style="display:inline-block;background:linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%);color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:8px;">
            ${escapeHtml(label)}
          </a>
        </td>
      </tr>
    </table>
  `.trim()
}

export function renderVerifyCta(
  branding: EmailBrandingContext,
  customerPhone: string,
): string {
  if (!customerPhone.trim()) return ""
  const href = verifyTicketsUrl(branding.appUrl, customerPhone)
  return renderPrimaryCta(href, "Verificar mis boletos", branding.colors)
}

export function renderTicketsBlock(
  title: string,
  ticketGridHtml: string,
  colors: SiteColors,
  subtitle?: string,
): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg, ${colors.primary}15 0%, ${colors.accent}15 100%);border:2px solid ${colors.accent};border-radius:12px;margin:24px 0;">
      <tr>
        <td style="padding:24px 20px;text-align:center;">
          <p style="margin:0 0 16px;color:${colors.primary};font-size:18px;font-weight:700;">${escapeHtml(title)}</p>
          ${ticketGridHtml}
          ${subtitle ? `<p style="margin:16px 0 0;color:#666;font-size:14px;line-height:1.5;">${escapeHtml(subtitle)}</p>` : ""}
        </td>
      </tr>
    </table>
  `.trim()
}

export function renderInstructionsBox(title: string, items: string[]): string {
  const list = items
    .map((item) => `<li style="margin:6px 0;color:#333;font-size:14px;line-height:1.5;">${item}</li>`)
    .join("")
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#e3f2fd;border:1px solid #2196f3;border-radius:8px;margin:20px 0;">
      <tr>
        <td style="padding:20px;">
          <p style="margin:0 0 10px;color:#1976d2;font-size:16px;font-weight:700;">${escapeHtml(title)}</p>
          <ul style="margin:0;padding-left:20px;">${list}</ul>
        </td>
      </tr>
    </table>
  `.trim()
}

export function renderEmailDocument(options: EmailLayoutOptions): string {
  const { branding, title, preheader, bodyHtml } = options
  const { colors, siteName, tagline, logoUrl, contact, appUrl } = branding
  const heroUrl = toAbsoluteAssetUrl(options.heroImageUrl ?? null, appUrl)

  const logoBlock = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(siteName)}" width="160" height="48" style="display:block;max-width:160px;max-height:48px;width:auto;height:auto;margin:0 auto 12px;border:0;" />`
    : `<p style="margin:0 0 8px;font-size:26px;font-weight:700;color:#ffffff;">${escapeHtml(siteName)}</p>`

  const heroBlock = heroUrl
    ? `
      <tr>
        <td style="padding:0;line-height:0;">
          <img src="${escapeHtml(heroUrl)}" alt="${escapeHtml(title)}" width="600" height="200" style="display:block;width:100%;max-width:600px;height:auto;border:0;" />
        </td>
      </tr>
    `
    : ""

  const contactLines = [
    contact.phone.trim()
      ? `<p style="margin:4px 0;color:#666;font-size:14px;">Tel: ${escapeHtml(contact.phone)}</p>`
      : "",
    contact.email.trim()
      ? `<p style="margin:4px 0;color:#666;font-size:14px;">${escapeHtml(contact.email)}</p>`
      : "",
  ]
    .filter(Boolean)
    .join("")

  const preheaderHtml = preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(preheader)}</div>`
    : ""

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { margin:0; padding:0; -webkit-text-size-adjust:100%; }
    table { border-collapse:collapse; }
    img { border:0; outline:none; text-decoration:none; }
    @media only screen and (max-width: 620px) {
      .email-container { width:100% !important; }
      .email-padding { padding-left:16px !important; padding-right:16px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:linear-gradient(135deg, ${colors.secondary} 0%, #f8f9fa 100%);font-family:Arial,Helvetica,sans-serif;color:#333;">
  ${preheaderHtml}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:15px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.1);">
          <tr>
            <td style="background:linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%);padding:28px 20px;text-align:center;">
              ${logoBlock}
              <p style="margin:0;font-size:15px;color:rgba(255,255,255,0.92);">${escapeHtml(tagline)}</p>
            </td>
          </tr>
          ${heroBlock}
          <tr>
            <td class="email-padding" style="padding:28px 24px;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="background:#f8f9fa;padding:24px;text-align:center;">
              <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#333;">¡Gracias por participar!</p>
              <p style="margin:0 0 12px;font-size:14px;color:#666;">${escapeHtml(siteName)}</p>
              ${contactLines}
              <p style="margin:20px 0 0;font-size:12px;color:#999;line-height:1.5;">
                Este correo fue enviado automáticamente. Por favor no respondas a este mensaje.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function renderGreeting(customerName: string): string {
  return `<p style="margin:0 0 16px;font-size:16px;line-height:1.5;color:#333;">Hola <strong>${escapeHtml(customerName)}</strong>,</p>`
}

export function renderHeading(text: string, colors: SiteColors, align: "center" | "left" = "center"): string {
  return `<h1 style="margin:0 0 12px;color:${colors.primary};font-size:22px;font-weight:700;text-align:${align};line-height:1.3;">${escapeHtml(text)}</h1>`
}

export function renderSubtext(text: string): string {
  return `<p style="margin:0 0 20px;color:#666;font-size:15px;line-height:1.5;text-align:center;">${escapeHtml(text)}</p>`
}
