import React from 'react'

const Banner = ({ config = {} }) => {
  const colors = config?.site_colors || { primary: '#8B7355', secondary: '#F5F5DC' }
const bannerImage = config?.site_images?.banner
  ? `${import.meta.env.VITE_BASE_URL}${config.site_images.banner}`
  : null;

  return (
    <section 
      className="relative py-20 px-4"
      style={{
        background: bannerImage 
          ? `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url(${bannerImage})`
          : `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <div className="container mx-auto text-center">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <div className="inline-block p-4 bg-white rounded-full shadow-lg mb-6">
              <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center">
                <span className="text-white text-3xl font-bold">R</span>
              </div>
            </div>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
            RIFAS
          </h1>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            CREATOR.VZLA
          </h2>
          
          <p className="text-xl text-white mb-8 opacity-90">
            Carabobo, Venezuela
          </p>
          
          <a
            href="#available"
            className="inline-block bg-accent text-gray-900 px-8 py-4 rounded-full text-lg font-semibold hover:bg-yellow-400 transition-colors shadow-lg"
          >
            LISTA DE DISPONIBLES
          </a>
        </div>
      </div>
    </section>
  )
}

export default Banner