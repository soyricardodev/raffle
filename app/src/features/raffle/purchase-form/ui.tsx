export function SectionHeader({ step, title }: { step: number; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="bg-primary/15 text-primary flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold">
        {step}
      </span>
      <h3 className="text-sm font-semibold">{title}</h3>
    </div>
  )
}

export function FieldHint({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-destructive text-xs">{message}</p>
}
