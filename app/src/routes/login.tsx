import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router"
import { useEffect } from "react"
import { z } from "zod"
import { authClient } from "@/features/auth/auth-client"
import { LoginForm } from "@/features/auth/LoginForm"
import { PublicLayout } from "@/features/layout/PublicLayout"

const loginSearchSchema = z.object({
  redirect: z.string().optional(),
})

export const Route = createFileRoute("/login")({
  validateSearch: loginSearchSchema,
  beforeLoad: async () => {
    const session = await authClient.getSession()
    if (session.data) {
      throw redirect({ to: "/admin" })
    }
  },
  component: LoginPage,
})

function LoginPage() {
  const { redirect: redirectTo } = Route.useSearch()
  const navigate = useNavigate()
  const { data: session, isPending } = authClient.useSession()

  useEffect(() => {
    if (!isPending && session) {
      void navigate({ to: redirectTo ?? "/admin" })
    }
  }, [isPending, session, navigate, redirectTo])

  return (
    <PublicLayout>
      <div className="container mx-auto flex min-h-[70vh] items-center justify-center px-4 py-10">
        <LoginForm redirectTo={redirectTo ?? "/admin"} />
      </div>
    </PublicLayout>
  )
}
