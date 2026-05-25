import { createFileRoute, redirect } from "@tanstack/react-router"
import { z } from "zod"
import { LoginForm } from "@/features/auth/LoginForm"
import { getClientSession } from "@/features/auth/auth-client"
import { PublicLayout } from "@/features/layout/PublicLayout"

const loginSearchSchema = z.object({
  redirect: z.string().optional(),
})

export const Route = createFileRoute("/login")({
  validateSearch: loginSearchSchema,
  beforeLoad: () => {
    if (getClientSession()) {
      throw redirect({ to: "/admin" })
    }
  },
  component: LoginPage,
})

function LoginPage() {
  const { redirect: redirectTo } = Route.useSearch()

  return (
    <PublicLayout>
      <div className="container mx-auto flex min-h-[70vh] items-center justify-center px-4 py-10">
        <LoginForm redirectTo={redirectTo ?? "/admin"} />
      </div>
    </PublicLayout>
  )
}
