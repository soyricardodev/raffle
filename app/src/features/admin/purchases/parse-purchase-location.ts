import { parseCustomerLocation } from "@raffle/shared/analytics"
import type { CustomerLocationType } from "@raffle/shared/validators"

export function parsePurchaseLocationFormState(location: string | null | undefined): {
  locationType: CustomerLocationType
  selectedState: string
  selectedMunicipality: string
  customLocation: string
} {
  const parsed = parseCustomerLocation(location)
  if (parsed.kind === "venezuela") {
    return {
      locationType: "venezuela",
      selectedState: parsed.state ?? "",
      selectedMunicipality: parsed.municipality ?? "",
      customLocation: "",
    }
  }
  if (parsed.kind === "international") {
    return {
      locationType: "other",
      selectedState: "",
      selectedMunicipality: "",
      customLocation: parsed.raw ?? "",
    }
  }
  return { locationType: "venezuela", selectedState: "", selectedMunicipality: "", customLocation: "" }
}
