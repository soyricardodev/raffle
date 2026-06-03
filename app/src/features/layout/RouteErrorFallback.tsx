import {
  type ErrorComponentProps,
  Link,
  type NotFoundRouteProps,
  useRouter,
} from "@tanstack/react-router"
import { ArrowLeft, Home, RefreshCw, SearchX, TriangleAlert } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
  formatRouteErrorDetails,
  type RouteErrorPresentation,
  resolveRouteError,
} from "./route-error-utils"

export type RouteErrorVariant = "public" | "admin"

const NOT_FOUND_PRESENTATION: RouteErrorPresentation = {
  title: "Página no encontrada",
  description: "La dirección que abriste no existe o ya no está disponible.",
  isNotFound: true,
}

type RouteProblemScreenProps = {
  presentation: RouteErrorPresentation
  variant: RouteErrorVariant
  onRetry?: () => void
  technicalDetails?: string
}

function RouteProblemScreen({
  presentation,
  variant,
  onRetry,
  technicalDetails,
}: RouteProblemScreenProps) {
  const router = useRouter()
  const [retrying, setRetrying] = useState(false)
  const homeTo = variant === "admin" ? "/admin" : "/"
  const homeLabel = variant === "admin" ? "Panel" : "Inicio"
  const Icon = presentation.isNotFound ? SearchX : TriangleAlert

  const handleRetry = () => {
    if (!onRetry) return
    setRetrying(true)
    onRetry()
    void router.invalidate().finally(() => {
      setRetrying(false)
    })
  }

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back()
      return
    }
    void router.navigate({ to: homeTo })
  }

  return (
    <main
      className={cn(
        "flex min-h-svh items-center justify-center px-4 py-10",
        variant === "admin" ? "bg-muted/30" : "bg-background",
      )}
      role="alert"
      aria-live="assertive"
    >
      <Card className="w-full max-w-md shadow-lg" size="sm">
        <CardHeader className="items-center text-center">
          <div
            className={cn(
              "mb-2 flex size-14 items-center justify-center rounded-full",
              presentation.isNotFound
                ? "bg-muted text-muted-foreground"
                : "bg-destructive/10 text-destructive",
            )}
            aria-hidden
          >
            <Icon className="size-7" strokeWidth={1.75} />
          </div>
          <CardTitle className="text-xl">{presentation.title}</CardTitle>
          <CardDescription className="text-balance">{presentation.description}</CardDescription>
          {presentation.code ? (
            <p className="text-muted-foreground font-mono text-xs tracking-wide">
              {presentation.code}
              {presentation.statusCode != null ? ` · ${presentation.statusCode}` : null}
            </p>
          ) : null}
        </CardHeader>

        {technicalDetails && import.meta.env.DEV ? (
          <CardContent>
            <details className="group rounded-2xl border border-border/80 bg-muted/40 px-3 py-2 text-left">
              <summary className="cursor-pointer list-none text-xs font-medium text-muted-foreground marker:content-none [&::-webkit-details-marker]:hidden">
                <span className="group-open:hidden">Ver detalles técnicos</span>
                <span className="hidden group-open:inline">Ocultar detalles técnicos</span>
              </summary>
              <pre className="mt-2 max-h-40 overflow-auto wrap-break-word font-mono text-[11px] leading-relaxed text-muted-foreground whitespace-pre-wrap">
                {technicalDetails}
              </pre>
            </details>
          </CardContent>
        ) : null}

        <CardFooter className="flex flex-col gap-2 sm:flex-row">
          {onRetry ? (
            <Button
              type="button"
              className="min-h-11 w-full sm:flex-1"
              onClick={handleRetry}
              disabled={retrying}
            >
              <RefreshCw className={cn("size-4", retrying && "animate-spin")} />
              {retrying ? "Reintentando…" : "Reintentar"}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full sm:flex-1"
            onClick={handleBack}
          >
            <ArrowLeft className="size-4" />
            Volver
          </Button>
          <Button type="button" variant="secondary" className="min-h-11 w-full sm:flex-1" asChild>
            <Link to={homeTo}>
              <Home className="size-4" />
              {homeLabel}
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </main>
  )
}

type RouteErrorFallbackProps = ErrorComponentProps & {
  variant?: RouteErrorVariant
}

export function RouteErrorFallback({
  error,
  info,
  reset,
  variant = "public",
}: RouteErrorFallbackProps) {
  const presentation = resolveRouteError(error)
  const technicalDetails = import.meta.env.DEV ? formatRouteErrorDetails(error, info) : undefined

  return (
    <RouteProblemScreen
      presentation={presentation}
      variant={variant}
      onRetry={reset}
      technicalDetails={technicalDetails}
    />
  )
}

export function createRouteErrorComponent(variant: RouteErrorVariant) {
  return function BoundRouteError(props: ErrorComponentProps) {
    return <RouteErrorFallback {...props} variant={variant} />
  }
}

export const PublicRouteError = createRouteErrorComponent("public")
export const AdminRouteError = createRouteErrorComponent("admin")

function RouteNotFoundShell({ variant }: { variant: RouteErrorVariant }) {
  return <RouteProblemScreen presentation={NOT_FOUND_PRESENTATION} variant={variant} />
}

export function PublicRouteNotFound(_props: NotFoundRouteProps) {
  return <RouteNotFoundShell variant="public" />
}

export function AdminRouteNotFound(_props: NotFoundRouteProps) {
  return <RouteNotFoundShell variant="admin" />
}
