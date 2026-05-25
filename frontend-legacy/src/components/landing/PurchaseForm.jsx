import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery } from 'react-query'
import { Plus, Minus, Upload, CreditCard, AlertCircle, CheckCircle2, Smartphone, DollarSign, Building2, Zap, Copy, Check, Clock, Pause, TrendingDown, Users, MapPin, Globe, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import { purchaseAPI, configAPI, raffleAPI } from '../../services/api'
import { formatCurrency, normalizeString, validateFile } from '../../utils/helpers'
import { VENEZUELA_STATES, FEATURES } from '../../utils/constants'
import Loading from '../common/Loading'
import { ScrollArea } from "../scroll-area"
import Modal from "../common/Modal";

const PurchaseForm = ({ raffle }) => {
  const [ticketQuantity, setTicketQuantity] = useState(raffle?.min_purchase || 1)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [purchaseResult, setPurchaseResult] = useState(null)
  const [copiedItems, setCopiedItems] = useState({})
  const [pauseInfo, setPauseInfo] = useState(null)
  const [remainingTime, setRemainingTime] = useState(0)

  // Estados para ubicación
  const [locationType, setLocationType] = useState('venezuela')
  const [selectedState, setSelectedState] = useState('')
  const [customLocation, setCustomLocation] = useState('')

  //  configuración de colores
  const { data: config } = useQuery('config', configAPI.getAll)
  const siteConfig = config?.data || {}
  const colors = siteConfig.site_colors || { primary: '#8B7355', secondary: '#F5F5DC', accent: '#FFD700' }

  const { register, handleSubmit, formState: { errors }, reset } = useForm()

  // si la rifa está finalizada o pausada
  const isRaffleFinished = raffle?.status === 'finished'
  const isRafflePaused = raffle?.status === 'paused'

  // Consultar información de pausa si la rifa está pausada
  const { data: pauseData, refetch: refetchPauseInfo } = useQuery(
    ['pauseInfo', raffle?.id],
    () => raffleAPI.getPauseInfo(raffle.id),
    {
      enabled: !!raffle?.id && isRafflePaused,
      refetchInterval: 5000, //  cada 5 segundos
      onSuccess: (data) => {
        if (data?.data) {
          setPauseInfo(data.data);
          setRemainingTime(data.data.remainingSeconds || 0);
        }
      }
    }
  );

  // Timer 
  useEffect(() => {
    let timer;
    if (isRafflePaused && remainingTime > 0) {
      timer = setInterval(() => {
        setRemainingTime(prev => {
          const next = prev - 1;
          if (next <= 0) {
            clearInterval(timer);
            setTimeout(() => {
              window.location.reload();
            }, 1000);
            return 0;
          }
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isRafflePaused, remainingTime]);

  // Formatear tiempo restante
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const availableTickets = Math.max((raffle?.total_tickets || 0) - (raffle?.tickets_sold + raffle?.tickets_reserved || 0), 0)
  const effectiveMaxPurchase = Math.min(raffle?.max_purchase || 10, availableTickets)

  useEffect(() => {
    if (raffle) {
      console.log('🎯 Rifa recibida en PurchaseForm:', raffle)
      console.log('💳 Métodos de pago disponibles:', raffle.payment_methods)
      console.log('📊 Estado de la rifa:', raffle.status)
      console.log('⏸️ Es rifa pausada:', isRafflePaused)
      console.log('🏁 Es rifa finalizada:', isRaffleFinished)
      console.log('📊 Boletos disponibles:', availableTickets)
      console.log('📊 Compra mínima:', raffle.min_purchase)
    }
  }, [raffle, isRafflePaused, isRaffleFinished])

  // Validar y ajustar la cantidad de boletos al perder el foco
  const validateTicketQuantity = (value) => {
    // Si el valor está vacío, usar el mínimo
    if (value === '') {
      setTicketQuantity(raffle?.min_purchase || 1);
      return;
    }

    // Convertir a número
    const numValue = parseInt(value, 10);

    // Si no es un número, usar el mínimo
    if (isNaN(numValue)) {
      setTicketQuantity(raffle?.min_purchase || 1);
      return;
    }

    // Asegurarse de que el valor esté dentro de los límites
    const min = raffle?.min_purchase || 1;
    const max = effectiveMaxPurchase;

    if (numValue < min) {
      setTicketQuantity(min);
    } else if (numValue > max) {
      setTicketQuantity(max);
    } else {
      setTicketQuantity(numValue);
    }
  };

  // Manejar cambios en el input (solo actualizar el estado)
  const handleTicketQuantityChange = (value) => {
    setTicketQuantity(value === '' ? '' : parseInt(value, 10) || '');
  };

  // Actualizar cantidad mínima cuando cambie la rifa
  useEffect(() => {
    if (raffle?.min_purchase) {
      setTicketQuantity(raffle.min_purchase);
    }
  }, [raffle?.min_purchase, effectiveMaxPurchase])

  const purchaseMutation = useMutation(purchaseAPI.create, {
    onSuccess: (response) => {
      console.log('✅ Purchase response:', response)

      // Cerrar toast de procesamiento
      toast.dismiss('processing-purchase')

      let purchaseData = response.data || response

      if (purchaseData.data) {
        purchaseData = purchaseData.data
      }
      setPurchaseResult(purchaseData)
      setShowSuccessModal(true)
      reset()
      setSelectedFile(null)
      setTicketQuantity(raffle?.min_purchase || 1)

      toast.success('🎉 ¡Compra realizada exitosamente!')
    },
    onError: (error) => {
      console.error('❌ Purchase error:', error)

      // Cerrar toast de procesamiento
      toast.dismiss('processing-purchase')

      const errorData = error.response?.data || {}

      //  error de pausa específicamente
      if (errorData.isPaused) {
        if (errorData.pauseInfo) {
          setPauseInfo(errorData.pauseInfo);
          setRemainingTime(errorData.pauseInfo.remainingSeconds || 0);
        }
        // Refrescar la página para mostrar el estado de pausa
        setTimeout(() => {
          window.location.reload();
        }, 2000);

        const errorMessage = error.response?.data?.error || 'Error al procesar la compra'
        toast.error('⏸️ ' + errorMessage, { duration: 6000 })
        return;
      }

      // Mensaje simple de error para el usuario
      toast.error('❌ Error al procesar la compra. Por favor, intenta nuevamente y verifica tu conexión a internet.', {
        duration: 8000
      })
    }
  })

  // mensaje de pausa personalizado**
  const getPauseDisplayInfo = () => {
    if (!pauseInfo?.pauseContext) {
      return {
        icon: Pause,
        title: '⏸️ Rifa en PAUSA',
        description: 'La rifa se encuentra en pausa temporalmente.',
        color: colors.accent
      }
    }

    const context = pauseInfo.pauseContext;

    switch (context.title) {
      case 'Boletos Insuficientes':
        return {
          icon: TrendingDown,
          title: '📊 Boletos Insuficientes',
          description: `Solo quedan ${pauseInfo.availability?.available || 0} boletos disponibles, pero necesitas al menos ${pauseInfo.minPurchase} boletos para comprar.`,
          color: '#f59e0b',
          extraInfo: `Compra mínima requerida: ${pauseInfo.minPurchase} boletos`
        }
      case 'Rifa Completa':
        return {
          icon: Users,
          title: '🎯 Rifa Completa',
          description: 'Todos los boletos están vendidos o reservados.',
          color: '#10b981'
        }
      case 'Pausa Manual':
        return {
          icon: Pause,
          title: '👨‍💼 Pausa Manual',
          description: 'La rifa fue pausada manualmente por un administrador.',
          color: colors.primary
        }
      default:
        return {
          icon: Pause,
          title: '⏸️ Rifa en PAUSA',
          description: 'La rifa se encuentra en pausa temporalmente.',
          color: colors.accent
        }
    }
  }

  // copiar datos
  const copyToClipboard = async (text, itemKey) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text)
      } else {
        const textArea = document.createElement('textarea')
        textArea.value = text
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()

        const successful = document.execCommand('copy')
        document.body.removeChild(textArea)

        if (!successful) {
          throw new Error('Fallback copy failed')
        }
      }

      setCopiedItems(prev => ({ ...prev, [itemKey]: true }))
      toast.success('📋 Copiado al portapapeles')

      // Limpiar  después de 2 segundos
      setTimeout(() => {
        setCopiedItems(prev => ({ ...prev, [itemKey]: false }))
      }, 2000)
    } catch (err) {
      const userAgent = navigator.userAgent.toLowerCase()
      if (userAgent.includes('android') || userAgent.includes('iphone') || userAgent.includes('ipad')) {
        window.prompt('Copia este texto:', text)
      } else {
        toast.error('No se pudo copiar automáticamente. Copia manualmente: ' + text)
      }
    }
  }

  // copiar toda la información de pago
  const copyAllPaymentInfo = async (method) => {
    const paymentInfo = formatPaymentInfo(method.account_info)
    const methodName = getPaymentMethodName(method.method_type)

    let textToCopy = `🏦 INFORMACIÓN DE PAGO - ${methodName}\n\n`

    paymentInfo.forEach(info => {
      textToCopy += `${info.label}: ${info.value}\n`
    })

    textToCopy += `\n💰 Precio: ${method.method_type === 'usd' || method.method_type === 'zelle'
      ? formatCurrency(raffle.price_usd, '$')
      : formatCurrency(raffle.price_bs, 'Bs')
      } por boleto`

    await copyToClipboard(textToCopy, `all-${method.id}`)
  }



  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const validation = validateFile(file, 5, ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'])
      if (validation.valid) {
        setSelectedFile(file)
      } else {
        toast.error(validation.error)
        e.target.value = ''
      }
    }
  }

  const isDollarMethod = ['usd', 'zelle', 'zinli', 'binance'].includes(selectedPaymentMethod)

  const calculateTotal = () => {
    if (!raffle) return 0
    const pricePerTicket = isDollarMethod ? raffle.price_usd : raffle.price_bs
    return pricePerTicket * ticketQuantity
  }

  const onSubmit = (data) => {
    if (isRaffleFinished) {
      toast.error('Esta rifa ya ha finalizado. No se pueden comprar más boletos.')
      return
    }

    if (isRafflePaused) {
      toast.error('Esta rifa se encuentra en pausa temporalmente. Por favor intenta más tarde.')
      return
    }

    if (!selectedPaymentMethod) {
      toast.error('Selecciona un método de pago')
      return
    }

    if (!selectedFile && selectedPaymentMethod !== 'efectivo') {
      toast.error('Debes adjuntar el comprobante de pago')
      return
    }

    // Validar ubicación
    if (FEATURES.ENABLE_LOCATION) {
      if (locationType === 'venezuela' && !selectedState) {
        toast.error('Por favor selecciona tu estado')
        return
      }
      if (locationType === 'other' && !customLocation.trim()) {
        toast.error('Por favor indica de dónde nos escribes')
        return
      }
    }

    const location = FEATURES.ENABLE_LOCATION
      ? (locationType === 'venezuela' ? `Venezuela, ${selectedState}` : customLocation.trim())
      : null

    console.log('🔄 Submitting purchase data:', {
      raffle_id: raffle.id,
      customer_name: data.customer_name,
      customer_phone: data.customer_phone,
      customer_email: data.customer_email || '',
      customer_ci: data.customer_ci || '',
      customer_location: location,
      payment_method: selectedPaymentMethod,
      payment_reference: data.payment_reference || '',
      ticket_quantity: ticketQuantity,
      hasFile: !!selectedFile
    })

    const formData = new FormData()
    formData.append('raffle_id', raffle.id)
    formData.append('customer_name', normalizeString(data.customer_name))
    formData.append('customer_phone', normalizeString(data.customer_phone))
    formData.append('customer_email', data.customer_email || '')
    formData.append('customer_ci', normalizeString(data.customer_ci))
    formData.append('customer_location', location)
    formData.append('payment_method', selectedPaymentMethod)
    formData.append('payment_reference', data.payment_reference || '')
    formData.append('ticket_quantity', ticketQuantity)

    if (selectedFile) {
      formData.append('payment_proof', selectedFile)
    }

    // Mostrar toast de procesamiento
    toast.loading('⏳ Procesando tu compra...', {
      id: 'processing-purchase',
      duration: 120000 // Duración igual al timeout
    })

    purchaseMutation.mutate(formData)
  }

  const incrementQuantity = () => {
    if (raffle && ticketQuantity < effectiveMaxPurchase) {
      setTicketQuantity(ticketQuantity + 1)
    }
  }

  const decrementQuantity = () => {
    if (raffle && ticketQuantity > (raffle.min_purchase || 1)) {
      setTicketQuantity(ticketQuantity - 1)
    }
  }

  const closeModal = () => {
    setShowSuccessModal(false)
    setPurchaseResult(null)
    setTimeout(() => {
      window.location.reload()
    }, 500) //  delay para permitir cierre 
  }

  const formatPaymentInfo = (accountInfo) => {
    if (!accountInfo) return []

    let parsedInfo = accountInfo
    if (typeof accountInfo === 'string') {
      try {
        parsedInfo = JSON.parse(accountInfo)
      } catch (error) {
        console.error('Error parsing account_info:', error, accountInfo)
        return []
      }
    }

    if (typeof parsedInfo !== 'object' || parsedInfo === null) {
      return []
    }

    const formatMap = {
      'bank': { label: 'Banco', key: 'bank' },
      'holder': { label: 'Titular', key: 'holder' },
      'account': { label: 'Cuenta', key: 'account' },
      'phone': { label: 'Teléfono', key: 'phone' },
      'email': { label: 'Email', key: 'email' },
      'type': { label: 'Tipo Cuenta', key: 'type' },
      'cedula': { label: 'Cédula', key: 'cedula' },
      'address': { label: 'Dirección', key: 'address' }
    }

    return Object.keys(parsedInfo)
      .filter(key =>
        key !== 'holder' &&
        parsedInfo[key] &&
        parsedInfo[key].toString().trim()
      )
      .map(key => ({
        label: formatMap[key]?.label || `${key}:`,
        value: parsedInfo[key].toString()
      }))
  }

  const getPaymentMethodName = (methodType) => {
    const nameMap = {
      'pago_movil': 'Pago Móvil',
      'zinli': 'Zinli',
      'zelle': 'Zelle',
      'binance': 'Binance Pay',
      'bs': 'Transferencia Bancaria',
      'usd': 'Transferencia Dólares'
    }
    return nameMap[methodType] || methodType.toUpperCase()
  }

  const renderTicketNumbers = () => {
    if (!purchaseResult) return null

    let ticketNumbers = purchaseResult.ticket_numbers || []

    if (typeof ticketNumbers === 'string') {
      ticketNumbers = ticketNumbers.split(',').map(num => num.trim())
    }

    if (!Array.isArray(ticketNumbers)) {
      console.warn('⚠️ ticket_numbers no es un array:', ticketNumbers)
      return <p className="text-red-500">Error al mostrar números de boletos</p>
    }

    if (ticketNumbers.length === 0) {
      return <p className="text-gray-500">No se asignaron números de boletos</p>
    }

    return (
      <div className="flex flex-wrap gap-2 justify-center">
        {ticketNumbers.map((number, index) => (
          <span
            key={index}
            className="text-white px-4 py-2 rounded-lg font-black text-lg shadow-lg"
            style={{ backgroundColor: colors.primary }}
          >
            #{String(number).padStart(4, '0')}
          </span>
        ))}
      </div>
    )
  }

  // Si no hay rifa, mostrar loading
  if (!raffle) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 border-l-4" style={{ borderColor: colors.primary }}>
        <div className="flex justify-center py-8">
          <Loading text="Cargando información de la rifa..." />
        </div>
      </div>
    )
  }

  // Si la rifa está finalizada, mostrar 
  if (isRaffleFinished) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 border-l-4" style={{ borderColor: colors.primary }}>
        <div className="flex items-center justify-center text-center py-8">
          <div>
            <AlertCircle size={64} className="mx-auto mb-4 text-gray-400" />
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Rifa Finalizada</h3>
            <p className="text-gray-600 mb-4">
              ¡Rifa Finalizada! Gracias por tu participación. No te pierdas la próxima RIFA.
            </p>
            <button
              className="px-6 py-3 rounded-lg font-semibold text-white"
              style={{ backgroundColor: colors.primary }}
            >
              Ver Resultados
            </button>
          </div>
        </div>
      </div>
    )
  }

  //  Si la rifa está pausada, mostrar mensaje personalizado con timer
  if (isRafflePaused) {
    const pauseDisplay = getPauseDisplayInfo();
    const IconComponent = pauseDisplay.icon;

    return (
      <div className="bg-white rounded-lg shadow-lg p-6 border-l-4" style={{ borderColor: pauseDisplay.color }}>
        <div className="flex items-center justify-center text-center py-8">
          <div>
            <div className="relative">
              <IconComponent size={64} className="mx-auto mb-4" style={{ color: pauseDisplay.color }} />
              <div className="absolute inset-0 animate-ping">
                <IconComponent size={64} className="mx-auto mb-4 opacity-30" style={{ color: pauseDisplay.color }} />
              </div>
            </div>

            <h3 className="text-2xl font-bold mb-2" style={{ color: colors.primary }}>
              {pauseDisplay.title}
            </h3>

            <p className="text-gray-600 mb-4 text-lg">
              {pauseDisplay.description}
            </p>

            {/* Información extra para pausas por boletos insuficientes */}
            {pauseDisplay.extraInfo && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-amber-800 text-sm font-medium">
                  {pauseDisplay.extraInfo}
                </p>
              </div>
            )}

            <p className="text-gray-600 mb-6 text-base">
              Vuelve a intentar tu compra en:
            </p>

            {/* Timer  */}
            {remainingTime > 0 ? (
              <div className="mb-6">
                <div
                  className="inline-flex items-center space-x-4 text-white px-8 py-6 rounded-2xl shadow-xl text-3xl font-black"
                  style={{
                    background: `linear-gradient(135deg, ${pauseDisplay.color} 0%, ${colors.accent} 100%)`,
                    animation: 'pulse 1s infinite'
                  }}
                >
                  <Clock size={32} />
                  <span>{formatTime(remainingTime)}</span>
                  <Clock size={32} />
                </div>
              </div>
            ) : (
              <div className="mb-6">
                <div
                  className="inline-flex items-center space-x-4 text-white px-8 py-4 rounded-2xl shadow-xl text-lg font-bold"
                  style={{ backgroundColor: colors.primary }}
                >
                  <Zap size={24} />
                  <span>Verificando disponibilidad...</span>
                  <Zap size={24} />
                </div>
              </div>
            )}

            {/* Información adicional según el tipo de pausa */}
            {pauseInfo?.pauseContext?.title === 'Boletos Insuficientes' && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-bold text-blue-800 mb-2">¿Por qué está pausada?</h4>
                <p className="text-blue-700 text-sm">
                  La rifa se pausa automáticamente cuando no hay suficientes boletos para cumplir con la compra mínima.
                  Esto puede suceder cuando otros compradores liberan boletos o cuando se realizan ajustes administrativos.
                </p>
              </div>
            )}

            {/*refrescar */}
            <button
              onClick={() => window.location.reload()}
              className="px-8 py-3 rounded-lg font-semibold text-white transition-all hover:scale-105"
              style={{ backgroundColor: colors.primary }}
            >
              🔄 Verificar Estado
            </button>
          </div>
        </div>
      </div>
    )
  }

  // si no hay suficientes boletos para la compra mínima
  if (availableTickets > 0 && availableTickets < (raffle.min_purchase || 1)) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 border-l-4" style={{ borderColor: '#f59e0b' }}>
        <div className="flex items-center justify-center text-center py-8">
          <div>
            <TrendingDown size={64} className="mx-auto mb-4" style={{ color: '#f59e0b' }} />
            <h3 className="text-2xl font-bold mb-2" style={{ color: colors.primary }}>
              📊 Boletos Insuficientes
            </h3>
            <p className="text-gray-600 mb-4 text-lg">
              Solo quedan {availableTickets} boletos disponibles, pero necesitas al menos {raffle.min_purchase} boletos para comprar.
            </p>
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-amber-800 text-sm">
                <strong>Compra mínima:</strong> {raffle.min_purchase} boletos<br />
                <strong>Disponibles:</strong> {availableTickets} boletos
              </p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 rounded-lg font-semibold text-white"
              style={{ backgroundColor: colors.primary }}
            >
              🔄 Refrescar
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="bg-white rounded-lg md:rounded-2xl shadow-lg p-4 md:p-6">
        {/* TEXTOS PROMOCIONALES - SOLO EN DESKTOP */}
        <div className="hidden md:block mb-6">
          <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl md:rounded-3xl p-6 md:p-8 border-2 border-green-100 mb-6 md:mb-8">
            <h2 className="text-2xl md:text-3xl font-black mb-4 md:mb-6 flex items-center" style={{ color: colors.primary }}>
              <Zap className="mr-3" size={32} />
              ¡COMPRA TUS BOLETOS AHORA!
            </h2>
            <p className="text-lg text-gray-600 mb-4 md:mb-6">
              Cada boleto es una oportunidad de cambiar tu vida. ¡No dejes pasar esta oportunidad!
            </p>
          </div>

          {/* Beneficios - SOLO EN DESKTOP */}
          <div className="space-y-4 mb-8">
            <h3 className="text-xl md:text-2xl font-black mb-4 md:mb-6" style={{ color: colors.primary }}>
              ✨ ¿Por qué elegir nuestras rifas?
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { icon: '⚡', title: 'Proceso rápido', desc: 'Compra en menos de 2 minutos' },
                { icon: '🔒', title: 'Pago seguro', desc: 'Múltiples métodos de pago' },
                { icon: '📱', title: 'Confirmación inmediata', desc: 'Recibes tus números al instante' },
                { icon: '🏆', title: 'Premios garantizados', desc: 'Sorteo 100% transparente' },
                { icon: '💰', title: 'Precios accesibles', desc: 'Boletos desde ' + formatCurrency(raffle.price_bs, 'Bs') },
                { icon: '🎯', title: 'Múltiples oportunidades', desc: `Hasta ${raffle.max_purchase || 10} boletos por persona` }
              ].map((benefit, index) => (
                <div key={index} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all">
                  <div className="text-2xl">{benefit.icon}</div>
                  <div>
                    <div className="font-bold text-gray-900 text-sm">{benefit.title}</div>
                    <div className="text-xs text-gray-600">{benefit.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* TÍTULO PARA MÓVIL */}
        <div className="md:hidden text-center mb-4">
          <h3 className="text-xl font-black" style={{ color: colors.primary }}>
            💳 COMPRAR BOLETOS
          </h3>
        </div>

        {/* cantidad */}
        <div className="mb-4 md:mb-6">
          <div className="flex items-baseline justify-center space-x-4 mb-3 md:mb-4">
            <button
              type="button"
              onClick={decrementQuantity}
              disabled={ticketQuantity <= (raffle?.min_purchase || 1)}
              className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gray-200 flex items-center justify-center disabled:opacity-50 hover:bg-gray-300 transition-colors"
            >
              <Minus size={16} />
            </button>

            <div className="text-center flex flex-col items-center justify-start gap-2">
              <input
                type="number"
                value={ticketQuantity}
                onChange={(e) => handleTicketQuantityChange(e.target.value)}
                onBlur={(e) => validateTicketQuantity(e.target.value)}
                min={raffle?.min_purchase || 1}
                max={effectiveMaxPurchase}
                className="w-12 md:w-16 h-8 md:h-10 rounded-lg bg-gray-200 text-center"
              />
              <div className="text-xs md:text-sm text-gray-600">
                min {raffle?.min_purchase || 1} - máx {effectiveMaxPurchase}
              </div>
            </div>

            <button
              type="button"
              onClick={incrementQuantity}
              disabled={ticketQuantity >= effectiveMaxPurchase}
              className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gray-200 flex items-center justify-center disabled:opacity-50 hover:bg-gray-300 transition-colors"
            >
              <Plus size={16} />
            </button>
          </div>

          <div className="text-center">
            <div className="text-lg md:text-xl font-semibold">
              Total: {formatCurrency(calculateTotal(), isDollarMethod ? '$' : 'Bs')}
            </div>
            <div className="text-sm text-gray-600">
              {ticketQuantity} boleto{ticketQuantity > 1 ? 's' : ''}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 md:space-y-6">
          {/* Datos personales */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3 md:mb-4 flex items-center text-sm md:text-base">
              <CreditCard size={16} className="mr-2" />
              DATOS PERSONALES
            </h4>

            <div className="grid grid-cols-1 gap-3 md:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombres y Apellidos *
                </label>
                <input
                  type="text"
                  {...register('customer_name', { required: 'Este campo es requerido' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent text-sm md:text-base"
                  style={{ '--tw-ring-color': colors.primary }}
                  maxLength={200}
                />
                {errors.customer_name && (
                  <p className="text-red-500 text-xs md:text-sm mt-1">{errors.customer_name.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono *
                </label>
                <input
                  type="tel"
                  maxLength={20}
                  {...register('customer_phone', { required: 'Este campo es requerido' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent text-sm md:text-base"
                  style={{ '--tw-ring-color': colors.primary }}
                  placeholder="04121234567"
                />
                {errors.customer_phone && (
                  <p className="text-red-500 text-xs md:text-sm mt-1">{errors.customer_phone.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    {...register('customer_email', {
                      required: 'Este campo es requerido',
                      pattern: {
                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                        message: 'Ingresa un email válido'
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent text-sm md:text-base"
                    style={{ '--tw-ring-color': colors.primary }}
                    maxLength={100}
                  />
                  {errors.customer_email && (
                    <p className="text-red-500 text-xs md:text-sm mt-1">{errors.customer_email.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cédula *
                  </label>
                  <input
                    type="text"
                    {...register('customer_ci', {
                      required: 'Este campo es requerido',
                      pattern: {
                        value: /^[0-9]+$/,
                        message: 'Debe contener solo números'
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent text-sm md:text-base"
                    style={{ '--tw-ring-color': colors.primary }}
                    placeholder="12345678"
                    maxLength={20}
                  />
                  {errors.customer_ci && (
                    <p className="text-red-500 text-xs md:text-sm mt-1">{errors.customer_ci.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Selector de Ubicación */}
            {FEATURES.ENABLE_LOCATION && (
              <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center text-sm">
                  <MapPin size={16} className="mr-2 text-gray-500" />
                  ¿Desde dónde juegas?
                </h4>

                <div className="flex flex-col space-y-3">
                  <div className="flex space-x-4">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        checked={locationType === 'venezuela'}
                        onChange={() => setLocationType('venezuela')}
                        className="mr-2"
                        style={{ accentColor: colors.primary }}
                      />
                      <span className="text-sm font-medium">Venezuela 🇻🇪</span>
                    </label>

                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        checked={locationType === 'other'}
                        onChange={() => setLocationType('other')}
                        className="mr-2"
                        style={{ accentColor: colors.primary }}
                      />
                      <span className="text-sm font-medium flex items-center">
                        <Globe size={14} className="mr-1" /> Otro país
                      </span>
                    </label>
                  </div>

                  {locationType === 'venezuela' ? (
                    <select
                      value={selectedState}
                      onChange={(e) => setSelectedState(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent text-sm bg-white"
                      style={{ '--tw-ring-color': colors.primary }}
                    >
                      <option value="">Selecciona tu estado...</option>
                      {VENEZUELA_STATES.map(state => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={customLocation}
                      onChange={(e) => setCustomLocation(e.target.value)}
                      placeholder="¿País y Ciudad?"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent text-sm"
                      style={{ '--tw-ring-color': colors.primary }}
                      maxLength={100}
                    />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Métodos de pago */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3 md:mb-4 flex items-center text-sm md:text-base">
              <CreditCard size={16} className="mr-2" />
              MÉTODOS DE PAGO
            </h4>
            <p className="text-xs md:text-sm text-gray-600 mb-4 md:mb-6">Elige tu método de pago preferido</p>

            {/* si hay métodos de pago disponibles */}
            {!raffle.payment_methods || raffle.payment_methods.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center">
                  <AlertCircle size={20} className="text-yellow-600 mr-2" />
                  <p className="text-yellow-800 text-sm">
                    Los métodos de pago se están cargando. Por favor espera un momento...
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {raffle.payment_methods.map((method) => {
                  const paymentInfo = formatPaymentInfo(method.account_info)
                  const isSelected = selectedPaymentMethod === method.method_type
                  const minTickets = (FEATURES.ENABLE_MIN_TICKETS && method.min_tickets) ? parseInt(method.min_tickets) : 0
                  const isLocked = minTickets > 0 && ticketQuantity < minTickets

                  return (
                    <div key={method.id} className="relative">
                      <label className={`flex items-center p-3 md:p-4 border-2 rounded-lg transition-all ${isLocked
                        ? 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                        : isSelected
                          ? 'border-blue-500 bg-blue-50 cursor-pointer'
                          : 'border-gray-200 hover:bg-gray-50 cursor-pointer'
                        }`}>
                        <input
                          type="radio"
                          value={method.method_type}
                          checked={isSelected}
                          onChange={(e) => !isLocked && setSelectedPaymentMethod(e.target.value)}
                          disabled={isLocked}
                          className="mr-3"
                          style={{ accentColor: colors.primary }}
                        />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center mb-1">
                            <span className="font-bold text-sm md:text-lg text-gray-900 mr-2">
                              {getPaymentMethodName(method.method_type)}
                            </span>
                            {isLocked && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-600">
                                <Lock size={10} className="mr-1" />
                                Mínimo {minTickets} tickets
                              </span>
                            )}
                          </div>

                          {/* Información del método de pago (oculta si está bloqueado) */}
                          {!isLocked && paymentInfo.length > 0 && (
                            <div className="space-y-1 md:space-y-2">
                              {paymentInfo.map((info, index) => (
                                <div key={index} className="flex items-center justify-between">
                                  <span className="text-xs md:text-sm text-gray-600">
                                    <span className="font-bold">{info.label}:</span> {info.value}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(info.value, `${method.id}-${index}`)}
                                    className="ml-2 p-1 rounded hover:bg-gray-200 transition-colors"
                                    title="Copiar"
                                  >
                                    {copiedItems[`${method.id}-${index}`] ? (
                                      <Check size={14} className="text-green-600" />
                                    ) : (
                                      <Copy size={14} className="text-gray-500" />
                                    )}
                                  </button>
                                </div>
                              ))}

                              {/* Botón para copiar toda la información */}
                              <div className="mt-2 pt-2 border-t border-gray-200">
                                <button
                                  type="button"
                                  onClick={() => copyAllPaymentInfo(method)}
                                  className="flex items-center space-x-2 text-xs text-blue-600 hover:text-blue-800 transition-colors"
                                >
                                  {copiedItems[`all-${method.id}`] ? (
                                    <>
                                      <Check size={12} />
                                      <span>¡Copiado!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy size={12} />
                                      <span>Copiar todo</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          )}

                          {isLocked && (
                            <p className="text-xs text-gray-500 italic">
                              Este método de pago se desbloqueará al seleccionar {minTickets} o más boletos.
                            </p>
                          )}
                        </div>

                        <div className="text-right ml-2">
                          <div className="font-bold text-sm md:text-lg" style={{ color: colors.primary }}>
                            {method.method_type === 'usd' || method.method_type === 'zelle' || method.method_type === 'zinli' || method.method_type === 'binance'
                              ? formatCurrency(raffle.price_usd, '$')
                              : formatCurrency(raffle.price_bs, 'Bs')
                            }
                          </div>
                          <div className="text-xs text-gray-500">por boleto</div>
                        </div>
                      </label>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          {selectedPaymentMethod && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Referencia de Pago *
              </label>
              {FEATURES.ENABLE_FULL_REFERENCE && (
                <p className="text-xs text-gray-600 mb-2">
                  ⚠️ Debes ingresar el número de referencia completo
                </p>
              )}
              <input
                type="text"
                {...register('payment_reference', {
                  required: 'Este campo es requerido',
                  ...(FEATURES.ENABLE_FULL_REFERENCE && {
                    minLength: {
                      value: 8,
                      message: 'La referencia debe tener al menos 8 caracteres'
                    },
                    pattern: {
                      value: /^[a-zA-Z0-9]{8,}$/,
                      message: 'La referencia debe contener al menos 8 caracteres (letras y números)'
                    }
                  })
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent text-sm md:text-base"
                style={{ '--tw-ring-color': colors.primary }}
                placeholder={FEATURES.ENABLE_FULL_REFERENCE ? "Referencia de confirmación completa (mín. 8 caracteres)" : "Número de confirmación"}
                maxLength={100}
              />
              {errors.payment_reference && (
                <p className="text-red-500 text-xs md:text-sm mt-1">{errors.payment_reference.message}</p>
              )}
            </div>
          )}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3 md:mb-4 flex items-center text-sm md:text-base">
              <Upload size={16} className="mr-2" />
              COMPROBANTE DE PAGO
            </h4>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 md:p-6 hover:border-gray-400 transition-colors">
              <input
                type="file"
                onChange={handleFileChange}
                accept="image/*,.pdf"
                className="hidden"
                id="payment-proof"
              />
              <label
                htmlFor="payment-proof"
                className="cursor-pointer flex flex-col items-center text-gray-600"
              >
                <Upload size={32} className="mb-2" />
                <span className="text-sm md:text-lg font-medium">Subir comprobante</span>
                {selectedFile ? (
                  <span className="text-sm text-green-600 mt-2 font-medium text-center">
                    ✅ {selectedFile.name}
                  </span>
                ) : (
                  <span className="text-xs md:text-sm text-center mt-2">
                    Imágenes (JPG, PNG) o PDF hasta 5MB<br />
                    <strong>Total: {formatCurrency(calculateTotal(), isDollarMethod ? '$' : 'Bs')}</strong>
                  </span>
                )}
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={
              purchaseMutation.isLoading ||
              isRaffleFinished ||
              isRafflePaused ||
              !raffle.payment_methods ||
              raffle.payment_methods.length === 0 ||
              availableTickets < (raffle.min_purchase || 1)
            }
            className="w-full text-white py-3 md:py-4 rounded-lg font-semibold transition-colors disabled:opacity-50 text-sm md:text-lg"
            style={{ backgroundColor: colors.primary }}
          >
            {purchaseMutation.isLoading ? (
              <Loading size="small" text="Procesando..." />
            ) : isRafflePaused ? (
              'RIFA EN PAUSA'
            ) : availableTickets < (raffle.min_purchase || 1) ? (
              'BOLETOS INSUFICIENTES'
            ) : !raffle.payment_methods || raffle.payment_methods.length === 0 ? (
              'Cargando métodos...'
            ) : (
              `CONFIRMAR - ${formatCurrency(calculateTotal(), isDollarMethod ? '$' : 'Bs')}`
            )}
          </button>
        </form>

        <div className="mt-4 md:mt-6 text-center text-xs text-gray-500">
          <p>
            Este sitio está protegido por recaptcha de Google. Aplican su{' '}
            <a href="#" style={{ color: colors.primary }}>Política de Privacidad</a> y{' '}
            <a href="#" style={{ color: colors.primary }}>Términos del Servicio</a>.
          </p>
        </div>
      </div>

      {/* Éxito */}
      <Modal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
      >
        {purchaseResult ? (
          <div className="text-center flex flex-col items-center">
            <CheckCircle2 size={48} className="mx-auto mb-4" style={{ color: colors.accent }} />

            <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">
              ¡Compra Exitosa! 🎉
            </h3>

            <div className="bg-gray-50">
              <h4 className="font-semibold text-gray-800 mb-3">Tus números ganadores:</h4>
              <ScrollArea className="h-48">
                {renderTicketNumbers()}
              </ScrollArea>
            </div>

            <div className="text-sm text-gray-600 mb-4 md:mb-6">
              <p><strong>Total pagado:</strong> {formatCurrency(purchaseResult.total_amount || 0, 'Bs')}</p>
              <p><strong>ID de compra:</strong> #{purchaseResult.purchase_id || 'N/A'}</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 md:p-4 mb-4 md:mb-6">
              <p className="text-xs md:text-sm text-blue-800">
                📱 <strong>¡Guarda tus números!</strong> Puedes verificar tus boletos en cualquier momento
                con tu número de teléfono en la sección "Verificador de Boletos".
              </p>
            </div>

            <button
              onClick={closeModal}
              className="w-full py-3 rounded-lg font-semibold text-white"
              style={{ backgroundColor: colors.primary }}
            >
              ¡Perfecto!
            </button>
          </div>
        ) : null}
      </Modal>

    </>
  )
}

export default PurchaseForm