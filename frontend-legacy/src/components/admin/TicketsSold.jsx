import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "react-query";
import {
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  Ticket,
  Sparkles,
  Plus,
  Minus,
  RefreshCw,
  ChevronDown,
  X,
  User,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  MapPin,
} from "lucide-react";
import toast from "react-hot-toast";
import { purchaseAPI, raffleAPI, ticketAPI } from "../../services/api";
import Loading from "../common/Loading";
import Modal from "../common/Modal";
import DebounceInput from "../input-debounce";
import {
  formatDateTime,
  formatCurrency,
  getStatusColor,
  getStatusText,
} from "../../utils/helpers";

import { useInView } from "react-intersection-observer";

const SingleSelectDropdown = ({
  options,
  selectedValue,
  onChange,
  placeholder,
  label,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (value) => {
    onChange(value);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange("");
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <label className="block text-sm font-bold text-gray-700 mb-2">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-left focus:ring-2 focus:ring-primary focus:border-primary flex items-center justify-between"
      >
        <span className="flex-1 truncate">
          {selectedValue
            ? options.find((opt) => opt.value === selectedValue)?.label
            : placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-xl max-h-60 overflow-auto">
          {selectedValue && (
            <button
              onClick={handleClear}
              className="w-full px-3 py-2 text-left text-red-600 hover:bg-red-50 flex items-center space-x-2 border-b"
            >
              <X size={14} />
              <span>Limpiar selección</span>
            </button>
          )}
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className={`w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center space-x-2 ${selectedValue === option.value
                ? "bg-primary/10 text-primary font-medium"
                : ""
                }`}
            >
              <span className="text-lg">{option.icon}</span>
              <span className="truncate">{option.label}</span>
              {selectedValue === option.value && (
                <CheckCircle
                  size={14}
                  className="ml-auto text-primary flex-shrink-0"
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const PURCHASES_DATA_QUERY_KEY = "purchases-all-data"

const parseTicketQtyInput = (raw) => {
  if (raw === "" || raw == null) return "";
  const n = parseInt(String(raw), 10);
  if (Number.isNaN(n) || n < 1) return "";
  return n;
};

const clampTicketQuantity = (value, min, max) => {
  const n = typeof value === "number" ? value : parseInt(String(value), 10);
  if (!Number.isFinite(n)) return min;
  let v = Math.floor(n);
  if (v < min) v = min;
  if (max != null && Number.isFinite(max) && v > max) v = max;
  return v;
};

const TicketsSold = () => {
  const { ref, inView } = useInView();



  //  paginación y ordenamiento
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 500,
  });

  const [sorting, setSorting] = useState({
    field: "created_at",
    direction: "desc",
  });

  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [addTicketQuantity, setAddTicketQuantity] = useState(1);
  const [removeTicketQuantity, setRemoveTicketQuantity] = useState(1);

  const queryClient = useQueryClient();

  const [filters, setFilters] = useState({
    status: "",
    payment_method: "",
    raffle_id: "",
    search: "",
  });

  const {
    data: allPurchasesResponse,
    isLoading,
    error,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery(
    [PURCHASES_DATA_QUERY_KEY, filters],
    ({ pageParam }) => {
      console.log("🔍 Fetching ALL sales analytics:");
      return purchaseAPI.getAll({
        limit: 50,
        page: pageParam,
        raffle_id: filters.raffle_id,
        ...(filters.status && { status: filters.status }),
        ...(filters.payment_method && {
          payment_method: filters.payment_method,
        }),
        ...(filters.search.trim() && {
          search: filters.search.trim(),
          search_type: 'all',
        }),
      });
    },
    {
      staleTime: 5 * 60 * 1000, // Cache por 5 minutos
      cacheTime: 10 * 60 * 1000, // Mantener en cache por 10 minutos
      onSuccess: (data) => {
        console.log('✅ ALL Sales data loaded successfully:', data)
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
  )

  // Obtener rifas para filtros
  const { data: rafflesData } = useQuery("raffles-for-filter", () =>
    raffleAPI.getAll({ status: "all", limit: 1000 })
  );

  const firstActiveRaffleId = rafflesData?.data?.[0]?.status === "active" ? rafflesData?.data?.[0]?.id : "";



  const {
    data: salesAnalytics,
    isLoading: isLoadingSalesAnalytics
  } = useQuery(
    ["sales-analytics", filters.raffle_id,
      filters.status,
      filters.payment_method],
    () => {
      const params = {
        raffle_id: filters.raffle_id,
        ...(filters.status && { status: filters.status }),
        ...(filters.payment_method != "" && {
          payment_method: filters.payment_method,
        }),
      }
      return purchaseAPI.getAnalyticsPurchases(params);
    },
  )

  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      raffle_id: firstActiveRaffleId.toString(),
    }))
  }, [firstActiveRaffleId])

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);


  const updateStatusMutation = useMutation(
    ({ id, status, notes }) => purchaseAPI.updateStatus(id, { status, notes }),
    {
      onSuccess: (response, variables) => {
        const { id, status } = variables;

        if (response.data.noChange) {
          toast.success(
            `La compra ya estaba ${status === "approved"
              ? "aprobada"
              : status === "rejected"
                ? "rechazada"
                : "pendiente"
            }`
          );
        } else {
          toast.success(
            `✅ Estado actualizado: ${response.data.previousStatus} → ${status}`
          );
          setShowModal(false);
        }

        queryClient.invalidateQueries([PURCHASES_DATA_QUERY_KEY]);

        if (selectedPurchase && selectedPurchase.id === id) {
          setSelectedPurchase((prev) => ({
            ...prev,
            status: status,
          }));
        }
      },
      onError: (error) => {
        const errorMsg =
          error.response?.data?.error || "Error al actualizar estado";
        toast.error(errorMsg);
      },
    }
  );

  const reassingStatusMutation = useMutation(
    ({ id, status, notes }) =>
      purchaseAPI.reassignStatus(id, { status, notes }),
    {
      onSuccess: (response, variables) => {
        const { id, status } = variables;

        if (response.data.noChange) {
          toast.success(
            `La compra ya estaba ${status === "approved"
              ? "aprobada"
              : status === "rejected"
                ? "rechazada"
                : "pendiente"
            }`
          );
        } else {
          //toast.success(`✅ Estado actualizado: ${response.data.previousStatus} → ${status}`)
          toast.success(
            `✅ Estado actualizado:  ${status} → ${response.data.status}`
          );
          setShowModal(false);
        }

        queryClient.invalidateQueries([PURCHASES_DATA_QUERY_KEY]);

        if (selectedPurchase && selectedPurchase.id === id) {
          setSelectedPurchase((prev) => ({
            ...prev,
            status: status,
          }));
        }
      },
      onError: (error) => {
        const errorMsg =
          error.response?.data?.error || "Error al actualizar estado";
        toast.error(errorMsg);
      },
    }
  );

  const addTicketsMutation = useMutation(
    ({ purchaseId, quantity }) => purchaseAPI.addTickets(purchaseId, quantity),
    {
      onSuccess: (response, variables) => {
        toast.success(
          `✅ ${response.data.added_tickets.length} boletos agregados exitosamente`
        );
        queryClient.invalidateQueries([PURCHASES_DATA_QUERY_KEY]);
        setAddTicketQuantity(1);
        setRemoveTicketQuantity(1);
        setShowModal(false);
        setSelectedPurchase((prev) => {
          if (!prev) return prev;
          const addedCount =
            response.data.added_tickets?.length ?? variables.quantity ?? 0;
          let nextAvail = prev.raffle_available_tickets;
          if (
            prev.raffle_available_tickets != null &&
            prev.raffle_available_tickets !== ""
          ) {
            const curAvail = parseInt(prev.raffle_available_tickets, 10);
            if (Number.isFinite(curAvail)) {
              nextAvail = Math.max(0, curAvail - addedCount);
            }
          }
          return {
            ...prev,
            ticket_quantity: response.data.new_quantity,
            total_amount: response.data.new_total_amount,
            ticket_numbers: prev.ticket_numbers
              ? prev.ticket_numbers +
                "," +
                response.data.added_tickets.join(",")
              : response.data.added_tickets.join(","),
            raffle_available_tickets: nextAvail,
          };
        });
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || "Error al agregar boletos");
      },
    }
  );

  const removeTicketsMutation = useMutation(
    ({ purchaseId, quantity }) =>
      purchaseAPI.removeTickets(purchaseId, quantity),
    {
      onSuccess: (response, variables) => {
        toast.success(
          `🗑️ ${response.data.removed_tickets.length} boletos removidos exitosamente`
        );
        queryClient.invalidateQueries([PURCHASES_DATA_QUERY_KEY]);
        setAddTicketQuantity(1);
        setRemoveTicketQuantity(1);
        setShowModal(false);
        setSelectedPurchase((prev) => {
          if (!prev) return prev;
          const removedCount =
            response.data.removed_tickets?.length ?? variables.quantity ?? 0;
          let nextAvail = prev.raffle_available_tickets;
          if (
            prev.raffle_available_tickets != null &&
            prev.raffle_available_tickets !== ""
          ) {
            const curAvail = parseInt(prev.raffle_available_tickets, 10);
            if (Number.isFinite(curAvail)) {
              nextAvail = curAvail + removedCount;
            }
          }
          const currentTickets = prev.ticket_numbers
            ? prev.ticket_numbers.split(",")
            : [];
          const remainingTickets = currentTickets.filter(
            (ticket) => !response.data.removed_tickets.includes(ticket.trim())
          );
          return {
            ...prev,
            ticket_quantity: response.data.new_quantity,
            total_amount: response.data.new_total_amount,
            ticket_numbers: remainingTickets.join(","),
            raffle_available_tickets: nextAvail,
          };
        });
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || "Error al quitar boletos");
      },
    }
  );

  const statusOptions = [
    { value: "pending", label: "Pendiente", icon: "⏳" },
    { value: "approved", label: "Aprobado", icon: "✅" },
    { value: "rejected", label: "Rechazado", icon: "❌" },
  ];

  const paymentMethodOptions = [
    { value: "pago_movil", label: "Pago Móvil", icon: "📱" },
    { value: "zinli", label: "Zinli", icon: "⚡" },
    { value: "zelle", label: "Zelle", icon: "💰" },
    { value: "binance", label: "Binance", icon: "🪙" },
    { value: "bs", label: "Bolívares", icon: "🏦" },
    { value: "usd", label: "Dólares", icon: "💵" },
  ];

  const raffleOptions = useMemo(() => {
    let rafflesArray = [];
    if (rafflesData) {
      if (rafflesData.data && Array.isArray(rafflesData.data)) {
        rafflesArray = rafflesData.data;
      } else if (Array.isArray(rafflesData)) {
        rafflesArray = rafflesData;
      } else if (
        rafflesData.status &&
        rafflesData.data &&
        Array.isArray(rafflesData.data.data)
      ) {
        rafflesArray = rafflesData.data.data;
      }
    }
    return rafflesArray.map((raffle) => ({
      value: raffle.id.toString(),
      label: raffle.name,
      icon: "🎲",
    }));
  }, [rafflesData]);

  // Extraer todos los datos
  const allPurchases = useMemo(() => {
    if (!allPurchasesResponse) return []
    const sales = allPurchasesResponse.pages.flatMap((page) => page.data.data);
    return sales
  }, [allPurchasesResponse]);

  // Aplicar filtros del lado del cliente
  const filteredPurchases = useMemo(() => {
    if (!Array.isArray(allPurchases)) return [];

    let filtered = [...allPurchases];

    // Filtro por estado
    if (filters.status) {
      filtered = filtered.filter(
        (purchase) => purchase.status === filters.status
      );
    }

    // Filtro por método de pago
    if (filters.payment_method) {
      filtered = filtered.filter(
        (purchase) => purchase.payment_method === filters.payment_method
      );
    }

    // Filtro por rifa
    if (filters.raffle_id) {
      filtered = filtered.filter(
        (purchase) => purchase.raffle_id?.toString() === filters.raffle_id
      );
    }

    // Filtro de búsqueda
    /*
    if (filters.search && filters.search.trim()) {
      const searchTerm = filters.search.toLowerCase().trim();
      filtered = filtered.filter((purchase) => {
        if (!purchase || typeof purchase !== "object") return false;
        try {
          return (
            (purchase.customer_name || "").toLowerCase().includes(searchTerm) ||
            (purchase.customer_phone || "")
              .toLowerCase()
              .includes(searchTerm) ||
            (purchase.customer_email || "")
              .toLowerCase()
              .includes(searchTerm) ||
            (purchase.customer_ci || "").toLowerCase().includes(searchTerm) ||
            (purchase.payment_reference || "")
              .toLowerCase()
              .includes(searchTerm) ||
            (purchase.ticket_numbers || "")
              .toLowerCase()
              .includes(searchTerm) ||
            (purchase.raffle_name || "").toLowerCase().includes(searchTerm)
          );
        } catch (error) {
          console.warn("⚠️ Error al filtrar purchase:", purchase, error);
          return false;
        }
      });
    }

    console.log(
      `🔍 Filtered purchases: ${filtered.length} of ${allPurchases.length}`
    );*/
    return filtered;
  }, [allPurchases, filters]);


  // Aplicar ordenamiento
  const sortedPurchases = useMemo(() => {
    if (!Array.isArray(filteredPurchases)) return [];
    return [...filteredPurchases].sort((a, b) => {
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
  }, [filteredPurchases, sorting]);

  // Paginación
  const paginationData = useMemo(() => {
    const totalCount = sortedPurchases.length;
    const totalPages = Math.ceil(totalCount / pagination.limit);
    const currentPage = Math.min(pagination.page, totalPages || 1);
    const startIndex = (currentPage - 1) * pagination.limit;
    const endIndex = startIndex + pagination.limit;
    const currentPageData = sortedPurchases.slice(startIndex, endIndex);
    return { totalCount, totalPages, currentPage, currentPageData };
  }, [sortedPurchases, pagination]);

  // Estadísticas totales (excluyendo rechazados)
  const totalStats = useMemo(() => {
    const nonRejectedPurchases = filteredPurchases.filter(
      (p) => p.status !== "rejected"
    );
    const total = filteredPurchases.length;

    let revenueBs = 0;
    let revenueUsd = 0;
    let tickets = 0;

    for (const p of nonRejectedPurchases) {
      const amount = parseFloat(p.total_amount || 0);
      const qty = parseInt(p.ticket_quantity || 0);
      if (isNaN(amount)) continue;
      if (["usd", "zelle", "zinli", "binance"].includes(p.payment_method)) {
        revenueUsd += amount;
      } else {
        revenueBs += amount;
      }
      if (!isNaN(qty)) {
        tickets += qty;
      }
    }

    return {
      total,
      revenueBs,
      revenueUsd,
      tickets,
    };
  }, [filteredPurchases]);

  const canChangeStatus = (purchase) => {
    // No se puede cambiar si ya está aprobada
    if (["approved", "rejected"].includes(purchase.status)) {
      return false;
    }
    // Debe tener tickets asignados
    if (!purchase.ticket_numbers || purchase.ticket_numbers.trim() === "") {
      return false;
    }
    return true;
  };

  const canModifyTickets = (purchase) => {
    // Se puede modificar si está pendiente o aprobada, NO si está rechazada
    return ["pending", "approved"].includes(purchase.status);
  };

  const getStatusChangeBlockMessage = (purchase) => {
    if (["approved", "rejected"].includes(purchase.status)) {
      return `Esta compra ya está ${purchase.status === "approved" ? "aprobada" : "rechazada"
        } y no se puede cambiar`;
    }
    if (!purchase.ticket_numbers || purchase.ticket_numbers.trim() === "") {
      return "Esta compra no tiene boletos asignados";
    }
    return "";
  };

  //  mensaje de por qué no se pueden modificar boletos
  const getTicketModificationBlockMessage = (purchase) => {
    if (purchase.status === "rejected") {
      return "Las compras rechazadas no se pueden modificar";
    }
    return "";
  };

  const ticketAdjustmentLimits = useMemo(() => {
    if (!selectedPurchase) {
      return { maxRemovable: 0, maxAddable: null };
    }
    const curQty = parseInt(selectedPurchase.ticket_quantity, 10) || 0;
    const maxRemovable = Math.max(0, curQty - 1);
    const rawAvail = selectedPurchase.raffle_available_tickets;
    if (rawAvail == null || rawAvail === "") {
      return { maxRemovable, maxAddable: null };
    }
    const parsedAvail = parseInt(rawAvail, 10);
    const maxAddable =
      Number.isFinite(parsedAvail) && parsedAvail >= 0 ? parsedAvail : null;
    return { maxRemovable, maxAddable };
  }, [selectedPurchase]);

  const handleSort = (field) => {
    setSorting((prev) => ({
      field,
      direction:
        prev.field === field && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const resetFilters = () => {
    setFilters({ status: "", payment_method: "", raffle_id: "", search: "" });
    setPagination({ page: 1, limit: 50 });
  };

  const handleViewPurchase = async (purchase) => {
    setSelectedPurchase(purchase);
    setAddTicketQuantity(1);
    setRemoveTicketQuantity(1);
    setShowModal(true);
  };

  const handleUpdateStatus = (purchaseId, status, notes = "") => {
    console.log(`🔄 Actualizando estado de compra ${purchaseId} a ${status}`);
    updateStatusMutation.mutate({
      id: purchaseId,
      status,
      notes,
    });
  };

  const handleReassignStatus = (purchaseId, status, notes = "") => {
    console.log(`🔄 Actualizando estado de compra ${purchaseId} a ${status}`);
    reassingStatusMutation.mutate({
      id: purchaseId,
      status,
      notes,
    });
  };

  const handleAddTickets = () => {
    if (!selectedPurchase) return;
    const maxA = ticketAdjustmentLimits.maxAddable;
    if (maxA === 0) {
      toast.error("No hay boletos disponibles en esta rifa");
      return;
    }
    const parsed = parseTicketQtyInput(addTicketQuantity);
    if (parsed === "") {
      toast.error("Indica una cantidad válida");
      return;
    }
    const upperCap = maxA != null ? maxA : 50000;
    const q = clampTicketQuantity(parsed, 1, upperCap);
    addTicketsMutation.mutate({
      purchaseId: selectedPurchase.id,
      quantity: q,
    });
  };

  const handleRemoveTickets = () => {
    if (!selectedPurchase) return;
    const maxR = ticketAdjustmentLimits.maxRemovable;
    if (maxR < 1) {
      toast.error("No puedes quitar más boletos (debe quedar al menos uno)");
      return;
    }
    const parsed = parseTicketQtyInput(removeTicketQuantity);
    if (parsed === "") {
      toast.error("Indica una cantidad válida");
      return;
    }
    const q = clampTicketQuantity(parsed, 1, Math.min(maxR, 50000));
    removeTicketsMutation.mutate({
      purchaseId: selectedPurchase.id,
      quantity: q,
    });
  };

  const addQtyParsed = parseTicketQtyInput(addTicketQuantity);
  const removeQtyParsed = parseTicketQtyInput(removeTicketQuantity);
  const addTicketsSubmitDisabled =
    addTicketsMutation.isLoading ||
    ticketAdjustmentLimits.maxAddable === 0 ||
    addQtyParsed === "" ||
    addQtyParsed < 1 ||
    addQtyParsed > 50000 ||
    (ticketAdjustmentLimits.maxAddable != null &&
      addQtyParsed > ticketAdjustmentLimits.maxAddable);

  const removeTicketsSubmitDisabled =
    removeTicketsMutation.isLoading ||
    !selectedPurchase?.ticket_numbers ||
    (parseInt(selectedPurchase?.ticket_quantity, 10) || 0) <= 1 ||
    removeQtyParsed === "" ||
    removeQtyParsed < 1 ||
    removeQtyParsed > 50000 ||
    removeQtyParsed > ticketAdjustmentLimits.maxRemovable;

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
        "Estado",
      ],
      ...sortedPurchases.map((purchase) => [
        formatDateTime(purchase.created_at),
        purchase.customer_name,
        purchase.customer_phone || "",
        purchase.customer_email || "",
        purchase.customer_ci || "",
        purchase.raffle_name,
        purchase.payment_method?.toUpperCase() || "",
        purchase.payment_reference || "",
        purchase.ticket_quantity || 0,
        purchase.ticket_numbers || "",
        purchase.total_amount || 0,
        getStatusText(purchase.status),
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `boletos_vendidos_completo_${new Date().toISOString().split("T")[0]
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-3 lg:p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6 lg:mb-8">
        <div className="bg-gradient-to-r from-primary via-primary/90 to-accent rounded-xl lg:rounded-2xl p-4 lg:p-8 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent"></div>
          <div className="absolute top-0 right-0 w-48 lg:w-96 h-48 lg:h-96 bg-accent/10 rounded-full -translate-y-24 lg:-translate-y-48 translate-x-24 lg:translate-x-48"></div>
          <div className="absolute bottom-0 left-0 w-32 lg:w-64 h-32 lg:h-64 bg-white/5 rounded-full translate-y-16 lg:translate-y-32 -translate-x-16 lg:-translate-x-32"></div>

          <div className="relative z-10">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-4 lg:space-y-0">
              <div className="flex-1">
                <div className="flex items-center space-x-3 lg:space-x-4 mb-3 lg:mb-4">
                  <div className="p-2 lg:p-3 bg-white/20 backdrop-blur-sm rounded-lg lg:rounded-xl">
                    <Ticket size={24} className="lg:w-8 lg:h-8 text-accent" />
                  </div>
                </div>
                <h1 className="text-2xl lg:text-5xl font-bold mb-2">
                  🎫 Boletos Vendidos
                </h1>
                <p className="text-sm lg:text-xl text-white/80 mb-3 lg:mb-4">
                  Gestión de ventas y transacciones
                </p>
                <div className="flex flex-wrap items-center gap-3 lg:gap-6 text-xs lg:text-sm">
                  <div>
                    <span className="text-white/60">Registros totales:</span>
                    <span className="font-bold ml-1">
                      {salesAnalytics?.data?.data?.total_purchases} compras
                    </span>
                  </div>
                  <div>
                    <span className="text-white/60">Filtradas:</span>
                    <span className="font-bold ml-1">
                      {totalStats.total} (
                      {paginationData.currentPageData.length} mostradas)
                    </span>
                  </div>
                  <div className="flex flex-col leading-tight">
                    <span className="text-white/60">Ingresos:</span>
                    <span className="font-bold">
                      {formatCurrency(parseFloat(salesAnalytics?.data?.data?.total_bs), "Bs")}{" "}
                      <span className="mx-1">•</span>{" "}
                      {formatCurrency(parseFloat(salesAnalytics?.data?.data?.total_usd), "USD")}
                    </span>
                  </div>

                  <div>
                    <span className="text-white/60">Boletos:</span>
                    <span className="font-bold ml-1">{salesAnalytics?.data?.data.ticket_quantity}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 lg:gap-4">
                <button
                  onClick={handleExport}
                  className="bg-white/20 backdrop-blur-sm text-white px-3 lg:px-6 py-2 lg:py-3 rounded-lg lg:rounded-xl font-bold hover:bg-white/30 transition-all flex items-center space-x-2 shadow-lg text-sm lg:text-base"
                >
                  <Download size={16} className="lg:w-5 lg:h-5" />
                  <span className="hidden sm:inline">Exportar</span>
                </button>
                <button
                  onClick={() =>
                    queryClient.invalidateQueries([PURCHASES_DATA_QUERY_KEY])
                  }
                  className="bg-white/20 backdrop-blur-sm text-white px-3 lg:px-6 py-2 lg:py-3 rounded-lg lg:rounded-xl font-bold hover:bg-white/30 transition-all flex items-center space-x-2 shadow-lg text-sm lg:text-base"
                >
                  <RefreshCw size={16} className="lg:w-5 lg:h-5" />
                  <span className="hidden sm:inline">Actualizar</span>
                </button>
                <div className="hidden lg:block text-4xl lg:text-6xl opacity-30">
                  📊
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Filtros */}
        <div className="bg-white rounded-xl lg:rounded-2xl shadow-xl border border-gray-100 p-4 lg:p-8 mb-6 lg:mb-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-4 lg:mb-6 space-y-2 lg:space-y-0">
            <h2 className="text-lg lg:text-xl font-bold text-gray-900 flex items-center">
              <Filter className="mr-2 text-primary" size={20} />
              Filtros
            </h2>
            <div className="flex flex-wrap items-center gap-2 lg:gap-4 text-sm text-gray-600">
              <span>
                {paginationData.currentPageData.length} de {totalStats.total}{" "}
                compras filtradas
              </span>
              {paginationData.totalPages > 1 && (
                <span>
                  • Página {paginationData.currentPage} de{" "}
                  {paginationData.totalPages}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            <SingleSelectDropdown
              label="Estado"
              options={statusOptions}
              selectedValue={filters.status}
              onChange={(value) => setFilters({ ...filters, status: value })}
              placeholder="Todos los estados"
            />

            <SingleSelectDropdown
              label="Método de Pago"
              options={paymentMethodOptions}
              selectedValue={filters.payment_method}
              onChange={(value) =>
                setFilters({ ...filters, payment_method: value })
              }
              placeholder="Todos los métodos"
            />

            <SingleSelectDropdown
              label="Rifa"
              options={raffleOptions}
              selectedValue={filters.raffle_id === "all" ? undefined : filters.raffle_id}
              onChange={(value) => setFilters({ ...filters, raffle_id: value })}
              placeholder="Todas las rifas"
            />

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Buscar
              </label>
              <DebounceInput
                placeholder="Buscar..."
                value={filters.search}
                onChangeDebounce={(value) => {
                  setFilters({ ...filters, search: value });
                  queryClient.invalidateQueries([PURCHASES_DATA_QUERY_KEY]);
                }}
                className="w-full"
              />
            </div>
          </div>

          {/* Controles de paginación y acciones */}
          {/* <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mt-4 lg:mt-6 space-y-3 lg:space-y-0">
            <div className="flex flex-wrap items-center gap-2 lg:gap-4">
              {(filters.status ||
                filters.payment_method ||
                filters.raffle_id ||
                filters.search) && (
                <button
                  onClick={resetFilters}
                  className="text-red-600 hover:text-red-800 font-medium flex items-center space-x-1 text-sm"
                >
                  <X size={14} />
                  <span>Limpiar filtros</span>
                </button>
              )}
            </div>

            {paginationData.totalPages > 1 && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() =>
                    handlePageChange(paginationData.currentPage - 1)
                  }
                  disabled={paginationData.currentPage === 1}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Página anterior"
                >
                  <ChevronLeft size={16} />
                </button>

                <div className="flex items-center space-x-1">
                  {Array.from(
                    { length: Math.min(5, paginationData.totalPages) },
                    (_, i) => {
                      let pageNum;
                      if (paginationData.totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (paginationData.currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (
                        paginationData.currentPage >=
                        paginationData.totalPages - 2
                      ) {
                        pageNum = paginationData.totalPages - 4 + i;
                      } else {
                        pageNum = paginationData.currentPage - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`px-3 py-1 rounded-lg text-sm font-medium ${
                            pageNum === paginationData.currentPage
                              ? "bg-primary text-white"
                              : "border border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    }
                  )}
                </div>

                <button
                  onClick={() =>
                    handlePageChange(paginationData.currentPage + 1)
                  }
                  disabled={
                    paginationData.currentPage === paginationData.totalPages
                  }
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Página siguiente"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div> */}
        </div>

        {/* Tabla */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loading text="Cargando todos los boletos vendidos..." />
          </div>
        ) : error ? (
          <div className="bg-white rounded-xl lg:rounded-2xl shadow-xl border border-gray-100 p-6 lg:p-8">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="text-red-500 text-4xl lg:text-6xl mb-4">⚠️</div>
              <h3 className="text-lg lg:text-xl font-bold text-gray-900 mb-2">
                Error al cargar datos
              </h3>
              <p className="text-sm lg:text-base text-gray-600 mb-4">
                No se pudieron cargar los datos de compras. Por favor, intenta
                nuevamente.
              </p>
              <button
                onClick={() =>
                  queryClient.invalidateQueries([PURCHASES_DATA_QUERY_KEY])
                }
                className="bg-primary text-white px-6 py-2 rounded-lg font-bold hover:bg-primary/90 transition-all"
              >
                Intentar nuevamente
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl lg:rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
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
                      field="created_at"
                      className="hidden md:table-cell"
                    >
                      Fecha
                    </SortableHeader>
                    <SortableHeader
                      field="payment_method"
                      className="hidden sm:table-cell"
                    >
                      Pago
                    </SortableHeader>
                    <SortableHeader field="status">Estado</SortableHeader>
                    <SortableHeader
                      field="ticket_quantity"
                      className="hidden lg:table-cell"
                    >
                      Boletos
                    </SortableHeader>
                    <SortableHeader field="total_amount">Monto</SortableHeader>
                    <th className="px-3 lg:px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginationData.currentPageData.length > 0 ? (
                    paginationData.currentPageData.map((purchase) => (
                      <tr
                        key={purchase.id}
                        className="hover:bg-gray-50 transition-all"
                      >
                        <td className="px-3 lg:px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-bold text-gray-900 truncate max-w-[150px]">
                              {purchase.customer_name}
                            </div>
                            <div className="text-xs text-gray-400">
                              {purchase.customer_phone}
                            </div>
                            {purchase.customer_email && (
                              <div className="text-xs text-gray-400 truncate max-w-[150px] lg:hidden">
                                {purchase.customer_email}
                              </div>
                            )}
                            <div className="lg:hidden text-xs text-gray-500 mt-1">
                              {purchase.raffle_name}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 lg:px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                          <div className="text-sm font-medium text-gray-900 max-w-[200px] truncate">
                            {purchase.raffle_name}
                          </div>
                        </td>
                        <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                          <div className="text-xs lg:text-sm">
                            {new Date(purchase.created_at).toLocaleDateString(
                              "es-ES",
                              {
                                day: "2-digit",
                                month: "2-digit",
                                year: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </div>
                        </td>
                        <td className="px-3 lg:px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                          <div>
                            <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-lg text-xs font-bold uppercase">
                              {purchase.payment_method}
                            </span>
                            {purchase.payment_reference && (
                              <div className="text-xs text-gray-400 mt-1 font-mono truncate max-w-[100px]">
                                {purchase.payment_reference}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-3 lg:px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-bold rounded-full ${getStatusColor(
                              purchase.status
                            )}`}
                          >
                            <span className="lg:hidden">
                              {purchase.status === "pending"
                                ? "⏳"
                                : purchase.status === "approved"
                                  ? "✅"
                                  : purchase.status === "rejected"
                                    ? "❌"
                                    : "⏰"}
                            </span>
                            <span className="hidden lg:inline">
                              {getStatusText(purchase.status)}
                            </span>
                          </span>
                          <div className="sm:hidden text-xs text-gray-500 mt-1">
                            {purchase.payment_method?.toUpperCase()}
                          </div>
                        </td>
                        <td className="px-3 lg:px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                          <div>
                            <div className="text-sm font-bold text-gray-900">
                              {purchase.ticket_quantity}
                            </div>
                            {purchase.ticket_numbers && (
                              <div className="text-xs text-gray-400 max-w-32 truncate">
                                #
                                {purchase.ticket_numbers
                                  .split(",")
                                  .slice(0, 3)
                                  .map(ticket => String(ticket.trim()).padStart(4, '0'))
                                  .join(", #")}
                                {purchase.ticket_numbers.split(",").length > 3
                                  ? "..."
                                  : ""}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                          <div>
                            <div>
                              {formatCurrency(
                                purchase.total_amount,
                                ["usd", "zelle", "zinli", "binance"].includes(
                                  purchase.payment_method
                                )
                                  ? "USD"
                                  : "Bs"
                              )}
                            </div>
                            <div className="lg:hidden text-xs text-gray-500">
                              {purchase.ticket_quantity} boletos
                            </div>
                          </div>
                        </td>

                        <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              onClick={() => handleViewPurchase(purchase)}
                              className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded-lg transition-all"
                              title="Ver detalles"
                            >
                              <Eye size={14} className="lg:w-4 lg:h-4" />
                            </button>
                            {canChangeStatus(purchase) && (
                              <>
                                <button
                                  onClick={() =>
                                    handleUpdateStatus(purchase.id, "approved")
                                  }
                                  disabled={updateStatusMutation.isLoading}
                                  className="text-green-600 hover:text-green-900 p-2 hover:bg-green-50 rounded-lg transition-all disabled:opacity-50"
                                  title="Aprobar"
                                >
                                  <CheckCircle
                                    size={14}
                                    className="lg:w-4 lg:h-4"
                                  />
                                </button>
                                <button
                                  onClick={() =>
                                    handleUpdateStatus(purchase.id, "rejected")
                                  }
                                  disabled={updateStatusMutation.isLoading}
                                  className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                                  title="Rechazar"
                                >
                                  <XCircle
                                    size={14}
                                    className="lg:w-4 lg:h-4"
                                  />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="8"
                        className="px-6 py-12 text-center text-gray-500"
                      >
                        <div className="flex flex-col items-center">
                          <Ticket size={48} className="text-gray-300 mb-4" />
                          <p className="text-lg font-medium">
                            No se encontraron compras
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

        {/* Modal de detalles */}
        <Modal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setAddTicketQuantity(1);
            setRemoveTicketQuantity(1);
          }}
          title="Detalles de la Compra"
          size="large"
        >
          {selectedPurchase && (
            <div className="space-y-6 lg:space-y-8">
              {/* Información del cliente */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 lg:p-6">
                <h3 className="text-lg lg:text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <User className="mr-2 text-blue-600" size={20} />
                  Información del Cliente
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700">
                      Nombre
                    </label>
                    <p className="mt-1 text-sm text-gray-900 bg-white p-3 rounded-lg">
                      {selectedPurchase.customer_name}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700">
                      Teléfono
                    </label>
                    <p className="mt-1 text-sm text-gray-900 bg-white p-3 rounded-lg">
                      {selectedPurchase.customer_phone}
                    </p>
                  </div>
                  {selectedPurchase.customer_email && (
                    <div>
                      <label className="block text-sm font-bold text-gray-700">
                        Email
                      </label>
                      <p className="mt-1 text-sm text-gray-900 bg-white p-3 rounded-lg break-all">
                        {selectedPurchase.customer_email}
                      </p>
                    </div>
                  )}
                  {selectedPurchase.customer_ci && (
                    <div>
                      <label className="block text-sm font-bold text-gray-700">
                        Cédula
                      </label>
                      <p className="mt-1 text-sm text-gray-900 bg-white p-3 rounded-lg">
                        {selectedPurchase.customer_ci}
                      </p>
                    </div>
                  )}
                  {selectedPurchase.customer_location && (
                    <div className="col-span-1 lg:col-span-2">
                      <label className="block text-sm font-bold text-gray-700">
                        Ubicación
                      </label>
                      <p className="mt-1 text-sm text-gray-900 bg-white p-3 rounded-lg flex items-center">
                        <MapPin size={16} className="mr-2 text-gray-500" />
                        {selectedPurchase.customer_location}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Información de la compra */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 lg:p-6">
                <h3 className="text-lg lg:text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <Ticket className="mr-2 text-green-600" size={20} />
                  Información de la Compra
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700">
                      Rifa
                    </label>
                    <p className="mt-1 text-sm text-gray-900 bg-white p-3 rounded-lg">
                      {selectedPurchase.raffle_name}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700">
                      Cantidad de boletos
                    </label>
                    <p className="mt-1 text-sm text-gray-900 bg-white p-3 rounded-lg">
                      {selectedPurchase.ticket_quantity}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700">
                      Método de pago
                    </label>
                    <p className="mt-1 text-sm text-gray-900 bg-white p-3 rounded-lg uppercase">
                      {selectedPurchase.payment_method}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700">
                      Monto total
                    </label>
                    <p className="mt-1 text-sm text-gray-900 bg-white p-3 rounded-lg font-bold text-green-600">
                      {formatCurrency(
                        selectedPurchase.total_amount,
                        ["zinli", "zelle", "binance", "usd"].includes(
                          selectedPurchase.payment_method
                        )
                          ? "USD"
                          : "Bs"
                      )}
                    </p>
                  </div>
                  {selectedPurchase.payment_reference && (
                    <div>
                      <label className="block text-sm font-bold text-gray-700">
                        Referencia
                      </label>
                      <p className="mt-1 text-sm text-gray-900 bg-white p-3 rounded-lg font-mono break-all">
                        {selectedPurchase.payment_reference}
                      </p>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-bold text-gray-700">
                      Estado
                    </label>
                    <span
                      className={`inline-flex px-3 py-1 text-xs font-bold rounded-full ${getStatusColor(
                        selectedPurchase.status
                      )}`}
                    >
                      {getStatusText(selectedPurchase.status)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Gestión de boletos */}
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-4 lg:p-6">
                <h3 className="text-lg lg:text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <Ticket className="mr-2 text-yellow-600" size={20} />
                  Gestión de Boletos
                </h3>

                {/* Boletos actuales */}
                <div className="mb-6">
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Boletos Asignados
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {selectedPurchase.ticket_numbers ? (
                      selectedPurchase.ticket_numbers
                        .split(",")
                        .map((ticket, index) => (
                          <span
                            key={index}
                            className="bg-gradient-to-r from-primary to-accent text-white px-3 py-1 rounded-full text-sm font-bold"
                          >
                            #{String(ticket.trim()).padStart(4, '0')}
                          </span>
                        ))
                    ) : (
                      <span className="text-gray-500">
                        No hay boletos asignados
                      </span>
                    )}
                  </div>
                </div>

                {canModifyTickets(selectedPurchase) ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <h4 className="font-bold text-gray-900">
                        Agregar Boletos
                      </h4>
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="number"
                            min={1}
                            max={
                              ticketAdjustmentLimits.maxAddable != null
                                ? ticketAdjustmentLimits.maxAddable
                                : 50000
                            }
                            value={addTicketQuantity}
                            onChange={(e) =>
                              setAddTicketQuantity(
                                parseTicketQtyInput(e.target.value)
                              )
                            }
                            onBlur={() => {
                              const maxA = ticketAdjustmentLimits.maxAddable;
                              setAddTicketQuantity((prev) => {
                                const parsed = parseTicketQtyInput(prev);
                                if (parsed === "") return 1;
                                const upper = maxA != null ? maxA : 50000;
                                return clampTicketQuantity(parsed, 1, upper);
                              });
                            }}
                            className="w-24 min-w-[5.5rem] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary text-sm"
                          />
                          <button
                            type="button"
                            onClick={handleAddTickets}
                            disabled={addTicketsSubmitDisabled}
                            className="bg-green-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-600 transition-all disabled:opacity-50 flex items-center space-x-2 text-sm"
                          >
                            <Plus size={16} />
                            <span className="hidden sm:inline">
                              {addTicketsMutation.isLoading
                                ? "Agregando..."
                                : "Agregar"}
                            </span>
                          </button>
                        </div>
                        <p className="text-xs text-gray-600">
                          {ticketAdjustmentLimits.maxAddable != null ? (
                            <>
                              Mínimo 1 — hasta{" "}
                              <strong>
                                {ticketAdjustmentLimits.maxAddable}
                              </strong>{" "}
                              según boletos libres en la rifa (máx. 50.000 por
                              operación).
                            </>
                          ) : (
                            <>
                              Mínimo 1 — hasta{" "}
                              <strong>50.000</strong> por operación; el
                              servidor valida también contra boletos libres.
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-bold text-gray-900">
                        Quitar Boletos
                      </h4>
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="number"
                            min={1}
                            max={Math.max(
                              1,
                              Math.min(
                                ticketAdjustmentLimits.maxRemovable,
                                50000
                              )
                            )}
                            value={removeTicketQuantity}
                            onChange={(e) =>
                              setRemoveTicketQuantity(
                                parseTicketQtyInput(e.target.value)
                              )
                            }
                            onBlur={() => {
                              const maxR = ticketAdjustmentLimits.maxRemovable;
                              setRemoveTicketQuantity((prev) => {
                                const parsed = parseTicketQtyInput(prev);
                                if (parsed === "") return 1;
                                if (maxR < 1) return 1;
                                const upper = Math.min(maxR, 50000);
                                return clampTicketQuantity(parsed, 1, upper);
                              });
                            }}
                            className="w-24 min-w-[5.5rem] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary text-sm"
                          />
                          <button
                            type="button"
                            onClick={handleRemoveTickets}
                            disabled={removeTicketsSubmitDisabled}
                            className="bg-red-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-600 transition-all disabled:opacity-50 flex items-center space-x-2 text-sm"
                          >
                            <Minus size={16} />
                            <span className="hidden sm:inline">
                              {removeTicketsMutation.isLoading
                                ? "Quitando..."
                                : "Quitar"}
                            </span>
                          </button>
                        </div>
                        <p className="text-xs text-gray-600">
                          Mínimo 1 — máximo{" "}
                          <strong>{ticketAdjustmentLimits.maxRemovable}</strong>{" "}
                          (siempre queda al menos 1 boleto; máx. 50.000 por
                          operación).
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 text-red-700">
                      <AlertTriangle size={20} />
                      <span className="font-bold">
                        No se pueden modificar boletos
                      </span>
                    </div>
                    <p className="text-red-600 text-sm mt-1">
                      {getTicketModificationBlockMessage(selectedPurchase)}
                    </p>
                  </div>
                )}

                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <strong>💡 Información:</strong>
                  </p>
                  <ul className="text-sm text-blue-700 mt-2 space-y-1">
                    <li>
                      • <strong>Agregar boletos:</strong> Se seleccionarán
                      automáticamente boletos disponibles
                    </li>
                    <li>
                      • <strong>Quitar boletos:</strong> Se liberarán boletos
                      para otros usuarios
                    </li>
                    <li>
                      • <strong>Montos:</strong> Los precios se recalcularán
                      automáticamente
                    </li>
                    <li>
                      • <strong>Estados:</strong> Se puede modificar compras
                      pendientes y aprobadas, NO rechazadas
                    </li>
                    {!canChangeStatus(selectedPurchase) && (
                      <li className="text-red-600">
                        • <strong>⚠️ Cambio de estado:</strong>{" "}
                        {getStatusChangeBlockMessage(selectedPurchase)}
                      </li>
                    )}
                    {!canModifyTickets(selectedPurchase) && (
                      <li className="text-red-600">
                        • <strong>🔒 Modificación bloqueada:</strong>{" "}
                        {getTicketModificationBlockMessage(selectedPurchase)}
                      </li>
                    )}
                  </ul>
                </div>
              </div>

              {/* Comprobante de pago */}
              {selectedPurchase.payment_proof_url && (
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 lg:p-6">
                  <h3 className="text-lg lg:text-xl font-bold text-gray-900 mb-4 flex items-center">
                    <CreditCard className="mr-2 text-purple-600" size={20} />
                    Comprobante de Pago
                  </h3>
                  <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-4">
                    <img
                      src={selectedPurchase.payment_proof_url}
                      alt="Comprobante de pago"
                      className="max-w-full h-auto rounded-lg shadow-lg"
                    />
                  </div>
                </div>
              )}

              {canChangeStatus(selectedPurchase) ? (
                <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4 pt-6 border-t border-gray-200">
                  <button
                    onClick={() =>
                      handleUpdateStatus(selectedPurchase.id, "rejected")
                    }
                    disabled={updateStatusMutation.isLoading}
                    className="bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-xl font-bold hover:from-red-600 hover:to-red-700 transition-all disabled:opacity-50"
                  >
                    Rechazar
                  </button>
                  <button
                    onClick={() =>
                      handleUpdateStatus(selectedPurchase.id, "approved")
                    }
                    disabled={updateStatusMutation.isLoading}
                    className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-xl font-bold hover:from-green-600 hover:to-green-700 transition-all disabled:opacity-50"
                  >
                    Aprobar
                  </button>
                </div>
              ) : ["rejected"].includes(selectedPurchase.status) ? (
                <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4 pt-6 border-t border-gray-200">
                  <button
                    onClick={() =>
                      handleReassignStatus(selectedPurchase.id, "rejected")
                    }
                    disabled={updateStatusMutation.isLoading}
                    className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white px-6 py-3 rounded-xl font-bold hover:from-yellow-600 hover:to-yellow-700 transition-all disabled:opacity-50"
                  >
                    Recuperar
                  </button>
                </div>
              ) : (
                ["approved"].includes(selectedPurchase.status) && (
                  <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4 pt-6 border-t border-gray-200">
                    <button
                      onClick={() =>
                        handleUpdateStatus(selectedPurchase.id, "rejected")
                      }
                      disabled={updateStatusMutation.isLoading}
                      className="bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-xl font-bold hover:from-red-600 hover:to-red-700 transition-all disabled:opacity-50"
                    >
                      Rechazar
                    </button>
                  </div>
                )
              )}
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
};

export default TicketsSold;
