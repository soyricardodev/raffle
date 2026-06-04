import { useEffect, useRef } from "react"

type UseInfiniteScrollSentinelOptions = {
  enabled?: boolean
  hasNextPage: boolean
  isFetching: boolean
  isFetchingNextPage: boolean
  fetchNextPage: () => void
  /** Preload distance before the sentinel enters the viewport. */
  rootMargin?: string
}

export function useInfiniteScrollSentinel({
  enabled = true,
  hasNextPage,
  isFetching,
  isFetchingNextPage,
  fetchNextPage,
  rootMargin = "480px 0px 480px 0px",
}: UseInfiniteScrollSentinelOptions) {
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!enabled) return
    const target = sentinelRef.current
    if (!target) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        if (!hasNextPage || isFetching || isFetchingNextPage) return
        fetchNextPage()
      },
      { root: null, rootMargin, threshold: 0 },
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [enabled, fetchNextPage, hasNextPage, isFetching, isFetchingNextPage, rootMargin])

  return sentinelRef
}
