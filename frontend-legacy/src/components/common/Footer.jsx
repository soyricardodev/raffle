import React from "react";
import {
  MessageCircle,
  Instagram,
  Facebook,
  Send,
  Trophy,
  Star,
  Zap,
} from "lucide-react";

const SHOULD_SHOW_BRAND_ON_FOOTER =
	import.meta.env.VITE_SITE_WITH_BRAND_ON_FOOTER === "true";

const Footer = ({ config = {}, activeRaffles = null }) => {
  const socialButtons = config?.social_media || {};
  const colors = config?.site_colors || {
    primary: "#8B7355",
    accent: "#FFD700",
  };
  const contactInfo = config?.contact_info || {};

  const FloatingCard = ({ children, delay = 0 }) => (
    <div
      className="transform transition-all duration-500 hover:scale-105 hover:-translate-y-2"
      style={{
        animation: `float 3s ease-in-out infinite ${delay}s`,
        transformStyle: "preserve-3d",
      }}
    >
      {children}
    </div>
  );

  return (
    <>
      <style>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0px) rotateX(0deg);
          }
          50% {
            transform: translateY(-10px) rotateX(2deg);
          }
        }
      `}</style>

      <footer className="bg-gray-900 text-white">
        {/* Sección principal del footer */}
        <div className="py-12">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {/* Logo y descripción */}
              <div className="col-span-1">
                <div className="flex items-center space-x-2 mb-4">
                  {config?.site_images?.footer_logo ? (
                    <img
                      src={`${import.meta.env.VITE_BASE_URL}${
                        config.site_images.footer_logo
                      }`}
                      alt="Logo"
                      className="h-8 w-auto"
                    />
                  ) : (
                    <div
                      className="text-xl font-bold"
                      style={{ color: colors.primary }}
                    >
                      RIFAS
                    </div>
                  )}
                </div>
                <p className="text-gray-400 text-sm">
                  Plataforma de rifas confiable y transparente
                </p>
              </div>

              {/* Secciones */}
              <div className="col-span-1">
                <h3 className="font-semibold mb-4">SECCIONES</h3>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li>
                    <a href="/" className="hover:text-white transition-colors">
                      Inicio
                    </a>
                  </li>
                  <li>
                    <a
                      href="/#available"
                      className="hover:text-white transition-colors"
                    >
                      Rifas Disponibles
                    </a>
                  </li>
                  <li>
                    <a
                      href="/#finished"
                      className="hover:text-white transition-colors"
                    >
                      Finalizadas
                    </a>
                  </li>
                </ul>
              </div>

              {/* Contacto */}
              <div className="col-span-1">
                <h3 className="font-semibold mb-4">CONTACTO</h3>
                <ul className="space-y-2 text-sm text-gray-400">
                  {contactInfo.phone && (
                    <li className="flex items-center space-x-2">
                      <MessageCircle size={16} />
                      <span>{contactInfo.phone}</span>
                    </li>
                  )}
                  {contactInfo.email && (
                    <li>
                      <span>{contactInfo.email}</span>
                    </li>
                  )}
                  {contactInfo.address && (
                    <li>
                      <span>{contactInfo.address}</span>
                    </li>
                  )}
                </ul>
              </div>

              {/* Redes sociales */}
              <div className="col-span-1">
                <h3 className="font-semibold mb-4">SÍGUENOS</h3>
                <div className="flex space-x-3">
                  {socialButtons.whatsapp && (
                    <a
                      href={`https://wa.me/${socialButtons.whatsapp}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-green-500 p-3 rounded-full hover:bg-green-600 transition-colors"
                    >
                      <MessageCircle size={16} />
                    </a>
                  )}
                  {socialButtons.instagram && (
                    <a
                      href={socialButtons.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-pink-500 p-3 rounded-full hover:bg-pink-600 transition-colors"
                    >
                      <Instagram size={16} />
                    </a>
                  )}
                  {socialButtons.facebook && (
                    <a
                      href={socialButtons.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-blue-600 p-3 rounded-full hover:bg-blue-700 transition-colors"
                    >
                      <Facebook size={16} />
                    </a>
                  )}
                  {socialButtons.telegram && (
                    <a
                      href={socialButtons.telegram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-blue-500 p-3 rounded-full hover:bg-blue-600 transition-colors"
                    >
                      <Send size={16} />
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Sección de imágenes oficiales */}
            <div className="border-t border-gray-800 mt-8 pt-8">
              <div className="text-center mb-6">
                <h4 className="text-lg font-bold text-gray-300 mb-4">
                  Sorteos Oficiales Avalados
                </h4>
                <p className="text-sm text-gray-400 mb-6">
                  Nuestros sorteos se basan en lotería oficial del Estado
                  Táchira
                </p>

                {/* Imágenes oficiales */}
                <div className="flex justify-center items-center space-x-8 flex-wrap gap-4">
                  <div className="group">
                    <img
                      src="/tachira.png"
                      alt="Lotería del Táchira"
                      className="h-16 w-auto"
                    />
                  </div>
                  <div className="group">
                    <img
                      src="/supergana.png"
                      alt="Super Gana"
                      className="h-16 w-auto"
                    />
                  </div>
                  <div className="group">
                    <img
                      src="/conalot.png"
                      alt="CONALOT"
                      className="h-16 w-auto"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Copyright */}
            <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
            <p>&copy; {new Date().getFullYear()}{" "}{SHOULD_SHOW_BRAND_ON_FOOTER ? "CREATOR.VZLA." : null} Todos los derechos reservados.</p>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};

export default Footer;
