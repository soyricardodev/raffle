import type { CedulaPrefix, PhoneInputMode, VerifyTicketInput } from "@raffle/shared/validators"
import { formatCustomerCi, parseCustomerCi } from "@raffle/shared/validators"
import type { SavedBuyerProfile } from "@/features/raffle/purchase-form/buyer-profile-storage"
import type { VerifyRouteSearch } from "@/features/verify/verify-route-search"

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

export type ParsedVerifyRouteSearch = {
  form: VerifyFormState
  autoSearch: boolean
}

export function parseVerifyRouteSearch(search: VerifyRouteSearch): ParsedVerifyRouteSearch | null {
  if (search.phone) {
    return {
      form: {
        ...emptyForm(),
        method: "phone",
        phone: search.phone,
      },
      autoSearch: search.auto === true,
    }
  }

  if (search.ticket) {
    return {
      form: {
        ...emptyForm(),
        method: "ticket",
        text: search.ticket,
      },
      autoSearch: search.auto === true,
    }
  }

  if (search.cedula) {
    const parsed = parseCustomerCi(search.cedula)
    if (!parsed) return null
    return {
      form: {
        ...emptyForm(),
        method: "cedula",
        ciPrefix: parsed.prefix,
        ciNumber: parsed.number,
      },
      autoSearch: search.auto === true,
    }
  }

  if (search.email) {
    return {
      form: {
        ...emptyForm(),
        method: "email",
        text: search.email,
      },
      autoSearch: search.auto === true,
    }
  }

  return null
}

export function toVerifyInput(form: VerifyFormState): VerifyTicketInput | null {
  switch (form.method) {
    case "phone": {
      const phone = form.phone.trim()
      return phone ? { phone } : null
    }
    case "cedula": {
      const cedula = form.ciNumber.trim() ? formatCustomerCi(form.ciPrefix, form.ciNumber) : ""
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
