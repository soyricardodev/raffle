import React, { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { useMutation, useQueryClient } from 'react-query'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  Trash2,
  Upload,
  Save,
  X,
  Calendar,
  DollarSign,
  Gift,
  CreditCard,
  Image,
  Settings,
  ArrowLeft,
  Sparkles,
  Target,
  Percent
} from 'lucide-react'
import toast from 'react-hot-toast'
import { raffleAPI } from '../../services/api'
import Loading from '../common/Loading'
import { validateFile } from '../../utils/helpers'
import { FEATURES } from '../../utils/constants'

const CreateRaffle = () => {
  const [imagePreview, setImagePreview] = useState(null)
  const [selectedImage, setSelectedImage] = useState(null)
  const [prizeImages, setPrizeImages] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { register, handleSubmit, control, watch, formState: { errors }, setValue } = useForm({
    defaultValues: {
      name: '',
      description: '',
      total_tickets: 100,
      price_bs: 150,
      price_usd: 1,
      min_purchase: 1,
      max_purchase: 10,
      draw_date: '',
      percentage_mode: false,
      activation_percentage: 80,
      days_for_draw: 7,
      status: 'draft',
      prizes: [{ name: '', description: '', image_url: '' }],
      payment_methods: [
        { type: 'pago_movil', info: { bank: '', phone: '', cedula: '', holder: '' } }
      ]
    }
  })

  const { fields: prizeFields, append: appendPrize, remove: removePrize } = useFieldArray({
    control,
    name: 'prizes'
  })

  const { fields: paymentFields, append: appendPayment, remove: removePayment } = useFieldArray({
    control,
    name: 'payment_methods'
  })

  const watchPercentageMode = watch('percentage_mode')
  const watchPaymentMethods = watch('payment_methods')

  const createRaffleMutation = useMutation(raffleAPI.create, {
    onSuccess: (response) => {
      toast.success('🎉 ¡Rifa creada exitosamente!')
      queryClient.invalidateQueries('raffles')
      navigate('/admin/raffles')
    },
    onError: (error) => {
      console.error('❌ Error creando rifa:', error)
      toast.error(error.response?.data?.error || 'Error al crear la rifa')
      setIsSubmitting(false)
    }
  })

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const validation = validateFile(file, 5, ['image/jpeg', 'image/png', 'image/gif'])
      if (validation.valid) {
        setSelectedImage(file)
        const reader = new FileReader()
        reader.onload = (e) => setImagePreview(e.target.result)
        reader.readAsDataURL(file)
      } else {
        toast.error(validation.error)
        e.target.value = ''
      }
    }
  }

  const handlePrizeImageChange = (e, index) => {
    const file = e.target.files[0]
    if (file) {
      const validation = validateFile(file, 5, ['image/jpeg', 'image/png', 'image/gif'])
      if (validation.valid) {
        const preview = URL.createObjectURL(file)
        setPrizeImages(prev => ({
          ...prev,
          [index]: {
            file: file,
            preview: preview,
            existing: false
          }
        }))
        console.log(`🖼️ Imagen seleccionada para premio ${index}:`, file.name)
      } else {
        toast.error(validation.error)
        e.target.value = ''
      }
    }
  }

  const removePrizeImage = (index) => {
    setPrizeImages(prev => {
      const newImages = { ...prev }
      if (newImages[index] && newImages[index].preview && !newImages[index].existing) {
        URL.revokeObjectURL(newImages[index].preview)
      }
      delete newImages[index]
      return newImages
    })
  }

  const getPaymentMethodFields = (type, index) => {
    switch (type) {
      case 'pago_movil':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                🏦 Banco
              </label>
              <input
                type="text"
                {...register(`payment_methods.${index}.info.bank`)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                placeholder="Banco de Venezuela"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                📱 Número de teléfono
              </label>
              <input
                type="text"
                {...register(`payment_methods.${index}.info.phone`)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                placeholder="04121234567"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                🆔 Cédula
              </label>
              <input
                type="text"
                {...register(`payment_methods.${index}.info.cedula`)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                placeholder="12345678"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                👤 Nombre del titular
              </label>
              <input
                type="text"
                {...register(`payment_methods.${index}.info.holder`)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                placeholder="Nombre completo del titular"
              />
            </div>
          </div>
        )
      case 'zinli':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                📧 Email de Zinli
              </label>
              <input
                type="text"
                {...register(`payment_methods.${index}.info.account`)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                placeholder="Email de Zinli"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                👤 Nombre del titular
              </label>
              <input
                type="text"
                {...register(`payment_methods.${index}.info.holder`)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                placeholder="Nombre completo"
              />
            </div>
          </div>
        )
      case 'zelle':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                📧 Email de Zelle / Número de teléfono
              </label>
              <input
                type="text"
                {...register(`payment_methods.${index}.info.account`)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                placeholder="Email o Número de Teléfono de Zelle"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                👤 Nombre del titular
              </label>
              <input
                type="text"
                {...register(`payment_methods.${index}.info.holder`)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                placeholder="Nombre completo"
              />
            </div>
          </div>
        )
      case 'binance':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                🪙 ID de Binance / Email
              </label>
              <input
                type="text"
                {...register(`payment_methods.${index}.info.account`)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                placeholder="ID o email de Binance"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                👤 Nombre del titular
              </label>
              <input
                type="text"
                {...register(`payment_methods.${index}.info.holder`)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                placeholder="Nombre completo"
              />
            </div>
          </div>
        )
      case 'bs':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                🏦 Banco
              </label>
              <input
                type="text"
                {...register(`payment_methods.${index}.info.bank`)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                placeholder="Nombre del banco"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                💳 Número de cuenta
              </label>
              <input
                type="text"
                {...register(`payment_methods.${index}.info.account`)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                placeholder="01020123456789012345"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                🏦 Tipo de Cuenta
              </label>
              <input
                type="text"
                {...register(`payment_methods.${index}.info.type`)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                placeholder="Ahorro / Corriente"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                👤 Nombre del titular
              </label>
              <input
                type="text"
                {...register(`payment_methods.${index}.info.holder`)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                placeholder="Nombre completo del titular"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                🆔 Cédula
              </label>
              <input
                type="text"
                {...register(`payment_methods.${index}.info.cedula`)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                placeholder="12345678"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                📱 Número de teléfono
              </label>
              <input
                type="text"
                {...register(`payment_methods.${index}.info.phone`)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                placeholder="04121234567"
              />
            </div>
          </div>
        )
      default:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                💳 Cuenta/Email
              </label>
              <input
                type="text"
                {...register(`payment_methods.${index}.info.account`)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                placeholder="Número de cuenta o email"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                👤 Titular
              </label>
              <input
                type="text"
                {...register(`payment_methods.${index}.info.holder`)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                placeholder="Nombre del titular"
              />
            </div>
          </div>
        )
    }
  }

  const onSubmit = (data) => {
    if (isSubmitting) return

    setIsSubmitting(true)
    console.log('📝 Enviando datos de rifa:', data)
    console.log('🖼️ Imágenes de premios seleccionadas:', Object.keys(prizeImages))

    const formData = new FormData()

    // Datos básicos
    Object.keys(data).forEach(key => {
      if (key !== 'prizes' && key !== 'payment_methods') {
        formData.append(key, data[key])
      }
    })

    // Premios
    formData.append('prizes', JSON.stringify(data.prizes))

    // Métodos de pago
    formData.append('payment_methods', JSON.stringify(data.payment_methods))

    // Imagen principal
    if (selectedImage) {
      formData.append('image', selectedImage)
      console.log('🖼️ Imagen principal agregada al FormData')
    }

    // Imágenes de premios
    Object.keys(prizeImages).forEach(prizeIndex => {
      const prizeImage = prizeImages[prizeIndex]
      if (prizeImage.file) {
        formData.append(`prize_image_${prizeIndex}`, prizeImage.file)
        console.log(`🖼️ Imagen del premio ${prizeIndex} agregada al FormData:`, prizeImage.file.name)
      }
    })

    // Log de todo lo que se envía
    for (let pair of formData.entries()) {
      if (pair[1] instanceof File) {
        console.log(`📎 ${pair[0]}: ${pair[1].name} (${pair[1].size} bytes)`)
      } else {
        console.log(`📄 ${pair[0]}: ${pair[1]}`)
      }
    }

    createRaffleMutation.mutate(formData)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      {/* Header  */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="bg-gradient-to-r from-primary via-primary/90 to-accent rounded-2xl p-8 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent"></div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-accent/10 rounded-full -translate-y-48 translate-x-48"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-32 -translate-x-32"></div>

          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-4 mb-4">
                  <button
                    onClick={() => navigate('/admin/raffles')}
                    className="bg-white/20 backdrop-blur-sm text-white p-3 rounded-xl hover:bg-white/30 transition-all"
                  >
                    <ArrowLeft size={24} />
                  </button>
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                    <Sparkles size={32} className="text-accent" />
                  </div>
                </div>
                <h1 className="text-5xl font-bold mb-2">✨ Nueva Rifa</h1>
                <p className="text-xl text-white/80">
                  Crea una experiencia de rifa increíble que enamore a tus participantes
                </p>
              </div>
              <div className="hidden md:block">
                <div className="text-6xl opacity-30">🎯</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Información General */}
          <div className="lg:col-span-2 space-y-8">
            {/* Información básica */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-gray-100">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                  <Settings className="mr-3 text-blue-600" size={28} />
                  Información General
                </h2>
                <p className="text-gray-600 mt-1">Configura los datos básicos de tu rifa</p>
              </div>

              <div className="p-8 space-y-8">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    🎯 Nombre de la rifa *
                  </label>
                  <input
                    type="text"
                    {...register('name', { required: 'El nombre es requerido' })}
                    className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all text-lg font-medium"
                    placeholder="Ej: Combo Power 2024 - ¡Gana el carro de tus sueños!"
                  />
                  {errors.name && (
                    <p className="text-red-500 text-sm mt-2 flex items-center">
                      <X size={16} className="mr-1" />
                      {errors.name.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    📝 Descripción
                  </label>
                  <textarea
                    rows={5}
                    {...register('description')}
                    className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all resize-none"
                    placeholder="Describe todos los detalles emocionantes de tu rifa... ¡Haz que la gente se emocione por participar!"
                  />
                </div>

                {/* Modo porcentaje */}
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-xl border border-purple-100">
                  <div className="flex items-center space-x-4 mb-4">
                    <input
                      type="checkbox"
                      {...register('percentage_mode')}
                      className="w-5 h-5 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <label className="text-lg font-bold text-gray-700 flex items-center">
                      <Percent className="mr-2 text-purple-600" size={20} />
                      Modo porcentaje automático
                    </label>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    La rifa se activará automáticamente cuando se venda el porcentaje especificado
                  </p>

                  {watchPercentageMode ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                          📊 Porcentaje de activación (%)
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          {...register('activation_percentage', {
                            valueAsNumber: true,
                            min: { value: 1, message: 'Mínimo 1%' },
                            max: { value: 100, message: 'Máximo 100%' }
                          })}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                          ⏱️ Días para el sorteo
                        </label>
                        <input
                          type="number"
                          min="1"
                          {...register('days_for_draw', { valueAsNumber: true })}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        📅 Fecha y hora del sorteo
                      </label>
                      <input
                        type="datetime-local"
                        {...register('draw_date')}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                      />
                    </div>
                  )}
                </div>

                {/* Configuración de boletos y precios */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      🎫 Cantidad de boletos *
                    </label>
                    <input
                      type="number"
                      min="1"
                      {...register('total_tickets', {
                        required: 'La cantidad es requerida',
                        valueAsNumber: true,
                        min: { value: 1, message: 'Mínimo 1 boleto' }
                      })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                    />
                    {errors.total_tickets && (
                      <p className="text-red-500 text-sm mt-1">{errors.total_tickets.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      💰 Precio en Bs. *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      {...register('price_bs', {
                        required: 'El precio es requerido',
                        valueAsNumber: true,
                        min: { value: 0, message: 'El precio debe ser mayor a 0' }
                      })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                    />
                    {errors.price_bs && (
                      <p className="text-red-500 text-sm mt-1">{errors.price_bs.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      💵 Precio en USD *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      {...register('price_usd', {
                        required: 'El precio es requerido',
                        valueAsNumber: true,
                        min: { value: 0, message: 'El precio debe ser mayor a 0' }
                      })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                    />
                    {errors.price_usd && (
                      <p className="text-red-500 text-sm mt-1">{errors.price_usd.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      ⬇️ Mínimo de compra
                    </label>
                    <input
                      type="number"
                      min="1"
                      {...register('min_purchase', { valueAsNumber: true })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      ⬆️ Máximo de compra
                    </label>
                    <input
                      type="number"
                      min="1"
                      {...register('max_purchase', { valueAsNumber: true })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Lista de premios */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                      <Gift className="mr-3 text-yellow-600" size={28} />
                      Lista de Premios
                    </h2>
                    <p className="text-gray-600 mt-1">Define los increíbles premios que pueden ganar</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => appendPrize({ name: '', description: '', image_url: '' })}
                    className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-6 py-3 rounded-xl font-bold hover:from-yellow-600 hover:to-orange-600 transition-all flex items-center space-x-2 shadow-lg hover:shadow-xl"
                  >
                    <Plus size={20} />
                    <span>Agregar Premio</span>
                  </button>
                </div>
              </div>

              <div className="p-8 space-y-6">
                {prizeFields.map((field, index) => (
                  <div key={field.id} className="border-2 border-gray-100 rounded-xl p-6 hover:border-primary/30 transition-all bg-gradient-to-r from-gray-50 to-white">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-bold text-gray-900 flex items-center">
                        <span className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">
                          {index + 1}
                        </span>
                        Premio {index + 1}
                      </h3>
                      {prizeFields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            removePrizeImage(index)
                            removePrize(index)
                          }}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-all"
                        >
                          <Trash2 size={20} />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                          🏆 Nombre del premio
                        </label>
                        <input
                          type="text"
                          {...register(`prizes.${index}.name`)}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                          placeholder="Ej: Primer premio - Automóvil Toyota"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                          📝 Descripción
                        </label>
                        <input
                          type="text"
                          {...register(`prizes.${index}.description`)}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                          placeholder="Detalles específicos del premio"
                        />
                      </div>
                    </div>

                    <div className="mt-6">
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        📸 Imagen del premio
                      </label>
                      <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-primary transition-all">
                        {prizeImages[index] ? (
                          <div className="relative">
                            <img
                              src={prizeImages[index].preview}
                              alt={`Premio ${index + 1}`}
                              className="w-full h-32 object-cover rounded-lg"
                            />
                            <button
                              type="button"
                              onClick={() => removePrizeImage(index)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <div>
                            <Image size={32} className="mx-auto mb-2 text-gray-400" />
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handlePrizeImageChange(e, index)}
                              className="hidden"
                              id={`prize-image-${index}`}
                            />
                            <label
                              htmlFor={`prize-image-${index}`}
                              className="cursor-pointer bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-4 py-2 rounded-lg font-medium hover:from-blue-600 hover:to-indigo-600 transition-all inline-block"
                            >
                              Subir imagen del premio
                            </label>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Métodos de pago */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                      <CreditCard className="mr-3 text-green-600" size={28} />
                      Métodos de Pago
                    </h2>
                    <p className="text-gray-600 mt-1">Configura las formas de pago disponibles</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => appendPayment({ type: 'pago_movil', info: { bank: '', phone: '', cedula: '', holder: '' } })}
                    className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-xl font-bold hover:from-green-600 hover:to-emerald-600 transition-all flex items-center space-x-2 shadow-lg hover:shadow-xl"
                  >
                    <Plus size={20} />
                    <span>Agregar Método</span>
                  </button>
                </div>
              </div>

              <div className="p-8 space-y-6">
                {paymentFields.map((field, index) => (
                  <div key={field.id} className="border-2 border-gray-100 rounded-xl p-6 hover:border-primary/30 transition-all bg-gradient-to-r from-gray-50 to-white">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-bold text-gray-900 flex items-center">
                        <span className="bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">
                          {index + 1}
                        </span>
                        Método {index + 1}
                      </h3>
                      {paymentFields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePayment(index)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-all"
                        >
                          <Trash2 size={20} />
                        </button>
                      )}
                    </div>

                    <div className="mb-6">
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        💳 Tipo de método
                      </label>
                      <select
                        {...register(`payment_methods.${index}.type`)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                      >
                        <option value="pago_movil">📱 Pago Móvil</option>
                        <option value="zinli">💫 Zinli</option>
                        <option value="zelle">💰 Zelle</option>
                        <option value="binance">🪙 Binance</option>
                        <option value="bs">🏦 Transferencia Bancaria</option>
                        <option value="usd">💵 Efectivo en Dólares</option>
                      </select>
                    </div>

                    {getPaymentMethodFields(watchPaymentMethods?.[index]?.type, index)}

                    {FEATURES.ENABLE_MIN_TICKETS && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                          🔢 Mínimo de tickets para mostrar
                        </label>
                        <input
                          type="number"
                          min="0"
                          {...register(`payment_methods.${index}.min_tickets`, { valueAsNumber: true })}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all"
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
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-8">
            {/* Imagen principal */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-900 flex items-center">
                  <Image className="mr-3 text-indigo-600" size={24} />
                  Imagen Principal
                </h2>
                <p className="text-gray-600 text-sm mt-1">Esta imagen aparecerá en todas las tarjetas</p>
              </div>

              <div className="p-6">
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-primary transition-all">
                  {imagePreview ? (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-48 object-cover rounded-xl"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImagePreview(null)
                          setSelectedImage(null)
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors shadow-lg"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <Upload size={48} className="mx-auto mb-4 text-gray-400" />
                      <p className="text-gray-600 mb-4 font-medium">
                        Sube una imagen atractiva que haga que la gente quiera participar
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                        id="main-image"
                      />
                      <label
                        htmlFor="main-image"
                        className="cursor-pointer bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-6 py-3 rounded-xl font-bold hover:from-indigo-600 hover:to-purple-600 transition-all inline-block"
                      >
                        Seleccionar Imagen
                      </label>
                      <p className="text-xs text-gray-400 mt-3">PNG, JPG o JPEG hasta 5MB</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Estado y publicación */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-900 flex items-center">
                  <Target className="mr-3 text-emerald-600" size={24} />
                  Publicación
                </h2>
                <p className="text-gray-600 text-sm mt-1">Define si quieres publicar inmediatamente</p>
              </div>

              <div className="p-6">
                <label className="block text-sm font-bold text-gray-700 mb-3">
                  🚀 Estado de publicación
                </label>
                <select
                  {...register('status')}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all mb-6"
                >
                  <option value="draft">📝 Guardar como borrador</option>
                  <option value="active">🔥 Publicar inmediatamente</option>
                </select>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-primary to-accent text-white py-4 rounded-xl font-bold hover:from-primary/90 hover:to-accent/90 transition-all disabled:opacity-50 flex items-center justify-center space-x-3 shadow-lg hover:shadow-xl text-lg"
                >
                  {isSubmitting ? (
                    <>
                      <Loading size="small" text="" />
                      <span>Creando rifa...</span>
                    </>
                  ) : (
                    <>
                      <Save size={24} />
                      <span>Crear Rifa</span>
                    </>
                  )}
                </button>

                <div className="mt-6 p-4 bg-blue-50 rounded-xl">
                  <p className="text-sm text-blue-800 text-center">
                    💡 <strong>Tip:</strong> Puedes editar todos estos datos después de crear la rifa
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}

export default CreateRaffle