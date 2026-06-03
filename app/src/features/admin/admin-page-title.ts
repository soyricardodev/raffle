import type { AnyRouteMatch } from "@tanstack/react-router"
import {
  ADMIN_ACCOUNT_PAGE_TITLE,
  adminNavItems,
  adminNavTitle,
  isAdminNavActive,
} from "@/features/admin/nav"
import type { AdminRaffleHubSearchTab } from "@/features/admin/raffles/admin-raffle-hub"
import { buildAdminPageHead, type DocumentHeadResult } from "@/features/layout/document-head"

export { ADMIN_ACCOUNT_PAGE_TITLE }

export type AdminRaffleIdLoaderData = {
  raffleName: string | null
}

type ResolveAdminPageTitleInput = {
  pathname: string
  search?: { tab?: AdminRaffleHubSearchTab }
  raffleName?: string | null
}

export function resolveAdminPageTitle({
  pathname,
  search,
  raffleName,
}: ResolveAdminPageTitleInput): string {
  if (pathname === "/admin/cuenta") return ADMIN_ACCOUNT_PAGE_TITLE

  const raffleDetailMatch = /^\/admin\/rifas\/[^/]+$/.exec(pathname)
  if (raffleDetailMatch) {
    const base = raffleName?.trim() || "Rifa"
    return search?.tab === "editar" ? `${base} · Editar` : base
  }

  for (const item of adminNavItems) {
    if (isAdminNavActive(pathname, item.href)) return item.name
  }

  return adminNavTitle("/admin")
}

export function raffleNameFromMatches(matches: AnyRouteMatch[]): string | null {
  const data = matches.find((m) => m.routeId === "/admin/rifas/$id")?.loaderData
  if (data && typeof data === "object" && data !== null && "raffleName" in data) {
    return (data as AdminRaffleIdLoaderData).raffleName
  }
  return null
}

export function adminRouteHead(input: {
  matches: AnyRouteMatch[]
  pageTitle?: string
  pathname?: string
  search?: { tab?: AdminRaffleHubSearchTab }
  raffleName?: string | null
  description?: string
}): DocumentHeadResult {
  const pageTitle =
    input.pageTitle ??
    resolveAdminPageTitle({
      pathname: input.pathname ?? "",
      search: input.search,
      raffleName: input.raffleName,
    })

  return buildAdminPageHead(pageTitle, input.matches, { description: input.description })
}

/** Document head for a static admin section keyed by nav href. */
export function adminNavRouteHead(
  matches: AnyRouteMatch[],
  href: string,
  options?: { description?: string },
): DocumentHeadResult {
  return adminRouteHead({ matches, pageTitle: adminNavTitle(href), ...options })
}
