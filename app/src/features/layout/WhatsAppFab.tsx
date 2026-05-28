import { MessageCircle } from "lucide-react"
import { usePublicBranding } from "@/features/layout/use-public-branding"

function normalizeWhatsAppUrl(phone: string): string | null {
  const digits = phone.replace(/\D/g, "")
  if (!digits) return null
  return `https://wa.me/${digits}`
}

export function WhatsAppFab() {
  const branding = usePublicBranding()
  const whatsapp = branding?.social.whatsapp ?? ""

  const href = whatsapp ? normalizeWhatsAppUrl(whatsapp) : null
  if (!href) return null

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="bg-emerald-500 text-white fixed right-4 z-50 flex size-14 min-h-11 min-w-11 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105 focus-visible:ring-3 focus-visible:ring-emerald-300/50 active:scale-95 bottom-[max(1rem,env(safe-area-inset-bottom))]"
      aria-label="Contactar por WhatsApp"
    >
      <MessageCircle className="size-7" />
    </a>
  )
}
