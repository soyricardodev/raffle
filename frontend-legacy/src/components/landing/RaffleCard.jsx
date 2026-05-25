import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Users, TrendingUp } from 'lucide-react';
import { formatCurrency } from '../../utils/helpers';

const RaffleCard = ({ raffle, showStatus = false, colors = { primary: '#946c00', accent: '#1680e3', secondary: '#bdbdcc' } }) => {
  const soldPercentage = 100;
  const [timeLeft, setTimeLeft] = useState('');
  useEffect(() => {
    if (!raffle.draw_date) return;

    const updateTimeLeft = () => {
      const now = new Date();
      const drawDate = new Date(raffle.draw_date);
      const diffMs = drawDate - now;

      if (diffMs <= 0) {
        setTimeLeft('Finalizada');
        return;
      }

      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

      setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [raffle.draw_date]);

  // Mensaje dinámico según porcentaje
  const getMessage = (percentage) => {
    if (percentage < 25) return '¡Recién Empezando!';
    if (percentage < 50) return '¡Vamos Bien!';
    if (percentage < 75) return '¡Más de la Mitad!';
    if (percentage < 90) return '¡Casi Agotado!';
    return '¡Últimos Boletos!';
  };

  // Determinar si aplicar efecto de pulso
  const shouldPulse = soldPercentage >= 50 && soldPercentage < 75
    ? 'animate-pulse-custom'
    : soldPercentage >= 75 && soldPercentage < 90
      ? 'animate-pulse-custom'
      : soldPercentage >= 90
        ? 'animate-pulse-custom'
        : '';

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
      <div className="relative">
        <img
          src={raffle.image_url ? `${import.meta.env.VITE_BASE_URL}${raffle.image_url}` : '/placeholder-raffle.jpg'}
          alt={raffle.name}
          className="w-full h-65 object-cover"
        />
        {showStatus && (
          <div className="absolute top-4 right-4">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${raffle.status === 'active' ? 'bg-green-100 text-green-800' :
              raffle.status === 'finished' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
              {raffle.status === 'active' ? 'Activa' : raffle.status === 'finished' ? 'Finalizada' : 'Borrador'}
            </span>
          </div>
        )}
      </div>

      <div className="p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2">{raffle.name}</h3>

        {raffle.description && (
          <p className="text-gray-600 mb-4 line-clamp-2">{raffle.description}</p>
        )}

        <div className="space-y-3 mb-6">
          {raffle.draw_date && (
            <div style={{ backgroundColor: `${colors.primary}20`, color: colors.primary }} className="inline-flex items-center px-3 py-1 rounded-full">
              <Calendar size={16} className="mr-2" />
              <span className="font-semibold">{timeLeft}</span>
            </div>
          )}

          <div className="flex items-center text-sm text-gray-600">
            <TrendingUp size={16} className="mr-2" />
            <span>{soldPercentage.toFixed(1)}% vendido</span>
          </div>
        </div>

        <div className="relative w-full h-8 bg-gray-200 rounded-full mb-4 overflow-hidden shadow-inner">
          <div
            className={`relative h-full rounded-full animate-grow ${shouldPulse}`}
            style={{
              width: `${Math.min(soldPercentage, 100)}%`,
              background: `linear-gradient(to right, ${colors.primary}, ${colors.accent})`,
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2), inset 0 -2px 4px rgba(0,0,0,0.2)',
            }}
          >
            <div className="absolute inset-0 animate-shine" />
          </div>
          <span
            className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-white"
            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
          >
            {soldPercentage.toFixed(1)}% vendido - {getMessage(soldPercentage)}
          </span>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-sm text-gray-600">Precio desde</span>
            <div className="font-bold text-lg" style={{ color: colors.primary }}>
              {formatCurrency(raffle.price_bs, 'Bs')}
            </div>
          </div>
          <div className="text-right">
            <span className="text-sm text-gray-600">USD</span>
            <div className="font-bold text-lg text-green-600">
              {formatCurrency(raffle.price_usd, '$')}
            </div>
          </div>
        </div>

        <Link
          to={`/raffle/${raffle.id}`}
          className="block w-full text-white text-center py-3 rounded-lg font-semibold hover:opacity-90 transition-colors"
          style={{ backgroundColor: colors.primary }}
        >
          {raffle.status === 'finished' ? 'VER RESULTADOS' : 'LISTA DE BOLETOS'}
        </Link>
      </div>

      <style>
        {`
          @keyframes grow {
            from { width: 0%; }
            to { width: ${Math.min(soldPercentage, 100)}%; }
          }

          @keyframes pulse-custom {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
          }

          @keyframes shine {
            0% {
              background-position: -100%;
            }
            100% {
              background-position: 200%;
            }
          }

          .animate-grow {
            animation: grow 1.5s ease-out forwards;
          }

          .animate-pulse-custom {
            animation: pulse-custom 0.5s ease-in-out infinite;
          }

          .animate-shine {
            background: linear-gradient(
              90deg,
              transparent 0%,
              rgba(255, 255, 255, 0.5) 50%,
              transparent 100%
            );
            background-size: 200%;
            animation: shine 2s linear infinite;
          }
        `}
      </style>
    </div>
  );
};

export default RaffleCard;