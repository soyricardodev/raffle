export type AdminRaffleHubTab = "resumen" | "editar"

/** Tab value encoded in `/admin/rifas/$id` search params. */
export type AdminRaffleHubSearchTab = "editar"

export function adminRaffleHubLink(id: string | number) {
  return {
    to: "/admin/rifas/$id" as const,
    params: { id: String(id) },
  }
}

export function adminRaffleHubTabSearch(tab: AdminRaffleHubTab): { tab?: AdminRaffleHubSearchTab } {
  return tab === "editar" ? { tab: "editar" } : {}
}

export function hubTabFromSearch(tab: AdminRaffleHubSearchTab | undefined): AdminRaffleHubTab {
  return tab === "editar" ? "editar" : "resumen"
}

export function parseAdminRaffleHubSearch(search: Record<string, unknown>): {
  tab?: AdminRaffleHubSearchTab
} {
  return {
    tab: search.tab === "editar" ? "editar" : undefined,
  }
}
