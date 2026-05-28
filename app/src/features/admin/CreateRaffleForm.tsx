import { useMutation } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { toast } from "sonner"
import type { CreateRaffleInput } from "@raffle/shared/validators"
import { RaffleForm } from "@/features/admin/raffles/RaffleForm"
import { defaultRaffleFormState } from "@/features/admin/raffles/types"
import { defaultPaymentMethod } from "@/features/admin/PaymentMethodsEditor"
import { adminFetch } from "@/lib/admin-fetch"

const initialState = () => ({
  ...defaultRaffleFormState(),
  methods: [defaultPaymentMethod()],
})

export function CreateRaffleForm() {
  const navigate = useNavigate()

  const createMutation = useMutation({
    mutationFn: async (payload: CreateRaffleInput) =>
      adminFetch<{ raffleId: number }>("/api/admin/raffles/", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: (result) => {
      toast.success(`Rifa creada (#${result.raffleId})`)
      void navigate({ to: "/admin/rifas/$id", params: { id: String(result.raffleId) } })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  return (
    <RaffleForm
      mode="create"
      title="Nueva rifa"
      description="Configura tu rifa paso a paso. Los boletos son siempre 10.000 (0000-9999)."
      initial={initialState()}
      isPending={createMutation.isPending}
      onSubmit={(payload) => createMutation.mutate(payload as CreateRaffleInput)}
      onCancel={() => void navigate({ to: "/admin/rifas" })}
    />
  )
}
