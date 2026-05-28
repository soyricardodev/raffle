import type { IconProps } from "@phosphor-icons/react"
import { CaretRight } from "@phosphor-icons/react"
import type { ComponentType } from "react"
import { cn } from "@/lib/utils"

type LifecycleOptionButtonProps = {
  icon: ComponentType<IconProps>
  label: string
  description: string
  disabled?: boolean
  destructive?: boolean
  primary?: boolean
  onClick: () => void
}

export function LifecycleOptionButton({
  icon: Icon,
  label,
  description,
  disabled,
  destructive,
  primary,
  onClick,
}: LifecycleOptionButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex min-h-[52px] w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
        "hover:bg-muted/60 active:bg-muted disabled:pointer-events-none disabled:opacity-50",
        destructive && "border-destructive/30 bg-destructive/5 hover:bg-destructive/10",
        primary && "border-primary/30 bg-primary/5 hover:bg-primary/10",
      )}
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full",
          destructive && "bg-destructive/15 text-destructive",
          primary && "bg-primary/15 text-primary",
          !destructive && !primary && "bg-muted text-foreground",
        )}
      >
        <Icon className="size-5" weight={primary || destructive ? "duotone" : "regular"} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{label}</span>
        <span className="text-muted-foreground block text-xs leading-snug">{description}</span>
      </span>
      <CaretRight className="text-muted-foreground size-4 shrink-0" />
    </button>
  )
}
