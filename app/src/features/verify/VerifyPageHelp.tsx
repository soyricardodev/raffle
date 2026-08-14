import { Link } from "@tanstack/react-router"
import { resolveSupportChannel } from "@/features/layout/social-links"
import { usePublicBranding } from "@/features/layout/use-public-branding"

export function VerifyPageHelp() {
  const branding = usePublicBranding()
  const contactPhone = branding?.contact.phone?.trim() ?? ""
  const contactEmail = branding?.contact.email?.trim() ?? ""
  const support = resolveSupportChannel({
    whatsappEnabled: branding?.whatsappEnabled ?? false,
    social: branding?.social,
    promo: branding?.purchaseSuccessPromo,
  })

  const supportHref = support.supportHrefWithText("Hola, necesito ayuda para buscar mis boletos.")
  const telHref = contactPhone ? `tel:${contactPhone.replace(/\s/g, "")}` : ""

  if (!supportHref && !telHref && !contactEmail) {
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
      {supportHref ? (
        <a
          href={supportHref}
          target="_blank"
          rel="noopener noreferrer"
          className="text-foreground font-medium underline-offset-4 hover:underline"
        >
          Escríbenos por {support.label}
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
