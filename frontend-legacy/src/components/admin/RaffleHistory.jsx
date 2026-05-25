import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { Link } from "react-router-dom";
import {
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Eye,
  Flag,
  Calendar,
  Sparkles,
  Target,
  AlertTriangle,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { raffleAPI, configAPI } from "../../services/api";
import Loading from "../common/Loading";
import {
  formatDate,
  formatCurrency,
  getStatusColor,
  getStatusText,
} from "../../utils/helpers";

const RaffleHistory = () => {
  const [filters, setFilters] = useState({
    status: "all",
    search: "",
    page: 1,
    limit: 10,
  });
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [raffleToDelete, setRaffleToDelete] = useState(null);

  const queryClient = useQueryClient();

  //  configuración de colores
  const { data: config } = useQuery("config", configAPI.getAll);
  const siteConfig = config?.data || {};
  const colors = siteConfig.site_colors || {
    primary: "#8B7355",
    secondary: "#F5F5DC",
    accent: "#FFD700",
  };

  const { data: raffles, isLoading } = useQuery(
    ["raffles", filters],
    () =>
      raffleAPI.getAll(
        filters.status === "all" ? {} : { status: filters.status }
      ),
    { keepPreviousData: true }
  );

  const deleteMutation = useMutation(raffleAPI.delete, {
    onSuccess: () => {
      toast.success("Rifa eliminada exitosamente");
      queryClient.invalidateQueries("raffles");
      setDeleteModalOpen(false);
      setRaffleToDelete(null);
    },
    onError: (error) => {
      const errorMessage =
        error.response?.data?.error || "Error al eliminar la rifa";
      if (
        errorMessage.includes("pagos registrados") ||
        errorMessage.includes("compras asociadas")
      ) {
        toast.error(
          "No se puede eliminar esta rifa porque tiene compras registradas",
          { duration: 5000 }
        );
      } else {
        toast.error(errorMessage);
      }
    },
  });

  const statusOptions = [
    { value: "all", label: "Todas", color: "bg-gray-100 text-gray-800" },
    {
      value: "draft",
      label: "Borrador",
      color: "bg-yellow-100 text-yellow-800",
    },
    {
      value: "active",
      label: "En curso",
      color: "bg-green-100 text-green-800",
    },
    {
      value: "finished",
      label: "Finalizado",
      color: "bg-blue-100 text-blue-800",
    },
  ];

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const handleDeleteClick = (raffle) => {
    setRaffleToDelete(raffle);
    setDeleteModalOpen(true);
  };

  const handlePublishRaffle = (raffle) => {
    if (raffle) {
      publishMutation.mutate({
        id: raffle.id,
        status: !raffle.publish,
      });
    }
  };

  const confirmDelete = () => {
    if (raffleToDelete) {
      deleteMutation.mutate(raffleToDelete.id);
    }
  };

  const publishMutation = useMutation(
    ({ id, status }) => raffleAPI.publishRaffle(id, status),
    {
      onSuccess: (response) => {
        filteredRaffles.map((raffle) => {
          if (raffle.id === response.data.raffleId) {
            return {
              ...raffle,
              publish: !raffle.publish,
            };
          }
        });
        toast.success(`${response?.data?.message}`);
        queryClient.invalidateQueries(["raffle"]);
        window.location.reload();
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || "Error al publicar la rifa");
      },
    }
  );

  const filteredRaffles =
    raffles?.data?.filter((raffle) => {
      if (!filters.search) return true;
      const searchTerm = filters.search.toLowerCase();
      return raffle.name.toLowerCase().includes(searchTerm);
    }) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div
          className="rounded-2xl p-8 text-white relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
          }}
        >
          {/* Efectos */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -translate-y-48 translate-x-48"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full translate-y-32 -translate-x-32"></div>
          </div>

          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-4 mb-4">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                    <Calendar size={32} style={{ color: colors.accent }} />
                  </div>
                </div>
                <h1 className="text-5xl font-bold mb-2">
                  🎯 Historial de Rifas
                </h1>
                <p className="text-xl text-white/80">
                  Gestiona y supervisa todas tus rifas
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <Link
                  to="/admin/create"
                  className="bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-xl font-bold hover:bg-white/30 transition-all flex items-center space-x-2 shadow-lg"
                >
                  <Plus size={20} />
                  <span>Nueva Rifa</span>
                </Link>
                <div className="hidden md:block text-6xl opacity-30">🎲</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Filtros mejorados */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Filtros de estado */}
            <div className="flex flex-wrap gap-3">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleFilterChange("status", option.value)}
                  className={`px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-sm hover:shadow-md ${
                    filters.status === option.value
                      ? "text-white transform scale-105"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                  style={
                    filters.status === option.value
                      ? { backgroundColor: colors.primary }
                      : {}
                  }
                >
                  {option.label}
                </button>
              ))}
            </div>

            {/* Búsqueda */}
            <div className="relative flex-1 lg:max-w-md">
              <Search
                className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="text"
                placeholder="Buscar rifas..."
                value={filters.search}
                onChange={(e) => handleFilterChange("search", e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:border-transparent transition-all"
                style={{ "--tw-ring-color": colors.primary }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-100">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-gray-600">
                <Filter size={16} />
                <span className="text-sm font-medium">
                  {filteredRaffles.length} rifa
                  {filteredRaffles.length !== 1 ? "s" : ""} encontrada
                  {filteredRaffles.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Lista de rifas */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loading text="Cargando rifas..." />
          </div>
        ) : filteredRaffles.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
            {filteredRaffles.map((raffle) => (
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
                      className={`inline-flex px-3 py-1 text-xs font-bold rounded-full ${getStatusColor(
                        raffle.status
                      )}`}
                    >
                      {getStatusText(raffle.status)}
                    </span>
                  </div>

                  {/* Progreso */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-4">
                    <div className="bg-white/20 backdrop-blur-sm rounded-full h-2 mb-2">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(
                            parseFloat(raffle.sold_percentage) || 0,
                            100
                          )}%`,
                          backgroundColor: colors.accent,
                        }}
                      ></div>
                    </div>
                    <div className="text-white text-sm font-bold">
                      {raffle.sold_percentage}% vendido
                    </div>
                  </div>
                </div>

                {/* Contenido */}
                <div className="p-6">
                  <h3
                    className="text-xl font-bold text-gray-900 mb-2 group-hover:transition-colors"
                    style={{ color: raffle.name ? colors.primary : "inherit" }}
                  >
                    {raffle.name}
                  </h3>

                  {/* Estadísticas */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center p-3 bg-gray-50 rounded-xl">
                      <div className="text-lg font-bold text-gray-900">
                        {raffle.total_tickets_sold || 0}/{raffle.total_tickets}
                      </div>
                      <div className="text-xs text-gray-500">Boletos</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-xl">
                      <div className="text-lg font-bold text-green-600">
                        {formatCurrency(raffle.price_bs, "Bs")}
                      </div>
                      <div className="text-xs text-gray-500">Precio</div>
                    </div>
                  </div>

                  {/* Fechas */}
                  <div className="space-y-2 mb-4">
                    {raffle.draw_date && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar size={14} className="mr-2" />
                        Sorteo: {formatDate(raffle.draw_date)}
                      </div>
                    )}
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar size={14} className="mr-2" />
                      Creada: {formatDate(raffle.created_at)}
                    </div>
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

                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => handlePublishRaffle(raffle)}
                        className="flex items-center space-x-1 text-purple-600 hover:text-purple-800 font-medium transition-colors"
                        disabled={handlePublishRaffle.isLoading}
                      >
                        <Flag size={16} />
                        {raffle.publish ? (
                          <span>Despublicar</span>
                        ) : (
                          <span>Publicar</span>
                        )}
                      </button>

                      <Link
                        to={`/admin/edit/${raffle.id}`}
                        className="flex items-center space-x-1 text-green-600 hover:text-green-800 font-medium transition-colors"
                      >
                        <Edit size={16} />
                        <span>Editar</span>
                      </Link>
                      <button
                        onClick={() => handleDeleteClick(raffle)}
                        className="flex items-center space-x-1 text-red-600 hover:text-red-800 font-medium transition-colors"
                        disabled={deleteMutation.isLoading}
                      >
                        <Trash2 size={16} />
                        <span>Eliminar</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-12 text-center">
            <Target size={64} className="text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              No se encontraron rifas
            </h3>
            <p className="text-gray-600 mb-6">
              {filters.search
                ? "Intenta con otros términos de búsqueda"
                : "Crea tu primera rifa para comenzar"}
            </p>
            <Link
              to="/admin/create"
              className="text-white px-6 py-3 rounded-xl font-bold transition-all inline-flex items-center space-x-2"
              style={{
                background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
              }}
            >
              <Plus size={20} />
              <span>Crear Primera Rifa</span>
            </Link>
          </div>
        )}

        {/* Paginación */}
        {filteredRaffles.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 mt-8 p-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700 font-medium">
                Página {filters.page} - Mostrando {filteredRaffles.length} rifas
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() =>
                    handleFilterChange("page", Math.max(1, filters.page - 1))
                  }
                  disabled={filters.page === 1}
                  className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg disabled:opacity-50 hover:bg-gray-200 transition-all font-medium"
                >
                  Anterior
                </button>
                <button
                  onClick={() => handleFilterChange("page", filters.page + 1)}
                  className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-medium"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* confirmación de eliminación */}
      {deleteModalOpen && raffleToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 relative">
            <button
              onClick={() => setDeleteModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={24} />
            </button>

            <div className="text-center">
              <AlertTriangle size={64} className="mx-auto mb-4 text-red-500" />

              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                ¿Eliminar Rifa?
              </h3>

              <p className="text-gray-600 mb-2">
                ¿Estás seguro de que quieres eliminar la rifa:
              </p>
              <p className="font-bold text-gray-900 mb-6">
                "{raffleToDelete.name}"
              </p>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-red-800">
                  <strong>⚠️ Advertencia:</strong> Esta acción no se puede
                  deshacer. Si la rifa tiene compras registradas, no podrá ser
                  eliminada.
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setDeleteModalOpen(false)}
                  className="flex-1 py-3 rounded-lg font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleteMutation.isLoading}
                  className="flex-1 py-3 rounded-lg font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {deleteMutation.isLoading ? (
                    <Loading size="small" text="Eliminando..." />
                  ) : (
                    "Eliminar"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RaffleHistory;
