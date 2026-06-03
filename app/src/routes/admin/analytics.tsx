import { createFileRoute } from "@tanstack/react-router"
import { AdminAnalytics } from "@/features/admin/AdminAnalytics"
import { adminNavRouteHead } from "@/features/admin/admin-page-title"

export const Route = createFileRoute("/admin/analytics")({
  head: ({ matches }) => adminNavRouteHead(matches, "/admin/analytics"),
  component: AdminAnalytics,
})
