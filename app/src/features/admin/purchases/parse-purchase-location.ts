import type { CustomerLocationType } from "@raffle/shared/validators"

export function parsePurchaseLocationFormState(location: string | null | undefined): {
  locationType: CustomerLocationType
  selectedState: string
  customLocation: string
} {
  const loc = location?.trim() ?? ""
  if (loc.startsWith("Venezuela,")) {
    return {
      locationType: "venezuela",
      selectedState: loc.slice("Venezuela,".length).trim(),
      customLocation: "",
    }
  }
  if (loc) {
    return { locationType: "other", selectedState: "", customLocation: loc }
  }
  return { locationType: "venezuela", selectedState: "", customLocation: "" }
}
