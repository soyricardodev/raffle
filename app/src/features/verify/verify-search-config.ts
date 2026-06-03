import {
  CreditCardIcon,
  EnvelopeSimpleIcon,
  type IconProps,
  PhoneIcon,
  TicketIcon,
} from "@phosphor-icons/react"
import type { ComponentType } from "react"
import type { VerifySearchType } from "@/features/verify/verify-profile"

export type VerifySearchMethodConfig = {
  value: VerifySearchType
  label: string
  shortLabel: string
  placeholder: string
  icon: ComponentType<IconProps>
}

export const VERIFY_SEARCH_METHODS: VerifySearchMethodConfig[] = [
  {
    value: "phone",
    label: "Teléfono",
    shortLabel: "Tel.",
    placeholder: "Ej: 04121234567",
    icon: PhoneIcon,
  },
  {
    value: "cedula",
    label: "Cédula",
    shortLabel: "CI",
    placeholder: "Ej: V12345678",
    icon: CreditCardIcon,
  },
  {
    value: "email",
    label: "Email",
    shortLabel: "Email",
    placeholder: "Ej: correo@email.com",
    icon: EnvelopeSimpleIcon,
  },
  {
    value: "ticket",
    label: "Boleto",
    shortLabel: "Nº",
    placeholder: "Ej: 1234",
    icon: TicketIcon,
  },
]

export function verifySearchMethodLabel(type: VerifySearchType): string {
  return VERIFY_SEARCH_METHODS.find((m) => m.value === type)?.label ?? type
}
