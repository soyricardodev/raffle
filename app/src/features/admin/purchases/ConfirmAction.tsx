import { useEffect, useRef, type ReactNode } from "react"

type ConfirmActionProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  pending?: boolean
  destructive?: boolean
}

/** Compatibility wrapper: administrative mutations run immediately, without a confirmation dialog. */
export function ConfirmAction({ open, onOpenChange, onConfirm }: ConfirmActionProps) {
  const handled = useRef(false)

  useEffect(() => {
    if (!open) {
      handled.current = false
      return
    }
    if (handled.current) return

    handled.current = true
    onConfirm()
    onOpenChange(false)
  }, [open, onConfirm, onOpenChange])

  return null
}
