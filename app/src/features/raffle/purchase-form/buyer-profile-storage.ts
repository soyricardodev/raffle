import {
  type CedulaPrefix,
  type CustomerLocationType,
  normalizeCountryScope,
} from "@raffle/shared/validators"

const STORAGE_KEY = "raffle:buyer-profile:v1"

export type SavedBuyerProfile = {
  customerName: string
  customerPhone: string
  customerEmail: string
  ciPrefix: CedulaPrefix
  ciNumber: string
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
      locationType: normalizeCountryScope(parsed.locationType),
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

export function buyerFirstName(fullName: string, fallback = ""): string {
  const trimmed = fullName.trim()
  if (!trimmed) return fallback
  return trimmed.split(/\s+/)[0] ?? trimmed
}
