import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

type ColorFieldProps = {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  className?: string
  error?: string
}

export function ColorField({ id, label, value, onChange, className, error }: ColorFieldProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)} data-invalid={!!error}>
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-3">
        <label
          htmlFor={`${id}-picker`}
          className="relative size-11 shrink-0 cursor-pointer overflow-hidden rounded-xl border ring-1 ring-border"
          style={{ backgroundColor: value }}
        >
          <input
            id={`${id}-picker`}
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
            aria-label={`Elegir color ${label}`}
          />
        </label>
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-11 font-mono text-sm"
          placeholder="#000000"
          aria-invalid={!!error}
        />
      </div>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </div>
  )
}
