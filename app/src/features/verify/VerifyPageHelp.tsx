import { Link } from "@tanstack/react-router"
import { whatsAppHrefWithText } from "@/features/layout/social-links"
import { usePublicBranding } from "@/features/layout/use-public-branding"

export function VerifyPageHelp() {
  const branding = usePublicBranding()
  const whatsappDigits = branding?.social.whatsapp?.trim() ?? ""
  const contactPhone = branding?.contact.phone?.trim() ?? ""
  const contactEmail = branding?.contact.email?.trim() ?? ""

  const whatsappHrefResolved = whatsAppHrefWithText(
    whatsappDigits,
    "Hola, necesito ayuda para verificar mis boletos.",
  )
  const telHref = contactPhone ? `tel:${contactPhone.replace(/\s/g, "")}` : ""

  if (!whatsappHrefResolved && !telHref && !contactEmail) {
    return (
      <p className="text-muted-foreground text-center text-xs leading-relaxed">
        ¿Problemas para encontrar tus boletos?{" "}
        <Link to="/" hash="comprar" className="text-foreground font-medium underline-offset-4 hover:underline">
          Vuelve a la página de compra
        </Link>{" "}
        o escríbenos por los canales de contacto del sitio.
      </p>
    )
  }

  return (
    <p className="text-muted-foreground text-center text-xs leading-relaxed">
      ¿Problemas?{" "}
      {whatsappHrefResolved ? (
        <a
          href={whatsappHrefResolved}
          target="_blank"
          rel="noopener noreferrer"
          className="text-foreground font-medium underline-offset-4 hover:underline"
        >
          Escríbenos por WhatsApp
        </a>
      ) : telHref ? (
        <a href={telHref} className="text-foreground font-medium underline-offset-4 hover:underline">
          Llámanos
        </a>
      ) : (
        <a
          href={`mailto:${contactEmail}`}
          className="text-foreground font-medium underline-offset-4 hover:underline"
        >
          Envíanos un correo
        </a>
      )}
    </p>
  )
}
