"use client"

import { useEffect, useState } from "react"
import { getLocalTimeZone } from "@/lib/date-input"

export function useLocalTimeZone() {
  const [timeZone, setTimeZone] = useState<string>()

  useEffect(() => {
    setTimeZone(getLocalTimeZone())
  }, [])

  return timeZone
}
