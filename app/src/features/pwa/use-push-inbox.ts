import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback, useEffect, useState } from "react"
import { buildPreviewInbox, type PushInbox } from "@/features/pwa/push-inbox-format"
import {
  markPushInboxRead,
  pushInboxQueryKey,
  pushInboxQueryOptions,
} from "@/features/pwa/push-inbox-queries"
import { readPwaStorage } from "@/features/pwa/pwa-storage"

export function usePushInbox(options: { enabled: boolean; preview: boolean }) {
  const queryClient = useQueryClient()
  const [previewInbox, setPreviewInbox] = useState<PushInbox>(() => buildPreviewInbox())
  const endpoint = options.preview ? null : readPwaStorage().subscribedEndpoint
  const query = useQuery({
    ...pushInboxQueryOptions(options.enabled && !options.preview ? endpoint : null),
    refetchInterval: options.enabled && !options.preview ? 60_000 : false,
  })

  useEffect(() => {
    if (!options.enabled || options.preview) return
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "pwa:push-received") {
        void queryClient.invalidateQueries({ queryKey: pushInboxQueryKey })
      }
    }
    navigator.serviceWorker?.addEventListener("message", onMessage)
    return () => navigator.serviceWorker?.removeEventListener("message", onMessage)
  }, [options.enabled, options.preview, queryClient])

  const markMutation = useMutation({
    mutationFn: (input: { ids?: number[]; all?: boolean }) => {
      const liveEndpoint = readPwaStorage().subscribedEndpoint
      if (!liveEndpoint) throw new Error("no-endpoint")
      return markPushInboxRead({ endpoint: liveEndpoint, ...input })
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: pushInboxQueryKey })
      const key = [...pushInboxQueryKey, readPwaStorage().subscribedEndpoint] as const
      const previous = queryClient.getQueryData<PushInbox>(key)
      if (previous) {
        queryClient.setQueryData<PushInbox>(key, optimisticInbox(previous, input))
      }
      return { previous, key }
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(ctx.key, ctx.previous)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: pushInboxQueryKey })
    },
  })

  const inbox = options.preview ? previewInbox : (query.data ?? { items: [], unreadCount: 0 })

  const markRead = useCallback(
    (input: { ids?: number[]; all?: boolean }) => {
      if (options.preview) {
        setPreviewInbox((current) => optimisticInbox(current, input))
        return
      }
      markMutation.mutate(input)
    },
    [markMutation, options.preview],
  )

  return {
    inbox,
    loading: !options.preview && query.isLoading,
    markRead,
  }
}

function optimisticInbox(current: PushInbox, input: { ids?: number[]; all?: boolean }): PushInbox {
  const ids = new Set(input.ids ?? [])
  const items = current.items.map((item) =>
    input.all || ids.has(item.id) ? { ...item, read: true } : item,
  )
  return {
    items,
    unreadCount: items.filter((item) => !item.read).length,
  }
}
