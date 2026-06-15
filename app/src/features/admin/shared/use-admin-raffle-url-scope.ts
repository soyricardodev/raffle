import { useNavigate } from "@tanstack/react-router"
import { useEffect } from "react"

type FilterRaffle = { id: number }

type UseSanitizeAdminRaffleUrlParamOptions = {
  raffleId: string | null
  filterRaffles: Array<FilterRaffle>
  from: "/admin/compras" | "/admin/boletos"
}

export function useSanitizeAdminRaffleUrlParam({
  raffleId,
  filterRaffles,
  from,
}: UseSanitizeAdminRaffleUrlParamOptions) {
  const navigate = useNavigate({ from })

  useEffect(() => {
    if (!raffleId || filterRaffles.some((raffle) => String(raffle.id) === raffleId)) return

    void navigate({
      replace: true,
      search: (previous) => ({
        ...previous,
        raffle_id: undefined,
      }),
    })
  }, [filterRaffles, navigate, raffleId])
}
