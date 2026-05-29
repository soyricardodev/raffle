import { QueryClient } from "@tanstack/react-query"

/** Fresh client per router instance so SSR loaders always fetch current data on hard reload. */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
      },
    },
  })
}
