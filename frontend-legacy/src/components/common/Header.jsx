import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Menu, X, Phone, MessageCircle } from 'lucide-react'

const Header = ({ config = {} }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const socialButtons = config?.social_media || {}
  const colors = config?.site_colors || { primary: '#8B7355', secondary: '#F5F5DC', accent: '#FFD700' }
  const siteInfo = config?.site_info || {}

  //  título de la página dinamico
  useEffect(() => {
    if (siteInfo.site_name) {
      document.title = siteInfo.site_name
    }
  }, [siteInfo.site_name])

  return (
    <header
      className="sticky top-0 z-50 shadow-md transition-all duration-300"
      style={{
        backgroundColor: colors.secondary || '#F5F5DC',
        borderBottom: `3px solid ${colors.primary || '#8B7355'}`
      }}
    >
      <nav className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo y Nombre del Sitio */}
          <Link to="/" className="flex items-center space-x-3 group">
            {config?.site_images?.logo ? (
              <img
                src={`${import.meta.env.VITE_BASE_URL}${config.site_images.logo}`}
                alt="Logo"
                className="h-10 w-auto transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div
                className="text-2xl font-bold transition-colors duration-300"
                style={{ color: colors.primary }}
              >
                RIFAS
              </div>
            )}

            {/* Nombre del sitio/rifa al lado del logo */}
            {siteInfo.site_name && (
              <div className="hidden sm:block">
                <h1
                  className="text-xl font-bold transition-colors duration-300"
                  style={{ color: colors.primary }}
                >
                  {siteInfo.site_name}
                </h1>
                {siteInfo.tagline && (
                  <p
                    className="text-xs opacity-75"
                    style={{ color: colors.primary }}
                  >
                    {siteInfo.tagline}
                  </p>
                )}
              </div>
            )}
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              to="/"
              className="font-medium transition-all duration-300 hover:scale-105"
              style={{
                color: colors.primary,
                borderBottom: `2px solid transparent`
              }}
              onMouseEnter={(e) => {
                e.target.style.borderBottomColor = colors.accent || '#FFD700'
              }}
              onMouseLeave={(e) => {
                e.target.style.borderBottomColor = 'transparent'
              }}
            >
              INICIO
            </Link>
            <Link
              to="/#available"
              className="font-medium transition-all duration-300 hover:scale-105"
              style={{
                color: colors.primary,
                borderBottom: `2px solid transparent`
              }}
              onMouseEnter={(e) => {
                e.target.style.borderBottomColor = colors.accent || '#FFD700'
              }}
              onMouseLeave={(e) => {
                e.target.style.borderBottomColor = 'transparent'
              }}
            >
              RIFAS DISPONIBLES
            </Link>
            <Link
              to="/#finished"
              className="font-medium transition-all duration-300 hover:scale-105"
              style={{
                color: colors.primary,
                borderBottom: `2px solid transparent`
              }}
              onMouseEnter={(e) => {
                e.target.style.borderBottomColor = colors.accent || '#FFD700'
              }}
              onMouseLeave={(e) => {
                e.target.style.borderBottomColor = 'transparent'
              }}
            >
              FINALIZADAS
            </Link>
            <Link
              to="/#contact"
              className="font-medium transition-all duration-300 hover:scale-105"
              style={{
                color: colors.primary,
                borderBottom: `2px solid transparent`
              }}
              onMouseEnter={(e) => {
                e.target.style.borderBottomColor = colors.accent || '#FFD700'
              }}
              onMouseLeave={(e) => {
                e.target.style.borderBottomColor = 'transparent'
              }}
            >
              CONTACTO
            </Link>

            {/* Social Buttons */}
            <div className="flex items-center space-x-2">
              {socialButtons.whatsapp && (
                <a
                  href={`https://wa.me/${socialButtons.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-full transition-all duration-300 hover:scale-110 shadow-md hover:shadow-lg"
                  style={{
                    backgroundColor: colors.accent || '#25D366',
                    color: 'white'
                  }}
                >
                  <MessageCircle size={16} />
                </a>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-lg transition-all duration-300 hover:scale-105"
            style={{
              color: colors.primary,
              backgroundColor: `${colors.primary}15`
            }}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div
            className="md:hidden py-4 border-t-2 transition-all duration-300"
            style={{ borderTopColor: colors.accent || '#FFD700' }}
          >
            <div className="flex flex-col space-y-4">
              {/* Nombre del sitio en móvil */}
              {siteInfo.site_name && (
                <div className="px-2 pb-2 border-b" style={{ borderBottomColor: `${colors.primary}30` }}>
                  <h1
                    className="text-lg font-bold"
                    style={{ color: colors.primary }}
                  >
                    {siteInfo.site_name}
                  </h1>
                  {siteInfo.tagline && (
                    <p
                      className="text-sm opacity-75"
                      style={{ color: colors.primary }}
                    >
                      {siteInfo.tagline}
                    </p>
                  )}
                </div>
              )}

              <Link
                to="/"
                className="font-medium transition-colors duration-300 px-2 py-1 rounded"
                style={{ color: colors.primary }}
                onClick={() => setIsMenuOpen(false)}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = `${colors.primary}10`
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent'
                }}
              >
                INICIO
              </Link>
              <Link
                to="/#available"
                className="font-medium transition-colors duration-300 px-2 py-1 rounded"
                style={{ color: colors.primary }}
                onClick={() => setIsMenuOpen(false)}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = `${colors.primary}10`
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent'
                }}
              >
                RIFAS DISPONIBLES
              </Link>
              <Link
                to="/#finished"
                className="font-medium transition-colors duration-300 px-2 py-1 rounded"
                style={{ color: colors.primary }}
                onClick={() => setIsMenuOpen(false)}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = `${colors.primary}10`
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent'
                }}
              >
                FINALIZADAS
              </Link>
              <Link
                to="/#contact"
                className="font-medium transition-colors duration-300 px-2 py-1 rounded"
                style={{ color: colors.primary }}
                onClick={() => setIsMenuOpen(false)}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = `${colors.primary}10`
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent'
                }}
              >
                CONTACTO
              </Link>

              {/* Social button en móvil */}
              {socialButtons.whatsapp && (
                <div className="pt-2 border-t" style={{ borderTopColor: `${colors.primary}30` }}>
                  <a
                    href={`https://wa.me/${socialButtons.whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-2 px-4 py-2 rounded-full transition-all duration-300 hover:scale-105"
                    style={{
                      backgroundColor: colors.accent || '#25D366',
                      color: 'white'
                    }}
                  >
                    <MessageCircle size={16} />
                    <span className="text-sm font-medium">WhatsApp</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}

export default Header