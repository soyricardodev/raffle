import React, { useEffect, useState } from "react";
import { useQuery } from "react-query";
import { Link } from "react-router-dom";
import {
  Sparkles,
  Trophy,
  Zap,
  Star,
  ArrowRight,
  Phone,
  MessageCircle,
  Gift,
  Clock,
  Target,
  TrendingUp,
  Award,
  Diamond,
  Calendar,
  Users,
  DollarSign,
  Eye,
  Edit,
} from "lucide-react";
import Header from "../components/common/Header";
import Footer from "../components/common/Footer";
import Banner from "../components/landing/Banner";
import RaffleCard from "../components/landing/RaffleCard";
import TicketVerifier from "../components/landing/TicketVerifier";
import PurchaseForm from "../components/landing/PurchaseForm";
import Loading from "../components/common/Loading";
import { raffleAPI, configAPI } from "../services/api";
import {
  formatDate,
  formatDateTime,
  getStatusColor,
  formatCurrency,
  getStatusText,
  formatLargeDate,
} from "../utils/helpers";

const Home = () => {
  const [scrollY, setScrollY] = useState(0);

  const { data: config } = useQuery("config", configAPI.getAll);

  const { data: activeRaffles, isLoading: loadingActive } = useQuery(
    "activeRaffles",
    () =>
      raffleAPI.getAll({
        status: ["active", "paused"],
        limit: parseInt(config?.data?.raffle_limits?.max_active) || 1,
      })
  );

  const [loadingPublished, setloadingPublished] = useState(true);
  const [error, setError] = useState(false);
  const [publishedRaffles, setPublishedRaffles] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters] = useState({ limit: 6 });

  const siteConfig = config?.data || {};
  const colors = siteConfig.site_colors || {
    primary: "#8B7355",
    secondary: "#F5F5DC",
    accent: "#FFD700",
  };

  const heroConfig = siteConfig.hero_config || {
    main_text: "¡GANA",
    accent_text: "AHORA!",
    main_text_color: "#FFFFFF",
    accent_text_color: "#FFD700",
    particles_type: "sparkles",
    particles_count: 20,
  };

  //  ID de la primera rifa activa
  const firstActiveRaffleId = activeRaffles?.data?.[0]?.id || null;

  //  detalles completos de la primera rifa activa
  const { data: firstActiveRaffleDetails, isLoading: loadingFirstRaffle } =
    useQuery(
      ["firstActiveRaffle", firstActiveRaffleId],
      () => raffleAPI.getById(firstActiveRaffleId),
      {
        enabled: !!firstActiveRaffleId,
        staleTime: 5 * 60 * 1000, // Cache por 5 minutos
      }
    );

  const getParticleEmoji = (particleType) => {
    const particleMap = {
      sparkles: "✨",
      stars: "⭐",
      star_sparkles: "💫",
      brightness: "🔆",
      rockets: "🚀",
      lightning: "⚡",
      comet: "☄️",
      explosion: "💥",
      fireworks: "🎆",
      smoke: "💨",
      fire: "🔥",
      chili: "🌶️",
      volcano: "🌋",
      sun: "☀️",
      hot_springs: "♨️",
      money: "💰",
      flying_money: "💸",
      diamonds: "💎",
      trophies: "🏆",
      hundred: "💯",
      party: "🎉",
      cars: "🚗",
      race_cars: "🏎️",
      motorcycles: "🏍️",
      trucks: "🚛",
    };

    return particleMap[particleType] || "✨";
  };

  const firstActiveRaffle = firstActiveRaffleDetails?.data || null;

  const calculateProgress = (raffle) => {
    if (!raffle) return { percentage: 0, soldAndReserved: 0 };

    const ticketsSold = parseInt(raffle.tickets_sold || 0);
    const ticketsReserved = parseInt(raffle.tickets_reserved || 0);
    const totalTickets = parseInt(raffle.total_tickets || 1);

    const soldAndReserved = ticketsSold + ticketsReserved;
    const percentage = (soldAndReserved / totalTickets) * 100;

    console.log("📊 Progress calculation:", {
      ticketsSold,
      ticketsReserved,
      soldAndReserved,
      totalTickets,
      percentage: percentage.toFixed(1),
    });

    return {
      percentage: Math.min(percentage, 100),
      soldAndReserved,
      ticketsSold,
      ticketsReserved,
      totalTickets,
    };
  };

  useEffect(() => {
    if (firstActiveRaffle) {
      console.log("🎯 Primera rifa activa con detalles:", firstActiveRaffle);
      console.log("💳 Métodos de pago:", firstActiveRaffle.payment_methods);

      const progress = calculateProgress(firstActiveRaffle);
      console.log("📊 Progress info:", progress);
    }
  }, [firstActiveRaffle]);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  //  colores  dinámicamente
  useEffect(() => {
    if (colors) {
      document.documentElement.style.setProperty(
        "--color-primary",
        colors.primary
      );
      document.documentElement.style.setProperty(
        "--color-secondary",
        colors.secondary
      );
      document.documentElement.style.setProperty(
        "--color-accent",
        colors.accent
      );
    }
  }, [colors]);

  useEffect(() => {
    const fetchRaffles = async () => {
      setError(null); // Limpiamos cualquier error previo
      try {
        const response = await raffleAPI.getPublishRaffles(
          filters.limit,
          currentPage
        );

        let totalRafflesPublished = Math.ceil(
          response.data.totalRows / filters.limit
        );
        setPublishedRaffles(response.data.raffles);
        if (totalRafflesPublished > currentPage) {
          setHasMore(true);
        } else {
          setHasMore(false);
        }
      } catch (err) {
        console.error("Error fetching published raffles:", err);
        setError(
          "No se pudieron cargar los sorteos. Inténtalo de nuevo más tarde."
        ); // Establecemos un mensaje de error
      } finally {
        setloadingPublished(false); // La carga finaliza, ya sea con éxito o con error
      }
    };

    fetchRaffles();
  }, [currentPage]);

  const PulsingButton = ({
    children,
    className = "",
    style = {},
    ...props
  }) => (
    <button
      className={`relative overflow-hidden transform transition-all duration-300 hover:scale-110 active:scale-95 ${className}`}
      style={style}
      {...props}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 animate-shimmer"></div>
      {children}
    </button>
  );

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

  const getDaysRemaining = (drawDate) => {
    if (!drawDate) return null;
    const today = new Date();
    const draw = new Date(drawDate);
    const diffTime = draw.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Obtener datos de progreso para la rifa activa
  const progressData = firstActiveRaffle
    ? calculateProgress(firstActiveRaffle)
    : { percentage: 0, soldAndReserved: 0 };

  return (
    <div className="min-h-screen bg-gray-50 relative overflow-hidden">
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
        @keyframes shimmer {
          0% {
            transform: translateX(-100%) skewX(-12deg);
          }
          100% {
            transform: translateX(200%) skewX(-12deg);
          }
        }
        @keyframes pulse-glow {
          0%,
          100% {
            box-shadow: 0 0 20px ${colors.accent}40;
          }
          50% {
            box-shadow: 0 0 40px ${colors.accent}80, 0 0 60px ${colors.accent}40;
          }
        }
        @keyframes mega-pulse {
          0%,
          100% {
            box-shadow: 0 0 30px ${colors.accent}60, 0 0 60px ${colors.accent}40,
              0 0 90px ${colors.accent}20;
            transform: scale(1);
          }
          50% {
            box-shadow: 0 0 50px ${colors.accent}80,
              0 0 100px ${colors.accent}60, 0 0 150px ${colors.accent}40;
            transform: scale(1.02);
          }
        }
        @keyframes progress-glow {
          0%,
          100% {
            box-shadow: 0 0 10px ${colors.accent}80,
              inset 0 0 10px ${colors.accent}40;
            filter: brightness(1);
          }
          50% {
            box-shadow: 0 0 20px ${colors.accent}ff,
              inset 0 0 20px ${colors.accent}80;
            filter: brightness(1.3);
          }
        }
        @keyframes progress-advance {
          0% {
            background-position: 0% 50%;
          }
          100% {
            background-position: 100% 50%;
          }
        }
        @keyframes progress-flash {
          0%,
          100% {
            opacity: 0.8;
          }
          50% {
            opacity: 1;
          }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
        .animate-pulse-glow {
          animation: pulse-glow 2s infinite;
        }
        .animate-mega-pulse {
          animation: mega-pulse 1.5s infinite;
        }
        .animate-progress-glow {
          animation: progress-glow 1.5s ease-in-out infinite;
        }
        .animate-progress-advance {
          animation: progress-advance 2s linear infinite;
        }
        .animate-progress-flash {
          animation: progress-flash 1s ease-in-out infinite;
        }
        .bg-primary {
          background-color: ${colors.primary};
        }
        .bg-secondary {
          background-color: ${colors.secondary};
        }
        .bg-accent {
          background-color: ${colors.accent};
        }
        .text-primary {
          color: ${colors.primary};
        }
        .text-secondary {
          color: ${colors.secondary};
        }
        .text-accent {
          color: ${colors.accent};
        }
        .border-primary {
          border-color: ${colors.primary};
        }
        .border-accent {
          border-color: ${colors.accent};
        }
      `}</style>

      <Header config={siteConfig} />

      <main className="relative">
        {/* BOTÓN PRINCIPAL DE ENTRADA */}
        <section className="py-4 md:py-8 px-4 bg-white">
          <div className="container mx-auto text-center">
            <div className="mb-2 md:mb-4">
              <PulsingButton
                className="text-white px-8 md:px-16 py-4 md:py-6 rounded-full text-xl md:text-3xl font-black shadow-2xl animate-mega-pulse"
                style={{
                  background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
                  boxShadow: `0 0 30px ${colors.primary}50`,
                }}
                onClick={() =>
                  document
                    .querySelector("#purchase-form")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                <span className="flex items-center space-x-2 md:space-x-4">
                  <Target size={20} className="md:w-8 md:h-8" />
                  <span>¡COMPRA TU BOLETO YA!</span>
                  <Target size={20} className="md:w-8 md:h-8" />
                </span>
              </PulsingButton>
            </div>
          </div>
        </section>

        {/* SECCIÓN DE RIFA PRINCIPAL */}
        {loadingActive || loadingFirstRaffle ? (
          <div className="flex justify-center py-8">
            <Loading text="Cargando rifa disponible..." />
          </div>
        ) : firstActiveRaffle ? (
          <section className="py-4 md:py-8 px-4 bg-white">
            <div className="container mx-auto">
              <div className="max-w-6xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-8 items-center">
                  {/* Imagen principal */}
                  <div className="lg:col-span-5">
                    <FloatingCard>
                      <div className="relative group">
                        {/* estado */}
                        <div className="absolute -top-2 -right-2 z-20">
                          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white px-3 md:px-6 py-1 md:py-3 rounded-full text-xs md:text-sm font-black shadow-xl animate-pulse-glow">
                            🔥 ACTIVA
                          </div>
                        </div>
                        <div className="relative overflow-hidden rounded-2xl md:rounded-3xl shadow-2xl group-hover:shadow-3xl transition-all">
                          <img
                            src={
                              firstActiveRaffle.image_url
                                ? `${import.meta.env.VITE_BASE_URL}${
                                    firstActiveRaffle.image_url
                                  }`
                                : "/placeholder-raffle.jpg"
                            }
                            alt={firstActiveRaffle.name}
                            className="w-full h-74 md:h-120 lg:h-[550px] object-cover group-hover:scale-105 transition-transform duration-500"
                          />

                          {/* BARRA DE PROGRESO */}
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-3 md:p-4">
                            <div className="text-white">
                              <div className="flex items-center justify-between text-sm md:text-base mb-3 font-black">
                                <span className="flex items-center space-x-2">
                                  <span className="text-2xl animate-pulse">
                                    🔥
                                  </span>
                                  <span className="text-yellow-300">
                                    VENDIDOS
                                  </span>
                                </span>
                                <span className="text-2xl md:text-3xl font-black text-yellow-400 animate-pulse">
                                  {progressData.percentage.toFixed(1)}%
                                </span>
                              </div>

                              <div className="relative">
                                <div className="w-full bg-black/50 rounded-full h-6 md:h-8 overflow-hidden border-2 border-yellow-400/60 shadow-lg relative">
                                  <div
                                    className="h-full rounded-full relative overflow-hidden transition-all duration-1000"
                                    style={{
                                      width: `${progressData.percentage}%`,
                                      background: `linear-gradient(45deg, 
                                        ${colors.accent}ff 0%, 
                                        #FFD700 25%, 
                                        #FFA500 50%, 
                                        #FFD700 75%, 
                                        ${colors.accent}ff 100%)`,
                                      backgroundSize: "400% 400%",
                                      animation:
                                        "progress-advance 2s linear infinite, progress-glow 1.5s ease-in-out infinite, progress-flash 1s ease-in-out infinite",
                                    }}
                                  >
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent animate-shimmer"></div>
                                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-200/30 via-transparent to-yellow-200/30"></div>
                                    <div className="absolute top-1/2 left-1/4 transform -translate-y-1/2 w-1 h-1 bg-white rounded-full animate-ping"></div>
                                    <div
                                      className="absolute top-1/2 left-3/4 transform -translate-y-1/2 w-1 h-1 bg-white rounded-full animate-ping"
                                      style={{ animationDelay: "0.5s" }}
                                    ></div>
                                  </div>
                                  <div className="absolute inset-0 rounded-full border-2 border-yellow-300/80 animate-pulse"></div>
                                </div>
                                <div
                                  className="absolute inset-0 rounded-full blur-sm opacity-60 animate-pulse"
                                  style={{
                                    background: `linear-gradient(90deg, transparent 0%, ${colors.accent}80 ${progressData.percentage}%, transparent 100%)`,
                                    filter: "blur(4px)",
                                  }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </FloatingCard>
                  </div>

                  {/* Información principal */}
                  <div className="lg:col-span-7">
                    <div className="space-y-3 md:space-y-6">
                      {/* Título */}
                      <div>
                        <h1 className="text-2xl md:text-4xl lg:text-5xl font-black mb-2 md:mb-4 leading-tight">
                          <span style={{ color: colors.primary }}>
                            {firstActiveRaffle.name}
                          </span>
                        </h1>

                        {/* Descripción - desktop */}
                        {firstActiveRaffle.description && (
                          <p className="hidden md:block text-lg lg:text-xl text-gray-700 leading-relaxed mb-4">
                            {firstActiveRaffle.description}
                          </p>
                        )}

                        {/* Fecha y tiempo restante */}
                        {getDaysRemaining(firstActiveRaffle.draw_date) !==
                          null && (
                          <div className="flex items-center justify-center md:justify-start space-x-2 md:space-x-4 mb-3 md:mb-6">
                            <div
                              className="flex items-center space-x-2 text-white px-3 md:px-6 py-2 md:py-3 rounded-full font-bold animate-pulse-glow text-sm md:text-base"
                              style={{
                                background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
                              }}
                            >
                              <Clock size={16} className="md:w-5 md:h-5" />
                              <span>
                                {getDaysRemaining(firstActiveRaffle.draw_date) >
                                0
                                  ? `⏰ ${getDaysRemaining(
                                      firstActiveRaffle.draw_date
                                    )} días`
                                  : getDaysRemaining(
                                      firstActiveRaffle.draw_date
                                    ) === 0
                                  ? "🚨 ¡HOY!"
                                  : "🎯 Realizado"}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Precios destacados */}
                      <div className="bg-gray-50 rounded-2xl md:rounded-3xl shadow-lg p-4 md:p-6 border-2 border-gray-100">
                        <h3 className="text-lg md:text-2xl font-black text-gray-900 mb-3 md:mb-6 flex items-center justify-center md:justify-start">
                          <DollarSign
                            className="mr-2 text-green-600"
                            size={20}
                          />
                          <span className="text-sm md:text-base">
                            Precios por boleto
                          </span>
                        </h3>

                        <div className="grid grid-cols-2 gap-3 md:gap-6">
                          {/* Precio en Bolívares */}
                          <div
                            className="text-center p-3 md:p-6 rounded-xl md:rounded-2xl text-white relative overflow-hidden group"
                            style={{
                              background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
                            }}
                          >
                            <div className="relative z-10">
                              <div className="text-xs md:text-sm font-bold mb-1 md:mb-2 opacity-90">
                                💰 BS
                              </div>
                              <div className="text-lg md:text-4xl font-black mb-1 md:mb-2">
                                {formatCurrency(
                                  firstActiveRaffle.price_bs,
                                  "Bs"
                                )}
                              </div>
                              <div className="text-xs md:text-sm opacity-90">
                                boleto
                              </div>
                            </div>
                            <div className="absolute inset-0 bg-white/10 transform -skew-x-12 translate-x-full group-hover:translate-x-0 transition-transform duration-700"></div>
                          </div>

                          {/* Precio en Dólares */}
                          <div
                            className="text-center p-3 md:p-6 rounded-xl md:rounded-2xl text-white relative overflow-hidden group"
                            style={{
                              background: `linear-gradient(135deg, #059669 0%, #10b981 100%)`,
                            }}
                          >
                            <div className="relative z-10">
                              <div className="text-xs md:text-sm font-bold mb-1 md:mb-2 opacity-90">
                                💵 USD
                              </div>
                              <div className="text-lg md:text-4xl font-black mb-1 md:mb-2">
                                {formatCurrency(
                                  firstActiveRaffle.price_usd,
                                  "$"
                                )}
                              </div>
                              <div className="text-xs md:text-sm opacity-90">
                                boleto
                              </div>
                            </div>
                            <div className="absolute inset-0 bg-white/10 transform -skew-x-12 translate-x-full group-hover:translate-x-0 transition-transform duration-700"></div>
                          </div>
                        </div>

                        {/* Información adicional */}
                        <div className="mt-3 md:mt-6 p-3 md:p-4 bg-white rounded-xl md:rounded-2xl">
                          <div className="grid grid-cols-2 gap-2 md:gap-4 text-center">
                            <div>
                              <div className="text-xs md:text-sm text-gray-600">
                                Mínimo
                              </div>
                              <div className="text-sm md:text-lg font-bold text-gray-900">
                                {firstActiveRaffle.min_purchase || 1}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs md:text-sm text-gray-600">
                                Máximo
                              </div>
                              <div className="text-sm md:text-lg font-bold text-gray-900">
                                {firstActiveRaffle.max_purchase || 10}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : (
          /* MENSAJE CUANDO NO HAY RIFAS ACTIVAS */
          <div className="text-center py-8 md:py-16 bg-white rounded-xl md:rounded-3xl shadow-xl mx-4">
            <div className="text-4xl md:text-8xl mb-4 md:mb-6">⏰</div>
            <h3 className="text-2xl md:text-4xl font-black text-gray-800 mb-2 md:mb-4">
              ¡Próximamente!
            </h3>
            <p className="text-lg md:text-xl text-gray-600 mb-4 md:mb-8">
              Rifas increíbles están por llegar
            </p>
            <a
              href={`https://wa.me/${siteConfig?.social_media?.whatsapp || ""}`}
              className="inline-flex items-center space-x-3 bg-green-500 text-white px-6 md:px-8 py-3 md:py-4 rounded-full text-lg md:text-xl font-bold hover:bg-green-600 transition-all shadow-lg"
            >
              <MessageCircle size={20} />
              <span>¡Notificarme!</span>
            </a>
          </div>
        )}

        {/* FORMULARIO DE COMPRA */}
        {firstActiveRaffle && (
          <section id="purchase-form" className="py-4 md:py-8 px-4 bg-gray-50">
            <div className="container mx-auto">
              <div className="max-w-4xl mx-auto">
                <PurchaseForm raffle={firstActiveRaffle} />
              </div>
            </div>
          </section>
        )}

        {/* VERIFICADOR DE BOLETOS */}
        <section id="ticket-verifier" className="py-8 md:py-16 px-4 bg-white">
          <div className="container mx-auto">
            <div className="max-w-4xl mx-auto">
              <TicketVerifier />
            </div>
          </div>
        </section>

        {/* SECCIÓN DE PREMIOS */}
        {firstActiveRaffle?.prizes && firstActiveRaffle.prizes.length > 0 && (
          <section className="py-8 md:py-20 px-4 bg-white relative overflow-hidden">
            <div className="absolute inset-0">
              <div className="absolute top-20 left-20 w-64 h-64 bg-accent/5 rounded-full blur-3xl animate-pulse"></div>
              <div
                className="absolute bottom-20 right-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse"
                style={{ animationDelay: "1.5s" }}
              ></div>
            </div>

            <div className="relative z-10">
              <div className="text-center mb-8 md:mb-16">
                <div
                  className="inline-flex items-center space-x-3 text-white px-4 md:px-8 py-2 md:py-4 rounded-full mb-4 md:mb-8 shadow-xl"
                  style={{
                    background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
                  }}
                >
                  <Trophy size={20} className="md:w-7 md:h-7" />
                  <span className="text-lg md:text-2xl font-black">
                    PREMIOS
                  </span>
                  <Trophy size={20} className="md:w-7 md:h-7" />
                </div>

                <h2 className="text-3xl md:text-5xl lg:text-6xl font-black mb-3 md:mb-6">
                  <span style={{ color: colors.primary }}>¿QUÉ PUEDES</span>
                  <br />
                  <span className="text-accent">GANAR?</span>
                </h2>
                <p className="text-lg md:text-2xl text-gray-600 max-w-3xl mx-auto">
                  🎯 Cada boleto te acerca más a estos premios
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 container mx-auto">
                {firstActiveRaffle.prizes.map((prize, index) => (
                  <FloatingCard key={prize.id} delay={index * 0.2}>
                    <div className="bg-white rounded-2xl md:rounded-3xl shadow-xl overflow-hidden group hover:shadow-2xl transition-all border-2 border-gray-100">
                      {/* posición */}
                      <div className="relative">
                        <div
                          className="absolute top-2 md:top-4 left-2 md:left-4 z-20 text-white px-2 md:px-4 py-1 md:py-2 rounded-full text-xs md:text-sm font-black shadow-lg"
                          style={{
                            background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
                          }}
                        >
                          #{index + 1} PREMIO
                        </div>

                        {/* Imagen del premio */}
                        <div className="relative h-40 md:h-80 overflow-hidden">
                          {prize.image_url ? (
                            <img
                              src={`${import.meta.env.VITE_BASE_URL}${
                                prize.image_url
                              }`}
                              alt={prize.name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                          ) : (
                            <div
                              className="w-full h-full flex items-center justify-center text-white"
                              style={{
                                background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
                              }}
                            >
                              <Gift size={32} className="md:w-16 md:h-16" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                        </div>

                        {/* Contenido del premio */}
                        <div className="p-3 md:p-6">
                          <h3 className="text-lg md:text-xl font-black text-gray-900 mb-2 md:mb-3 group-hover:text-primary transition-colors">
                            {prize.name}
                          </h3>

                          {prize.description && (
                            <p className="text-gray-600 text-sm leading-relaxed mb-2 md:mb-4 line-clamp-2 md:line-clamp-none">
                              {prize.description}
                            </p>
                          )}

                          {/* Decoración */}
                          <div className="flex items-center justify-center space-x-2 pt-2 md:pt-4 border-t border-gray-100">
                            <Star className="text-accent" size={12} />
                            <span className="text-xs md:text-sm font-bold text-gray-500">
                              PREMIO GARANTIZADO
                            </span>
                            <Star className="text-accent" size={12} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </FloatingCard>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* INFORMACIÓN DEL SORTEO */}
        {firstActiveRaffle && (
          <section
            className="py-8 md:py-20 px-4 relative overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${colors.primary}10 0%, ${colors.accent}10 100%)`,
            }}
          >
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-6 md:mb-12">
                <h2
                  className="text-2xl md:text-4xl font-black mb-3 md:mb-6"
                  style={{ color: colors.primary }}
                >
                  📅 INFO DEL SORTEO
                </h2>
              </div>

              <div className="bg-white rounded-2xl md:rounded-3xl shadow-xl p-4 md:p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                  <div className="text-center">
                    <div className="p-3 md:p-4 bg-blue-50 rounded-xl md:rounded-2xl mb-3 md:mb-4">
                      <Calendar className="mx-auto text-blue-600" size={32} />
                    </div>
                    <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-1 md:mb-2">
                      Fecha del sorteo
                    </h3>
                    <p className="text-sm md:text-lg text-gray-600">
                      {firstActiveRaffle.draw_date
                        ? formatDateTime(firstActiveRaffle.draw_date)
                        : "Por definir"}
                    </p>
                  </div>

                  <div className="text-center">
                    <div className="p-3 md:p-4 bg-green-50 rounded-xl md:rounded-2xl mb-3 md:mb-4">
                      <Award className="mx-auto text-green-600" size={32} />
                    </div>
                    <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-1 md:mb-2">
                      Método del sorteo
                    </h3>
                    <p className="text-sm md:text-lg text-gray-600">
                      Super Gana del Táchira
                    </p>
                  </div>
                </div>

                <div className="mt-4 md:mt-8 p-4 md:p-6 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl md:rounded-2xl border border-yellow-200">
                  <div className="text-center">
                    <h4 className="text-sm md:text-lg font-bold text-yellow-800 mb-1 md:mb-2">
                      ⚠️ IMPORTANTE
                    </h4>
                    <p className="text-xs md:text-base text-yellow-700">
                      Mínimo {firstActiveRaffle.min_purchase || 2} boletos. ¡Más
                      boletos = más oportunidades!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* SECCIÓN DE ULTIMAS RIFAS */}
        {loadingPublished ? (
          <div className="flex items-center justify-center py-12">
            <Loading text="Cargando hitorial de rifas..." />
          </div>
        ) : (
          publishedRaffles && publishedRaffles.length > 0 && (
            <section className="py-8 md:py-20 px-20 bg-white relative overflow-hidden">
              <div className="absolute inset-0">
                <div className="absolute top-20 left-20 w-64 h-64 bg-accent/5 rounded-full blur-3xl animate-pulse"></div>
                <div
                  className="absolute bottom-20 right-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse"
                  style={{ animationDelay: "1.5s" }}
                ></div>
              </div>

              <div className="relative z-10">
                <div className="text-center mb-8 md:mb-16">
                  <div
                    className="inline-flex items-center space-x-3 text-white px-4 md:px-8 py-2 md:py-4 rounded-full mb-4 md:mb-8 shadow-xl"
                    style={{
                      background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
                    }}
                  >
                    <Trophy size={20} className="md:w-7 md:h-7" />
                    <span className="text-lg md:text-2xl font-black">
                      ULTIMAS RIFAS
                    </span>
                    <Trophy size={20} className="md:w-7 md:h-7" />
                  </div>

                  <h2 className="text-3xl md:text-5xl lg:text-6xl font-black mb-3 md:mb-6">
                    <span style={{ color: colors.primary }}>HISTORIAL</span>
                    <br />
                    <span className="text-accent">DE RIFAS</span>
                  </h2>
                  <p className="text-lg md:text-2xl text-gray-600 max-w-3xl mx-auto">
                    🎯 Tu también puedes ser un ganador
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-3 gap-8">
                  {publishedRaffles.map((raffle) => (
                    <div
                      key={raffle.id}
                      className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden hover:shadow-2xl transition-all group"
                    >
                      {/* Imagen */}
                      <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200">
                        {raffle.image_url ? (
                          <img
                            src={`${import.meta.env.VITE_BASE_URL}${
                              raffle.image_url
                            }`}
                            alt={raffle.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Target size={64} className="text-gray-300" />
                          </div>
                        )}

                        {/* Estado */}
                        <div className="absolute top-4 left-4">
                          <span
                            className={`inline-flex px-3 py-1 text-xs font-bold rounded-full bg-yellow-100 text-yellow-800`}
                          >
                            SOLD OUT
                          </span>
                        </div>

                        {/* Progreso */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-4">
                          <div className="bg-white/20 backdrop-blur-sm rounded-full h-2 mb-2">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${Math.min(
                                  parseFloat(100) || 0,
                                  100
                                )}%`,
                                backgroundColor: colors.accent,
                              }}
                            ></div>
                          </div>
                          <div className="text-white text-sm font-bold">
                            100% vendido
                          </div>
                        </div>
                      </div>

                      {/* Contenido */}
                      <div className="p-6">
                        <h3
                          className="text-xl font-bold text-gray-900 mb-2 group-hover:transition-colors"
                          style={{
                            color: raffle.name ? colors.primary : "inherit",
                          }}
                        >
                          {raffle.name}
                        </h3>

                        {/* Fechas */}
                        <div className="space-y-2 mb-4">
                          {raffle.draw_date && (
                            <div className="flex items-center text-sm text-gray-600">
                              <Calendar size={14} className="mr-2" />
                              Sorteado: {formatLargeDate(raffle.draw_date)}
                            </div>
                          )}
                        </div>

                        {/* Acciones */}
                        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                          <Link
                            to={`/raffle/${raffle.id}`}
                            className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 font-medium transition-colors"
                          >
                            <Eye size={16} />
                            <span>Ver</span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Paginación */}
                {
                  <div className="bg-white rounded-2xl shadow-xl border border-gray-100 mt-8 p-6">
                    <div className="flex items-center justify-center">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setCurrentPage(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="px-5 py-3 text-lg text-gray-700 bg-gray-100 rounded-lg disabled:opacity-50 hover:bg-gray-200 transition-all font-medium"
                        >
                          &lt;
                        </button>
                        {
                          <button
                            onClick={() => setCurrentPage(currentPage + 1)}
                            disabled={!hasMore}
                            className="px-5 py-3 text-lg text-gray-700 bg-gray-100 rounded-lg disabled:opacity-50 hover:bg-gray-200 transition-all font-medium"
                          >
                            &gt;
                          </button>
                        }
                      </div>
                    </div>
                  </div>
                }
              </div>
            </section>
          )
        )}

        {/*  BANNER */}
        <section
          className="relative min-h-screen flex items-center justify-center overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${colors.primary}ee 0%, ${colors.accent}dd 50%, ${colors.primary}ee 100%)`,
          }}
        >
          <div
            className="absolute inset-0"
            style={{ transform: `translateY(${scrollY * 0.1}px)` }}
          >
            <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
            <div
              className="absolute bottom-20 right-20 w-96 h-96 rounded-full blur-3xl animate-pulse"
              style={{
                backgroundColor: `${colors.accent}33`,
                animationDelay: "1s",
              }}
            ></div>
            <div
              className="absolute top-1/2 left-1/2 w-64 h-64 bg-white/5 rounded-full blur-2xl animate-spin"
              style={{ animation: "spin 20s linear infinite" }}
            ></div>
          </div>

          <div className="absolute inset-0 overflow-hidden">
            {[...Array(parseInt(heroConfig.particles_count) || 20)].map(
              (_, i) => (
                <div
                  key={i}
                  className="absolute animate-bounce text-2xl"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 3}s`,
                    animationDuration: `${3 + Math.random() * 2}s`,
                    fontSize: `${16 + Math.random() * 16}px`,
                    opacity: 0.7,
                  }}
                >
                  {getParticleEmoji(heroConfig.particles_type)}
                </div>
              )
            )}
          </div>

          <div className="relative z-10 text-center px-4 max-w-6xl mx-auto">
            <div className="inline-flex items-center space-x-2 bg-white/20 backdrop-blur-md px-6 py-3 rounded-full mb-8 animate-pulse-glow">
              <span className="text-2xl">🔥</span>
              <span className="text-white font-bold">
                ¡ÚLTIMAS RIFAS DISPONIBLES!
              </span>
              <span className="text-2xl">🔥</span>
            </div>

            <div className="flex flex-col lg:flex-row items-center justify-center gap-8 mb-8">
              {/* Imagen banner de la BD */}
              {siteConfig?.site_images?.banner && (
                <div className="flex-1 max-w-lg">
                  <div className="relative group">
                    <img
                      src={`${import.meta.env.VITE_BASE_URL}${
                        siteConfig.site_images.banner
                      }`}
                      alt="Banner promocional"
                      className="w-full h-auto rounded-3xl shadow-2xl transform group-hover:scale-105 transition-all duration-500 border-4 border-white/20"
                      style={{
                        maxHeight: "400px",
                        objectFit: "cover",
                      }}
                    />
                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div
                      className="absolute inset-0 rounded-3xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity -z-10"
                      style={{
                        background: `linear-gradient(45deg, ${colors.primary}, ${colors.accent})`,
                      }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Texto principal */}
              <div className="flex-1 text-center lg:text-left">
                <h1 className="text-6xl md:text-7xl lg:text-8xl font-black leading-none">
                  <span
                    className="block bg-gradient-to-r bg-clip-text text-transparent animate-pulse drop-shadow-2xl"
                    style={{
                      color: heroConfig.main_text_color || "#FFFFFF",
                      textShadow: `0 0 30px ${
                        heroConfig.main_text_color || "#FFFFFF"
                      }50`,
                    }}
                  >
                    {heroConfig.main_text}
                  </span>
                  <span
                    className="block drop-shadow-2xl"
                    style={{
                      color: heroConfig.accent_text_color || colors.accent,
                      textShadow: `0 0 30px ${
                        heroConfig.accent_text_color || colors.accent
                      }, 0 0 60px ${
                        heroConfig.accent_text_color || colors.accent
                      }50`,
                      animation: "pulse-glow 1.5s infinite",
                    }}
                  >
                    {heroConfig.accent_text}
                  </span>
                </h1>
              </div>
            </div>

            <p className="text-2xl md:text-3xl text-white/90 mb-8 font-bold drop-shadow-lg">
              🎯 Tu premio está a un boleto de distancia 🎯
            </p>

            <div className="flex flex-col md:flex-row items-center justify-center gap-6 mb-12">
              <a
                href="#purchase-form"
                className="text-white px-12 py-6 rounded-full text-2xl font-black shadow-2xl animate-pulse-glow"
                style={{
                  backgroundColor: colors.accent,
                  boxShadow: `0 0 50px ${colors.accent}80`,
                }}
              >
                <span className="flex items-center space-x-3">
                  <span className="text-3xl">👑</span>
                  <span>¡COMPRAR AHORA!</span>
                  <span className="text-3xl">👑</span>
                </span>
              </a>

              <a
                href={`https://wa.me/${
                  siteConfig?.social_media?.whatsapp || ""
                }`}
                className="bg-green-500 text-white px-10 py-6 rounded-full text-xl font-bold shadow-2xl hover:bg-green-400 transform hover:scale-110 transition-all"
              >
                <span className="flex items-center space-x-3">
                  <MessageCircle size={24} />
                  <span>WhatsApp Directo</span>
                </span>
              </a>
            </div>
          </div>
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
            <ArrowRight className="text-white rotate-90" size={32} />
          </div>
        </section>
      </main>

      <Footer config={siteConfig} activeRaffles={activeRaffles} />

      {siteConfig?.social_media?.whatsapp && (
        <a
          href={`https://wa.me/${siteConfig.social_media.whatsapp}`}
          className="fixed bottom-6 right-6 z-50 bg-green-500 text-white p-4 rounded-full shadow-2xl hover:bg-green-600 transition-all hover:scale-110 animate-pulse-glow"
          style={{
            animation: "pulse-glow 2s infinite",
            boxShadow: "0 0 20px rgba(34, 197, 94, 0.5)",
          }}
        >
          <MessageCircle size={32} />
        </a>
      )}
    </div>
  );
};

export default Home;
