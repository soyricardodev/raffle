import { createFileRoute } from "@tanstack/react-router"
import { PaymentAccountsView } from "@/features/admin/payment-methods/PaymentAccountsView"
import { adminNavRouteHead } from "@/features/admin/admin-page-title"

export const Route = createFileRoute("/admin/metodos-pago")({
  head: ({ matches }) => adminNavRouteHead(matches, "/admin/metodos-pago"),
  component: PaymentAccountsView,
})
