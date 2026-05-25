import React, { useState } from "react";
import {
  Search,
  CheckCircle,
  XCircle,
  Phone,
  Ticket,
  Sparkles,
  Mail,
  CreditCard,
} from "lucide-react";
import { useQuery } from "react-query";
import { ticketAPI, configAPI } from "../../services/api";
import Loading from "../common/Loading";
import { formatDate } from "../../utils/helpers";

const TicketVerifier = () => {
  const [searchType, setSearchType] = useState("phone");
  const [searchValue, setSearchValue] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  //  configuración de colores
  const { data: config } = useQuery("config", configAPI.getAll);
  const siteConfig = config?.data || {};
  const colors = siteConfig.site_colors || {
    primary: "#8B7355",
    secondary: "#F5F5DC",
    accent: "#FFD700",
  };

  const {
    data: tickets,
    isLoading,
    refetch,
    error,
  } = useQuery(
    ["verifyTickets", searchValue, searchType],
    () =>
      ticketAPI.verify({
        phone: searchType === "phone" ? searchValue : "",
        ticketNumber: searchType === "ticket" ? searchValue : "",
        cedula: searchType === "cedula" ? searchValue : "",
        email: searchType === "email" ? searchValue : "",
      }),
    {
      enabled: false,
      onSuccess: (data) => {
        console.log("✅ [TicketVerifier] Search successful:", data);
      },
      onError: (error) => {
        console.error("❌ [TicketVerifier] Search error:", error);
      },
    }
  );

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchValue.trim()) {
      setHasSearched(true);
      refetch();
    }
  };

  const searchOptions = [
    {
      value: "phone",
      title: "Número de Teléfono",
      desc: "Buscar por tu número registrado",
      icon: Phone,
      placeholder: "Ej: 04121234567",
    },
    {
      value: "cedula",
      title: "Cédula de Identidad",
      desc: "Buscar por tu cédula",
      icon: CreditCard,
      placeholder: "Ej: 12.345.678 o V12345678",
    },
    {
      value: "email",
      title: "Correo Electrónico",
      desc: "Buscar por tu email registrado",
      icon: Mail,
      placeholder: "Ej: tucorreo@email.com",
    },
    {
      value: "ticket",
      title: "Número de Boleto",
      desc: "Buscar por el número específico",
      icon: Ticket,
      placeholder: "Ej: 1234",
    },
  ];

  const currentOption = searchOptions.find((opt) => opt.value === searchType);

  return (
    <section
      className="py-20 px-4 relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
      }}
    >
      <div className="absolute inset-0 opacity-5">
        <div
          className="absolute top-10 left-10 w-32 h-32 rounded-full"
          style={{ backgroundColor: colors.primary }}
        ></div>
        <div
          className="absolute bottom-10 right-10 w-24 h-24 rounded-full"
          style={{ backgroundColor: colors.accent }}
        ></div>
        <div
          className="absolute top-1/2 left-1/4 w-16 h-16 rounded-full"
          style={{ backgroundColor: colors.secondary }}
        ></div>
      </div>

      <div className="container mx-auto relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6 shadow-lg"
              style={{ backgroundColor: colors.primary }}
            >
              <Search className="text-white" size={32} />
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Verificador de Boletos
            </h2>
          </div>

          {/*  Card */}
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
            <div className="p-8 md:p-10">
              <form onSubmit={handleSearch} className="space-y-8">
                <div>
                  <label className="block text-lg font-semibold text-gray-800 mb-6">
                    ¿Cómo quieres buscar?
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {searchOptions.map((option) => {
                      const IconComponent = option.icon;
                      return (
                        <label
                          key={option.value}
                          className={`relative flex flex-col items-center p-6 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
                            searchType === option.value
                              ? "shadow-lg transform scale-105"
                              : "border-gray-200 hover:border-gray-300 hover:shadow-md"
                          }`}
                          style={
                            searchType === option.value
                              ? {
                                  borderColor: colors.primary,
                                  backgroundColor: `${colors.primary}0D`,
                                }
                              : {}
                          }
                        >
                          <input
                            type="radio"
                            value={option.value}
                            checked={searchType === option.value}
                            onChange={(e) => setSearchType(e.target.value)}
                            className="sr-only"
                          />

                          {/* Radio button  */}
                          <div
                            className={`absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center`}
                            style={
                              searchType === option.value
                                ? {
                                    borderColor: colors.primary,
                                    backgroundColor: colors.primary,
                                  }
                                : { borderColor: "#d1d5db" }
                            }
                          >
                            {searchType === option.value && (
                              <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
                            )}
                          </div>

                          {/* Icon */}
                          <IconComponent
                            className={`mb-3 ${
                              searchType === option.value ? "" : "text-gray-400"
                            }`}
                            style={
                              searchType === option.value
                                ? { color: colors.primary }
                                : {}
                            }
                            size={32}
                          />

                          <div className="text-center">
                            <div className="font-semibold text-gray-900 text-sm mb-1">
                              {option.title}
                            </div>
                            <div className="text-xs text-gray-500">
                              {option.desc}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Search Input */}
                <div>
                  <label className="block text-lg font-semibold text-gray-800 mb-3">
                    {currentOption?.title}
                  </label>
                  <div className="relative">
                    <input
                      type={searchType === "email" ? "email" : "text"}
                      value={searchValue}
                      onChange={(e) => setSearchValue(e.target.value)}
                      placeholder={currentOption?.placeholder}
                      className="w-full px-6 py-4 text-lg border-2 border-gray-200 rounded-2xl transition-all duration-200 bg-gray-50 focus:bg-white focus:outline-none"
                      style={{
                        "--tw-ring-color": `${colors.primary}33`,
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = colors.primary;
                        e.target.style.boxShadow = `0 0 0 4px ${colors.primary}33`;
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = "#e5e7eb";
                        e.target.style.boxShadow = "none";
                      }}
                      required
                    />
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                      {currentOption && (
                        <currentOption.icon
                          className="text-gray-400"
                          size={20}
                        />
                      )}
                    </div>
                  </div>

                  <div className="mt-2 text-sm text-gray-500">
                    {searchType === "cedula" && (
                      <p>
                        💡 Puedes usar cualquier formato: 12345678,
                        V-12.345.678, 12.345.678, etc.
                      </p>
                    )}
                    {searchType === "phone" && (
                      <p>
                        💡 Ingresa el número tal como lo registraste (con o sin
                        código de país)
                      </p>
                    )}
                    {searchType === "email" && (
                      <p>
                        💡 Debe ser exactamente el mismo correo usado en la
                        compra
                      </p>
                    )}
                    {searchType === "ticket" && (
                      <p>
                        💡 Solo números, sin ceros adicionales (ej: 123, no
                        0123)
                      </p>
                    )}
                  </div>
                </div>

                {/* Search Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 rounded-2xl font-bold text-lg text-white transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:transform-none flex items-center justify-center space-x-3 shadow-lg"
                  style={{
                    backgroundColor: colors.primary,
                    background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primary}dd 100%)`,
                  }}
                >
                  {isLoading ? (
                    <Loading size="small" text="" />
                  ) : (
                    <>
                      <Search size={24} />
                      <span>VERIFICAR BOLETOS</span>
                      <Sparkles size={20} />
                    </>
                  )}
                </button>
              </form>
            </div>

            {hasSearched && !isLoading && (
              <div className="border-t border-gray-100">
                {tickets?.data?.length > 0 ? (
                  <div className="p-8 md:p-10">
                    <div className="flex items-center justify-center mb-8">
                      <div className="flex items-center text-green-600 bg-green-50 px-6 py-3 rounded-2xl">
                        <CheckCircle size={24} className="mr-3" />
                        <span className="font-bold text-lg">
                          ¡Encontramos {tickets.data.length} boleto
                          {tickets.data.length > 1 ? "s" : ""}!
                        </span>
                      </div>
                    </div>

                    <div className="grid gap-6">
                      {tickets.data.map((ticket, index) => (
                        <div
                          key={ticket.id}
                          className="bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200"
                          style={{ animationDelay: `${index * 0.1}s` }}
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <h4 className="text-xl font-bold text-gray-900 mb-2">
                                {ticket.raffle_name}
                              </h4>
                              <div className="space-y-1">
                                <div className="block sm:hidden">
                                  <div
                                    className="inline-flex items-center px-4 py-2 rounded-xl text-white font-bold shadow-sm mb-2"
                                    style={{ backgroundColor: colors.accent }}
                                  >
                                    <Ticket size={18} className="mr-2" />#
                                    {String(ticket.ticket_number).padStart(4, '0')}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    Boleto{" "}
                                    {ticket.status === "sold"
                                      ? "Vendido"
                                      : "Reservado"}
                                  </div>
                                </div>
                                <p className="text-gray-700 font-medium">
                                  👤 {ticket.customer_name}
                                </p>
                                {ticket.customer_phone && (
                                  <p className="text-gray-600 text-sm">
                                    📞 {ticket.customer_phone}
                                  </p>
                                )}
                                {ticket.customer_email && (
                                  <p className="text-gray-600 text-sm">
                                    📧 {ticket.customer_email}
                                  </p>
                                )}
                                {ticket.customer_cedula && (
                                  <p className="text-gray-600 text-sm">
                                    🆔 {ticket.customer_cedula}
                                  </p>
                                )}
                                {ticket.draw_date && (
                                  <p className="text-gray-500 text-sm">
                                    📅 Fecha del sorteo:{" "}
                                    {formatDate(ticket.draw_date)}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="hidden sm:block text-right ml-4">
                              <div
                                className="inline-flex items-center px-4 py-2 rounded-xl text-white font-bold shadow-sm mb-2"
                                style={{ backgroundColor: colors.accent }}
                              >
                                <Ticket size={18} className="mr-2" />#
                                {String(ticket.ticket_number).padStart(4, '0')}
                              </div>
                              <div className="text-xs text-gray-500">
                                Boleto{" "}
                                {ticket.status === "sold"
                                  ? "Vendido"
                                  : "Reservado"}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-8 md:p-10 text-center">
                    <div className="max-w-md mx-auto">
                      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-100 flex items-center justify-center">
                        <XCircle size={40} className="text-gray-400" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-3">
                        No encontramos boletos
                      </h3>
                      <p className="text-gray-600 mb-2">
                        No se encontraron boletos con esa información
                      </p>
                      <p className="text-sm text-gray-500">
                        Verifica que hayas ingresado correctamente los datos y
                        que tengas boletos registrados
                      </p>
                      {error && (
                        <div className="mt-4 p-3 bg-red-50 rounded-lg">
                          <p className="text-red-600 text-sm">
                            Error:{" "}
                            {error.response?.data?.error || error.message}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="text-center mt-8">
            <p className="text-gray-500">
              ¿Necesitas ayuda? Contacta a nuestro equipo
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TicketVerifier;
