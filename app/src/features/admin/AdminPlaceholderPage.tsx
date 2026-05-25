type AdminPlaceholderPageProps = {
  title: string
  description: string
}

export function AdminPlaceholderPage({ title, description }: AdminPlaceholderPageProps) {
  return (
    <div className="space-y-2">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-muted-foreground max-w-2xl text-sm">{description}</p>
    </div>
  )
}
