import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import {
    Mail,
    Search,
    Filter,
    RefreshCw,
    Send,
    AlertCircle,
    CheckCircle,
    Clock,
    Eye,
    RotateCcw,
    Download,
    TestTube,
    BarChart3,
    Sparkles
} from 'lucide-react'
import toast from 'react-hot-toast'
import { emailAPI } from '../../services/api'
import Loading from '../common/Loading'
import Modal from '../common/Modal'
import { formatDateTime, getStatusColor } from '../../utils/helpers'

const EmailLogs = () => {
    const [filters, setFilters] = useState({
        email_type: 'all',
        status: 'all',
        recipient_email: '',
        search: ''
    })
    const [selectedEmail, setSelectedEmail] = useState(null)
    const [showModal, setShowModal] = useState(false)
    const [showTestModal, setShowTestModal] = useState(false)
    const [testEmailData, setTestEmailData] = useState({
        email: '',
        type: 'purchase_confirmation'
    })

    const queryClient = useQueryClient()

    // Obtener logs de emails
    const { data: emailLogs, isLoading, error } = useQuery(
        ['emailLogs', filters],
        () => emailAPI.getLogs(filters),
        {
            keepPreviousData: true,
            refetchInterval: 30000, // Refrescar cada 30 segundos
            onSuccess: (data) => {
                console.log('✅ Email logs cargados:', data)
            }
        }
    )

    // Obtener estadísticas de emails
    const { data: emailStats } = useQuery(
        'emailStats',
        emailAPI.getStats,
        {
            refetchInterval: 60000 // Refrescar cada minuto
        }
    )


    const resendMutation = useMutation(
        (logId) => emailAPI.resendEmail(logId),
        {
            onSuccess: () => {
                toast.success('Email reenviado exitosamente')
                queryClient.invalidateQueries('emailLogs')
                queryClient.invalidateQueries('emailStats')
            },
            onError: (error) => {
                toast.error(error.response?.data?.error || 'Error al reenviar email')
            }
        }
    )

    const testEmailMutation = useMutation(
        (data) => emailAPI.sendTestEmail(data),
        {
            onSuccess: () => {
                toast.success('Email de prueba enviado exitosamente')
                setShowTestModal(false)
                setTestEmailData({ email: '', type: 'purchase_confirmation' })
                queryClient.invalidateQueries('emailLogs')
            },
            onError: (error) => {
                toast.error(error.response?.data?.error || 'Error al enviar email de prueba')
            }
        }
    )

    // Filtrar logs
    const filteredLogs = useMemo(() => {
        if (!emailLogs?.data) return []

        let filtered = [...emailLogs.data]

        if (filters.email_type !== 'all') {
            filtered = filtered.filter(log => log.email_type === filters.email_type)
        }

        if (filters.status !== 'all') {
            filtered = filtered.filter(log => log.status === filters.status)
        }

        if (filters.search && filters.search.trim()) {
            const searchTerm = filters.search.toLowerCase().trim()
            filtered = filtered.filter(log =>
                (log.recipient_email || '').toLowerCase().includes(searchTerm) ||
                (log.subject || '').toLowerCase().includes(searchTerm) ||
                (log.customer_name || '').toLowerCase().includes(searchTerm) ||
                (log.customer_phone || '').toLowerCase().includes(searchTerm)
            )
        }

        return filtered
    }, [emailLogs, filters])

    const handleViewEmail = (emailLog) => {
        setSelectedEmail(emailLog)
        setShowModal(true)
    }

    const handleResendEmail = (logId) => {
        if (window.confirm('¿Estás seguro de que quieres reenviar este email?')) {
            resendMutation.mutate(logId)
        }
    }

    const handleSendTestEmail = () => {
        if (!testEmailData.email.trim()) {
            toast.error('Por favor ingresa un email válido')
            return
        }

        testEmailMutation.mutate(testEmailData)
    }

    const getEmailTypeIcon = (type) => {
        switch (type) {
            case 'purchase_confirmation':
                return '📧'
            case 'status_update':
                return '🔄'
            case 'ticket_modification':
                return '🎫'
            default:
                return '📩'
        }
    }

    const getEmailTypeName = (type) => {
        switch (type) {
            case 'purchase_confirmation':
                return 'Confirmación de Compra'
            case 'status_update':
                return 'Actualización de Estado'
            case 'ticket_modification':
                return 'Modificación de Boletos'
            default:
                return type
        }
    }

    const getStatusIcon = (status) => {
        switch (status) {
            case 'sent':
                return <CheckCircle size={16} className="text-green-600" />
            case 'failed':
                return <AlertCircle size={16} className="text-red-600" />
            case 'pending':
                return <Clock size={16} className="text-yellow-600" />
            default:
                return <Clock size={16} className="text-gray-400" />
        }
    }

    const getStatusText = (status) => {
        switch (status) {
            case 'sent':
                return 'Enviado'
            case 'failed':
                return 'Fallido'
            case 'pending':
                return 'Pendiente'
            default:
                return status
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                <Loading size="large" text="Cargando logs de emails..." />
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <AlertCircle size={64} className="text-red-500 mb-4" />
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Error al cargar logs</h3>
                            <p className="text-gray-600 mb-4">
                                No se pudieron cargar los logs de emails.
                            </p>
                            <button
                                onClick={() => queryClient.invalidateQueries('emailLogs')}
                                className="bg-primary text-white px-6 py-2 rounded-lg font-bold hover:bg-primary/90 transition-all"
                            >
                                Intentar nuevamente
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
            {/* Header */}
            <div className="max-w-7xl mx-auto mb-8">
                <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-2xl p-8 text-white relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-transparent"></div>
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-48 translate-x-48"></div>

                    <div className="relative z-10">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="flex items-center space-x-4 mb-4">
                                    <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                                        <Mail size={32} className="text-pink-200" />
                                    </div>
                                </div>
                                <h1 className="text-5xl font-bold mb-2">📧 Logs de Emails</h1>
                                <p className="text-xl text-white/80">
                                    Monitoreo y gestión de emails automáticos
                                </p>

                                {emailStats && (
                                    <div className="flex items-center space-x-6 mt-4">
                                        <div className="text-sm">
                                            <span className="text-white/60">Total:</span>
                                            <span className="font-bold ml-1">{emailStats.overview?.total || 0}</span>
                                        </div>
                                        <div className="text-sm">
                                            <span className="text-white/60">Enviados:</span>
                                            <span className="font-bold ml-1 text-green-200">{emailStats.overview?.sent || 0}</span>
                                        </div>
                                        <div className="text-sm">
                                            <span className="text-white/60">Fallidos:</span>
                                            <span className="font-bold ml-1 text-red-200">{emailStats.overview?.failed || 0}</span>
                                        </div>
                                        <div className="text-sm">
                                            <span className="text-white/60">Tasa de éxito:</span>
                                            <span className="font-bold ml-1 text-yellow-200">{emailStats.overview?.success_rate || 0}%</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center space-x-4">
                                <button
                                    onClick={() => setShowTestModal(true)}
                                    className="bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-xl font-bold hover:bg-white/30 transition-all flex items-center space-x-2 shadow-lg"
                                >
                                    <TestTube size={20} />
                                    <span>Email de Prueba</span>
                                </button>
                                <button
                                    onClick={() => queryClient.invalidateQueries(['emailLogs', 'emailStats'])}
                                    className="bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-xl font-bold hover:bg-white/30 transition-all flex items-center space-x-2 shadow-lg"
                                >
                                    <RefreshCw size={20} />
                                    <span>Actualizar</span>
                                </button>
                                <div className="hidden md:block text-6xl opacity-30">📊</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto">
                {/* Estadísticas rápidas */}
                {emailStats && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-600 text-sm font-medium">Total Emails</p>
                                    <p className="text-2xl font-bold text-gray-900">{emailStats.overview.total}</p>
                                </div>
                                <Mail className="text-blue-500" size={24} />
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-600 text-sm font-medium">Emails Enviados</p>
                                    <p className="text-2xl font-bold text-green-600">{emailStats.overview.sent}</p>
                                </div>
                                <CheckCircle className="text-green-500" size={24} />
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-600 text-sm font-medium">Emails Fallidos</p>
                                    <p className="text-2xl font-bold text-red-600">{emailStats.overview.failed}</p>
                                </div>
                                <AlertCircle className="text-red-500" size={24} />
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-600 text-sm font-medium">Tasa de Éxito</p>
                                    <p className="text-2xl font-bold text-purple-600">{emailStats.overview.success_rate}%</p>
                                </div>
                                <BarChart3 className="text-purple-500" size={24} />
                            </div>
                        </div>
                    </div>
                )}

                {/* Filtros */}
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center">
                            <Filter className="mr-2 text-blue-600" size={20} />
                            Filtros
                        </h2>
                        <div className="text-sm text-gray-600">
                            {filteredLogs.length} de {emailLogs?.data?.length || 0} emails
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Tipo de email */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Email</label>
                            <select
                                value={filters.email_type}
                                onChange={(e) => setFilters(prev => ({ ...prev, email_type: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="all">📧 Todos los tipos</option>
                                <option value="purchase_confirmation">📧 Confirmación de Compra</option>
                                <option value="status_update">🔄 Actualización de Estado</option>
                                <option value="ticket_modification">🎫 Modificación de Boletos</option>
                            </select>
                        </div>

                        {/* Estado */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                            <select
                                value={filters.status}
                                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="all">📊 Todos los estados</option>
                                <option value="sent">✅ Enviado</option>
                                <option value="failed">❌ Fallido</option>
                                <option value="pending">⏳ Pendiente</option>
                            </select>
                        </div>

                        {/* Búsqueda */}
                        <div className="lg:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Buscar por email, asunto, nombre..."
                                    value={filters.search}
                                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabla de logs */}
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        Tipo
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        Destinatario
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        Asunto
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        Estado
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        Fecha
                                    </th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        Acciones
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredLogs.length > 0 ? (
                                    filteredLogs.map((emailLog) => (
                                        <tr key={emailLog.id} className="hover:bg-gray-50 transition-all">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <span className="text-2xl mr-2">{getEmailTypeIcon(emailLog.email_type)}</span>
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {getEmailTypeName(emailLog.email_type)}
                                                        </div>
                                                        {emailLog.purchase_id && (
                                                            <div className="text-xs text-gray-500">
                                                                Compra #{emailLog.purchase_id}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {emailLog.recipient_email}
                                                    </div>
                                                    {emailLog.customer_name && (
                                                        <div className="text-xs text-gray-500">
                                                            {emailLog.customer_name}
                                                        </div>
                                                    )}
                                                    {emailLog.customer_phone && (
                                                        <div className="text-xs text-gray-500">
                                                            {emailLog.customer_phone}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>

                                            <td className="px-6 py-4">
                                                <div className="text-sm text-gray-900 max-w-xs truncate">
                                                    {emailLog.subject}
                                                </div>
                                            </td>

                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    {getStatusIcon(emailLog.status)}
                                                    <span className={`ml-2 text-sm font-medium ${emailLog.status === 'sent' ? 'text-green-600' :
                                                        emailLog.status === 'failed' ? 'text-red-600' :
                                                            'text-yellow-600'
                                                        }`}>
                                                        {getStatusText(emailLog.status)}
                                                    </span>
                                                </div>
                                                {emailLog.error_message && (
                                                    <div className="text-xs text-red-500 mt-1 max-w-xs truncate">
                                                        {emailLog.error_message}
                                                    </div>
                                                )}
                                            </td>

                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">
                                                    {formatDateTime(emailLog.created_at)}
                                                </div>
                                                {emailLog.sent_at && emailLog.sent_at !== emailLog.created_at && (
                                                    <div className="text-xs text-gray-500">
                                                        Enviado: {formatDateTime(emailLog.sent_at)}
                                                    </div>
                                                )}
                                            </td>

                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex items-center justify-end space-x-2">
                                                    <button
                                                        onClick={() => handleViewEmail(emailLog)}
                                                        className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded-lg transition-all"
                                                        title="Ver detalles"
                                                    >
                                                        <Eye size={16} />
                                                    </button>

                                                    {emailLog.status === 'failed' && emailLog.purchase_id && (
                                                        <button
                                                            onClick={() => handleResendEmail(emailLog.id)}
                                                            disabled={resendMutation.isLoading}
                                                            className="text-green-600 hover:text-green-900 p-2 hover:bg-green-50 rounded-lg transition-all disabled:opacity-50"
                                                            title="Reenviar email"
                                                        >
                                                            <RotateCcw size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                                            <div className="flex flex-col items-center">
                                                <Mail size={48} className="text-gray-300 mb-4" />
                                                <p className="text-lg font-medium">No se encontraron logs de emails</p>
                                                <p className="text-sm">Intenta modificar los filtros de búsqueda</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal de detalles */}
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title="Detalles del Email"
                size="large"
            >
                {selectedEmail && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-4">Información General</h3>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Tipo</label>
                                        <p className="text-sm text-gray-900 flex items-center">
                                            <span className="mr-2">{getEmailTypeIcon(selectedEmail.email_type)}</span>
                                            {getEmailTypeName(selectedEmail.email_type)}
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Estado</label>
                                        <div className="flex items-center">
                                            {getStatusIcon(selectedEmail.status)}
                                            <span className="ml-2 text-sm">{getStatusText(selectedEmail.status)}</span>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Destinatario</label>
                                        <p className="text-sm text-gray-900">{selectedEmail.recipient_email}</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Asunto</label>
                                        <p className="text-sm text-gray-900">{selectedEmail.subject}</p>
                                    </div>

                                    {selectedEmail.resend_email_id && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">ID de Resend</label>
                                            <p className="text-sm text-gray-900 font-mono">{selectedEmail.resend_email_id}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-4">Fechas</h3>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Creado</label>
                                        <p className="text-sm text-gray-900">{formatDateTime(selectedEmail.created_at)}</p>
                                    </div>

                                    {selectedEmail.sent_at && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Enviado</label>
                                            <p className="text-sm text-gray-900">{formatDateTime(selectedEmail.sent_at)}</p>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Actualizado</label>
                                        <p className="text-sm text-gray-900">{formatDateTime(selectedEmail.updated_at)}</p>
                                    </div>
                                </div>

                                {selectedEmail.customer_name && (
                                    <div className="mt-6">
                                        <h3 className="text-lg font-bold text-gray-900 mb-4">Cliente</h3>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Nombre</label>
                                                <p className="text-sm text-gray-900">{selectedEmail.customer_name}</p>
                                            </div>

                                            {selectedEmail.customer_phone && (
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">Teléfono</label>
                                                    <p className="text-sm text-gray-900">{selectedEmail.customer_phone}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {selectedEmail.error_message && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <h3 className="text-lg font-bold text-red-900 mb-2">Error</h3>
                                <p className="text-sm text-red-700">{selectedEmail.error_message}</p>
                            </div>
                        )}

                        {selectedEmail.metadata && Object.keys(selectedEmail.metadata).length > 0 && (
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                <h3 className="text-lg font-bold text-gray-900 mb-2">Metadata</h3>
                                <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                                    {JSON.stringify(selectedEmail.metadata, null, 2)}
                                </pre>
                            </div>
                        )}
                    </div>
                )}
            </Modal>

            {/* Modal de email de prueba */}
            <Modal
                isOpen={showTestModal}
                onClose={() => setShowTestModal(false)}
                title="Enviar Email de Prueba"
            >
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email de destino
                        </label>
                        <input
                            type="email"
                            value={testEmailData.email}
                            onChange={(e) => setTestEmailData(prev => ({ ...prev, email: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="tu@email.com"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Tipo de email
                        </label>
                        <select
                            value={testEmailData.type}
                            onChange={(e) => setTestEmailData(prev => ({ ...prev, type: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="purchase_confirmation">📧 Confirmación de Compra</option>
                            <option value="status_update_approved">✅ Estado: Aprobado</option>
                            <option value="status_update_rejected">❌ Estado: Rechazado</option>
                            <option value="ticket_modification_add">➕ Agregar Boletos</option>
                            <option value="ticket_modification_remove">➖ Quitar Boletos</option>
                        </select>
                    </div>

                    <div className="flex justify-end space-x-4">
                        <button
                            onClick={() => setShowTestModal(false)}
                            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSendTestEmail}
                            disabled={testEmailMutation.isLoading}
                            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center space-x-2"
                        >
                            {testEmailMutation.isLoading ? (
                                <Loading size="small" text="" />
                            ) : (
                                <Send size={16} />
                            )}
                            <span>{testEmailMutation.isLoading ? 'Enviando...' : 'Enviar Prueba'}</span>
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}

export default EmailLogs