import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
  type KeyboardEvent,
} from "react"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"

export type DebouncedSearchParamOptions = {
  /** Delay before committing draft to URL (default 400ms). */
  delayMs?: number
  /** Trim whitespace before commit (default true). */
  trim?: boolean
}

export type DebouncedSearchParamBind = {
  value: string
  onChange: (event: ChangeEvent<HTMLInputElement>) => void
  onBlur: () => void
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
}

export type DebouncedSearchParamResult = {
  inputValue: string
  setInputValue: (value: string) => void
  committedValue: string
  /** Draft changed but debounce has not committed yet. */
  isDebouncing: boolean
  /** Input differs from the value already in the URL. */
  isDirty: boolean
  commitNow: () => void
  clear: () => void
  bind: DebouncedSearchParamBind
}

/**
 * Professional debounced search: instant local input, delayed URL commit,
 * no draft clobbering while typing or while our commit is in flight.
 *
 * Pattern: local draft + debounced commit + pending ref (TanStack Router style).
 */
export function useDebouncedSearchParam(
  urlSearch: string | null | undefined,
  onCommit: (nextSearch: string) => void,
  options: DebouncedSearchParamOptions = {},
): DebouncedSearchParamResult {
  const { delayMs = 400, trim = true } = options
  const committed = urlSearch ?? ""
  const [draft, setDraft] = useState(committed)
  const debouncedDraft = useDebouncedValue(draft, delayMs)
  const pendingCommitRef = useRef<string | null>(null)
  const [, startTransition] = useTransition()

  const normalize = useCallback(
    (value: string) => (trim ? value.trim() : value),
    [trim],
  )

  const commit = useCallback(
    (rawValue: string) => {
      const value = normalize(rawValue)
      const committedNormalized = normalize(committed)
      if (value === committedNormalized) {
        if (pendingCommitRef.current === value) {
          pendingCommitRef.current = null
        }
        return
      }
      pendingCommitRef.current = value
      startTransition(() => {
        onCommit(value)
      })
    },
    [committed, normalize, onCommit],
  )

  // Sync draft only for external URL changes (back/forward, Limpiar, deep link).
  useEffect(() => {
    const committedNormalized = normalize(committed)

    if (pendingCommitRef.current !== null) {
      if (committedNormalized === pendingCommitRef.current) {
        pendingCommitRef.current = null
      }
      return
    }

    setDraft((previous) => {
      if (previous === committed) return previous
      if (trim && normalize(previous) === committedNormalized) return previous
      return committed
    })
  }, [committed, normalize, trim])

  // Trailing debounce commit.
  useEffect(() => {
    commit(debouncedDraft)
  }, [commit, debouncedDraft])

  const commitNow = useCallback(() => {
    commit(draft)
  }, [commit, draft])

  const clear = useCallback(() => {
    setDraft("")
    commit("")
  }, [commit])

  const bind = useMemo<DebouncedSearchParamBind>(
    () => ({
      value: draft,
      onChange: (event) => setDraft(event.target.value),
      onBlur: () => commit(draft),
      onKeyDown: (event) => {
        if (event.key === "Enter") {
          event.preventDefault()
          commit(draft)
        }
        if (event.key === "Escape") {
          event.preventDefault()
          setDraft("")
          commit("")
        }
      },
    }),
    [commit, draft],
  )

  const committedNormalized = normalize(committed)
  const draftNormalized = normalize(draft)
  const debouncedNormalized = normalize(debouncedDraft)

  return {
    inputValue: draft,
    setInputValue: setDraft,
    committedValue: committedNormalized,
    isDebouncing: draftNormalized !== debouncedNormalized,
    isDirty: draftNormalized !== committedNormalized,
    commitNow,
    clear,
    bind,
  }
}
