import {
	ArrowDown,
	ArrowUp,
	ArrowUpDown,
	BarChart3,
	Calendar,
	CheckCircle,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	DollarSign,
	Eye,
	Filter,
	Plus,
	RefreshCw,
	Search,
	TrendingUp,
	Users,
	X,
	XCircle,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useInView } from "react-intersection-observer";
import {
	useInfiniteQuery,
	useMutation,
	useQuery,
	useQueryClient,
} from "react-query";
import { Link } from "react-router-dom";
import { purchaseAPI, raffleAPI } from "../../services/api";
import {
	formatCurrency,
	formatDateTime,
	getStatusColor,
	getStatusText,
} from "../../utils/helpers";
import Loading from "../common/Loading";
import Modal from "../common/Modal";
import DebounceInput from "../input-debounce";

const getCurrencyByMethod = (method) => {
	if (["pago_movil", "bs"].includes(method)) return "Bs";
	return "USD";
};

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
		onChange(null);
		setIsOpen(false);
	};

	const selectedOption = options.find((opt) => opt.value === selectedValue);

	return (
		<div className="relative">
			<label className="block text-sm font-bold text-gray-700 mb-2">
				{label}
			</label>
			<button
				type="button"
				onClick={() => setIsOpen(!isOpen)}
				className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-left focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 flex items-center justify-between"
			>
				<span className="flex-1 truncate">
					{selectedValue ? selectedOption?.label : placeholder}
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
							className={`w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center space-x-2 ${
								selectedValue === option.value
									? "bg-indigo-100 text-indigo-700 font-medium"
									: ""
							}`}
						>
							<span className="text-lg">{option.icon}</span>
							<span className="truncate">{option.label}</span>
						</button>
					))}
				</div>
			)}
		</div>
	);
};

const DASHBOARD_DATA_QUERY_KEY = "dashboard-data"

