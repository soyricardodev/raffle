import type { VerifiedTicketRow, VerifyTicketInput } from "@raffle/shared/validators"
import { VerifyTicketInput as VerifyTicketSchema } from "@raffle/shared/validators"
import { useMutation } from "@tanstack/react-query"
import { useCallback, useRef, useState } from "react"
import { toast } from "sonner"
import { loadSavedBuyerProfile } from "@/features/raffle/purchase-form/buyer-profile-storage"
import {
  createVerifySession,
  hydrateVerifyFormFromProfile,
  toVerifyInput,
  type VerifyFormState,
  type VerifySearchType,
  type VerifyUiMode,
} from "@/features/verify/verify-profile"
import { publicFetch } from "@/lib/admin-fetch"

export function useTicketVerify() {
  const resultsRef = useRef<HTMLDivElement>(null)
  const [session] = useState(() =>
    createVerifySession(typeof window === "undefined" ? null : loadSavedBuyerProfile()),
  )

  const [uiMode, setUiMode] = useState<VerifyUiMode>(session.uiMode)
  const [form, setForm] = useState<VerifyFormState>(session.form)
  const savedProfile = session.savedProfile

  const scrollToResults = useCallback(() => {
    requestAnimationFrame(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    })
  }, [])

  const verifyMutation = useMutation({
    mutationFn: async (input: VerifyTicketInput) => {
      return publicFetch<VerifiedTicketRow[]>("/api/tickets/verify", {
        method: "POST",
        body: JSON.stringify(input),
      })
    },
    onMutate: scrollToResults,
    onSettled: scrollToResults,
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const patchForm = useCallback((patch: Partial<VerifyFormState>) => {
    setForm((current) => ({ ...current, ...patch }))
  }, [])

  const setMethod = useCallback(
    (method: VerifySearchType) => {
      if (savedProfile && uiMode === "quick") {
        setForm(hydrateVerifyFormFromProfile(savedProfile, method))
        return
      }
      setForm((current) => ({ ...current, method }))
    },
    [savedProfile, uiMode],
  )

  const enterManual = useCallback(() => {
    setUiMode("manual")
  }, [])

  const enterQuick = useCallback(() => {
    if (!savedProfile) return
    setUiMode("quick")
    setForm((current) => hydrateVerifyFormFromProfile(savedProfile, current.method))
  }, [savedProfile])

  const runSearch = useCallback(
    (target: VerifyFormState = form) => {
      const payload = toVerifyInput(target)
      if (!payload) {
        toast.error("Ingresa un valor para buscar")
        return
      }

      const parsed = VerifyTicketSchema.safeParse(payload)
      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message ?? "Datos inválidos")
        return
      }

      verifyMutation.mutate(parsed.data)
    },
    [form, verifyMutation],
  )

  const runQuickPhoneSearch = useCallback(() => {
    if (!savedProfile) return
    const quickForm = hydrateVerifyFormFromProfile(savedProfile, "phone")
    setForm(quickForm)
    setUiMode("quick")
    runSearch(quickForm)
  }, [savedProfile, runSearch])

  return {
    resultsRef,
    form,
    patchForm,
    setMethod,
    uiMode,
    enterManual,
    enterQuick,
    savedProfile,
    verifyMutation,
    runSearch,
    runQuickPhoneSearch,
  }
}
