import { endOfMonth, startOfDay, startOfMonth, subDays } from "date-fns"
import type { DateRangePreset } from "@/components/ui/date-picker/types"

export const adminDateRangePresets: DateRangePreset[] = [
  {
    label: "Hoy",
    getRange: () => {
      const today = startOfDay(new Date())
      return { from: today, to: today }
    },
  },
  {
    label: "7 días",
    getRange: () => ({
      from: startOfDay(subDays(new Date(), 6)),
      to: startOfDay(new Date()),
    }),
  },
  {
    label: "30 días",
    getRange: () => ({
      from: startOfDay(subDays(new Date(), 29)),
      to: startOfDay(new Date()),
    }),
  },
  {
    label: "Este mes",
    getRange: () => ({
      from: startOfMonth(new Date()),
      to: startOfDay(endOfMonth(new Date())),
    }),
  },
]