const Dashboard = () => {
	const { ref, inView } = useInView();

	const [pagination, setPagination] = useState({
		page: 1,
		limit: 10000,
	});

	const [sorting, setSorting] = useState({
		field: "created_at",
		direction: "desc",
	});

	const [selectedSale, setSelectedSale] = useState(null);
	const [showModal, setShowModal] = useState(false);

	const queryClient = useQueryClient();

	const { data: activeRaffle, isLoading: loadingActiveRaffle } = useQuery(
		"activeRaffle",
		() => raffleAPI.getAll({ status: "active", limit: 1 }),
	);

	const activeRaffleId = activeRaffle?.data?.[0]?.id;

	const [filters, setFilters] = useState({
		status: null,
		payment_method: null,
		raffle_id: activeRaffleId,
		search: "",
	});


	const { data: stats, isLoading: loadingStats } = useQuery(
		["dashboardStats", activeRaffleId],
		() => raffleAPI.getDashboardStats({ raffle_id: activeRaffleId }),
		{ enabled: !!activeRaffleId },
	);

	const {
		data: salesResponse,
		isLoading: loadingSales,
		isFetchingNextPage,
		hasNextPage,
		fetchNextPage,
	} = useInfiniteQuery(
		[DASHBOARD_DATA_QUERY_KEY, activeRaffleId, pagination, filters, sorting],
		({ pageParam = 1 }) => {
			const params = {
				limit: 50,
				page: pageParam,
				raffle_id: activeRaffleId,
				...(filters.status && { status: filters.status }),
				...(filters.payment_method && {
					payment_method: filters.payment_method,
				}),
				...(filters.search.trim() && {
					search: filters.search.trim(),
					search_type: "all",
				}),
			};
			return purchaseAPI.getAll(params);
		},
		{
			keepPreviousData: true,
			enabled: !!activeRaffleId,
			getNextPageParam: (lastPage, allPages) => {
				// If there are no more pages, return undefined to indicate there are no more pages to fetch
				if (!lastPage.data.nextPage) return undefined;
				// Return the next page number
				return allPages.length + 1;
			},
		},
	);

	const updateStatusMutation = useMutation(
		({ id, status, notes }) => purchaseAPI.updateStatus(id, { status, notes }),
		{
			onSuccess: () => {
				toast.success("Estado actualizado exitosamente");
				queryClient.invalidateQueries([DASHBOARD_DATA_QUERY_KEY]);
				queryClient.invalidateQueries(["dashboardStats"]);
				setShowModal(false);
			},
			onError: (error) =>
				toast.error(
					error.response?.data?.error || "Error al actualizar estado",
				),
		},
	);

	const reassignStatusMutation = useMutation(
		({ id, status, notes }) =>
			purchaseAPI.reassignStatus(id, { status, notes }),
		{
			onSuccess: () => {
				toast.success("Estado actualizado exitosamente");
				queryClient.invalidateQueries([DASHBOARD_DATA_QUERY_KEY]);
				queryClient.invalidateQueries(["dashboardStats"]);
				setShowModal(false);
			},
			onError: (error) =>
				toast.error(
					error.response?.data?.error || "Error al actualizar estado",
				),
		},
	);



	useEffect(() => {
		if (activeRaffleId) {
			setFilters((prev) => ({
				...prev,
				raffle_id: activeRaffleId.toString(),
			}))
		}
  }, [activeRaffleId])

	const {
    data: salesAnalytics,
    isLoading: isLoadingSalesAnalytics
  } = useQuery(
    ["sales-analytics", filters.raffle_id,
      filters.status,
      filters.payment_method,
      filters.search.trim()],
    () => {
      const params = {
        raffle_id: filters.raffle_id,
				...(filters.status && { status: filters.status }),
				...(filters.payment_method != "all" && {
					payment_method: filters.payment_method,
				}),
				...(filters.search.trim() && {
					search: filters.search.trim(),
					search_type: "all",
				}),
      }
      return purchaseAPI.getAnalyticsPurchases(params);
    },
  );

	useEffect(() => {
		if (inView && hasNextPage && !isFetchingNextPage) {
			fetchNextPage();
		}
	}, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

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

	const { sales, totalCount, totalPages } = useMemo(() => {
		if (!salesResponse) return { sales: [], totalCount: 0, totalPages: 0 };
		// const sales = Array.isArray(salesResponse.data)
		// 	? salesResponse.data
		// 	: salesResponse.data?.data || [];
		const sales = salesResponse.pages.flatMap((page) => page.data.data);
		const totalCount = salesResponse.pages.reduce(
			(acc, page) => acc + page.data.data.length,
			0,
		);
		const totalPages = Math.ceil(totalCount / pagination.limit);
		return { sales, totalCount, totalPages };
	}, [salesResponse, pagination.limit]);

	const incomeByMethod = useMemo(() => {
		if (!salesAnalytics || activeRaffleId === "all" || !activeRaffleId) {
			return {
				pago_movil: { label: "Pago Móvil", currency: "Bs", amount: 0 },
				bs: { label: "Bolívares", currency: "Bs", amount: 0 },
				zinli: { label: "Zinli", currency: "USD", amount: 0 },
				zelle: { label: "Zelle", currency: "USD", amount: 0 },
				binance: { label: "Binance", currency: "USD", amount: 0 },
				usd: { label: "Dólares", currency: "USD", amount: 0 },
			};
		}

		const methods = {
			pago_movil: { label: "Pago Móvil", currency: "Bs", amount: salesAnalytics.data.data.total_pagomovil },
			bs: { label: "Bolívares", currency: "Bs", amount: salesAnalytics.data.data.total_pbs },
			zinli: { label: "Zinli", currency: "USD", amount: salesAnalytics.data.data.total_zinli },
			zelle: { label: "Zelle", currency: "USD", amount: salesAnalytics.data.data.total_zelle },
			binance: { label: "Binance", currency: "USD", amount: salesAnalytics.data.data.total_binance },
			usd: { label: "Dólares", currency: "USD", amount: salesAnalytics.data.data.total_pusd },
		};

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

		// sales.forEach((sale) => {
		// 	const amount = parseFloat(sale.total_amount);
		// 	const isValid = !isNaN(amount);
		// 	const isApprovedOrPending = ["approved", "pending"].includes(sale.status);
		// 	const isKnownMethod = Object.hasOwn(methods, sale.payment_method);

		// 	if (isValid && isApprovedOrPending && isKnownMethod) {
		// 		methods[sale.payment_method].amount += amount;
		// 	}
		// });

		return methods;
	}, [salesAnalytics]);

	const handleSort = (field) => {
		setSorting((prev) => ({
			field,
			direction:
				prev.field === field && prev.direction === "asc" ? "desc" : "asc",
		}));
	};

	const handlePageChange = (newPage) =>
		setPagination((prev) => ({ ...prev, page: newPage }));

	const resetFilters = () => {
		setFilters({
			status: null,
			payment_method: null,
			raffle_id: null,
			search: "",
		});
		setPagination({ page: 1, limit: 50 });
	};

	const handleViewSale = (sale) => {
		setSelectedSale(sale);
		setShowModal(true);
	};

	const handleUpdateStatus = (status, notes = "") => {
		if (selectedSale) {
			updateStatusMutation.mutate({ id: selectedSale.id, status, notes });
		}
	};

	const handleReassignStatus = (status, notes = "") => {
		if (selectedSale) {
			reassignStatusMutation.mutate({ id: selectedSale.id, status, notes });
		}
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

	if (loadingActiveRaffle || loadingStats) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-3 lg:p-6">
				<Loading size="large" text="Cargando datos..." />
			</div>
		);
	}

	const dashboardData = stats?.data || {};

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-3 lg:p-6">
			<div className="max-w-7xl mx-auto mb-6 lg:mb-8">
				<div className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 rounded-xl lg:rounded-2xl p-4 lg:p-8 text-white relative overflow-hidden">
					<div className="absolute inset-0 bg-gradient-to-r from-indigo-600/20 to-transparent"></div>
					<div className="relative z-10">
						<div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-4 lg:space-y-0">
							<div className="flex-1">
								<div className="flex items-center space-x-3 lg:space-x-4 mb-3 lg:mb-4">
									<div className="p-2 lg:p-3 bg-white/20 backdrop-blur-sm rounded-lg lg:rounded-xl">
										<BarChart3 size={24} className="lg:w-8 lg:h-8 text-white" />
									</div>
								</div>
								<h1 className="text-2xl lg:text-5xl font-bold mb-2">
									📊 Dashboard
								</h1>
								<p className="text-sm lg:text-xl text-white/80">
									Resumen de la rifa activa:{" "}
									{activeRaffle?.data?.[0]?.name || "Sin rifa activa"}
								</p>
							</div>
							<div className="flex flex-wrap items-center gap-2 lg:gap-4">
								<Link
									to="/admin/create"
									className="bg-white/20 backdrop-blur-sm text-white px-3 lg:px-6 py-2 lg:py-3 rounded-lg lg:rounded-xl font-bold hover:bg-white/30 transition-all flex items-center space-x-2 shadow-lg text-sm lg:text-base"
								>
									<Plus size={16} className="lg:w-5 lg:h-5" />
									<span className="hidden sm:inline">Nueva Rifa</span>
									<span className="sm:hidden">Nueva</span>
								</Link>
								<button
									onClick={() => {
										queryClient.invalidateQueries(["dashboardStats"]);
										queryClient.invalidateQueries([DASHBOARD_DATA_QUERY_KEY]);
									}}
									className="bg-white/20 backdrop-blur-sm text-white px-3 lg:px-6 py-2 lg:py-3 rounded-lg lg:rounded-xl font-bold hover:bg-white/30 transition-all flex items-center space-x-2 shadow-lg text-sm lg:text-base"
								>
									<RefreshCw size={16} className="lg:w-5 lg:h-5" />
									<span className="hidden sm:inline">Actualizar</span>
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div className="max-w-7xl mx-auto">
				<div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6 mb-6 lg:mb-8">
					{/* Rifa Actual */}
					<div className="col-span-2 lg:col-span-1 bg-white rounded-xl lg:rounded-2xl shadow-xl border border-gray-100 p-4 lg:p-8 hover:shadow-2xl transition-all group">
						<div className="flex items-center justify-between mb-4 lg:mb-6">
							<div className="p-2 lg:p-3 bg-blue-100 rounded-lg lg:rounded-xl group-hover:bg-blue-200 transition-colors">
								<Calendar className="h-5 w-5 lg:h-8 lg:w-8 text-blue-600" />
							</div>
							<div className="text-xs lg:text-sm font-bold text-blue-600 bg-blue-50 px-2 lg:px-3 py-1 rounded-full">
								Rifa Activa
							</div>
						</div>

						{/* Detalles de la rifa activa */}
						{activeRaffle?.data?.[0] ? (
							<div className="text-center mb-4">
								<h3 className="text-sm lg:text-base font-bold text-gray-900">
									{activeRaffle.data[0].name}
								</h3>
								{activeRaffle.data[0].description && (
									<p className="text-xs text-gray-500 truncate">
										{activeRaffle.data[0].description}
									</p>
								)}
							</div>
						) : (
							<div className="text-sm text-gray-500 mb-4 italic text-center">
								Sin rifa activa
							</div>
						)}

						<div className="grid grid-cols-3 gap-2 lg:gap-4 text-center">
							<div className="group-hover:scale-105 transition-transform">
								<div className="text-lg lg:text-2xl font-bold text-green-600">
									{dashboardData.tickets?.sold_tickets || 0}
								</div>
								<div className="text-xs text-gray-500 font-medium">
									Vendidos
								</div>
							</div>
							<div className="group-hover:scale-105 transition-transform">
								<div className="text-lg lg:text-2xl font-bold text-blue-600">
									{(dashboardData.tickets?.total_tickets || 0) -
										(dashboardData.tickets?.sold_tickets || 0) -
										(dashboardData.tickets?.reserved_tickets || 0)}
								</div>
								<div className="text-xs text-gray-500 font-medium">
									Disponibles
								</div>
							</div>
							<div className="group-hover:scale-105 transition-transform">
								<div className="text-lg lg:text-2xl font-bold text-orange-600">
									{dashboardData.tickets?.reserved_tickets || 0}
								</div>
								<div className="text-xs text-gray-500 font-medium">
									Reservados
								</div>
							</div>
						</div>
					</div>

					{Object.entries(incomeByMethod).map(([method, data]) => (
						<div
							key={method}
							className="bg-white rounded-xl lg:rounded-2xl shadow-xl border border-gray-100 p-4 lg:p-8 hover:shadow-2xl transition-all group"
						>
							<div className="flex items-center justify-between mb-4 lg:mb-6">
								<div className="p-2 lg:p-3 bg-green-100 rounded-lg lg:rounded-xl group-hover:bg-green-200 transition-colors">
									<DollarSign className="h-5 w-5 lg:h-8 lg:w-8 text-green-600" />
								</div>
								<div className="text-xs lg:text-sm font-bold text-green-600 bg-green-50 px-2 lg:px-3 py-1 rounded-full">
									{data.label}
								</div>
							</div>
							<div className="text-center group-hover:scale-105 transition-transform">
								<div className="text-lg lg:text-3xl font-bold text-green-600 mb-2 leading-tight">
									{formatCurrency(data.amount, data.currency)}
								</div>
								<div className="text-xs lg:text-sm text-gray-500 font-medium">
									Ingresos
								</div>
							</div>
						</div>
					))}
				</div>

				<div className="bg-white rounded-xl lg:rounded-2xl shadow-xl border border-gray-100 p-4 lg:p-6 mb-6 lg:mb-8">
					<div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-4 space-y-2 lg:space-y-0">
						<h2 className="text-lg lg:text-xl font-bold text-gray-900 flex items-center">
							<Filter className="mr-2 text-indigo-600" size={20} />
							Filtros de Ventas
						</h2>
						<div className="flex flex-wrap items-center gap-2 lg:gap-4 text-sm text-gray-600">
							<span>
								{sales.length} de {totalCount} ventas
							</span>
							{totalPages > 1 && (
								<span>
									• Página {pagination.page} de {totalPages}
								</span>
							)}
						</div>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
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
						<div>
							<label className="block text-sm font-bold text-gray-700 mb-2">
								Buscar
							</label>
							<DebounceInput
								placeholder="Buscar en todo..."
								value={filters.search}
								onChangeDebounce={(value) =>
									setFilters({ ...filters, search: value })
								}
								className="w-full"
							/>
						</div>
					</div>

					<div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-3 lg:space-y-0">
						<div className="flex flex-wrap items-center gap-2 lg:gap-4">
							{(filters.status || filters.payment_method || filters.search) && (
								<button
									onClick={resetFilters}
									className="text-red-600 hover:text-red-800 font-medium flex items-center space-x-1 text-sm"
								>
									<X size={14} />
									<span>Limpiar filtros</span>
								</button>
							)}
						</div>
						{totalPages > 1 && (
							<div className="flex items-center space-x-2">
								<button
									onClick={() => handlePageChange(pagination.page - 1)}
									disabled={pagination.page === 1}
									className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									<ChevronLeft size={16} />
								</button>
								<div className="flex items-center space-x-1">
									{Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
										const pageNum =
											totalPages <= 5
												? i + 1
												: pagination.page <= 3
													? i + 1
													: pagination.page >= totalPages - 2
														? totalPages - 4 + i
														: pagination.page - 2 + i;
										return (
											<button
												key={pageNum}
												onClick={() => handlePageChange(pageNum)}
												className={`px-3 py-1 rounded-lg text-sm font-medium ${
													pageNum === pagination.page
														? "bg-indigo-600 text-white"
														: "border border-gray-300 hover:bg-gray-50"
												}`}
											>
												{pageNum}
											</button>
										);
									})}
								</div>
								<button
									onClick={() => handlePageChange(pagination.page + 1)}
									disabled={pagination.page === totalPages}
									className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									<ChevronRight size={16} />
								</button>
							</div>
						)}
					</div>
				</div>

				<div className="bg-white rounded-xl lg:rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
					<div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 lg:p-6 border-b border-gray-100">
						<div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-4 lg:space-y-0">
							<div className="flex-1">
								<h2 className="text-xl lg:text-2xl font-bold text-gray-900 flex items-center">
									<TrendingUp
										className="mr-2 lg:mr-3 text-indigo-600"
										size={24}
									/>
									Ventas recientes
								</h2>
								<p className="text-gray-600 mt-1 text-sm lg:text-base">
									Últimas transacciones de la rifa activa
								</p>
							</div>
							<Link
								to="/admin/tickets"
								className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-4 lg:px-6 py-2 lg:py-3 rounded-lg lg:rounded-xl font-bold hover:from-indigo-600 hover:to-purple-600 transition-all flex items-center space-x-2 shadow-lg text-sm lg:text-base"
							>
								<Eye size={16} className="lg:w-5 lg:h-5" />
								<span>Ver todo</span>
							</Link>
						</div>
					</div>

					{loadingSales ? (
						<div className="flex items-center justify-center py-12">
							<Loading text="Cargando ventas..." />
						</div>
					) : (
						<div className="overflow-x-auto">
							<table className="min-w-full divide-y divide-gray-200">
								<thead className="bg-gray-50">
									<tr>
										<SortableHeader field="customer_name">
											Cliente
										</SortableHeader>
										<SortableHeader
											field="created_at"
											className="hidden md:table-cell"
										>
											Fecha
										</SortableHeader>
										<SortableHeader
											field="payment_reference"
											className="hidden lg:table-cell"
										>
											Referencia
										</SortableHeader>
										<SortableHeader field="status">Estado</SortableHeader>
										<SortableHeader
											field="payment_method"
											className="hidden sm:table-cell"
										>
											Pago
										</SortableHeader>
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
									{sales.length > 0 ? (
										sales.map((sale) => (
											<tr
												key={sale.id}
												className="hover:bg-gray-50 transition-colors"
											>
												<td className="px-3 lg:px-6 py-4 whitespace-nowrap text-xs lg:text-sm text-gray-500">
													<div className="font-medium text-gray-900 max-w-[120px] lg:max-w-none truncate">
														{sale.customer_name}
													</div>
													{sale.customer_ci && (
														<div className="text-xs text-gray-400">
															CI: {sale.customer_ci}
														</div>
													)}
												</td>
												<td className="px-3 lg:px-6 py-4 whitespace-nowrap text-xs lg:text-sm text-gray-500 hidden md:table-cell">
													{new Date(sale.created_at).toLocaleDateString
														("es-ES", {
														day: "2-digit",
														month: "2-digit",
														year: "2-digit",
														hour: "2-digit",
														minute: "2-digit",
													})}
												</td>
												<td className="px-3 lg:px-6 py-4 whitespace-nowrap text-xs lg:text-sm text-gray-500 font-mono hidden lg:table-cell">
													<div className="max-w-[100px] truncate">
														{sale.payment_reference || "-"}
													</div>
												</td>
												<td className="px-3 lg:px-6 py-4 whitespace-nowrap">
													<span
														className={`inline-flex px-2 py-1 text-xs font-bold rounded-full ${getStatusColor(
															sale.status,
														)}`}
													>
														<span className="lg:hidden">
															{sale.status === "pending"
																? "⏳"
																: sale.status === "approved"
																	? "✅"
																	: "❌"}
														</span>
														<span className="hidden lg:inline">
															{getStatusText(sale.status)}
														</span>
													</span>
												</td>
												<td className="px-3 lg:px-6 py-4 whitespace-nowrap text-xs lg:text-sm text-gray-500 hidden sm:table-cell">
													<span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-lg text-xs font-bold uppercase">
														{sale.payment_method}
													</span>
												</td>
												<td className="px-3 lg:px-6 py-4 whitespace-nowrap text-xs lg:text-sm font-bold text-gray-900 hidden lg:table-cell">
													{sale.ticket_quantity}
												</td>
												<td className="px-3 lg:px-6 py-4 whitespace-nowrap text-xs lg:text-sm font-bold text-green-600">
													<div>
														{formatCurrency(
															sale.total_amount,
															getCurrencyByMethod(sale.payment_method),
														)}
													</div>
													<div className="sm:hidden text-xs text-gray-500">
														{sale.payment_method?.toUpperCase()} •{" "}
														{sale.ticket_quantity} boletos
													</div>
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
												colSpan="8"
												className="px-6 py-12 text-center text-gray-500"
											>
												<div className="flex flex-col items-center">
													<TrendingUp
														size={48}
														className="text-gray-300 mb-4"
													/>
													<p className="text-lg font-medium">
														No hay ventas recientes
													</p>
													<p className="text-sm">
														Las ventas aparecerán aquí cuando lleguen
													</p>
												</div>
											</td>
										</tr>
									)}
								</tbody>
							</table>
						</div>
					)}
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

				<Modal
					isOpen={showModal}
					onClose={() => setShowModal(false)}
					title="Detalles de la Venta"
					size="large"
				>
					{selectedSale && (
						<div className="space-y-6">
							<div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6">
								<h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
									<Users className="mr-2 text-blue-600" size={20} />
									Información del Cliente
								</h3>
								<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
									<div>
										<label className="block text-sm font-medium text-gray-700">
											Nombre
										</label>
										<p className="mt-1 text-sm text-gray-900 bg-white p-3 rounded-lg">
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
								</div>
							</div>
							<div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6">
								<h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
									<TrendingUp className="mr-2 text-green-600" size={20} />
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
												getCurrencyByMethod(selectedSale.payment_method),
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
												selectedSale.status,
											)}`}
										>
											{getStatusText(selectedSale.status)}
										</span>
									</div>
								</div>
							</div>
							{selectedSale.ticket_numbers && (
								<div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-6">
									<h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
										<TrendingUp className="mr-2 text-yellow-600" size={20} />
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
							{selectedSale.status === "pending" && (
								<div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4 pt-6 border-t border-gray-200">
									<button
										onClick={() => handleUpdateStatus("rejected")}
										disabled={updateStatusMutation.isLoading}
										className="bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-xl font-bold hover:from-red-600 hover:to-red-700 transition-all disabled:opacity-50"
									>
										Rechazar
									</button>
									<button
										onClick={() => handleUpdateStatus("approved")}
										disabled={updateStatusMutation.isLoading}
										className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-xl font-bold hover:from-green-600 hover:to-green-700 transition-all disabled:opacity-50"
									>
										Aprobar
									</button>
								</div>
							)}
							{selectedSale.status === "approved" && (
								<div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4 pt-6 border-t border-gray-200">
									<button
										onClick={() => handleUpdateStatus("rejected")}
										disabled={updateStatusMutation.isLoading}
										className="bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-xl font-bold hover:from-red-600 hover:to-red-700 transition-all disabled:opacity-50"
									>
										Rechazar
									</button>
								</div>
							)}
							{selectedSale.status === "rejected" && (
								<div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4 pt-6 border-t border-gray-200">
									<button
										onClick={() => handleReassignStatus("rejected")}
										disabled={updateStatusMutation.isLoading}
										className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white px-6 py-3 rounded-xl font-bold hover:from-yellow-600 hover:to-yellow-700 transition-all disabled:opacity-50"
									>
										Recuperar
									</button>
								</div>
							)}
						</div>
					)}
				</Modal>
			</div>
		</div>
	);
};

export default Dashboard