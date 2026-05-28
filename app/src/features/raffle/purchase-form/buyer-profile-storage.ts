import type { CedulaPrefix, CustomerLocationType } from "@raffle/shared/validators"
import type { PhoneInputMode } from "@raffle/shared/validators/buyer-identity"

const STORAGE_KEY = "raffle:buyer-profile:v1"

export type SavedBuyerProfile = {
  customerName: string
  customerPhone: string
  customerEmail: string
  ciPrefix: CedulaPrefix
  ciNumber: string
  phoneMode: PhoneInputMode
  locationType: CustomerLocationType
  selectedState: string
  customLocation: string
  savedAt: number
}

export function loadSavedBuyerProfile(): SavedBuyerProfile | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<SavedBuyerProfile>
    if (
      !parsed.customerName ||
      !parsed.customerPhone ||
      !parsed.customerEmail ||
      !parsed.ciPrefix ||
      !parsed.ciNumber ||
      !parsed.phoneMode ||
      !parsed.locationType
    ) {
      return null
    }
    return {
      customerName: parsed.customerName,
      customerPhone: parsed.customerPhone,
      customerEmail: parsed.customerEmail,
      ciPrefix: parsed.ciPrefix,
      ciNumber: parsed.ciNumber,
      phoneMode: parsed.phoneMode,
      locationType: parsed.locationType,
      selectedState: parsed.selectedState ?? "",
      customLocation: parsed.customLocation ?? "",
      savedAt: parsed.savedAt ?? 0,
    }
  } catch {
    return null
  }
}

export function saveBuyerProfile(profile: Omit<SavedBuyerProfile, "savedAt">): void {
  if (typeof window === "undefined") return
  const payload: SavedBuyerProfile = { ...profile, savedAt: Date.now() }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}

export function clearSavedBuyerProfile(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(STORAGE_KEY)
}
