import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/admin/edit/$id")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/admin/rifas/$id",
      params: { id: params.id },
      search: { tab: "editar" },
    })
  },
})
