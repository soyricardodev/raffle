import { Bell, Copy, ExternalLink, LockKeyhole } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  androidChromeIntentUrl,
  copyableHttpsUrl,
  detectInAppBrowserKind,
  detectPhoneType,
  type InAppBrowserKind,
  inAppSourceLabel,
  iosSafariSchemeUrl,
  type PhoneType,
} from "@/features/pwa/in-app-browser"
import { PWA_NAME } from "@/features/pwa/pwa-brand"
import { cn } from "@/lib/utils"

const SKIP_KEY = "raffle.inapp.skip"

type GateState = {
  kind: InAppBrowserKind
  phoneType: PhoneType
}

function readGate(): GateState | null {
  if (typeof window === "undefined") return null
  if (sessionStorage.getItem(SKIP_KEY) === "1") return null
  const ua = navigator.userAgent
  const kind = detectInAppBrowserKind(ua)
  const phoneType = detectPhoneType(ua)
  if (!kind || !phoneType) return null
  return { kind, phoneType }
}

export function InAppBrowserGate() {
  const [gate, setGate] = useState<GateState | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setGate(readGate())
  }, [])

  useEffect(() => {
    if (!gate) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [gate])

  useEffect(() => {
    if (!gate || gate.phoneType !== "android") return
    const timer = window.setTimeout(() => {
      window.location.href = androidChromeIntentUrl(window.location.href)
    }, 900)
    return () => window.clearTimeout(timer)
  }, [gate])

  if (!gate) return null

  const siteName = PWA_NAME
  const source = inAppSourceLabel(gate.kind)
  const href = typeof window !== "undefined" ? window.location.href : ""

  const openExternal = () => {
    if (gate.phoneType === "android") {
      window.location.href = androidChromeIntentUrl(href)
      return
    }
    window.location.href = iosSafariSchemeUrl(href)
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(copyableHttpsUrl(href))
      setCopied(true)
      toast.success("Enlace copiado")
    } catch {
      toast.error("No se pudo copiar el enlace")
    }
  }

  const skip = () => {
    sessionStorage.setItem(SKIP_KEY, "1")
    setGate(null)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="inapp-gate-title"
      className="bg-background/95 supports-backdrop-filter:backdrop-blur-md fixed inset-0 z-[80] flex items-end justify-center sm:items-center"
    >
      <div
        className={cn(
          "border-border/80 bg-card w-full max-w-lg rounded-t-3xl border p-5 shadow-2xl sm:rounded-3xl sm:p-6",
          "origin-bottom transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]",
          "motion-reduce:transition-none",
        )}
        style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
      >
        <div className="bg-primary/15 text-primary mb-4 inline-flex size-12 items-center justify-center rounded-2xl">
          <LockKeyhole className="size-6" aria-hidden />
        </div>
        <p className="text-primary mb-1 text-[11px] font-semibold tracking-wide uppercase">
          Estás en {source}
        </p>
        <h1
          id="inapp-gate-title"
          className="font-heading text-2xl leading-tight font-semibold tracking-tight"
        >
          Ábrelo en {gate.phoneType === "ios" ? "Safari" : "Chrome"} para instalar y recibir avisos
        </h1>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          Desde {source} no se puede instalar {siteName} ni activar avisos. Ábrelo en el navegador
          para enterarte de dinámicas, promociones, rifas y novedades más rápido que los demás.
        </p>

        {gate.phoneType === "ios" ? (
          <ol className="bg-muted/70 mt-4 space-y-2.5 rounded-2xl p-4 text-sm">
            <li className="flex gap-3">
              <span className="bg-foreground text-background flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                1
              </span>
              <span>
                Toca <strong>⋯</strong> arriba a la derecha
              </span>
            </li>
            <li className="flex gap-3">
              <span className="bg-foreground text-background flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                2
              </span>
              <span>
                Elige <strong>Abrir en Safari</strong> o <strong>navegador externo</strong>
              </span>
            </li>
            <li className="flex gap-3">
              <span className="bg-foreground text-background flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                3
              </span>
              <span>Ahí instala la app y activa los avisos</span>
            </li>
          </ol>
        ) : (
          <p className="bg-muted/70 text-muted-foreground mt-4 rounded-2xl p-3 text-sm">
            Te estamos abriendo Chrome. Si no pasa nada, usa el botón.
          </p>
        )}

        <div className="mt-5 flex flex-col gap-2">
          <Button
            size="lg"
            className="min-h-12 w-full text-base font-semibold transition-transform duration-160 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97]"
            onClick={openExternal}
          >
            <ExternalLink className="size-4" aria-hidden />
            Abrir en {gate.phoneType === "ios" ? "Safari" : "Chrome"}
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="min-h-11 w-full transition-transform duration-160 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97]"
            onClick={() => void copyLink()}
          >
            <Copy className="size-4" aria-hidden />
            {copied ? "Enlace copiado" : "Copiar enlace"}
          </Button>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground mt-1 min-h-11 text-center text-xs underline-offset-4 hover:underline"
            onClick={skip}
          >
            Seguir aquí, sin avisos ni app
          </button>
        </div>

        <p className="text-muted-foreground mt-4 flex items-center justify-center gap-1.5 text-center text-[11px]">
          <Bell className="size-3.5" aria-hidden />
          Los avisos solo funcionan en Chrome o Safari
        </p>
      </div>
    </div>
  )
}
