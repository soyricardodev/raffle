import React from 'react'
import { useQuery } from 'react-query'
import Header from '../components/common/Header'
import Footer from '../components/common/Footer'
import Banner from '../components/landing/Banner'
import RaffleCard from '../components/landing/RaffleCard'
import TicketVerifier from '../components/landing/TicketVerifier'
import Loading from '../components/common/Loading'
import { raffleAPI, configAPI } from '../services/api'

const Secondhome = () => {
  const { data: config } = useQuery('config', configAPI.getAll)
  const { data: activeRaffles, isLoading: loadingActive } = useQuery(
    'activeRaffles',
    () => raffleAPI.getAll({ status: 'active', limit: 6 })
  )
  const { data: finishedRaffles, isLoading: loadingFinished } = useQuery(
    'finishedRaffles',
    () => raffleAPI.getAll({ status: 'finished', limit: 10 })
  )

  const siteConfig = config?.data || {}

  return (
    <div className="min-h-screen bg-gray-50">
      <Header config={siteConfig} />

      <main>
        <Banner config={siteConfig} />

        <section id="available" className="py-20 px-4">
          <div className="container mx-auto">
            <div className="text-center mb-16">
              <div className="inline-block p-4 bg-primary/10 rounded-full mb-6">
                <div className="text-5xl">🎯</div>
              </div>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                ¡Participa Ahora!
              </h2>
              <h3 className="text-5xl font-bold text-primary mb-4">
                RIFAS DISPONIBLES
              </h3>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Encuentra la rifa perfecta y gana increíbles premios. ¡Tu suerte te está esperando!
              </p>
            </div>

            {loadingActive ? (
              <Loading text="Cargando rifas disponibles..." />
            ) : activeRaffles?.data?.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {activeRaffles.data.map((raffle) => (
                  <RaffleCard key={raffle.id} raffle={raffle} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">🎲</div>
                <h3 className="text-2xl font-semibold text-gray-700 mb-2">No hay rifas disponibles</h3>
                <p className="text-gray-500">¡Pronto tendremos nuevas rifas emocionantes!</p>
              </div>
            )}
          </div>
        </section>

        <section id="finished" className="py-20 px-4 bg-white">
          <div className="container mx-auto">
            <div className="text-center mb-16">
              <div className="inline-block p-4 bg-blue-100 rounded-full mb-6">
                <div className="text-5xl">🏆</div>
              </div>
              <h2 className="text-5xl font-bold text-gray-900 mb-4">
                RIFAS FINALIZADAS
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Conoce a nuestros ganadores anteriores y descubre qué premio podrías ganar tú
              </p>
            </div>

            {loadingFinished ? (
              <Loading text="Cargando rifas finalizadas..." />
            ) : finishedRaffles?.data?.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {finishedRaffles.data.map((raffle) => (
                  <RaffleCard key={raffle.id} raffle={raffle} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">📋</div>
                <h3 className="text-2xl font-semibold text-gray-700 mb-2">Sin rifas finalizadas</h3>
                <p className="text-gray-500">Aquí aparecerán las rifas completadas</p>
              </div>
            )}
          </div>
        </section>

        <TicketVerifier />

        <section id="contact" className="py-20 px-4 bg-gradient-to-br from-gray-900 via-primary to-gray-900 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent"></div>
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_50%,rgba(255,215,0,0.1),transparent)]"></div>

          <div className="container mx-auto text-center relative z-10">
            <div className="mb-16">
              <div className="inline-block p-4 bg-accent/20 rounded-full mb-6">
                <div className="text-5xl">💳</div>
              </div>
              <h2 className="text-5xl font-bold mb-4">MÉTODOS DE PAGO</h2>
              <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                Realiza tu pago de forma fácil y segura con nuestros métodos disponibles
              </p>
            </div>

            <div className="max-w-4xl mx-auto">
              {siteConfig?.payment_info?.pago_movil_number && (
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-8 rounded-2xl mb-8 shadow-2xl hover:shadow-3xl transition-all hover:scale-105">
                  <div className="flex items-center justify-center mb-6">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg">
                      <span className="text-blue-600 font-bold text-2xl">📱</span>
                    </div>
                  </div>
                  <h3 className="font-bold text-2xl mb-3">Pago Móvil</h3>
                  <p className="text-blue-100 mb-2">{siteConfig.payment_info.bank_name || 'Banco Venezuela'}</p>
                  <p className="font-bold text-3xl text-accent mb-4">{siteConfig.payment_info.pago_movil_number}</p>
                  {siteConfig.payment_info.cedula && (
                    <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                      <p className="text-sm text-blue-100">Cédula: <span className="font-bold">{siteConfig.payment_info.cedula}</span></p>
                      {siteConfig.payment_info.holder_name && (
                        <p className="text-sm text-blue-100 mt-1">Titular: <span className="font-bold">{siteConfig.payment_info.holder_name}</span></p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {!siteConfig?.payment_info?.pago_movil_number && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-8 rounded-2xl shadow-2xl">
                    <div className="flex items-center justify-center mb-4">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-bold">P</span>
                      </div>
                    </div>
                    <h3 className="font-bold mb-2">PagoMóvilBDV</h3>
                    <p className="text-sm">Banco Venezuela PAGO MÓVIL</p>
                    <p className="font-bold text-lg">04125051356</p>
                  </div>

                  <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-8 rounded-2xl shadow-2xl">
                    <h3 className="font-bold mb-2">CÉDULA</h3>
                    <p className="font-bold text-2xl">19.260.444</p>
                    <p className="text-sm mt-2">Titular: Cindy Vanessa Ortiz Hinojola</p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-16">
              <a
                href={siteConfig?.social_media?.whatsapp ? `https://wa.me/${siteConfig.social_media.whatsapp}` : '#'}
                className="inline-flex items-center space-x-3 bg-green-500 text-white px-10 py-4 rounded-full text-xl font-bold hover:bg-green-600 transition-all shadow-lg hover:shadow-xl hover:scale-105"
              >
                <span>💬</span>
                <span>WHATSAPP</span>
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer config={siteConfig} />
    </div>
  )
}

export default Secondhome