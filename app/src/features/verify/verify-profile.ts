import { formatCustomerCi } from "@raffle/shared/validators"
import type { VerifyTicketInput } from "@raffle/shared/validators"
import type { CedulaPrefix, PhoneInputMode } from "@raffle/shared/validators"
import type { SavedBuyerProfile } from "@/features/raffle/purchase-form/buyer-profile-storage"

export type VerifySearchType = "phone" | "cedula" | "email" | "ticket"

export type VerifyUiMode = "quick" | "manual"

export type VerifyFormState = {
  method: VerifySearchType
  phone: string
  phoneMode: PhoneInputMode
  ciPrefix: CedulaPrefix
  ciNumber: string
  text: string
}

const emptyForm = (): VerifyFormState => ({
  method: "phone",
  phone: "",
  phoneMode: "venezuela",
  ciPrefix: "V",
  ciNumber: "",
  text: "",
})

export function maskPhoneTail(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  if (digits.length < 4) return phone
  return `···${digits.slice(-4)}`
}

export function hydrateVerifyFormFromProfile(
  profile: SavedBuyerProfile,
  method: VerifySearchType,
): VerifyFormState {
  return {
    method,
    phone: profile.customerPhone,
    phoneMode: profile.phoneMode,
    ciPrefix: profile.ciPrefix,
    ciNumber: profile.ciNumber,
    text: method === "email" ? profile.customerEmail : "",
  }
}

export function createVerifySession(profile: SavedBuyerProfile | null): {
  form: VerifyFormState
  savedProfile: SavedBuyerProfile | null
  uiMode: VerifyUiMode
} {
  if (!profile) {
    return { form: emptyForm(), savedProfile: null, uiMode: "manual" }
  }
  return {
    form: hydrateVerifyFormFromProfile(profile, "phone"),
    savedProfile: profile,
    uiMode: "quick",
  }
}

export function toVerifyInput(form: VerifyFormState): VerifyTicketInput | null {
  switch (form.method) {
    case "phone": {
      const phone = form.phone.trim()
      return phone ? { phone } : null
    }
    case "cedula": {
      const cedula = form.ciNumber.trim()
        ? formatCustomerCi(form.ciPrefix, form.ciNumber)
        : ""
      return cedula ? { cedula } : null
    }
    case "email": {
      const email = form.text.trim()
      return email ? { email } : null
    }
    case "ticket": {
      const ticketNumber = form.text.trim()
      return ticketNumber ? { ticketNumber } : null
    }
  }
}
