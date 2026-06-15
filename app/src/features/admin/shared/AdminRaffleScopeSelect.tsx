import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { raffleStatusLabel } from "@/features/admin/raffle-labels"
import { cn } from "@/lib/utils"

type AdminRaffleScopeSelectProps = {
  raffles: Array<{ id: number; name: string; status: string }>
  value: string | null
  onValueChange: (value: string) => void
  disabled?: boolean
  className?: string
  triggerClassName?: string
  size?: "sm" | "default"
  id?: string
  label?: string
  ariaLabel?: string
  allLabel?: string
  placeholder?: string
}

export function AdminRaffleScopeSelect({
  raffles,
  value,
  onValueChange,
  disabled = false,
  className,
  triggerClassName,
  size = "default",
  id,
  label,
  ariaLabel = "Filtrar por rifa",
  allLabel = "Todas las rifas",
  placeholder,
}: AdminRaffleScopeSelectProps) {
  return (
    <div className={cn(label ? "flex flex-col gap-2" : undefined, className)}>
      {label ? (
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
      ) : null}
      <Select value={value ?? "all"} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger
          id={id}
          size={size}
          className={cn(triggerClassName)}
          aria-label={label ? undefined : ariaLabel}
        >
          <SelectValue placeholder={placeholder ?? (raffles.length === 0 ? "Sin rifas" : allLabel)} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="all">{allLabel}</SelectItem>
            {raffles.map((raffle) => (
              <SelectItem key={raffle.id} value={String(raffle.id)}>
                {raffle.name} ({raffleStatusLabel(raffle.status)})
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  )
}
