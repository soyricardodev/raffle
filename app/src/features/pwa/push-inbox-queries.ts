import { queryOptions } from "@tanstack/react-query"
import type { PushInbox } from "@/features/pwa/push-inbox-format"

export const pushInboxQueryKey = ["push-inbox"] as const

async function readJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw new Error("No se pudieron cargar los avisos")
  }
  return (await res.json()) as T
}

export async function fetchPushInbox(endpoint: string): Promise<PushInbox> {
  const res = await fetch("/api/push/inbox", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ endpoint }),
  })
  return readJson<PushInbox>(res)
}

export async function markPushInboxRead(input: {
  endpoint: string
  ids?: number[]
  all?: boolean
}): Promise<PushInbox> {
  const res = await fetch("/api/push/inbox", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  })
  return readJson<PushInbox>(res)
}

export function pushInboxQueryOptions(endpoint: string | null) {
  return queryOptions({
    queryKey: [...pushInboxQueryKey, endpoint] as const,
    queryFn: () => {
      if (!endpoint) throw new Error("no-endpoint")
      return fetchPushInbox(endpoint)
    },
    enabled: Boolean(endpoint),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  })
}
