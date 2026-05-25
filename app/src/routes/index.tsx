import { createFileRoute, Link } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PublicLayout } from "@/features/layout/PublicLayout"
import { useSiteConfig } from "@/stores/site-config"

export const Route = createFileRoute("/")({
  component: HomePage,
})

function HomePage() {
  const { siteInfo } = useSiteConfig()

  return (
    <PublicLayout>
      <section className="container mx-auto px-4 py-12 md:py-16">
        <div className="mx-auto max-w-3xl space-y-6 text-center">
          <p className="text-muted-foreground text-sm uppercase tracking-[0.2em]">Rifas en línea</p>
          <h1 className="font-heading text-4xl font-semibold tracking-tight md:text-5xl">
            {siteInfo.site_name}
          </h1>
          <p className="text-muted-foreground text-lg">{siteInfo.tagline}</p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button asChild size="lg">
              <a href="#rifas">Ver rifas</a>
            </Button>
            <Button variant="outline" asChild size="lg">
              <Link to="/verificar">Verificar boletos</Link>
            </Button>
          </div>
        </div>
      </section>

      <section id="rifas" className="container mx-auto px-4 pb-16">
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>Rifa activa</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Landing completa (progreso, compra, galería) — pendiente Fase 3 (T-303…T-306).
            </p>
          </CardContent>
        </Card>
      </section>
    </PublicLayout>
  )
}
