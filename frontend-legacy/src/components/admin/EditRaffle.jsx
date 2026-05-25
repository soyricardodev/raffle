import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useForm } from 'react-hook-form'
import {
  Save,
  ArrowLeft,
  Upload,
  Plus,
  Trash2,
  ImageIcon,
  Calendar,
  DollarSign,
  Target,
  AlertCircle,
  CreditCard,
  Eye,
  EyeOff,
  X,
  Clock,
  Pause,
  Play,
  Settings,
  ToggleLeft,
  ToggleRight
} from 'lucide-react'
import toast from 'react-hot-toast'
import { raffleAPI, configAPI } from '../../services/api'
import Loading from '../common/Loading'
import { formatDate } from '../../utils/helpers'
import { FEATURES } from '../../utils/constants'

const formatDateTimeForInput = (dateString) => {
  if (!dateString) return ''
  try {
    const [datePart, timePartWithZone] = dateString.split('T')
    const timePart = timePartWithZone?.slice(0, 5)
    if (!datePart || !timePart) return ''
    return `${datePart}T${timePart}`
  } catch (error) {
    console.error('Error formatting date:', error)
    return ''
  }
}



const formatDateTimeForMySQL = (dateTimeLocalValue) => {
  if (!dateTimeLocalValue) return null
  try {
    const [datePart, timePart] = dateTimeLocalValue.split('T')
    const [year, month, day] = datePart.split('-')
    const [hours, minutes] = timePart.split(':')
    return `${year}-${month}-${day} ${hours}:${minutes}:00`
  } catch (error) {
    console.error('Error converting to MySQL format:', error)
    return null
  }
}

const validateDateTime = (dateTimeLocalValue, mustBeFuture = false) => {
  if (!dateTimeLocalValue) return true
  try {
    const selectedDate = new Date(dateTimeLocalValue)
    if (isNaN(selectedDate.getTime())) return 'Fecha inválida'
    if (mustBeFuture) {
      const now = new Date()
      if (selectedDate <= now) return 'La fecha del sorteo debe ser en el futuro'
    }
    return true
  } catch (error) {
    return 'Error al validar la fecha'
  }
}

const formatDateTimeForDisplay = (date) => {
  if (!date) return ''
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    if (isNaN(dateObj.getTime())) return ''
    return dateObj.toLocaleString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
  } catch (error) {
    console.error('Error formatting date for display:', error)
    return ''
  }
}

