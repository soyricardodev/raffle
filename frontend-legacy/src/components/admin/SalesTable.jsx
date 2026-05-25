import React, { useEffect, useMemo, useState } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "react-query";

import {
  Activity,
  ArrowDown,
  ArrowDownRight,
  ArrowUp,
  ArrowUpDown,
  ArrowUpRight,
  BarChart3,
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  DollarSign,
  Download,
  Eye,
  FileText,
  Filter,
  PieChart,
  RefreshCw,
  Search,
  Target,
  Ticket,
  TrendingDown,
  TrendingUp,
  User,
  Users,
  Wallet,
  X,
  XCircle,
  MapPin,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

import toast from "react-hot-toast";
import { purchaseAPI, raffleAPI } from "../../services/api";
import {
  formatCurrency,
  formatDateTime,
  getStatusColor,
  getStatusText,
  normalizeString,
} from "../../utils/helpers";
import Loading from "../common/Loading";
import Modal from "../common/Modal";
import DebounceInput from "../input-debounce";

import { useInView } from "react-intersection-observer";

const SalesAnalyticsDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");

  const [sorting, setSorting] = useState({
    field: "created_at",
    direction: "desc",
  });

  const [selectedSale, setSelectedSale] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  const queryClient = useQueryClient();

  const getCurrency = (paymentMethod) => {
    const dollarMethods = ["usd", "zelle", "zinli", "binance"];
    return dollarMethods.includes(paymentMethod) ? "USD" : "Bs";
  };

  const { ref, inView } = useInView();

  // Obtener rifas para filtros
  const { data: rafflesData } = useQuery("raffles-for-filter", () =>
    raffleAPI.getAll({ status: "all", limit: 1000 })
  );

  const firstActiveRaffleId =
    rafflesData?.data?.[0]?.status === "active"
      ? rafflesData?.data?.[0]?.id
      : "all";

  const [filters, setFilters] = useState({
    search: "",
    status: "approved",
    payment_method: "all",
    date_range: "all",
    raffle_id: firstActiveRaffleId,
    search_type: "all",
  });

  const {
    data: salesResponse,
    isLoading: loadingSales,
    error: salesError,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery(
    ["purchases-analytics-all", filters, dateRange.start, dateRange.end],
    ({ pageParam }) => {
      console.log("🔍 Fetching ALL sales analytics:", filters);

      return purchaseAPI.getAll({
        limit: 50,
        page: pageParam,
        raffle_id:
          filters.raffle_id !== "all" ? Number(filters.raffle_id) : undefined,
        ...(filters.status && { status: filters.status }),
        ...(filters.payment_method !== "all"
          ? { payment_method: filters.payment_method }
          : undefined),
        ...(filters.search.trim() && {
          search: filters.search.trim(),
          search_type: filters.search_type,
        }),
        ...(dateRange.start.trim() && {
          start: dateRange.start,
        }),
        ...(dateRange.end.trim() && {
          end: dateRange.end,
        }),
      });
    },
    {
      staleTime: 5 * 60 * 1000, // Cache por 5 minutos
      cacheTime: 10 * 60 * 1000, // Mantener en cache por 10 minutos
      onSuccess: (data) => {
        console.log("✅ ALL Sales data loaded successfully:", data);
      },
      onError: (error) => {
        console.error("❌ Error loading all sales data:", error);
      },
      getNextPageParam: (lastPage, allPages) => {
        // If there are no more pages, return undefined to indicate there are no more pages to fetch
        if (!lastPage.data.nextPage) return undefined;
        // Return the next page number
        return allPages.length + 1;
      },
    }
  );

  const { data: purchasesAnalytics, isLoading: isLoadingPurchasesAnalytics } =
    useQuery(
      [
        "client-purchases-analytics",
        filters.raffle_id,
        filters.status,
        filters.payment_method,
        dateRange.start,
        dateRange.end,
      ],
      () => {
        console.log("🔍 Fetching purchases analytics:");
        const params = {
          raffle_id: filters.raffle_id,
          ...(filters.status && { status: filters.status }),
          ...(filters.payment_method != "all" && {
            payment_method: filters.payment_method,
          }),
          ...(dateRange.start.trim() && {
            start: dateRange.start,
          }),
          ...(dateRange.end.trim() && {
            end: dateRange.end,
          }),
        };
        return purchaseAPI.getClientPurchases(params);
      }
    );

  const { data: salesAnalytics, isLoading: isLoadingSalesAnalytics } = useQuery(
    [
      "sales-analytics",
      filters.raffle_id,
      filters.status,
      filters.payment_method,
      dateRange.start,
      dateRange.end,
    ],
    () => {
      const params = {
        raffle_id: filters.raffle_id,
        ...(filters.status && { status: filters.status }),
        ...(filters.payment_method != "all" && {
          payment_method: filters.payment_method,
        }),
        ...(dateRange.start.trim() && {
          start: dateRange.start,
        }),
        ...(dateRange.end.trim() && {
          end: dateRange.end,
        }),
      };
      return purchaseAPI.getAnalyticsPurchases(params);
    }
  );

  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      raffle_id: firstActiveRaffleId.toString(),
    }));
  }, [firstActiveRaffleId]);

  const updateStatusMutation = useMutation(
    ({ id, status, notes }) => purchaseAPI.updateStatus(id, { status, notes }),
    {
      onSuccess: () => {
        toast.success("Estado actualizado exitosamente");
        queryClient.invalidateQueries(["purchases-analytics-all"]);
        queryClient.invalidateQueries(["dashboardStats"]);
        setShowModal(false);
      },
      onError: (error) => {
        toast.error(
          error.response?.data?.error || "Error al actualizar estado"
        );
      },
    }
  );

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Extraer TODOS los datos de ventas
  const allSales = useMemo(() => {
    if (!salesResponse) return [];
    const sales = salesResponse.pages.flatMap((page) => page.data.data);
    // const sales = salesResponse.data.data
    return sales;
  }, [salesResponse]);

  // Aplicar TODOS los filtros del lado del cliente
  const filteredSales = useMemo(() => {
    if (!Array.isArray(allSales)) return [];

    let filtered = [...allSales];
    /*
        // Filtro por estado
        if (filters.status !== "all") {
          filtered = filtered.filter((sale) => sale.status === filters.status);
        }
    
        // Filtro por método de pago
        if (filters.payment_method !== "all") {
          filtered = filtered.filter(
            (sale) => sale.payment_method === filters.payment_method
          );
        }
    
        // Filtro por rifa
        if (filters.raffle_id !== "all") {
          filtered = filtered.filter(
            (sale) => sale.raffle_id.toString() === filters.raffle_id.toString()
          );
        }
    
        
        // Filtro por rango de fechas
        if (dateRange.start) {
          const startDate = new Date(dateRange.start);
          filtered = filtered.filter((sale) => {
            const saleDate = new Date(sale.created_at);
            return saleDate >= startDate;
          });
        }
    
        if (dateRange.end) {
          const endDate = new Date(dateRange.end);
          endDate.setHours(23, 59, 59, 999); // Incluir todo el día
          filtered = filtered.filter((sale) => {
            const saleDate = new Date(sale.created_at);
            return saleDate <= endDate;
          });
        }
          
    
        // Filtro de búsqueda
        if (filters.search && filters.search.trim()) {
          const searchTerm = filters.search.toLowerCase().trim();
          filtered = filtered.filter((sale) => {
            if (!sale || typeof sale !== "object") return false;
    
            try {
              if (filters.search_type === "all") {
                return (
                  (sale.customer_name || "").toLowerCase().includes(searchTerm) ||
                  (sale.customer_phone || "").toLowerCase().includes(searchTerm) ||
                  (sale.customer_email || "").toLowerCase().includes(searchTerm) ||
                  (sale.customer_ci || "").toLowerCase().includes(searchTerm) ||
                  (sale.payment_reference || "")
                    .toLowerCase()
                    .includes(searchTerm) ||
                  (sale.ticket_numbers || "").toLowerCase().includes(searchTerm) ||
                  (sale.raffle_name || "").toLowerCase().includes(searchTerm)
                );
              } else if (filters.search_type === "name") {
                return (sale.customer_name || "")
                  .toLowerCase()
                  .includes(searchTerm);
              } else if (filters.search_type === "phone") {
                return (sale.customer_phone || "")
                  .toLowerCase()
                  .includes(searchTerm);
              } else if (filters.search_type === "email") {
                return (sale.customer_email || "")
                  .toLowerCase()
                  .includes(searchTerm);
              } else if (filters.search_type === "ci") {
                return (sale.customer_ci || "").toLowerCase().includes(searchTerm);
              } else if (filters.search_type === "ticket") {
                return (sale.ticket_numbers || "")
                  .toLowerCase()
                  .includes(searchTerm);
              }
              return true;
            } catch (error) {
              console.warn("⚠️ Error al filtrar sale:", sale, error);
              return false;
            }
          });
        }
    */
    console.log(`🔍 Filtered sales: ${filtered.length} of ${allSales.length}`);
    return filtered;
  }, [allSales, filters, dateRange]);

  //  ordenamiento
  const sortedSales = useMemo(() => {
    if (!Array.isArray(filteredSales)) return [];

    return [...filteredSales].sort((a, b) => {
      let aValue, bValue;

      switch (sorting.field) {
        case "customer_name":
          aValue = (a.customer_name || "").toLowerCase();
          bValue = (b.customer_name || "").toLowerCase();
          break;
        case "raffle_name":
          aValue = (a.raffle_name || "").toLowerCase();
          bValue = (b.raffle_name || "").toLowerCase();
          break;
        case "created_at":
          aValue = new Date(a.created_at || 0);
          bValue = new Date(b.created_at || 0);
          break;
        case "payment_method":
          aValue = (a.payment_method || "").toLowerCase();
          bValue = (b.payment_method || "").toLowerCase();
          break;
        case "status":
          aValue = (a.status || "").toLowerCase();
          bValue = (b.status || "").toLowerCase();
          break;
        case "ticket_quantity":
          aValue = parseInt(a.ticket_quantity || 0);
          bValue = parseInt(b.ticket_quantity || 0);
          break;
        case "total_amount":
          aValue = parseFloat(a.total_amount || 0);
          bValue = parseFloat(b.total_amount || 0);
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sorting.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sorting.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredSales, sorting]);

  // Calcular estadísticas basadas en datos filtrados
  const stats = useMemo(() => {
    if (!salesAnalytics) {
      return {
        totalSales: 0,
        totalRevenueBs: 0,
        totalRevenueUsd: 0,
        totalTickets: 0,
        uniqueCustomers: 0,
        uniqueCustomersBs: 0,
        uniqueCustomersUsd: 0,
        revenueByStatus: {},
        paymentMethods: {},
        salesByWeekday: {},
        salesByDate: {},
        salesByRaffle: {},
      };
    }
    /*
    {
        "total_purchases": 301,
        "total_usd": "28532.00",
        "total_bs": "175650.00",
        "ticket_quantity": "2971",
        "clients": 10,
        "prom_bs": "29275.000000",
        "prom_usd": "7133.000000",
        "approved_usd": "28492.00",
        "pending_usd": "40.00",
        "rejected_usd": "0.00",
        "approved_bs": "171450.00",
        "pending_bs": "3750.00",
        "rejected_bs": "450.00",
        "total_pagomovil": "175050.00",
        "total_pbs": "600.00",
        "total_zelle": "28503.00",
        "total_zinli": "29.00",
        "total_binance": "0.00",
        "total_pusd": "0.00"
    }
    */

    return {
      totalSales: salesAnalytics.data.data.total_purchases,
      totalRevenueBs: salesAnalytics.data.data.total_bs,
      totalRevenueUsd: salesAnalytics.data.data.total_usd,
      totalTickets: salesAnalytics.data.data.ticket_quantity,
      uniqueCustomers: salesAnalytics.data.data.clients,
      uniqueCustomersBs: salesAnalytics.data.data.clients_bs,
      uniqueCustomersUsd: salesAnalytics.data.data.clients_usd,
      revenueByStatus: {
        approved: {
          bs: salesAnalytics.data.data.approved_bs,
          usd: salesAnalytics.data.data.approved_usd,
        },
        pending: {
          bs: salesAnalytics.data.data.pending_bs,
          usd: salesAnalytics.data.data.pending_usd,
        },
      },
      paymentMethods: {
        pago_movil: salesAnalytics.data.data.total_pagomovil,
        zinli: salesAnalytics.data.data.total_zinli,
        zelle: salesAnalytics.data.data.total_zelle,
        binance: salesAnalytics.data.data.total_binance,
        bs: salesAnalytics.data.data.total_pbs,
        usd: salesAnalytics.data.data.total_pusd,
      },
      salesByWeekday: {},
      salesByDate: {},
      salesByRaffle: {},
    };

    // const totalSales = filteredSales.length;

    // let totalRevenueBs = 0;
    // let totalRevenueUsd = 0;

    // // Sets para clientes únicos por moneda
    // const uniqueCustomersSetBs = new Set();
    // const uniqueCustomersSetUsd = new Set();
    // const uniqueCustomersSetAll = new Set();

    // filteredSales.forEach((sale) => {
    // 	if (!sale) return;

    // 	const amount = parseFloat(sale.total_amount || 0);
    // 	if (isNaN(amount)) return;

    // 	const dollarMethods = ["usd", "zelle", "zinli", "binance"];
    // 	const customerIdentifier = sale.customer_phone || sale.customer_email;

    // 	if (dollarMethods.includes(sale.payment_method)) {
    // 		totalRevenueUsd += amount;
    // 		if (customerIdentifier && customerIdentifier.trim()) {
    // 			uniqueCustomersSetUsd.add(customerIdentifier.trim().toLowerCase());
    // 		}
    // 	} else {
    // 		totalRevenueBs += amount;
    // 		if (customerIdentifier && customerIdentifier.trim()) {
    // 			uniqueCustomersSetBs.add(customerIdentifier.trim().toLowerCase());
    // 		}
    // 	}

    // 	// Para clientes únicos totales
    // 	if (customerIdentifier && customerIdentifier.trim()) {
    // 		uniqueCustomersSetAll.add(customerIdentifier.trim().toLowerCase());
    // 	}
    // });

    // const totalTickets = filteredSales.reduce((sum, sale) => {
    // 	if (!sale) return sum;
    // 	const quantity = parseInt(sale.ticket_quantity || 0);
    // 	return sum + (isNaN(quantity) ? 0 : quantity);
    // }, 0);

    // const uniqueCustomers = uniqueCustomersSetAll.size;
    // const uniqueCustomersBs = uniqueCustomersSetBs.size;
    // const uniqueCustomersUsd = uniqueCustomersSetUsd.size;

    // // Dinero por estado separado por moneda
    // const revenueByStatus = filteredSales.reduce((acc, sale) => {
    // 	if (!sale) return acc;
    // 	const status = sale.status || "pending";
    // 	const amount = parseFloat(sale.total_amount || 0);
    // 	if (!isNaN(amount)) {
    // 		if (!acc[status]) {
    // 			acc[status] = { bs: 0, usd: 0 };
    // 		}

    // 		const dollarMethods = ["usd", "zelle", "zinli", "binance"];
    // 		if (dollarMethods.includes(sale.payment_method)) {
    // 			acc[status].usd += amount;
    // 		} else {
    // 			acc[status].bs += amount;
    // 		}
    // 	}
    // 	return acc;
    // }, {});

    // // Métodos de pago
    // const paymentMethods = filteredSales.reduce((acc, sale) => {
    // 	if (!sale) return acc;
    // 	const method = sale.payment_method || "unknown";
    // 	const amount = parseFloat(sale.total_amount || 0);
    // 	if (!isNaN(amount)) {
    // 		acc[method] = (acc[method] || 0) + amount;
    // 	}
    // 	return acc;
    // }, {});

    // // Ventas por día de la semana
    // const salesByWeekday = filteredSales.reduce((acc, sale) => {
    // 	if (!sale || !sale.created_at) return acc;

    // 	try {
    // 		const date = new Date(sale.created_at);
    // 		if (isNaN(date.getTime())) return acc;

    // 		const weekday = date.toLocaleDateString("es-ES", { weekday: "long" });

    // 		if (!acc[weekday]) {
    // 			acc[weekday] = { sales: 0, revenueBs: 0, revenueUsd: 0, tickets: 0 };
    // 		}

    // 		acc[weekday].sales += 1;

    // 		const amount = parseFloat(sale.total_amount || 0);
    // 		if (!isNaN(amount)) {
    // 			const dollarMethods = ["usd", "zelle", "zinli", "binance"];
    // 			if (dollarMethods.includes(sale.payment_method)) {
    // 				acc[weekday].revenueUsd += amount;
    // 			} else {
    // 				acc[weekday].revenueBs += amount;
    // 			}
    // 		}

    // 		const quantity = parseInt(sale.ticket_quantity || 0);
    // 		if (!isNaN(quantity)) {
    // 			acc[weekday].tickets += quantity;
    // 		}
    // 	} catch (error) {
    // 		console.warn("⚠️ Error processing sale for weekday:", sale, error);
    // 	}

    // 	return acc;
    // }, {});

    // // Ventas por fecha
    // const salesByDate = filteredSales.reduce((acc, sale) => {
    // 	if (!sale || !sale.created_at) return acc;

    // 	try {
    // 		const dateObj = new Date(sale.created_at);
    // 		if (isNaN(dateObj.getTime())) return acc;

    // 		const date = dateObj.toISOString().split("T")[0];

    // 		if (!acc[date]) {
    // 			acc[date] = { sales: 0, revenueBs: 0, revenueUsd: 0, tickets: 0 };
    // 		}

    // 		acc[date].sales += 1;

    // 		const amount = parseFloat(sale.total_amount || 0);
    // 		if (!isNaN(amount)) {
    // 			const dollarMethods = ["usd", "zelle", "zinli", "binance"];
    // 			if (dollarMethods.includes(sale.payment_method)) {
    // 				acc[date].revenueUsd += amount;
    // 			} else {
    // 				acc[date].revenueBs += amount;
    // 			}
    // 		}

    // 		const quantity = parseInt(sale.ticket_quantity || 0);
    // 		if (!isNaN(quantity)) {
    // 			acc[date].tickets += quantity;
    // 		}
    // 	} catch (error) {
    // 		console.warn("⚠️ Error processing sale for date:", sale, error);
    // 	}

    // 	return acc;
    // }, {});

    // // Análisis por rifa
    // const salesByRaffle = filteredSales.reduce((acc, sale) => {
    // 	if (!sale) return acc;

    // 	const raffleName = sale.raffle_name || "Sin rifa";

    // 	if (!acc[raffleName]) {
    // 		acc[raffleName] = {
    // 			sales: 0,
    // 			revenueBs: 0,
    // 			revenueUsd: 0,
    // 			tickets: 0,
    // 			customers: new Set(),
    // 		};
    // 	}

    // 	acc[raffleName].sales += 1;

    // 	const amount = parseFloat(sale.total_amount || 0);
    // 	if (!isNaN(amount)) {
    // 		const dollarMethods = ["usd", "zelle", "zinli", "binance"];
    // 		if (dollarMethods.includes(sale.payment_method)) {
    // 			acc[raffleName].revenueUsd += amount;
    // 		} else {
    // 			acc[raffleName].revenueBs += amount;
    // 		}
    // 	}

    // 	const quantity = parseInt(sale.ticket_quantity || 0);
    // 	if (!isNaN(quantity)) {
    // 		acc[raffleName].tickets += quantity;
    // 	}

    // 	const customerContact = sale.customer_phone || sale.customer_email;
    // 	if (customerContact && customerContact.trim()) {
    // 		acc[raffleName].customers.add(customerContact.trim().toLowerCase());
    // 	}

    // 	return acc;
    // }, {});
  }, [salesAnalytics]);

  // Preparar datos para gráficos
  const chartData = useMemo(() => {
    // Procesar datos de ubicaciones
    const locationCounts = {};
    filteredSales.forEach((sale) => {
      if (sale.customer_location) {
        const location = sale.customer_location.trim();
        if (location) {
          locationCounts[location] = (locationCounts[location] || 0) + 1;
        }
      }
    });

    // Generar colores para ubicaciones
    const COLORS = [
      "#0088FE",
      "#00C49F",
      "#FFBB28",
      "#FF8042",
      "#8884d8",
      "#82ca9d",
      "#ffc658",
      "#ff7300",
      "#8dd1e1",
      "#d084d0",
    ];

    const locationData = Object.entries(locationCounts)
      .map(([location, count], index) => ({
        name: location || "Sin ubicación",
        value: count,
        color: COLORS[index % COLORS.length],
      }))
      .sort((a, b) => b.value - a.value); // Ordenar por cantidad descendente

    // Datos de estado separados por moneda para gráfico de pie
    const statusDataBs = Object.entries(stats.revenueByStatus)
      .map(([status, amounts]) => ({
        name: `${getStatusText(status)} (Bs)`,
        value: parseFloat(amounts.bs) || 0,
        color: getStatusColor(status).includes("green")
          ? "#10b981"
          : getStatusColor(status).includes("yellow")
            ? "#f59e0b"
            : getStatusColor(status).includes("red")
              ? "#ef4444"
              : "#6b7280",
        currency: "Bs",
      }))
      .filter((item) => item.value > 0);

    const statusDataUsd = Object.entries(stats.revenueByStatus)
      .map(([status, amounts]) => ({
        name: `${getStatusText(status)} (USD)`,
        value: parseFloat(amounts.usd) || 0,
        color: getStatusColor(status).includes("green")
          ? "#059669"
          : getStatusColor(status).includes("yellow")
            ? "#d97706"
            : getStatusColor(status).includes("red")
              ? "#dc2626"
              : "#4b5563",
        currency: "USD",
      }))
      .filter((item) => item.value > 0);

    // Combinar ambos para el gráfico
    const statusDataCombined = [...statusDataBs, ...statusDataUsd];

    const paymentData = Object.entries(stats.paymentMethods).map(
      ([method, amount]) => ({
        name: method.toUpperCase(),
        value: amount,
        currency: getCurrency(method),
        color:
          method === "pago_movil"
            ? "#059669"
            : method === "zinli"
              ? "#7c3aed"
              : method === "zelle"
                ? "#2563eb"
                : method === "binance"
                  ? "#f59e0b"
                  : method === "bs"
                    ? "#dc2626"
                    : method === "usd"
                      ? "#16a34a"
                      : "#6b7280",
      })
    );

    const weekdayOrder = [
      "lunes",
      "martes",
      "miércoles",
      "jueves",
      "viernes",
      "sábado",
      "domingo",
    ];
    const weekdayData = weekdayOrder.map((day) => ({
      day: day.charAt(0).toUpperCase() + day.slice(1),
      ventas: stats.salesByWeekday[day]?.sales || 0,
      ingresosBs: stats.salesByWeekday[day]?.revenueBs || 0,
      ingresosUsd: stats.salesByWeekday[day]?.revenueUsd || 0,
      boletos: stats.salesByWeekday[day]?.tickets || 0,
    }));

    const dateData = Object.entries(stats.salesByDate)
      .sort(([a], [b]) => new Date(a) - new Date(b))
      .map(([date, data]) => ({
        fecha: new Date(date).toLocaleDateString("es-ES", {
          month: "short",
          day: "numeric",
        }),
        ventas: data.sales,
        ingresosBs: data.revenueBs,
        ingresosUsd: data.revenueUsd,
        boletos: data.tickets,
      }));

    const raffleData = Object.entries(stats.salesByRaffle)
      .map(([raffle, data]) => ({
        rifa: raffle.length > 20 ? raffle.substring(0, 20) + "..." : raffle,
        ventas: data.sales,
        ingresosBs: data.revenueBs,
        ingresosUsd: data.revenueUsd,
        boletos: data.tickets,
        clientes: data.customers.size,
      }))
      .sort(
        (a, b) => b.ingresosBs + b.ingresosUsd - (a.ingresosBs + a.ingresosUsd)
      )
      .slice(0, 10);

    return {
      statusData: statusDataCombined,
      statusDataBs,
      statusDataUsd,
      paymentData,
      weekdayData,
      dateData,
      raffleData,
      locationData,
    };
  }, [stats, filteredSales]);

  const handleSort = (field) => {
    setSorting((prev) => ({
      field,
      direction:
        prev.field === field && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const resetFilters = () => {
    setFilters({
      search: "",
      status: "all",
      payment_method: "all",
      date_range: "all",
      raffle_id: "all",
      search_type: "all",
    });
    setDateRange({ start: "", end: "" });
  };

  const handleViewSale = (sale) => {
    setSelectedSale(sale);
    setShowModal(true);
  };

  const handleUpdateStatus = (status, notes = "") => {
    if (selectedSale) {
      updateStatusMutation.mutate({
        id: selectedSale.id,
        status,
        notes,
      });
    }
  };

  const handleExport = () => {
    const csvContent = [
      [
        "Fecha",
        "Cliente",
        "Teléfono",
        "Email",
        "CI",
        "Rifa",
        "Método de Pago",
        "Referencia",
        "Boletos",
        "Números",
        "Monto",
        "Moneda",
        "Estado",
      ],
      ...sortedSales.map((sale) => [
        formatDateTime(sale.created_at),
        sale.customer_name,
        sale.customer_phone || "",
        sale.customer_email || "",
        sale.customer_ci || "",
        sale.raffle_name,
        sale.payment_method?.toUpperCase() || "",
        sale.payment_reference || "",
        sale.ticket_quantity || 0,
        sale.ticket_numbers || "",
        sale.total_amount || 0,
        getCurrency(sale.payment_method),
        getStatusText(sale.status),
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `analisis_ventas_completo_${new Date().toISOString().split("T")[0]
      }.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const SortableHeader = ({ field, children, className = "" }) => (
    <th
      className={`px-3 lg:px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors ${className}`}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center space-x-1">
        <span>{children}</span>
        {sorting.field === field ? (
          sorting.direction === "asc" ? (
            <ArrowUp size={14} />
          ) : (
            <ArrowDown size={14} />
          )
        ) : (
          <ArrowUpDown size={14} className="opacity-40" />
        )}
      </div>
    </th>
  );

  if (loadingSales) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-3 lg:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl lg:rounded-2xl shadow-xl border border-gray-100 p-6 lg:p-8">
            <div className="flex items-center justify-center py-12">
              <Loading text="Cargando todos los datos de ventas..." />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (salesError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-3 lg:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl lg:rounded-2xl shadow-xl border border-gray-100 p-6 lg:p-8">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="text-red-500 text-4xl lg:text-6xl mb-4">⚠️</div>
              <h3 className="text-lg lg:text-xl font-bold text-gray-900 mb-2">
                Error al cargar datos
              </h3>
              <p className="text-sm lg:text-base text-gray-600 mb-4">
                No se pudieron cargar los datos de ventas. Por favor, intenta
                nuevamente.
              </p>
              <button
                onClick={() =>
                  queryClient.invalidateQueries("purchases-analytics-all")
                }
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 transition-all"
              >
                Intentar nuevamente
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // if (!Array.isArray(allSales) || allSales.length === 0) {
  // 	return (
  //       <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-3 lg:p-6">
  //         <div className="max-w-7xl mx-auto">
  //           <div className="bg-white rounded-xl lg:rounded-2xl shadow-xl border border-gray-100 p-6 lg:p-8">
  //             <div className="flex flex-col items-center justify-center py-12 text-center">
  //               <div className="text-gray-400 text-4xl lg:text-6xl mb-4">📊</div>
  //               <h3 className="text-lg lg:text-xl font-bold text-gray-900 mb-2">Sin datos de ventas</h3>
  //               <p className="text-sm lg:text-base text-gray-600 mb-4">
  //                 No hay ventas registradas aún. Los datos aparecerán aquí cuando se realicen las primeras ventas.
  //               </p>
  //               <button
  //                 onClick={() => queryClient.invalidateQueries('purchases-analytics-all')}
  //                 className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 transition-all flex items-center space-x-2"
  //               >
  //                 <RefreshCw size={16} />
  //                 <span>Actualizar</span>
  //               </button>
  //             </div>
  //           </div>
  //         </div>
  //       </div>
  //     )
  // }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-3 lg:p-6">
      <div className="max-w-7xl mx-auto space-y-4 lg:space-y-6">
        {/* Header  */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl lg:rounded-2xl p-4 lg:p-6 text-white">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-4 lg:space-y-0">
            <div className="flex-1">
              <h1 className="text-2xl lg:text-3xl font-bold flex items-center">
                <BarChart3 className="mr-2 lg:mr-3" size={28} />
                Dashboard de Análisis de Ventas Completo
              </h1>
              <p className="text-indigo-100 mt-2 text-sm lg:text-base">
                Análisis completo de todas las ventas sin paginación - Datos en
                tiempo real
              </p>
              <div className="flex flex-wrap items-center gap-2 lg:gap-4 mt-3 text-xs lg:text-sm">
                <span>
                  Total cargado: {salesAnalytics?.data?.data?.total_purchases}{" "}
                  ventas
                </span>
                <span>• Filtradas: {sortedSales.length} mostradas</span>
                <span>
                  • Ingresos: {formatCurrency(stats.totalRevenueBs, "Bs")} +{" "}
                  {formatCurrency(stats.totalRevenueUsd, "USD")}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:gap-3">
              <button
                onClick={handleExport}
                className="bg-white/20 backdrop-blur-sm text-white px-3 lg:px-4 py-2 rounded-lg lg:rounded-xl font-bold hover:bg-white/30 transition-all flex items-center space-x-2 text-sm lg:text-base"
              >
                <Download size={16} />
                <span className="hidden sm:inline">Exportar</span>
              </button>
              <button
                onClick={() =>
                  queryClient.invalidateQueries("purchases-analytics-all")
                }
                className="bg-white/20 backdrop-blur-sm text-white px-3 lg:px-4 py-2 rounded-lg lg:rounded-xl font-bold hover:bg-white/30 transition-all flex items-center space-x-2 text-sm lg:text-base"
              >
                <RefreshCw size={16} />
                <span className="hidden sm:inline">Actualizar</span>
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl lg:rounded-2xl shadow-xl border border-gray-100 p-4 lg:p-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-4 space-y-2 lg:space-y-0">
            <h2 className="text-lg lg:text-xl font-bold text-gray-900 flex items-center">
              <Filter className="mr-2 text-indigo-600" size={20} />
              Filtros (Aplicados del lado del cliente)
            </h2>
            <div className="flex flex-wrap items-center gap-2 lg:gap-4 text-sm text-gray-600">
              <span>
                {sortedSales.length} de {allSales.length} ventas mostradas
              </span>
              <span>• Filtros aplicados localmente</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Búsqueda */}
            <div className="lg:col-span-2">
              <DebounceInput
                placeholder="Buscar..."
                value={filters.search}
                onChangeDebounce={(value) =>
                  setFilters((prev) => ({ ...prev, search: value }))
                }
                className="w-full"
              />
            </div>

            {/* Tipo de búsqueda */}
            <select
              value={filters.search_type}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, search_type: e.target.value }))
              }
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
            >
              <option value="all">🔍 Buscar en todo</option>
              <option value="name">👤 Por nombre</option>
              <option value="phone">📱 Por teléfono</option>
              <option value="email">📧 Por email</option>
              <option value="ci">🆔 Por cédula</option>
              <option value="ticket">🎫 Por número de boleto</option>
            </select>

            {/* Rifa */}
            <select
              value={filters.raffle_id}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, raffle_id: e.target.value }))
              }
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
            >
              <option value="all">🎲 Todas las rifas</option>
              {rafflesData?.data?.map &&
                rafflesData.data.map((raffle) => (
                  <option key={raffle.id} value={raffle.id}>
                    {raffle.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Estado */}
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, status: e.target.value }))
              }
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
            >
              <option value="all">📊 Todos los estados</option>
              <option value="pending">⏳ Pendiente</option>
              <option value="approved">✅ Aprobado</option>
              <option value="rejected">❌ Rechazado</option>
            </select>

            {/* Método de pago */}
            <select
              value={filters.payment_method}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  payment_method: e.target.value,
                }))
              }
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
            >
              <option value="all">💳 Todos los métodos</option>
              <option value="pago_movil">📱 Pago Móvil</option>
              <option value="zinli">⚡ Zinli</option>
              <option value="zelle">💰 Zelle</option>
              <option value="binance">🪙 Binance</option>
              <option value="bs">🏦 Bolívares</option>
              <option value="usd">💵 Dólares</option>
            </select>

            {/* Fecha desde */}
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, start: e.target.value }))
              }
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              placeholder="Fecha desde"
            />

            {/* Fecha hasta */}
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, end: e.target.value }))
              }
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              placeholder="Fecha hasta"
            />
          </div>

          {/* Reset filters */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-3 lg:space-y-0">
            <div className="flex flex-wrap items-center gap-2 lg:gap-4">
              {(filters.search ||
                filters.status !== "all" ||
                filters.payment_method !== "all" ||
                filters.raffle_id !== "all" ||
                dateRange.start ||
                dateRange.end) && (
                  <button
                    onClick={resetFilters}
                    className="text-red-600 hover:text-red-800 font-medium flex items-center space-x-1 text-sm"
                  >
                    <X size={14} />
                    <span>Limpiar filtros</span>
                  </button>
                )}
            </div>

            <div className="text-sm text-gray-500">
              ✨ Todos los datos están cargados - Los filtros se aplican
              instantáneamente
            </div>
          </div>
        </div>

        {/* Tabs  */}
        <div className="bg-white rounded-xl lg:rounded-2xl shadow-xl border border-gray-100">
          <div className="border-b border-gray-200">
            <nav
              className="flex space-x-4 lg:space-x-8 px-4 lg:px-6 overflow-x-auto"
              aria-label="Tabs"
            >
              {[
                { id: "overview", name: "Resumen", icon: BarChart3 },
                // { id: 'analytics', name: 'Análisis', icon: TrendingUp },
                { id: "sales", name: "Ventas", icon: FileText },
                { id: "customers", name: "Clientes", icon: Users },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 whitespace-nowrap ${activeTab === tab.id
                    ? "border-indigo-500 text-indigo-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    } transition-all`}
                >
                  <tab.icon size={16} />
                  <span className="hidden sm:inline">{tab.name}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="p-4 lg:p-6">
            {/* Tab: Resumen General */}

            {activeTab === "overview" && (
              <div className="space-y-4 lg:space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 lg:gap-4">
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg lg:rounded-xl p-4 lg:p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-100 text-xs lg:text-sm font-medium">
                          Total Ventas
                        </p>
                        <p className="text-xl lg:text-2xl font-bold">
                          {stats.totalSales}
                        </p>
                      </div>
                      <div className="bg-white/20 p-2 lg:p-3 rounded-lg">
                        <FileText size={16} className="lg:w-5 lg:h-5" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg lg:rounded-xl p-4 lg:p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-100 text-xs lg:text-sm font-medium">
                          Ingresos Bs
                        </p>
                        <p className="text-lg lg:text-xl font-bold">
                          {formatCurrency(stats.totalRevenueBs, "Bs")}
                        </p>
                      </div>
                      <div className="bg-white/20 p-2 lg:p-3 rounded-lg">
                        <DollarSign size={16} className="lg:w-5 lg:h-5" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg lg:rounded-xl p-4 lg:p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-emerald-100 text-xs lg:text-sm font-medium">
                          Ingresos USD
                        </p>
                        <p className="text-lg lg:text-xl font-bold">
                          {formatCurrency(stats.totalRevenueUsd, "USD")}
                        </p>
                      </div>
                      <div className="bg-white/20 p-2 lg:p-3 rounded-lg">
                        <Wallet size={16} className="lg:w-5 lg:h-5" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg lg:rounded-xl p-4 lg:p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-purple-100 text-xs lg:text-sm font-medium">
                          Boletos
                        </p>
                        <p className="text-xl lg:text-2xl font-bold">
                          {stats.totalTickets}
                        </p>
                      </div>
                      <div className="bg-white/20 p-2 lg:p-3 rounded-lg">
                        <Ticket size={16} className="lg:w-5 lg:h-5" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg lg:rounded-xl p-4 lg:p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-orange-100 text-xs lg:text-sm font-medium">
                          Promedio/Cliente Bs
                        </p>
                        <p className="text-lg lg:text-xl font-bold">
                          {formatCurrency(
                            stats.uniqueCustomersBs > 0
                              ? stats.totalRevenueBs / stats.uniqueCustomersBs
                              : 0,
                            "Bs"
                          )}
                        </p>
                      </div>
                      <div className="bg-white/20 p-2 lg:p-3 rounded-lg">
                        <Target size={16} className="lg:w-5 lg:h-5" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-lg lg:rounded-xl p-4 lg:p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-cyan-100 text-xs lg:text-sm font-medium">
                          Promedio/Cliente USD
                        </p>
                        <p className="text-lg lg:text-xl font-bold">
                          {formatCurrency(
                            stats.uniqueCustomersUsd > 0
                              ? stats.totalRevenueUsd / stats.uniqueCustomersUsd
                              : 0,
                            "USD"
                          )}
                        </p>
                      </div>
                      <div className="bg-white/20 p-2 lg:p-3 rounded-lg">
                        <Users size={16} className="lg:w-5 lg:h-5" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dinero por estado */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
                  {Object.entries(stats.revenueByStatus).map(
                    ([status, amounts]) => (
                      <div
                        key={status}
                        className="bg-white border border-gray-200 rounded-lg lg:rounded-xl p-3 lg:p-4"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex-1">
                            <p className="text-gray-600 text-xs lg:text-sm font-medium">
                              {getStatusText(status)}
                            </p>
                            <div className="space-y-1">
                              <p className="text-base lg:text-lg font-bold text-gray-900">
                                {formatCurrency(amounts.bs || 0, "Bs")}
                              </p>
                              <p className="text-base lg:text-lg font-bold text-green-600">
                                {formatCurrency(amounts.usd || 0, "USD")}
                              </p>
                            </div>
                          </div>
                          <div
                            className={`p-2 rounded-lg ${getStatusColor(
                              status
                            )}`}
                          >
                            <Clock size={12} className="lg:w-4 lg:h-4" />
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>

                {/* Gráficos principales  */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                  {/* Estados */}
                  <div className="bg-white border border-gray-200 rounded-lg lg:rounded-xl p-4 lg:p-6">
                    <h3 className="text-base lg:text-lg font-bold text-gray-900 mb-4">
                      Ingresos por Estado (Bs + USD)
                    </h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <RechartsPieChart>
                        <Pie
                          data={chartData.statusData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value, currency }) => {
                            return `${name}: ${formatCurrency(
                              value,
                              currency
                            )}`;
                          }}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {chartData.statusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value, name, props) => {
                            const currency = props.payload.currency;
                            return formatCurrency(value, currency);
                          }}
                        />
                        <Legend />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Métodos de pago */}
                  <div className="bg-white border border-gray-200 rounded-lg lg:rounded-xl p-4 lg:p-6">
                    <h3 className="text-base lg:text-lg font-bold text-gray-900 mb-4">
                      Métodos de Pago (por Moneda)
                    </h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={chartData.paymentData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip
                          formatter={(value, name, props) => {
                            const currency = props.payload.currency || "Bs";
                            return [
                              formatCurrency(value, currency),
                              `${name} (${currency})`,
                            ];
                          }}
                        />
                        <Legend />
                        <Bar dataKey="value" fill="#8884d8">
                          {chartData.paymentData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Gráfico de ubicaciones */}
                {chartData.locationData.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-lg lg:rounded-xl p-4 lg:p-6">
                    <h3 className="text-base lg:text-lg font-bold text-gray-900 mb-4 flex items-center">
                      <MapPin className="mr-2 text-indigo-600" size={20} />
                      Compras por Ubicación
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <RechartsPieChart>
                        <Pie
                          data={chartData.locationData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value, percent }) => {
                            return `${name}: ${value} (${(percent * 100).toFixed(0)}%)`;
                          }}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {chartData.locationData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) => {
                            return [`${value} compras`, "Cantidad"];
                          }}
                        />
                        <Legend />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Análisis Detallado */}
            {activeTab === "analytics" && (
              <div className="space-y-4 lg:space-y-6">
                {/* Ventas por día de la semana */}
                <div className="bg-white border border-gray-200 rounded-lg lg:rounded-xl p-4 lg:p-6">
                  <h3 className="text-base lg:text-lg font-bold text-gray-900 mb-4">
                    Análisis por Día de la Semana
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={chartData.weekdayData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip
                        formatter={(value, name) => {
                          if (name === "ingresosBs")
                            return [formatCurrency(value, "Bs"), "Ingresos Bs"];
                          if (name === "ingresosUsd")
                            return [
                              formatCurrency(value, "USD"),
                              "Ingresos USD",
                            ];
                          return [value, name];
                        }}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="ingresosBs"
                        stackId="1"
                        stroke="#8884d8"
                        fill="#8884d8"
                        name="Ingresos Bs"
                      />
                      <Area
                        type="monotone"
                        dataKey="ingresosUsd"
                        stackId="2"
                        stroke="#82ca9d"
                        fill="#82ca9d"
                        name="Ingresos USD"
                      />
                      <Area
                        type="monotone"
                        dataKey="ventas"
                        stackId="3"
                        stroke="#ffc658"
                        fill="#ffc658"
                        name="Ventas"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Tendencia temporal */}
                <div className="bg-white border border-gray-200 rounded-lg lg:rounded-xl p-4 lg:p-6">
                  <h3 className="text-base lg:text-lg font-bold text-gray-900 mb-4">
                    Tendencia de Ventas por Fecha
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData.dateData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="fecha" />
                      <YAxis />
                      <Tooltip
                        formatter={(value, name) => {
                          if (name === "ingresosBs")
                            return [formatCurrency(value, "Bs"), "Ingresos Bs"];
                          if (name === "ingresosUsd")
                            return [
                              formatCurrency(value, "USD"),
                              "Ingresos USD",
                            ];
                          return [value, name];
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="ingresosBs"
                        stroke="#8884d8"
                        strokeWidth={2}
                        name="Ingresos Bs"
                      />
                      <Line
                        type="monotone"
                        dataKey="ingresosUsd"
                        stroke="#82ca9d"
                        strokeWidth={2}
                        name="Ingresos USD"
                      />
                      <Line
                        type="monotone"
                        dataKey="ventas"
                        stroke="#ffc658"
                        strokeWidth={2}
                        name="Ventas"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Top rifas */}
                <div className="bg-white border border-gray-200 rounded-lg lg:rounded-xl p-4 lg:p-6">
                  <h3 className="text-base lg:text-lg font-bold text-gray-900 mb-4">
                    Top 10 Rifas por Ingresos Totales
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData.raffleData} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="rifa" type="category" width={100} />
                      <Tooltip
                        formatter={(value, name) => {
                          if (name === "ingresosBs")
                            return [formatCurrency(value, "Bs"), "Ingresos Bs"];
                          if (name === "ingresosUsd")
                            return [
                              formatCurrency(value, "USD"),
                              "Ingresos USD",
                            ];
                          return [value, name];
                        }}
                      />
                      <Legend />
                      <Bar
                        dataKey="ingresosBs"
                        fill="#8884d8"
                        name="Ingresos Bs"
                      />
                      <Bar
                        dataKey="ingresosUsd"
                        fill="#82ca9d"
                        name="Ingresos USD"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Tab: Tabla de Ventas */}
            {activeTab === "sales" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base lg:text-lg font-bold text-gray-900">
                    Todas las Ventas ({sortedSales.length} registros)
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <SortableHeader field="created_at">
                          Fecha
                        </SortableHeader>
                        <SortableHeader field="customer_name">
                          Cliente
                        </SortableHeader>
                        <SortableHeader
                          field="raffle_name"
                          className="hidden lg:table-cell"
                        >
                          Rifa
                        </SortableHeader>
                        <SortableHeader
                          field="payment_method"
                          className="hidden md:table-cell"
                        >
                          Pago
                        </SortableHeader>
                        <SortableHeader field="status">Estado</SortableHeader>
                        <SortableHeader field="total_amount">
                          Monto
                        </SortableHeader>
                        <th className="px-3 lg:px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {sortedSales.length > 0 ? (
                        sortedSales.map((sale) => (
                          <tr
                            key={sale.id}
                            className="hover:bg-gray-50 transition-all"
                          >
                            <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-xs lg:text-sm text-gray-500">
                              {new Date(sale.created_at).toLocaleDateString(
                                "es-ES",
                                {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
                            </td>
                            <td className="px-3 lg:px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-xs lg:text-sm font-bold text-gray-900 truncate max-w-[120px] lg:max-w-none">
                                  {sale.customer_name}
                                </div>
                                <div className="text-xs text-gray-400">
                                  {sale.customer_phone}
                                </div>
                                <div className="lg:hidden text-xs text-gray-500 mt-1 truncate max-w-[120px]">
                                  {sale.raffle_name}
                                </div>
                              </div>
                            </td>
                            <td className="px-3 lg:px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                              <div className="text-sm font-medium text-gray-900 max-w-[200px] truncate">
                                {sale.raffle_name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {sale.ticket_quantity} boleto
                                {sale.ticket_quantity !== 1 ? "s" : ""}
                              </div>
                            </td>
                            <td className="px-3 lg:px-6 py-4 whitespace-nowrap hidden md:table-cell">
                              <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-lg text-xs font-bold uppercase">
                                {sale.payment_method}
                              </span>
                              {sale.payment_reference && (
                                <div className="text-xs text-gray-400 mt-1 font-mono truncate max-w-[100px]">
                                  {sale.payment_reference}
                                </div>
                              )}
                            </td>
                            <td className="px-3 lg:px-6 py-4 whitespace-nowrap">
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-bold rounded-full ${getStatusColor(
                                  sale.status
                                )}`}
                              >
                                <span className="lg:hidden">
                                  {sale.status === "pending"
                                    ? "⏳"
                                    : sale.status === "approved"
                                      ? "✅"
                                      : sale.status === "rejected"
                                        ? "❌"
                                        : "⏰"}
                                </span>
                                <span className="hidden lg:inline">
                                  {getStatusText(sale.status)}
                                </span>
                              </span>
                              <div className="md:hidden text-xs text-gray-500 mt-1">
                                {sale.payment_method?.toUpperCase()} •{" "}
                                {sale.ticket_quantity} boletos
                              </div>
                            </td>
                            <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-xs lg:text-sm font-bold text-green-600">
                              {formatCurrency(
                                sale.total_amount,
                                getCurrency(sale.payment_method)
                              )}
                            </td>
                            <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex items-center justify-end space-x-1">
                                <button
                                  onClick={() => handleViewSale(sale)}
                                  className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded-lg transition-all"
                                  title="Ver detalles"
                                >
                                  <Eye size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan="7"
                            className="px-6 py-12 text-center text-gray-500"
                          >
                            <div className="flex flex-col items-center">
                              <FileText
                                size={48}
                                className="text-gray-300 mb-4"
                              />
                              <p className="text-lg font-medium">
                                No se encontraron ventas
                              </p>
                              <p className="text-sm text-gray-400">
                                Intenta modificar los filtros de búsqueda
                              </p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  <button
                    type="button"
                    ref={ref}
                    onClick={() => fetchNextPage()}
                    disabled={!hasNextPage || isFetchingNextPage}
                  >
                    <span className="sr-only">
                      {isFetchingNextPage
                        ? "Loading more..."
                        : hasNextPage
                          ? "Load Newer"
                          : "Nothing more to load"}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Tab: Análisis de Clientes */}
            {activeTab === "customers" && (
              <div className="space-y-4 lg:space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
                  <div className="bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg lg:rounded-xl p-4 lg:p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-cyan-100 text-xs lg:text-sm font-medium">
                          Clientes Únicos
                        </p>
                        <p className="text-xl lg:text-3xl font-bold">
                          {stats.uniqueCustomers}
                        </p>
                        <p className="text-xs text-cyan-200 mt-1">
                          Bs: {stats.uniqueCustomersBs} • USD:{" "}
                          {stats.uniqueCustomersUsd}
                        </p>
                      </div>
                      <Users size={20} className="lg:w-6 lg:h-6" />
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg lg:rounded-xl p-4 lg:p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-emerald-100 text-xs lg:text-sm font-medium">
                          Promedio/Cliente Bs
                        </p>
                        <p className="text-lg lg:text-2xl font-bold">
                          {formatCurrency(
                            stats.uniqueCustomersBs > 0
                              ? stats.totalRevenueBs / stats.uniqueCustomersBs
                              : 0,
                            "Bs"
                          )}
                        </p>
                      </div>
                      <Target size={20} className="lg:w-6 lg:h-6" />
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg lg:rounded-xl p-4 lg:p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-purple-100 text-xs lg:text-sm font-medium">
                          Promedio/Cliente USD
                        </p>
                        <p className="text-lg lg:text-2xl font-bold">
                          {formatCurrency(
                            stats.uniqueCustomersUsd > 0
                              ? stats.totalRevenueUsd / stats.uniqueCustomersUsd
                              : 0,
                            "USD"
                          )}
                        </p>
                      </div>
                      <Activity size={20} className="lg:w-6 lg:h-6" />
                    </div>
                  </div>
                </div>

                {/* Top clientes responsivo */}
                <div className="bg-white border border-gray-200 rounded-lg lg:rounded-xl p-4 lg:p-6">
                  <h3 className="text-base lg:text-lg font-bold text-gray-900 mb-4">
                    Top Clientes por Compras
                  </h3>
                  <div className="space-y-3 lg:space-y-4">
                    {purchasesAnalytics?.data?.data.map((purchase, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 lg:p-4 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center space-x-3 lg:space-x-4 flex-1 min-w-0">
                          <div className="w-6 h-6 lg:w-8 lg:h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-indigo-600 font-bold text-xs lg:text-sm">
                              #{index + 1}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-gray-900 text-sm lg:text-base truncate capitalize">
                              {purchase.customer_name}
                            </div>
                            <div className="text-xs lg:text-sm text-gray-500">
                              {purchase.customer_ci +
                                " - " +
                                purchase.customer_phone}
                            </div>
                            {purchase.customer_email && (
                              <div className="text-xs text-gray-400 truncate lg:hidden">
                                {purchase.customer_email}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="font-bold text-green-600 text-sm lg:text-base">
                            {purchase.total_bs > 0 &&
                              formatCurrency(purchase.total_bs, "Bs")}
                            {purchase.total_bs > 0 &&
                              purchase.total_usd > 0 &&
                              " + "}
                            {purchase.total_usd > 0 &&
                              formatCurrency(purchase.total_usd, "USD")}
                          </div>
                          <div className="text-xs lg:text-sm text-gray-500">
                            {purchase.purchases} compras •{" "}
                            {purchase.ticket_quantity} boletos
                          </div>
                          <div className="text-xs text-gray-400">
                            {purchase.rifas} rifa
                            {purchase.rifas !== 1 ? "s" : ""}
                          </div>
                        </div>
                      </div>
                    ))}
                    {/* {Object.entries(
                      sortedSales.reduce((acc, sale) => {
                        const customerName = normalizeString(
													sale.customer_name,
												);
												const customerPhone = normalizeString(
													sale.customer_phone,
												);
                        	const customerCi = normalizeString(
													sale.customer_ci,
												);
												const key = normalizeString(
													customerCi,
												);
                        if (!acc[key]) {
                          acc[key] = {
                            priceBs: sale.price_bs,
                            name: sale.customer_name,
                            phone: sale.customer_phone,
                            email: sale.customer_email,
                            ci: sale.customer_ci,
                            sales: 0,
                            revenueBs: 0,
                            revenueUsd: 0,
                            tickets: 0,
                            raffles: new Set()
                          }
                        }
                        acc[key].sales += 1

                        const amount = parseFloat(sale.total_amount) || 0
                        const dollarMethods = ['usd', 'zelle', 'zinli', 'binance']
                        if (dollarMethods.includes(sale.payment_method)) {
                          acc[key].revenueUsd += amount
                        } else {
                          acc[key].revenueBs += amount
                        }

                        acc[key].tickets += parseInt(sale.ticket_quantity, 10) || 0;
                        acc[key].raffles.add(sale.raffle_name);
                        return acc;
                      }, {})
                    )
                      .sort(([, a], [, b]) => {
												const aRevenueBs = Number(a.revenueBs);
												const aRevenueUsd = Number(a.revenueUsd);
												const bRevenueBs = Number(b.revenueBs);
												const bRevenueUsd = Number(b.revenueUsd);

												const aPriceBs = Number(a.priceBs);
												const bPriceBs = Number(b.priceBs);

												const aRevenueUsdConverted = aRevenueUsd * aPriceBs;
												const bRevenueUsdConverted = bRevenueUsd * bPriceBs;

												const aTotal = aRevenueBs + aRevenueUsdConverted;
												const bTotal = bRevenueBs + bRevenueUsdConverted;

												return bTotal - aTotal;
											})
                      .slice(0, 10)
                      .map(([key, customer], index) => (
                        <div key={key} className="flex items-center justify-between p-3 lg:p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3 lg:space-x-4 flex-1 min-w-0">
                            <div className="w-6 h-6 lg:w-8 lg:h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-indigo-600 font-bold text-xs lg:text-sm">#{index + 1}</span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-gray-900 text-sm lg:text-base truncate capitalize">
                                {customer.name}
                              </div>
                              <div className="text-xs lg:text-sm text-gray-500">
                                {customer.ci +' - '+ customer.phone}
                              </div>
                              {customer.email && (
                                <div className="text-xs text-gray-400 truncate lg:hidden">{customer.email}</div>
                              )}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="font-bold text-green-600 text-sm lg:text-base">
                              {customer.revenueBs > 0 && formatCurrency(customer.revenueBs, 'Bs')}
                              {customer.revenueBs > 0 && customer.revenueUsd > 0 && ' + '}
                              {customer.revenueUsd > 0 && formatCurrency(customer.revenueUsd, 'USD')}
                            </div>
                            <div className="text-xs lg:text-sm text-gray-500">
                              {customer.sales} compras • {customer.tickets} boletos
                            </div>
                            <div className="text-xs text-gray-400">
                              {customer.raffles.size} rifa{customer.raffles.size !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>
                      ))} */}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/*  detalles */}
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title="Detalles de la Venta"
          size="large"
        >
          {selectedSale && (
            <div className="space-y-4 lg:space-y-6">
              {/* Información del cliente */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg lg:rounded-xl p-4 lg:p-6">
                <h3 className="text-lg lg:text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <User className="mr-2 text-blue-600" size={20} />
                  Información del Cliente
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Nombre
                    </label>
                    <p className="mt-1 text-sm text-gray-900 bg-white p-3 rounded-lg capitalize">
                      {selectedSale.customer_name}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Teléfono
                    </label>
                    <p className="mt-1 text-sm text-gray-900 bg-white p-3 rounded-lg">
                      {selectedSale.customer_phone}
                    </p>
                  </div>
                  {selectedSale.customer_email && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Email
                      </label>
                      <p className="mt-1 text-sm text-gray-900 bg-white p-3 rounded-lg break-all">
                        {selectedSale.customer_email}
                      </p>
                    </div>
                  )}
                  {selectedSale.customer_ci && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Cédula
                      </label>
                      <p className="mt-1 text-sm text-gray-900 bg-white p-3 rounded-lg">
                        {selectedSale.customer_ci}
                      </p>
                    </div>
                  )}
                  {selectedSale.customer_location && (
                    <div className="col-span-1 lg:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Ubicación
                      </label>
                      <p className="mt-1 text-sm text-gray-900 bg-white p-3 rounded-lg flex items-center">
                        <MapPin size={16} className="mr-2 text-gray-500" />
                        {selectedSale.customer_location}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Información de la venta */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg lg:rounded-xl p-4 lg:p-6">
                <h3 className="text-lg lg:text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <Ticket className="mr-2 text-green-600" size={20} />
                  Información de la Venta
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Rifa
                    </label>
                    <p className="mt-1 text-sm text-gray-900 bg-white p-3 rounded-lg">
                      {selectedSale.raffle_name}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Cantidad
                    </label>
                    <p className="mt-1 text-sm text-gray-900 bg-white p-3 rounded-lg">
                      {selectedSale.ticket_quantity} boleto
                      {selectedSale.ticket_quantity !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Método de pago
                    </label>
                    <p className="mt-1 text-sm text-gray-900 bg-white p-3 rounded-lg uppercase">
                      {selectedSale.payment_method}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Monto total
                    </label>
                    <p className="mt-1 text-sm text-gray-900 bg-white p-3 rounded-lg font-bold text-green-600">
                      {formatCurrency(
                        selectedSale.total_amount,
                        getCurrency(selectedSale.payment_method)
                      )}
                    </p>
                  </div>
                  {selectedSale.payment_reference && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Referencia
                      </label>
                      <p className="mt-1 text-sm text-gray-900 bg-white p-3 rounded-lg font-mono break-all">
                        {selectedSale.payment_reference}
                      </p>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Estado
                    </label>
                    <span
                      className={`inline-flex px-3 py-1 text-xs font-bold rounded-full ${getStatusColor(
                        selectedSale.status
                      )}`}
                    >
                      {getStatusText(selectedSale.status)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Números de boletos */}
              {selectedSale.ticket_numbers && (
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg lg:rounded-xl p-4 lg:p-6">
                  <h3 className="text-lg lg:text-xl font-bold text-gray-900 mb-4 flex items-center">
                    <Ticket className="mr-2 text-yellow-600" size={20} />
                    Boletos Asignados
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedSale.ticket_numbers
                      .split(",")
                      .map((ticket, index) => (
                        <span
                          key={index}
                          className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-3 py-1 rounded-full text-sm font-bold"
                        >
                          #{ticket.trim()}
                        </span>
                      ))}
                  </div>
                </div>
              )}

              {/* Comprobante de pago */}
              {selectedSale.payment_proof_url && (
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg lg:rounded-xl p-4 lg:p-6">
                  <h3 className="text-lg lg:text-xl font-bold text-gray-900 mb-4 flex items-center">
                    <CreditCard className="mr-2 text-purple-600" size={20} />
                    Comprobante de Pago
                  </h3>
                  <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-4">
                    <img
                      src={selectedSale.payment_proof_url}
                      alt="Comprobante de pago"
                      className="max-w-full h-auto rounded-lg shadow-lg"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
};

export default SalesAnalyticsDashboard;
