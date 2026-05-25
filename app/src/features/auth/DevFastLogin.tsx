"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Zap } from "lucide-react"

const DEV_CREDENTIALS = {
  email: "admin@rifas.com",
  password: "admin123",
}

interface Props {
  onSignIn: (email: string, password: string) => Promise<unknown>
  label?: string
}

export function DevFastLogin({ onSignIn, label = "Fast Login (dev)" }: Props) {
  const [loading, setLoading] = useState(false)

  async function handle() {
    setLoading(true)
    try {
      await onSignIn(DEV_CREDENTIALS.email, DEV_CREDENTIALS.password)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handle}
      disabled={loading}
      className="gap-2 border-amber-500/50 text-amber-600 hover:bg-amber-50 dark:border-amber-400/30 dark:text-amber-400 dark:hover:bg-amber-950"
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
      {label}
    </Button>
  )
}