const EditRaffle = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [prizes, setPrizes] = useState([])
  const [paymentMethods, setPaymentMethods] = useState([])
  const [prizeImages, setPrizeImages] = useState({})


  const [pauseInfo, setPauseInfo] = useState(null)
  const [showPauseModal, setShowPauseModal] = useState(false)
  const [pauseDuration, setPauseDuration] = useState(15)
  const [autoPauseEnabled, setAutoPauseEnabled] = useState(true)


  const { data: config } = useQuery('config', configAPI.getAll)
  const siteConfig = config?.data || {}
  const colors = siteConfig.site_colors || { primary: '#8B7355', secondary: '#F5F5DC', accent: '#FFD700' }

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm()

  // Cargar datos de la rifa
  const { data: raffle, isLoading } = useQuery(
    ['raffle', id],
    () => raffleAPI.getById(id),
    {
      onSuccess: (response) => {
        const raffleData = response.data

        reset({
          name: raffleData.name,
          description: raffleData.description,
          total_tickets: raffleData.total_tickets,
          price_bs: raffleData.price_bs,
          price_usd: raffleData.price_usd,
          min_purchase: raffleData.min_purchase,
          max_purchase: raffleData.max_purchase,
          draw_date: formatDateTimeForInput(raffleData.draw_date),
          status: raffleData.status
        })


        setAutoPauseEnabled(raffleData.auto_pause_enabled !== false)


        if (raffleData.image_url) {
          setPreviewUrl(`${import.meta.env.VITE_BASE_URL}${raffleData.image_url}`)
        }

        const prizesWithImages = (raffleData.prizes || []).map((prize, index) => {
          if (prize.image_url) {
            setPrizeImages(prev => ({
              ...prev,
              [index]: {
                file: null,
                preview: `${import.meta.env.VITE_BASE_URL}${prize.image_url}`,
                existing: true
              }
            }))
          }
          return prize
        })
        setPrizes(prizesWithImages)

        const mappedPaymentMethods = (raffleData.payment_methods || []).map(method => ({
          method_type: method.method_type,
          account_info: typeof method.account_info === 'string'
            ? JSON.parse(method.account_info)
            : method.account_info || {},
          min_tickets: method.min_tickets
        }))
        setPaymentMethods(mappedPaymentMethods)
      }
    }
  )

  const { data: pauseData, refetch: refetchPauseInfo } = useQuery(
    ['pauseInfo', id],
    () => raffleAPI.getPauseInfo(id),
    {
      enabled: !!id,
      refetchInterval: 5000,
      onSuccess: (response) => {
        if (response?.data) {
          setPauseInfo(response.data)
        }
      }
    }
  )


  const updateMutation = useMutation(
    (formData) => raffleAPI.update(id, formData),
    {
      onSuccess: () => {
        toast.success('Rifa actualizada exitosamente')
        queryClient.invalidateQueries('raffles')
        queryClient.invalidateQueries(['raffle', id])
        navigate('/admin/history')
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Error al actualizar la rifa')
      }
    }
  )


  const pauseMutation = useMutation(
    ({ duration }) => raffleAPI.pauseRaffle(id, duration),
    {
      onSuccess: (response) => {
        toast.success('Rifa pausada exitosamente')
        queryClient.invalidateQueries(['raffle', id])
        refetchPauseInfo()
        setShowPauseModal(false)
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Error al pausar la rifa')
      }
    }
  )

  const unpauseMutation = useMutation(
    () => raffleAPI.unpauseRaffle(id),
    {
      onSuccess: (response) => {
        const data = response.data
        if (data.newStatus === 'finished') {
          toast.success('Rifa finalizada - no había boletos disponibles')
        } else {
          toast.success('Rifa reactivada exitosamente')
        }
        queryClient.invalidateQueries(['raffle', id])
        refetchPauseInfo()
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Error al reactivar la rifa')
      }
    }
  )

  const toggleAutoPauseMutation = useMutation(
    (enabled) => raffleAPI.toggleAutoPause(id, enabled),
    {
      onSuccess: () => {
        toast.success(`Pausa automática ${autoPauseEnabled ? 'deshabilitada' : 'habilitada'}`)
        setAutoPauseEnabled(!autoPauseEnabled)
        queryClient.invalidateQueries(['raffle', id])
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Error al cambiar configuración de pausa automática')
      }
    }
  )

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        toast.error('El archivo no debe exceder 20MB')
        return
      }

      setSelectedFile(file)
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    }
  }

  const handlePrizeImageChange = (prizeIndex, file) => {
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        toast.error('El archivo no debe exceder 20MB')
        return
      }

      const preview = URL.createObjectURL(file)
      setPrizeImages(prev => ({
        ...prev,
        [prizeIndex]: {
          file: file,
          preview: preview,
          existing: false
        }
      }))
    }
  }


  const removePrizeImage = (prizeIndex) => {
    setPrizeImages(prev => {
      const newImages = { ...prev }
      if (newImages[prizeIndex] && newImages[prizeIndex].preview && !newImages[prizeIndex].existing) {
        URL.revokeObjectURL(newImages[prizeIndex].preview)
      }
      delete newImages[prizeIndex]
      return newImages
    })
  }

  const addPrize = () => {
    setPrizes([...prizes, { name: '', description: '', image_url: '' }])
  }

  const removePrize = (index) => {
    removePrizeImage(index)

    setPrizes(prizes.filter((_, i) => i !== index))

    const newPrizeImages = {}
    Object.keys(prizeImages).forEach(key => {
      const keyIndex = parseInt(key)
      if (keyIndex < index) {
        newPrizeImages[keyIndex] = prizeImages[keyIndex]
      } else if (keyIndex > index) {
        newPrizeImages[keyIndex - 1] = prizeImages[keyIndex]
      }
    })
    setPrizeImages(newPrizeImages)
  }

  const updatePrize = (index, field, value) => {
    const updatedPrizes = [...prizes]
    updatedPrizes[index][field] = value
    setPrizes(updatedPrizes)
  }

  const addPaymentMethod = () => {
    setPaymentMethods([...paymentMethods, {
      method_type: 'pago_movil',
      account_info: { bank: '', phone: '', cedula: '', holder: '' }
    }])
  }

  const removePaymentMethod = (index) => {
    setPaymentMethods(paymentMethods.filter((_, i) => i !== index))
  }

  const updatePaymentMethod = (index, field, value) => {
    const updated = [...paymentMethods]
    if (field === 'method_type') {
      updated[index].method_type = value
      updated[index].account_info = getDefaultAccountInfo(value)
    } else if (field === 'min_tickets') {
      updated[index].min_tickets = value
    } else {
      updated[index].account_info = { ...updated[index].account_info, [field]: value }
    }
    setPaymentMethods(updated)
  }

  const getDefaultAccountInfo = (methodType) => {
    switch (methodType) {
      case 'pago_movil':
        return { bank: '', phone: '', cedula: '', holder: '' }
      case 'zelle':
        return { account: '', holder: '' }
      case 'binance':
        return { account: '', holder: '' }
      case 'bs':
        return { bank: '', account: '', holder: '' }
      default:
        return { account: '', holder: '' }
    }
  }

  const getPaymentMethodFields = (method, index) => {
    switch (method.method_type) {
      case 'pago_movil':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🏦 Banco
              </label>
              <input
                type="text"
                value={method.account_info?.bank || ''}
                onChange={(e) => updatePaymentMethod(index, 'bank', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                style={{ '--tw-ring-color': colors.primary }}
                placeholder="Banco de Venezuela"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📱 Teléfono
              </label>
              <input
                type="text"
                value={method.account_info?.phone || ''}
                onChange={(e) => updatePaymentMethod(index, 'phone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                style={{ '--tw-ring-color': colors.primary }}
                placeholder="04121234567"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🆔 Cédula
              </label>
              <input
                type="text"
                value={method.account_info?.cedula || ''}
                onChange={(e) => updatePaymentMethod(index, 'cedula', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                style={{ '--tw-ring-color': colors.primary }}
                placeholder="12345678"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                👤 Titular
              </label>
              <input
                type="text"
                value={method.account_info?.holder || ''}
                onChange={(e) => updatePaymentMethod(index, 'holder', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                style={{ '--tw-ring-color': colors.primary }}
                placeholder="Nombre del titular"
              />
            </div>
          </div>
        )
      case 'zinli':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📧 Email de Zinli
              </label>
              <input
                type="text"
                value={method.account_info?.account || ''}
                onChange={(e) => updatePaymentMethod(index, 'account', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                style={{ '--tw-ring-color': colors.primary }}
                placeholder="Email de Zinli"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                👤 Titular
              </label>
              <input
                type="text"
                value={method.account_info?.holder || ''}
                onChange={(e) => updatePaymentMethod(index, 'holder', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                style={{ '--tw-ring-color': colors.primary }}
                placeholder="Nombre del titular"
              />
            </div>
          </div>
        )
      case 'zelle':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📧 Email de Zelle / Número de teléfono
              </label>
              <input
                type="text"
                value={method.account_info?.account || ''}
                onChange={(e) => updatePaymentMethod(index, 'account', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                style={{ '--tw-ring-color': colors.primary }}
                placeholder="Email o Número de Teléfono de Zelle"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                👤 Titular
              </label>
              <input
                type="text"
                value={method.account_info?.holder || ''}
                onChange={(e) => updatePaymentMethod(index, 'holder', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                style={{ '--tw-ring-color': colors.primary }}
                placeholder="Nombre completo"
              />
            </div>
          </div>
        )
      case 'binance':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🪙 ID de Binance
              </label>
              <input
                type="text"
                value={method.account_info?.account || ''}
                onChange={(e) => updatePaymentMethod(index, 'account', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                style={{ '--tw-ring-color': colors.primary }}
                placeholder="ID o email de Binance"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                👤 Titular
              </label>
              <input
                type="text"
                value={method.account_info?.holder || ''}
                onChange={(e) => updatePaymentMethod(index, 'holder', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                style={{ '--tw-ring-color': colors.primary }}
                placeholder="Nombre completo"
              />
            </div>
          </div>
        )
      case 'bs':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🏦 Banco
              </label>
              <input
                type="text"
                value={method.account_info?.bank || ''}
                onChange={(e) => updatePaymentMethod(index, 'bank', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                style={{ '--tw-ring-color': colors.primary }}
                placeholder="Nombre del banco"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🏦 Tipo de Cuenta
              </label>
              <input
                type="text"
                value={method.account_info?.type || ''}
                onChange={(e) => updatePaymentMethod(index, 'Tipo', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                style={{ '--tw-ring-color': colors.primary }}
                placeholder="Ahorro / Corriente"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                💳 Número de cuenta
              </label>
              <input
                type="text"
                value={method.account_info?.account || ''}
                onChange={(e) => updatePaymentMethod(index, 'account', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                style={{ '--tw-ring-color': colors.primary }}
                placeholder="01020123456789012345"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                👤 Titular
              </label>
              <input
                type="text"
                value={method.account_info?.holder || ''}
                onChange={(e) => updatePaymentMethod(index, 'holder', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                style={{ '--tw-ring-color': colors.primary }}
                placeholder="Nombre del titular"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📱 Teléfono
              </label>
              <input
                type="text"
                value={method.account_info?.phone || ''}
                onChange={(e) => updatePaymentMethod(index, 'phone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                style={{ '--tw-ring-color': colors.primary }}
                placeholder="04121234567"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🆔 Cédula
              </label>
              <input
                type="text"
                value={method.account_info?.cedula || ''}
                onChange={(e) => updatePaymentMethod(index, 'cedula', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                style={{ '--tw-ring-color': colors.primary }}
                placeholder="12345678"
              />
            </div>
          </div>
        )
      default:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                💳 Cuenta
              </label>
              <input
                type="text"
                value={method.account_info?.account || ''}
                onChange={(e) => updatePaymentMethod(index, 'account', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                style={{ '--tw-ring-color': colors.primary }}
                placeholder="Número de cuenta"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                👤 Titular
              </label>
              <input
                type="text"
                value={method.account_info?.holder || ''}
                onChange={(e) => updatePaymentMethod(index, 'holder', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                style={{ '--tw-ring-color': colors.primary }}
                placeholder="Nombre del titular"
              />
            </div>
          </div>
        )
    }
  }

  const handlePauseRaffle = () => {
    const duration = pauseDuration > 0 ? pauseDuration : null
    pauseMutation.mutate({ duration })
  }

  const handleUnpauseRaffle = () => {
    unpauseMutation.mutate()
  }

  const toggleAutoPause = () => {
    toggleAutoPauseMutation.mutate(!autoPauseEnabled)
  }

  const onSubmit = (data) => {

    const formData = new FormData()


    Object.keys(data).forEach(key => {
      if (data[key] !== undefined && data[key] !== '') {

        if (key === 'draw_date' && data[key]) {
          const mysqlDateTime = formatDateTimeForMySQL(data[key])
          console.log('📅 Fecha original input:', data[key])
          console.log('📅 Fecha convertida para MySQL:', mysqlDateTime)

          if (mysqlDateTime) {
            formData.append(key, mysqlDateTime)
          }
        } else {
          formData.append(key, data[key])
        }
      }
    })

    formData.append('auto_pause_enabled', autoPauseEnabled)

    if (selectedFile) {
      formData.append('image', selectedFile)
      console.log('🖼️ Imagen principal agregada al FormData')
    }

    Object.keys(prizeImages).forEach(prizeIndex => {
      const prizeImage = prizeImages[prizeIndex]
      if (prizeImage.file) {
        formData.append(`prize_image_${prizeIndex}`, prizeImage.file)
        console.log(`🖼️ Imagen del premio ${prizeIndex} agregada al FormData:`, prizeImage.file.name)
      }
    })

    const prizesWithImages = prizes.filter(p => p.name.trim()).map((prize, index) => {
      const prizeImage = prizeImages[index]
      return {
        ...prize,
        // Si hay una nueva imagen, se manejará por separado en el backend
        // Si no hay nueva imagen pero había una existente, mantener la URL actual
        keep_existing_image: prizeImage?.existing && !prizeImage?.file
      }
    })
    formData.append('prizes', JSON.stringify(prizesWithImages))

    // Agregar métodos de pago
    const validPaymentMethods = paymentMethods.map(method => ({
      type: method.method_type,
      info: method.account_info,
      min_tickets: method.min_tickets
    }))
    formData.append('payment_methods', JSON.stringify(validPaymentMethods))

    // Log de todo lo que se envía
    console.log('📦 FormData completo:')
    for (let pair of formData.entries()) {
      if (pair[1] instanceof File) {
        console.log(`📎 ${pair[0]}: ${pair[1].name} (${pair[1].size} bytes)`)
      } else {
        console.log(`📄 ${pair[0]}: ${pair[1]}`)
      }
    }

    updateMutation.mutate(formData)
  }

  const formatRemainingTime = (seconds) => {
    if (!seconds || seconds <= 0) return '0:00'
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  useEffect(() => {
    return () => {
      Object.values(prizeImages).forEach(prizeImage => {
        if (prizeImage.preview && !prizeImage.existing) {
          URL.revokeObjectURL(prizeImage.preview)
        }
      })
      if (previewUrl && selectedFile) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loading text="Cargando datos de la rifa..." />
      </div>
    )
  }

  if (!raffle?.data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle size={64} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Rifa no encontrada</h2>
          <button
            onClick={() => navigate('/admin/history')}
            className="text-blue-600 hover:text-blue-800"
          >
            Volver al historial
          </button>
        </div>
      </div>
    )
  }

  const currentStatus = watch('status')
  const currentDrawDate = watch('draw_date')
  const isPaused = pauseInfo?.isPaused || false

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div
          className="rounded-2xl p-8 text-white mb-8 relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`
          }}
        >
          <div className="relative z-10">
            <button
              onClick={() => navigate('/admin/history')}
              className="flex items-center space-x-2 text-white/80 hover:text-white mb-4 transition-colors"
            >
              <ArrowLeft size={20} />
              <span>Volver al historial</span>
            </button>

            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold mb-2">✏️ Editar Rifa</h1>
                <p className="text-xl text-white/80">
                  Modifica los detalles de "{raffle.data.name}"
                </p>
              </div>

              {/* Status  */}
              <div className="hidden md:flex items-center space-x-3 bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2">
                {currentStatus === 'draft' && <EyeOff size={20} className="text-white/80" />}
                {currentStatus === 'active' && !isPaused && <Eye size={20} className="text-white/80" />}
                {isPaused && <Pause size={20} className="text-white/80" />}
                <span className="font-medium">
                  {isPaused && '⏸️ Pausada'}
                  {!isPaused && currentStatus === 'draft' && '📝 Borrador'}
                  {!isPaused && currentStatus === 'active' && '🔥 Publicada'}
                  {currentStatus === 'finished' && '🏁 Finalizada'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/*  Estado de Pausa** */}
        {pauseInfo && (
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
            <div className="flex items-center space-x-3 mb-6">
              <Settings size={24} style={{ color: colors.primary }} />
              <h2 className="text-2xl font-bold text-gray-900">Control de Pausa</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Estado actual */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Estado Actual</h3>

                {isPaused ? (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <Pause className="text-orange-600" size={20} />
                      <span className="font-bold text-orange-800">RIFA PAUSADA</span>
                    </div>

                    {pauseInfo.hasTimer && pauseInfo.remainingSeconds > 0 && (
                      <div className="mb-3">
                        <p className="text-sm text-orange-700 mb-1">Tiempo restante:</p>
                        <div className="text-2xl font-bold text-orange-800">
                          ⏱️ {formatRemainingTime(pauseInfo.remainingSeconds)}
                        </div>
                      </div>
                    )}

                    <p className="text-sm text-orange-700">
                      Razón: {pauseInfo.pauseReason === 'manual' ? 'Pausa manual' :
                        pauseInfo.pauseReason === 'auto_full' ? 'Boletos agotados' :
                          'Pausa automática'}
                    </p>

                    <button
                      onClick={handleUnpauseRaffle}
                      disabled={unpauseMutation.isLoading}
                      className="mt-3 flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      {unpauseMutation.isLoading ? (
                        <Loading size="small" text="" />
                      ) : (
                        <Play size={16} />
                      )}
                      <span>Reactivar Rifa</span>
                    </button>
                  </div>
                ) : (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <Play className="text-green-600" size={20} />
                      <span className="font-bold text-green-800">RIFA ACTIVA</span>
                    </div>
                    <p className="text-sm text-green-700 mb-3">
                      La rifa está funcionando normalmente
                    </p>

                    <button
                      onClick={() => setShowPauseModal(true)}
                      disabled={pauseMutation.isLoading}
                      className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
                    >
                      {pauseMutation.isLoading ? (
                        <Loading size="small" text="" />
                      ) : (
                        <Pause size={16} />
                      )}
                      <span>Pausar Manualmente</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Configuración de pausa automática */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Pausa Automática</h3>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <Settings className="text-blue-600" size={20} />
                      <span className="font-medium text-blue-800">
                        Pausa cuando se agoten boletos
                      </span>
                    </div>

                    <button
                      onClick={toggleAutoPause}
                      disabled={toggleAutoPauseMutation.isLoading}
                      className="flex items-center space-x-2"
                    >
                      {autoPauseEnabled ? (
                        <ToggleRight size={24} className="text-green-600" />
                      ) : (
                        <ToggleLeft size={24} className="text-gray-400" />
                      )}
                    </button>
                  </div>

                  <p className="text-sm text-blue-700 mb-3">
                    {autoPauseEnabled
                      ? 'La rifa se pausará automáticamente por 15 minutos cuando todos los boletos estén vendidos o reservados.'
                      : 'La pausa automática está deshabilitada. La rifa no se pausará automáticamente.'
                    }
                  </p>

                  {pauseInfo?.availability && (
                    <div className="text-xs text-blue-600 space-y-1">
                      <p>📊 Estado actual: {pauseInfo.availability.available} disponibles, {pauseInfo.availability.sold + pauseInfo.availability.reserved} ocupados de {pauseInfo.availability.total}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Información Básica */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="flex items-center space-x-3 mb-6">
              <Target size={24} style={{ color: colors.primary }} />
              <h2 className="text-2xl font-bold text-gray-900">Información Básica</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre de la Rifa *
                </label>
                <input
                  type="text"
                  {...register('name', { required: 'El nombre es requerido' })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                  style={{ '--tw-ring-color': colors.primary }}
                />
                {errors.name && (
                  <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción
                </label>
                <textarea
                  {...register('description')}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                  style={{ '--tw-ring-color': colors.primary }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total de Boletos *
                </label>
                <input
                  type="number"
                  {...register('total_tickets', {
                    required: 'El total de boletos es requerido',
                    min: { value: 1, message: 'Debe ser mayor a 0' },
                    max: { value: 10000, message: 'Máximo 10,000 boletos' }
                  })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                  style={{ '--tw-ring-color': colors.primary }}
                />
                {errors.total_tickets && (
                  <p className="text-red-500 text-sm mt-1">{errors.total_tickets.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estado de Publicación *
                </label>
                <select
                  {...register('status')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                  style={{ '--tw-ring-color': colors.primary }}
                >
                  <option value="draft">📝 Borrador (No visible)</option>
                  <option value="active">🔥 Publicada (Visible)</option>
                  <option value="paused">⏸️ Pausada</option>
                  <option value="finished">🏁 Finalizada</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {currentStatus === 'draft' && 'Solo tú puedes ver esta rifa'}
                  {currentStatus === 'active' && 'Todos pueden ver y comprar boletos'}
                  {currentStatus === 'paused' && 'Visible pero no se pueden comprar boletos'}
                  {currentStatus === 'finished' && 'Rifa completada, no se pueden comprar más boletos'}
                </p>
              </div>
            </div>
          </div>

          {/* Precios */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="flex items-center space-x-3 mb-6">
              <DollarSign size={24} style={{ color: colors.primary }} />
              <h2 className="text-2xl font-bold text-gray-900">Precios y Límites</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Precio en Bs *
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register('price_bs', { required: 'El precio en Bs es requerido' })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                  style={{ '--tw-ring-color': colors.primary }}
                />
                {errors.price_bs && (
                  <p className="text-red-500 text-sm mt-1">{errors.price_bs.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Precio en USD *
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register('price_usd', { required: 'El precio en USD es requerido' })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                  style={{ '--tw-ring-color': colors.primary }}
                />
                {errors.price_usd && (
                  <p className="text-red-500 text-sm mt-1">{errors.price_usd.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Compra Mínima
                </label>
                <input
                  type="number"
                  {...register('min_purchase')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                  style={{ '--tw-ring-color': colors.primary }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Compra Máxima
                </label>
                <input
                  type="number"
                  {...register('max_purchase')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                  style={{ '--tw-ring-color': colors.primary }}
                />
              </div>
            </div>
          </div>

          {/* Fecha y Estado */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="flex items-center space-x-3 mb-6">
              <Calendar size={24} style={{ color: colors.primary }} />
              <h2 className="text-2xl font-bold text-gray-900">Fecha y Hora del Sorteo</h2>
            </div>

            <div className="max-w-md">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center space-x-2">
                  <Clock size={16} />
                  <span>Fecha y Hora del Sorteo</span>
                </div>
              </label>
              <input
                type="datetime-local"
                {...register('draw_date', {
                  validate: (value) => validateDateTime(value, false)
                })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                style={{ '--tw-ring-color': colors.primary }}
              />
              {errors.draw_date && (
                <p className="text-red-500 text-sm mt-1">{errors.draw_date.message}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Selecciona la fecha y hora exacta del sorteo
              </p>
              {currentDrawDate && (
                <p className="text-xs text-blue-600 mt-1">
                  📅 Sorteo programado: {formatDateTimeForDisplay(currentDrawDate)}
                </p>
              )}
            </div>
          </div>

          {/* Imagen */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="flex items-center space-x-3 mb-6">
              <ImageIcon size={24} style={{ color: colors.primary }} />
              <h2 className="text-2xl font-bold text-gray-900">Imagen Principal</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Imagen de la Rifa
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                    id="image-upload"
                  />
                  <label htmlFor="image-upload" className="cursor-pointer">
                    <Upload size={32} className="mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-600">
                      Click para subir nueva imagen
                    </p>
                  </label>
                </div>
              </div>

              {previewUrl && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vista Previa
                  </label>
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-lg border border-gray-200"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Premios con imágenes */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <Target size={24} style={{ color: colors.primary }} />
                <h2 className="text-2xl font-bold text-gray-900">Premios</h2>
              </div>
              <button
                type="button"
                onClick={addPrize}
                className="flex items-center space-x-2 px-4 py-2 text-white rounded-lg font-medium"
                style={{ backgroundColor: colors.primary }}
              >
                <Plus size={16} />
                <span>Agregar Premio</span>
              </button>
            </div>

            <div className="space-y-6">
              {prizes.map((prize, index) => (
                <div key={index} className="border border-gray-200 rounded-xl p-6 bg-gray-50">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Premio {index + 1}
                    </h3>
                    <button
                      type="button"
                      onClick={() => removePrize(index)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Información del premio */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Nombre del premio *
                        </label>
                        <input
                          type="text"
                          placeholder="Ej: iPhone 15 Pro"
                          value={prize.name}
                          onChange={(e) => updatePrize(index, 'name', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                          style={{ '--tw-ring-color': colors.primary }}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Descripción
                        </label>
                        <textarea
                          placeholder="Descripción detallada del premio"
                          value={prize.description}
                          onChange={(e) => updatePrize(index, 'description', e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                          style={{ '--tw-ring-color': colors.primary }}
                        />
                      </div>
                    </div>

                    {/* Imagen del premio */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Imagen del premio
                      </label>

                      {prizeImages[index]?.preview ? (
                        <div className="relative">
                          <img
                            src={prizeImages[index].preview}
                            alt={`Premio ${index + 1}`}
                            className="w-full h-40 object-cover rounded-lg border border-gray-200"
                          />
                          <button
                            type="button"
                            onClick={() => removePrizeImage(index)}
                            className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors"
                          >
                            <X size={16} />
                          </button>
                          <div className="mt-2">
                            <input
                              type="file"
                              onChange={(e) => handlePrizeImageChange(index, e.target.files[0])}
                              accept="image/*"
                              className="hidden"
                              id={`prize-image-${index}`}
                            />
                            <label
                              htmlFor={`prize-image-${index}`}
                              className="inline-flex items-center space-x-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer transition-colors"
                            >
                              <Upload size={14} />
                              <span>Cambiar imagen</span>
                            </label>
                          </div>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center h-40 flex flex-col items-center justify-center">
                          <input
                            type="file"
                            onChange={(e) => handlePrizeImageChange(index, e.target.files[0])}
                            accept="image/*"
                            className="hidden"
                            id={`prize-image-${index}`}
                          />
                          <label htmlFor={`prize-image-${index}`} className="cursor-pointer">
                            <ImageIcon size={24} className="mx-auto mb-2 text-gray-400" />
                            <p className="text-sm text-gray-600">
                              Click para subir imagen
                            </p>
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {prizes.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Target size={48} className="mx-auto mb-4 text-gray-300" />
                  <p>No hay premios agregados aún</p>
                  <p className="text-sm">Haz click en "Agregar Premio" para comenzar</p>
                </div>
              )}
            </div>
          </div>

          {/* Métodos de Pago */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <CreditCard size={24} style={{ color: colors.primary }} />
                <h2 className="text-2xl font-bold text-gray-900">Métodos de Pago</h2>
              </div>
              <button
                type="button"
                onClick={addPaymentMethod}
                className="flex items-center space-x-2 px-4 py-2 text-white rounded-lg font-medium"
                style={{ backgroundColor: colors.primary }}
              >
                <Plus size={16} />
                <span>Agregar Método</span>
              </button>
            </div>

            <div className="space-y-6">
              {paymentMethods.map((method, index) => (
                <div key={index} className="border border-gray-200 rounded-xl p-6 bg-gray-50">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Método {index + 1}
                    </h3>
                    {paymentMethods.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePaymentMethod(index)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo de método
                    </label>
                    <select
                      value={method.method_type}
                      onChange={(e) => updatePaymentMethod(index, 'method_type', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                      style={{ '--tw-ring-color': colors.primary }}
                    >
                      <option value="pago_movil">📱 Pago Móvil</option>
                      <option value="zinli">💫 Zinli</option>
                      <option value="zelle">💰 Zelle</option>
                      <option value="binance">🪙 Binance</option>
                      <option value="bs">🏦 Transferencia Bancaria</option>
                      <option value="usd">💵 Efectivo en Dólares</option>
                    </select>
                  </div>

                  {getPaymentMethodFields(method, index)}

                  {FEATURES.ENABLE_MIN_TICKETS && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        🔢 Mínimo de tickets para mostrar
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={method.min_tickets || ''}
                        onChange={(e) => updatePaymentMethod(index, 'min_tickets', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                        style={{ '--tw-ring-color': colors.primary }}
                        placeholder="Dejar vacío o en 0 para mostrar siempre"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Este método de pago solo aparecerá cuando el usuario seleccione esta cantidad o más boletos.
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex items-center justify-between bg-white rounded-2xl shadow-lg p-8">
            <button
              type="button"
              onClick={() => navigate('/admin/history')}
              className="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={updateMutation.isLoading}
              className="px-8 py-3 text-white rounded-lg font-bold transition-colors disabled:opacity-50 flex items-center space-x-2"
              style={{ backgroundColor: colors.primary }}
            >
              {updateMutation.isLoading ? (
                <Loading size="small" text="Guardando..." />
              ) : (
                <>
                  <Save size={20} />
                  <span>Guardar Cambios</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/*  Pausa Manual*/}
        {showPauseModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <Pause className="mr-3" style={{ color: colors.primary }} />
                Pausar Rifa
              </h3>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duración de la pausa (minutos)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={pauseDuration}
                    onChange={(e) => setPauseDuration(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                    style={{ '--tw-ring-color': colors.primary }}
                    placeholder="0 = indefinido"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Deja en 0 para pausar indefinidamente hasta reactivar manualmente
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setShowPauseModal(false)}
                  className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handlePauseRaffle}
                  disabled={pauseMutation.isLoading}
                  className="flex-1 px-4 py-3 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                  style={{ backgroundColor: colors.primary }}
                >
                  {pauseMutation.isLoading ? 'Pausando...' : 'Pausar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default EditRaffle