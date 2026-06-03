import type { EmailType } from "@raffle/shared/validators"
import {
  ArrowsClockwiseIcon,
  CheckCircleIcon,
  EnvelopeSimpleIcon,
  TicketIcon,
  type Icon,
} from "@phosphor-icons/react"

export const EMAIL_TYPE_LABELS: Record<EmailType, string> = {
  purchase_confirmation: "Confirmación de compra",
  status_update: "Actualización de estado",
  ticket_modification: "Modificación de boletos",
  purchase_reassign: "Reasignación de boletos",
  test: "Prueba",
}

export const EMAIL_TYPE_OPTIONS: Array<{ value: EmailType | "all"; label: string }> = [
  { value: "all", label: "Todos los tipos" },
  { value: "purchase_confirmation", label: EMAIL_TYPE_LABELS.purchase_confirmation },
  { value: "status_update", label: EMAIL_TYPE_LABELS.status_update },
  { value: "ticket_modification", label: EMAIL_TYPE_LABELS.ticket_modification },
  { value: "purchase_reassign", label: EMAIL_TYPE_LABELS.purchase_reassign },
  { value: "test", label: EMAIL_TYPE_LABELS.test },
]

export type TestEmailVariant =
  | { type: "purchase_confirmation" }
  | { type: "status_update"; status: "approved" | "rejected" }
  | { type: "ticket_modification"; modification: "add" | "remove" }
  | { type: "purchase_reassign" }
  | { type: "test" }

export const TEST_EMAIL_VARIANTS: Array<{ id: string; label: string; variant: TestEmailVariant }> =
  [
    {
      id: "confirm",
      label: EMAIL_TYPE_LABELS.purchase_confirmation,
      variant: { type: "purchase_confirmation" },
    },
    {
      id: "approved",
      label: "Estado: aprobado",
      variant: { type: "status_update", status: "approved" },
    },
    {
      id: "rejected",
      label: "Estado: rechazado",
      variant: { type: "status_update", status: "rejected" },
    },
    {
      id: "add",
      label: "Agregar boletos",
      variant: { type: "ticket_modification", modification: "add" },
    },
    {
      id: "remove",
      label: "Quitar boletos",
      variant: { type: "ticket_modification", modification: "remove" },
    },
    {
      id: "reassign",
      label: EMAIL_TYPE_LABELS.purchase_reassign,
      variant: { type: "purchase_reassign" },
    },
    { id: "generic", label: "Mensaje genérico", variant: { type: "test" } },
  ]

export function testEmailPreviewSubject(variant: TestEmailVariant): string {
  if (variant.type === "status_update") {
    const label = variant.status === "approved" ? "aprobada" : "rechazada"
    return `Compra ${label} — Rifa de prueba`
  }
  if (variant.type === "ticket_modification") {
    const verb = variant.modification === "add" ? "agregados" : "removidos"
    return `Boletos ${verb} — Rifa de prueba`
  }
  if (variant.type === "test") return "Email de prueba — Rifa de prueba"
  if (variant.type === "purchase_confirmation") {
    return "Confirmación de compra — Rifa de prueba"
  }
  return `${EMAIL_TYPE_LABELS[variant.type]} — Rifa de prueba`
}

export function emailTypeLabel(type: string): string {
  if (type in EMAIL_TYPE_LABELS) {
    return EMAIL_TYPE_LABELS[type as EmailType]
  }
  return type.replace(/_/g, " ")
}

export function emailTypeIcon(type: string): Icon {
  switch (type) {
    case "purchase_confirmation":
      return EnvelopeSimpleIcon
    case "status_update":
      return CheckCircleIcon
    case "ticket_modification":
    case "purchase_reassign":
      return TicketIcon
    default:
      return ArrowsClockwiseIcon
  }
}

export const PROVIDER_LABELS: Record<string, string> = {
  noop: "Sin envío real (noop)",
  resend: "Resend",
  brevo: "Brevo",
}
