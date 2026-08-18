import { CheckCircleIcon } from "@phosphor-icons/react"

export function FieldReadyMark({ visible }: { visible: boolean }) {
  if (!visible) return null
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
      <CheckCircleIcon className="size-3.5" weight="fill" aria-hidden />
      Listo
    </span>
  )
}
