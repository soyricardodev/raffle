import type { SiteColors } from "@raffle/shared/site-config"
import { escapeHtml } from "./email-html"

const DEFAULT_COLUMNS = 5

function formatTicketNumber(num: string): string {
  const trimmed = String(num).trim()
  if (/^\d+$/.test(trimmed) && trimmed.length <= 4) {
    return trimmed.padStart(4, "0")
  }
  return trimmed
}

/**
 * Renders ticket numbers in a table grid for email clients (no flexbox).
 */
export function renderEmailTicketGrid(
  ticketNumbers: string[],
  colors: SiteColors,
  columns = DEFAULT_COLUMNS,
): string {
  if (ticketNumbers.length === 0) {
    return `<p style="margin:0;color:#666;font-size:14px;text-align:center;">Sin números asignados</p>`
  }

  const cols = Math.max(2, Math.min(6, columns))
  const rows: string[][] = []
  for (let i = 0; i < ticketNumbers.length; i += cols) {
    rows.push(ticketNumbers.slice(i, i + cols))
  }

  const cellStyle = [
    "padding:6px 4px",
    "text-align:center",
    "vertical-align:middle",
    "font-family:'Courier New',Consolas,monospace",
    "font-size:13px",
    "font-weight:700",
    `color:${colors.primary}`,
    "background:#ffffff",
    `border:1px solid ${colors.accent}`,
    "border-radius:6px",
  ].join(";")

  const bodyRows = rows
    .map((row) => {
      const cells = row
        .map(
          (ticket) =>
            `<td style="${cellStyle}">${escapeHtml(formatTicketNumber(ticket))}</td>`,
        )
        .join("")
      const emptyCells = Array.from({ length: cols - row.length }, () => '<td style="padding:0;border:none;"></td>').join("")
      return `<tr>${cells}${emptyCells}</tr>`
    })
    .join("")

  return `
    <table role="presentation" cellpadding="0" cellspacing="6" width="100%" style="border-collapse:separate;border-spacing:6px;">
      <tbody>${bodyRows}</tbody>
    </table>
  `.trim()
}
