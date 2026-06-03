import { createFileRoute, Outlet } from "@tanstack/react-router"

type RifasSearch = {
  status?: string
  q?: string
  page?: number
  limit?: number
}

export const Route = createFileRoute("/admin/rifas")({
  validateSearch: (search: Record<string, unknown>): RifasSearch => ({
    status: typeof search.status === "string" ? search.status : undefined,
    q: typeof search.q === "string" ? search.q : undefined,
    page: Number.isFinite(Number(search.page)) ? Math.max(1, Number(search.page)) : undefined,
    limit: Number.isFinite(Number(search.limit)) ? Math.max(1, Number(search.limit)) : undefined,
  }),
  component: AdminRifasLayout,
})

function AdminRifasLayout() {
  return <Outlet />
}
