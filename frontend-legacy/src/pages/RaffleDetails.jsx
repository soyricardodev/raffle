import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from 'react-query'
import {
  ArrowLeft,
  Calendar,
  Users,
  Trophy,
  Clock,
  Star,
  Zap,
  Target,
  Gift,
  DollarSign,
  Sparkles,
  TrendingUp,
  Award,
  Diamond
} from 'lucide-react'
import Header from '../components/common/Header'
import Footer from '../components/common/Footer'
import PurchaseForm from '../components/landing/PurchaseForm'
import TicketVerifier from '../components/landing/TicketVerifier'
import Loading from '../components/common/Loading'
import { raffleAPI, configAPI } from '../services/api'
import { formatDate, formatDateTime, formatCurrency } from '../utils/helpers'

const RaffleDetails = () => {
  const { id } = useParams()
  const [scrollY, setScrollY] = useState(0)

  const { data: config } = useQuery('config', configAPI.getAll)
  const { data: raffle, isLoading, error } = useQuery(
    ['raffle', id],
    () => raffleAPI.getById(id),
    { enabled: !!id }
  )

  const siteConfig = config?.data || {}
  const colors = siteConfig.site_colors || { primary: '#8B7355', secondary: '#F5F5DC', accent: '#FFD700' }

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (colors) {
      document.documentElement.style.setProperty('--color-primary', colors.primary)
      document.documentElement.style.setProperty('--color-secondary', colors.secondary)
      document.documentElement.style.setProperty('--color-accent', colors.accent)
    }
  }, [colors])

  const getDaysRemaining = (drawDate) => {
    if (!drawDate) return null
    const today = new Date()
    const draw = new Date(drawDate)
    const diffTime = draw.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const FloatingCard = ({ children, delay = 0 }) => (
    <div
      className="transform transition-all duration-500 hover:scale-105 hover:-translate-y-2"
      style={{
        animation: `float 3s ease-in-out infinite ${delay}s`,
        transformStyle: 'preserve-3d'
      }}
    >
      {children}
    </div>
  )

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <Loading size="large" text="Cargando detalles de la rifa..." />
      </div>
    )
  }

  if (error || !raffle?.data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Header config={siteConfig} />
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl p-8">
            <div className="text-6xl mb-4">😕</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Rifa no encontrada</h1>
            <p className="text-gray-600 mb-6">La rifa que buscas no existe o ha sido eliminada</p>
            <Link
              to="/"
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-primary to-accent text-white px-6 py-3 rounded-xl font-bold hover:shadow-lg transition-all"
              style={{ background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)` }}
            >
              <ArrowLeft size={20} />
              <span>Volver al inicio</span>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const raffleData = raffle.data
  const daysRemaining = raffleData.draw_date ? getDaysRemaining(raffleData.draw_date) : null
  const isFinished = raffleData.status === 'finished'
  const soldPercentage = ((raffleData.tickets_sold + raffleData.tickets_reserved || 0) / raffleData.total_tickets * 100).toFixed(1)


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-hidden">
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotateX(0deg); }
          50% { transform: translateY(-10px) rotateX(2deg); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px ${colors.accent}40; }
          50% { box-shadow: 0 0 40px ${colors.accent}80, 0 0 60px ${colors.accent}40; }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%) skewX(-12deg); }
          100% { transform: translateX(200%) skewX(-12deg); }
        }
        .animate-pulse-glow {
          animation: pulse-glow 2s infinite;
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
        .bg-primary { background-color: ${colors.primary}; }
        .bg-secondary { background-color: ${colors.secondary}; }
        .bg-accent { background-color: ${colors.accent}; }
        .text-primary { color: ${colors.primary}; }
        .text-secondary { color: ${colors.secondary}; }
        .text-accent { color: ${colors.accent}; }
        .border-primary { border-color: ${colors.primary}; }
        .border-accent { border-color: ${colors.accent}; }
      `}</style>

      <Header config={siteConfig} />

      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              to="/"
              className="flex items-center space-x-2 text-gray-600 hover:text-primary transition-all hover:scale-105 font-medium"
            >
              <ArrowLeft size={20} />
              <span>INICIO</span>
            </Link>

            <div className="flex items-center space-x-6">
              <Link
                to="/#available"
                className="text-gray-600 hover:text-primary transition-all font-medium hover:scale-105"
              >
                VERIFICADOR
              </Link>
              <Link
                to="/#contact"
                className="text-gray-600 hover:text-primary transition-all font-medium hover:scale-105"
              >
                CONTACTO
              </Link>
              {!isFinished && (
                <span
                  className="text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg"
                  style={{ background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)` }}
                >
                  🎫 BOLETOS DISPONIBLES
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <main className="relative">
        {!isFinished && (
          <section id="purchase-form" className="py-12 px-4 bg-white">
            <div className="container mx-auto">
              <div className="max-w-6xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                  <div>
                    <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-3xl p-8 border-2 border-green-100 mb-8">
                      <h2 className="text-3xl font-black mb-6 flex items-center" style={{ color: colors.primary }}>
                        <Zap className="mr-3" size={32} />
                        ¡COMPRA TUS BOLETOS AHORA!
                      </h2>
                      <p className="text-lg text-gray-600 mb-6">
                        Cada boleto es una oportunidad de cambiar tu vida. ¡No dejes pasar esta oportunidad!
                      </p>

                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="text-center p-4 bg-white rounded-xl border">
                          <div className="text-sm text-gray-600">Precio por boleto</div>
                          <div className="text-lg font-bold" style={{ color: colors.primary }}>
                            {formatCurrency(raffleData.price_bs, 'Bs')}
                          </div>
                        </div>
                        <div className="text-center p-4 bg-white rounded-xl border">
                          <div className="text-sm text-gray-600">En dólares</div>
                          <div className="text-lg font-bold text-green-600">
                            {formatCurrency(raffleData.price_usd, '$')}
                          </div>
                        </div>
                      </div>

                      {daysRemaining !== null && (
                        <div className="text-center p-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-xl border border-red-200">
                          <div className="text-sm text-red-600 font-bold">⏰ TIEMPO RESTANTE</div>
                          <div className="text-xl font-black text-red-700">
                            {daysRemaining > 0
                              ? `${daysRemaining} días`
                              : daysRemaining === 0
                                ? '¡SORTEO HOY!'
                                : 'Sorteo realizado'
                            }
                          </div>
                        </div>
                      )}
                    </div>

                    <PurchaseForm raffle={raffleData} />
                  </div>

                  <div className="space-y-8">
                    <div>
                      <h3 className="text-2xl font-black mb-6" style={{ color: colors.primary }}>
                        ✨ ¿Por qué elegir nuestras rifas?
                      </h3>
                    </div>

                    <div className="space-y-4">
                      {[
                        { icon: '⚡', title: 'Proceso rápido', desc: 'Compra en menos de 2 minutos' },
                        { icon: '🔒', title: 'Pago seguro', desc: 'Múltiples métodos de pago' },
                        { icon: '📱', title: 'Confirmación inmediata', desc: 'Recibes tus números al instante' },
                        { icon: '🏆', title: 'Premios garantizados', desc: 'Sorteo 100% transparente' },
                        { icon: '💰', title: 'Precios accesibles', desc: 'Boletos desde ' + formatCurrency(raffleData.price_bs, 'Bs') },
                        { icon: '🎯', title: 'Múltiples oportunidades', desc: `Hasta ${raffleData.max_purchase || 10} boletos por persona` }
                      ].map((benefit, index) => (
                        <FloatingCard key={index} delay={index * 0.1}>
                          <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-all">
                            <div className="text-3xl">{benefit.icon}</div>
                            <div>
                              <div className="font-bold text-gray-900">{benefit.title}</div>
                              <div className="text-sm text-gray-600">{benefit.desc}</div>
                            </div>
                          </div>
                        </FloatingCard>
                      ))}
                    </div>

                    <div
                      className="p-6 rounded-2xl text-white text-center relative overflow-hidden"
                      style={{ background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)` }}
                    >
                      <div className="relative z-10">
                        <h4 className="text-xl font-black mb-2">⚡ ¡NO ESPERES MÁS! ⚡</h4>
                        <p className="text-sm mb-4 opacity-90">Los boletos se agotan rápido</p>
                        <div className="text-2xl font-black">
                          🎯 ¡COMPRA AHORA! 🎯
                        </div>
                      </div>

                      <div className="absolute inset-0 opacity-20">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-white rounded-full blur-xl animate-pulse"></div>
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full blur-xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        <section
          className="relative py-16 overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${colors.primary}15 0%, ${colors.accent}15 50%, ${colors.primary}15 100%)`,
            transform: `translateY(${scrollY * 0.05}px)`
          }}
        >
          <div className="absolute inset-0">
            <div className="absolute top-10 left-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-10 right-10 w-48 h-48 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          </div>

          <div className="container mx-auto px-4 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-5">
                <FloatingCard>
                  <div className="relative group">
                    <div className="absolute -top-4 -right-4 z-20">
                      {isFinished ? (
                        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-full text-sm font-black shadow-xl">
                          🏆 FINALIZADA
                        </div>
                      ) : (
                        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-full text-sm font-black shadow-xl animate-pulse-glow">
                          🔥 ACTIVA
                        </div>
                      )}
                    </div>

                    <div className="relative overflow-hidden rounded-3xl shadow-2xl group-hover:shadow-3xl transition-all">
                      <img
                        src={
                          raffleData.image_url
                            ? `${import.meta.env.VITE_BASE_URL}${raffleData.image_url}`
                            : '/placeholder-raffle.jpg'
                        }
                        alt={raffleData.name}
                        className="w-full h-[600px] object-cover group-hover:scale-105 transition-transform duration-500"
                      />

                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6">
                        <div className="text-white mb-3">
                          <div className="flex items-center justify-between text-sm mb-2">
                            <span>Progreso de ventas</span>
                            <span className="font-bold">{soldPercentage}%</span>
                          </div>
                          <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-1000 bg-gradient-to-r"
                              style={{
                                width: `${Math.min(parseFloat(soldPercentage), 100)}%`,
                                background: `linear-gradient(90deg, ${colors.accent} 0%, ${colors.primary} 100%)`
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </FloatingCard>
              </div>

              <div className="lg:col-span-7">
                <div className="space-y-8">
                  <div>
                    <h1 className="text-5xl md:text-6xl font-black mb-6 leading-tight">
                      <span style={{ color: colors.primary }}>{raffleData.name}</span>
                    </h1>

                    {raffleData.description && (
                      <p className="text-xl text-gray-700 leading-relaxed mb-6">
                        {raffleData.description}
                      </p>
                    )}

                    {!isFinished && daysRemaining !== null && (
                      <div className="flex items-center space-x-4 mb-6">
                        <div
                          className="flex items-center space-x-3 text-white px-6 py-3 rounded-full font-bold animate-pulse-glow"
                          style={{ background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)` }}
                        >
                          <Clock size={20} />
                          <span>
                            {daysRemaining > 0
                              ? `⏰ ${daysRemaining} días restantes`
                              : daysRemaining === 0
                                ? '🚨 ¡SORTEO HOY!'
                                : '🎯 Sorteo realizado'
                            }
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {!isFinished && (
                    <div className="bg-white rounded-3xl shadow-xl p-8 border-2 border-gray-100">
                      <h3 className="text-2xl font-black text-gray-900 mb-6 flex items-center">
                        <DollarSign className="mr-3 text-green-600" size={28} />
                        Precios por boleto
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div
                          className="text-center p-6 rounded-2xl text-white relative overflow-hidden group"
                          style={{ background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)` }}
                        >
                          <div className="relative z-10">
                            <div className="text-sm font-bold mb-2 opacity-90">💰 BOLÍVARES</div>
                            <div className="text-4xl font-black mb-2">
                              {formatCurrency(raffleData.price_bs, 'Bs')}
                            </div>
                            <div className="text-sm opacity-90">por boleto</div>
                          </div>
                          <div className="absolute inset-0 bg-white/10 transform -skew-x-12 translate-x-full group-hover:translate-x-0 transition-transform duration-700"></div>
                        </div>

                        <div
                          className="text-center p-6 rounded-2xl text-white relative overflow-hidden group"
                          style={{ background: `linear-gradient(135deg, #059669 0%, #10b981 100%)` }}
                        >
                          <div className="relative z-10">
                            <div className="text-sm font-bold mb-2 opacity-90">💵 DÓLARES</div>
                            <div className="text-4xl font-black mb-2">
                              {formatCurrency(raffleData.price_usd, '$')}
                            </div>
                            <div className="text-sm opacity-90">por boleto</div>
                          </div>
                          <div className="absolute inset-0 bg-white/10 transform -skew-x-12 translate-x-full group-hover:translate-x-0 transition-transform duration-700"></div>
                        </div>
                      </div>

                      <div className="mt-6 p-4 bg-gray-50 rounded-2xl">
                        <div className="grid grid-cols-2 gap-4 text-center">
                          <div>
                            <div className="text-sm text-gray-600">Mínimo de compra</div>
                            <div className="text-lg font-bold text-gray-900">{raffleData.min_purchase || 1} boletos</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">Máximo de compra</div>
                            <div className="text-lg font-bold text-gray-900">{raffleData.max_purchase || 10} boletos</div>
                          </div>
                        </div>
                      </div>

                      {!isFinished && (
                        <div className="mt-6 text-center">
                          <a
                            href="#purchase-form"
                            className="inline-flex items-center space-x-3 text-white px-8 py-4 rounded-full text-xl font-black shadow-xl hover:scale-105 transition-all"
                            style={{ background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)` }}
                          >
                            <Zap size={24} />
                            <span>¡COMPRAR AHORA!</span>
                            <Zap size={24} />
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  {isFinished && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-3xl p-8 border-2 border-blue-100 text-center">
                      <Trophy size={60} className="mx-auto mb-4 text-blue-600" />
                      <h3 className="text-2xl font-black text-blue-900 mb-3">
                        🏆 Sorteo Finalizado
                      </h3>
                      <p className="text-lg text-blue-700 mb-6">
                        Esta rifa ya fue sorteada el {formatDate(raffleData.draw_date)}
                      </p>
                      <Link
                        to="/"
                        className="inline-flex items-center space-x-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-6 py-3 rounded-xl font-bold hover:from-blue-600 hover:to-indigo-600 transition-all shadow-lg hover:shadow-xl"
                      >
                        <Sparkles size={20} />
                        <span>Ver Rifas Disponibles</span>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {raffleData.prizes && raffleData.prizes.length > 0 && (
          <section className="py-20 px-4 bg-white relative overflow-hidden">
            <div className="absolute inset-0">
              <div className="absolute top-20 left-20 w-64 h-64 bg-accent/5 rounded-full blur-3xl animate-pulse"></div>
              <div className="absolute bottom-20 right-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }}></div>
            </div>

            <div className="container mx-auto relative z-10">
              <div className="text-center mb-16">
                <div
                  className="inline-flex items-center space-x-3 text-white px-8 py-4 rounded-full mb-8 shadow-xl"
                  style={{ background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)` }}
                >
                  <Trophy size={28} />
                  <span className="text-2xl font-black">PREMIOS INCREÍBLES</span>
                  <Trophy size={28} />
                </div>

                <h2 className="text-5xl md:text-6xl font-black mb-6">
                  <span style={{ color: colors.primary }}>¿QUÉ PUEDES</span>
                  <br />
                  <span className="text-accent">GANAR?</span>
                </h2>
                <p className="text-2xl text-gray-600 max-w-3xl mx-auto">
                  🎯 Cada boleto te acerca más a estos fantásticos premios
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {raffleData.prizes.map((prize, index) => (
                  <FloatingCard key={prize.id} delay={index * 0.2}>
                    <div className="bg-white rounded-3xl shadow-xl overflow-hidden group hover:shadow-2xl transition-all border-2 border-gray-100">
                      <div className="relative">
                        <div
                          className="absolute top-4 left-4 z-20 text-white px-4 py-2 rounded-full text-sm font-black shadow-lg"
                          style={{ background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)` }}
                        >
                          #{index + 1} PREMIO
                        </div>

                        <div className="relative h-80 overflow-hidden">
                          {prize.image_url ? (
                            <img
                              src={`${import.meta.env.VITE_BASE_URL}${prize.image_url}`}
                              alt={prize.name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                          ) : (
                            <div
                              className="w-full h-full flex items-center justify-center text-white"
                              style={{ background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)` }}
                            >
                              <Gift size={64} />
                            </div>
                          )}

                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                        </div>

                        <div className="p-6">
                          <h3 className="text-xl font-black text-gray-900 mb-3 group-hover:text-primary transition-colors">
                            {prize.name}
                          </h3>

                          {prize.description && (
                            <p className="text-gray-600 text-sm leading-relaxed mb-4">
                              {prize.description}
                            </p>
                          )}

                          <div className="flex items-center justify-center space-x-2 pt-4 border-t border-gray-100">
                            <Star className="text-accent" size={16} />
                            <span className="text-sm font-bold text-gray-500">PREMIO GARANTIZADO</span>
                            <Star className="text-accent" size={16} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </FloatingCard>
                ))}
              </div>

              {!isFinished && (
                <div className="text-center mt-16">
                  <div
                    className="inline-block rounded-3xl p-12 text-white relative overflow-hidden"
                    style={{ background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)` }}
                  >
                    <div className="relative z-10">
                      <h3 className="text-4xl font-black mb-4">
                        🎯 ¡UNO DE ESTOS PREMIOS PUEDE SER TUYO!
                      </h3>
                      <p className="text-xl mb-8 opacity-90">
                        No pierdas la oportunidad de cambiar tu vida
                      </p>
                      <a
                        href="#purchase-form"
                        className="inline-flex items-center space-x-3 bg-white text-black px-12 py-6 rounded-full text-2xl font-black hover:bg-gray-100 transition-all shadow-2xl hover:scale-105"
                      >
                        <Zap size={28} />
                        <span>¡COMPRAR BOLETOS YA!</span>
                        <Zap size={28} />
                      </a>
                    </div>

                    <div className="absolute inset-0 opacity-10">
                      <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl"></div>
                      <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        <section
          className="py-20 px-4 relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${colors.primary}10 0%, ${colors.accent}10 100%)` }}
        >
          <div className="container mx-auto">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-4xl font-black mb-6" style={{ color: colors.primary }}>
                  📅 INFORMACIÓN DEL SORTEO
                </h2>
              </div>

              <div className="bg-white rounded-3xl shadow-xl p-8 mb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="text-center">
                    <div className="p-4 bg-blue-50 rounded-2xl mb-4">
                      <Calendar className="mx-auto text-blue-600" size={48} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Fecha del sorteo</h3>
                    <p className="text-lg text-gray-600">
                      {raffleData.draw_date ? formatDateTime(raffleData.draw_date) : 'Por definir'}
                    </p>
                  </div>

                  <div className="text-center">
                    <div className="p-4 bg-green-50 rounded-2xl mb-4">
                      <Award className="mx-auto text-green-600" size={48} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Método del sorteo</h3>
                    <p className="text-lg text-gray-600">
                      Super Gana de la lotería del Táchira
                    </p>
                  </div>
                </div>

                {!isFinished && (
                  <div className="mt-8 p-6 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl border border-yellow-200">
                    <div className="text-center">
                      <h4 className="text-lg font-bold text-yellow-800 mb-2">
                        ⚠️ IMPORTANTE
                      </h4>
                      <p className="text-yellow-700">
                        Recuerda que participas con mínimo {raffleData.min_purchase || 2} boletos.
                        ¡Más boletos = más oportunidades de ganar!
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <TicketVerifier />
      </main>

      <Footer config={siteConfig} />
    </div>
  )
}

export default RaffleDetails