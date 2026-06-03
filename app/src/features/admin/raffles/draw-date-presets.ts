import { addDays, setHours, setMinutes } from "date-fns"
import type { DateTimePreset } from "@/components/ui/date-picker/types"

function noonInDays(daysFromNow: number): Date {
  return setMinutes(setHours(addDays(new Date(), daysFromNow), 12), 0)
}

export const drawDatePresets: DateTimePreset[] = [
  { label: "En 7 días", getValue: () => noonInDays(7) },
  { label: "En 15 días", getValue: () => noonInDays(15) },
  { label: "En 30 días", getValue: () => noonInDays(30) },
]
