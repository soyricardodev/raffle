import { createFileRoute } from "@tanstack/react-router"
import { PaymentAccountsView } from "@/features/admin/payment-methods/PaymentAccountsView"

export const Route = createFileRoute("/admin/metodos-pago")({
  component: PaymentAccountsView,
})
