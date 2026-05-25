import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useForm } from 'react-hook-form'
import { Save, Upload, X, Palette, Globe, MessageCircle, Phone, Building, Sparkles, Send, TestTube } from 'lucide-react'
import toast from 'react-hot-toast'
import { configAPI, emailAPI } from '../../services/api'
import Loading from '../common/Loading'
import { validateFile } from '../../utils/helpers'

const ConfigPage = () => {
  const [activeTab, setActiveTab] = useState('general')
  const [imagesPreviews, setImagesPreviews] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadingImages, setUploadingImages] = useState({})
  const [uploadedImageUrls, setUploadedImageUrls] = useState({})
  const [hasPendingImages, setHasPendingImages] = useState(false)
  const [removedImages, setRemovedImages] = useState({})
  const queryClient = useQueryClient()

  const [testEmail, setTestEmail] = useState('')
  const [testEmailType, setTestEmailType] = useState('purchase_confirmation')
  const [testEmailResult, setTestEmailResult] = useState(null)

  const sendTestEmailMutation = useMutation(
    (data) => emailAPI.sendTestEmail(data),
    {
      onSuccess: () => {
        setTestEmailResult({ success: true })
        setTimeout(() => setTestEmailResult(null), 5000)
        toast.success('Email de prueba enviado exitosamente')
      },
      onError: (error) => {
        setTestEmailResult({
          success: false,
          error: error.response?.data?.error || 'Error al enviar email'
        })
        setTimeout(() => setTestEmailResult(null), 8000)
        toast.error('Error al enviar email de prueba')
      }
    }
  )

  const handleSendTestEmail = () => {
    if (!testEmail.trim()) {
      toast.error('Por favor ingresa un email válido')
      return
    }

    sendTestEmailMutation.mutate({
      email: testEmail.trim(),
      type: testEmailType
    })
  }

  const { data: config, isLoading } = useQuery('config', configAPI.getAll, {
    refetchOnWindowFocus: false,
    staleTime: 30000,
  })

  const { register, handleSubmit, setValue, watch, reset, getValues } = useForm()

  const updateConfigMutation = useMutation(
    ({ key, value }) => configAPI.update(key, value),
    {
      onSuccess: (response) => {
        console.log('✅ Configuración guardada:', response.data);
      },
      onError: (error) => {
        console.error('❌ Error guardando configuración:', error);
        toast.error(error.response?.data?.error || 'Error al actualizar configuración')
      }
    }
  )

  const uploadImageMutation = useMutation(configAPI.uploadImage, {
    onSuccess: (response) => {
      console.log('✅ Upload exitoso - response completa:', response);
      return response
    },
    onError: (error) => {
      console.error('❌ Error en uploadImageMutation:', error);
      toast.error(error.response?.data?.error || 'Error al subir imagen')
    }
  })

  //  formulario cuando se cargan los datos
  useEffect(() => {
    if (config?.data) {
      console.log('🔄 Poblando formulario con config:', config.data);

      const formData = {};

      Object.keys(config.data).forEach(key => {
        const value = config.data[key];
        if (typeof value === 'object' && value !== null) {
          Object.keys(value).forEach(subKey => {
            formData[`${key}.${subKey}`] = value[subKey] || '';
          });
        } else {
          formData[key] = value || '';
        }
      });

      console.log('📝 Datos del formulario:', formData);
      reset(formData);
    }
  }, [config, reset])

  //  cambios en color picker
  const handleColorChange = (colorKey, colorValue) => {
    setValue(`site_colors.${colorKey}`, colorValue);
    const textInput = document.querySelector(`input[name="site_colors.${colorKey}"][type="text"]`);
    if (textInput) {
      textInput.value = colorValue;
    }
  }

  //  cambios en color picker del hero
  const handleHeroColorChange = (colorKey, colorValue) => {
    setValue(`hero_config.${colorKey}`, colorValue);
    const textInput = document.querySelector(`input[name="hero_config.${colorKey}"][type="text"]`);
    if (textInput) {
      textInput.value = colorValue;
    }
  }

  const handleImageUpload = async (e, configKey, imageKey) => {
    const file = e.target.files[0]
    if (file) {
      const validation = validateFile(file, 5, ['image/jpeg', 'image/png', 'image/gif'])
      if (validation.valid) {
        try {
          const uploadKey = `${configKey}.${imageKey}`;
          setUploadingImages(prev => ({ ...prev, [uploadKey]: true }));

          console.log('📤 Subiendo imagen:', configKey, imageKey);
          const response = await uploadImageMutation.mutateAsync(file)

          const url = response.data?.url;
          console.log('🔗 URL extraída de response.data.url:', url);

          if (!url) {
            console.error('❌ No se pudo extraer URL de la respuesta:', response);
            throw new Error('No se pudo obtener la URL de la imagen subida');
          }

          //  preview
          setImagesPreviews(prev => ({
            ...prev,
            [uploadKey]: URL.createObjectURL(file)
          }))

          // Guardar la URL para incluir en el envío final
          setUploadedImageUrls(prev => ({
            ...prev,
            [uploadKey]: url
          }))

          // limpiar el estado de imagen eliminada al subir una nueva
          setRemovedImages(prev => {
            const newRemoved = { ...prev };
            delete newRemoved[uploadKey];
            return newRemoved;
          });

          // Marcar que hay cambios pendientes
          setHasPendingImages(true)

          // Actualizar el valor en el formulario
          setValue(`${configKey}.${imageKey}`, url);

          console.log('✅ URL guardada para envío:', uploadKey, url);

          toast.success('¡Imagen subida! Recuerda hacer clic en "Guardar Cambios"', {
            duration: 4000,
            icon: '📸'
          })

        } catch (error) {
          console.error('❌ Error subiendo imagen:', error);
          toast.error(error.response?.data?.error || error.message || 'Error al subir imagen')
        } finally {
          setUploadingImages(prev => ({ ...prev, [`${configKey}.${imageKey}`]: false }));
        }
      } else {
        toast.error(validation.error)
        e.target.value = ''
      }
    }
  }

  const onSubmit = async (data) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    console.log('💾 Guardando configuración:', data);
    console.log('🖼️ URLs de imágenes subidas:', uploadedImageUrls);

    try {
      // Obtener los datos actuales de configuración
      const currentConfig = config?.data || {};

      // Agrupar datos por configuración manteniendo los datos existentes
      const configGroups = { ...currentConfig };

      Object.keys(data).forEach(key => {
        const [configKey, ...subKeys] = key.split('.')
        if (subKeys.length > 0) {
          if (!configGroups[configKey]) {
            configGroups[configKey] = {}
          }
          configGroups[configKey] = {
            ...configGroups[configKey],
            [subKeys.join('.')]: data[key] || ''
          }
        } else {
          configGroups[key] = data[key] || ''
        }
      })

      // Agregar las URLs de imágenes subidas
      Object.keys(uploadedImageUrls).forEach(uploadKey => {
        const [configKey, imageKey] = uploadKey.split('.')
        if (!configGroups[configKey]) {
          configGroups[configKey] = {}
        }
        configGroups[configKey][imageKey] = uploadedImageUrls[uploadKey]
        console.log(`🔗 Incluyendo imagen subida: ${uploadKey} = ${uploadedImageUrls[uploadKey]}`)
      })

      // imágenes eliminadas (establecer como cadena vacía)
      Object.keys(removedImages).forEach(removedKey => {
        if (removedImages[removedKey]) {
          const [configKey, imageKey] = removedKey.split('.')
          if (!configGroups[configKey]) {
            configGroups[configKey] = {}
          }
          configGroups[configKey][imageKey] = ''
          console.log(`🗑️ Eliminando imagen: ${removedKey}`)
        }
      })

      console.log('📦 Grupos de configuración completos (con imágenes):', configGroups);

      // Actualizar cada configuración secuencialmente
      for (const [configKey, value] of Object.entries(configGroups)) {
        console.log(`💾 Guardando ${configKey}:`, value);
        await updateConfigMutation.mutateAsync({ key: configKey, value });

        await new Promise(resolve => setTimeout(resolve, 100));
      }

      await queryClient.invalidateQueries('config');

      // Limpiar estados
      setHasPendingImages(false)
      setUploadedImageUrls({})
      setRemovedImages({})
      toast.success('¡Configuración guardada exitosamente!');

    } catch (error) {
      console.error('❌ Error guardando:', error);
      toast.error('Error al guardar la configuración');
    } finally {
      setIsSubmitting(false);
    }
  }

  const tabs = [
    { id: 'general', name: 'General', icon: Globe },
    { id: 'design', name: 'Diseño', icon: Palette },
    { id: 'social', name: 'Redes Sociales', icon: MessageCircle }
  ]

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <Loading size="large" text="Cargando configuración..." />
      </div>
    )
  }

  const siteConfig = config?.data || {}

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="bg-gradient-to-r from-primary via-primary/90 to-accent rounded-2xl p-8 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent"></div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-accent/10 rounded-full -translate-y-48 translate-x-48"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-32 -translate-x-32"></div>

          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-4 mb-4">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                    <Sparkles size={32} className="text-accent" />
                  </div>
                </div>
                <h1 className="text-5xl font-bold mb-2">⚙️ Configuración del Sitio</h1>
                <p className="text-xl text-white/80">
                  Personaliza la apariencia y configuración de tu plataforma de rifas
                </p>
              </div>
              <div className="hidden md:block">
                <div className="text-6xl opacity-30">🎯</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Tabs  */}
        <div className="mb-8">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <nav className="flex">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-6 px-8 border-b-4 font-bold text-lg flex items-center justify-center space-x-3 transition-all hover:bg-gray-50 ${activeTab === tab.id
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                  <tab.icon size={24} />
                  <span>{tab.name}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Tab General */}
          {activeTab === 'general' && (
            <div className="space-y-8">
              {/* Configuración del Hero */}
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 border-b border-gray-100">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                    <Sparkles className="mr-3 text-purple-600" size={28} />
                    Configuración del Hero
                  </h2>
                  <p className="text-gray-600 mt-1">Personaliza el texto principal y efectos de la página de inicio</p>
                </div>

                <div className="p-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Textos del Hero */}
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-4">📝 Textos Principales</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">
                            Texto Principal
                          </label>
                          <input
                            type="text"
                            {...register('hero_config.main_text')}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                            placeholder="¡GANA"
                          />
                          <p className="text-xs text-gray-500 mt-1">Aparece en la primera línea del hero</p>
                        </div>

                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">
                            Texto de Acento
                          </label>
                          <input
                            type="text"
                            {...register('hero_config.accent_text')}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                            placeholder="AHORA!"
                          />
                          <p className="text-xs text-gray-500 mt-1">Aparece en la segunda línea con efectos especiales</p>
                        </div>
                      </div>

                      {/*colores del texto del Hero */}
                      <div className="mt-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">🎨 Colores del Texto</h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                              Color del Texto Principal
                            </label>
                            <div className="flex items-center space-x-3">
                              <input
                                type="color"
                                onChange={(e) => handleHeroColorChange('main_text_color', e.target.value)}
                                defaultValue={siteConfig.hero_config?.main_text_color || '#FFFFFF'}
                                className="w-16 h-12 border-2 border-gray-300 rounded-lg cursor-pointer hover:border-primary transition-colors"
                              />
                              <input
                                type="text"
                                {...register('hero_config.main_text_color')}
                                className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all font-mono"
                                placeholder="#FFFFFF"
                                onChange={(e) => {
                                  setValue('hero_config.main_text_color', e.target.value);
                                }}
                              />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Color de la primera línea de texto</p>
                          </div>

                          <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                              Color del Texto de Acento
                            </label>
                            <div className="flex items-center space-x-3">
                              <input
                                type="color"
                                onChange={(e) => handleHeroColorChange('accent_text_color', e.target.value)}
                                defaultValue={siteConfig.hero_config?.accent_text_color || '#FFD700'}
                                className="w-16 h-12 border-2 border-gray-300 rounded-lg cursor-pointer hover:border-primary transition-colors"
                              />
                              <input
                                type="text"
                                {...register('hero_config.accent_text_color')}
                                className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all font-mono"
                                placeholder="#FFD700"
                                onChange={(e) => {
                                  setValue('hero_config.accent_text_color', e.target.value);
                                }}
                              />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Color de la segunda línea de texto (con efectos)</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Configuración de Partículas */}
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-4">✨ Efectos de Partículas</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">
                            Tipo de Partículas
                          </label>
                          <select
                            {...register('hero_config.particles_type')}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                          >
                            <optgroup label="✨ Sparkles & Brillos">
                              <option value="sparkles">✨ Destellos</option>
                              <option value="stars">⭐ Estrellas</option>
                              <option value="star_sparkles">💫 Estrellas Giratorias</option>
                              <option value="brightness">🔆 Destellos de Luz</option>
                            </optgroup>
                            <optgroup label="🚀 Velocidad & Energía">
                              <option value="rockets">🚀 Cohetes</option>
                              <option value="lightning">⚡ Rayos</option>
                              <option value="comet">☄️ Cometas</option>
                              <option value="explosion">💥 Explosiones</option>
                              <option value="fireworks">🎆 Fuegos Artificiales</option>
                              <option value="smoke">💨 Ráfagas</option>
                            </optgroup>
                            <optgroup label="🔥 Fuego & Calor">
                              <option value="fire">🔥 Fuego</option>
                              <option value="chili">🌶️ Chile Picante</option>
                              <option value="volcano">🌋 Volcanes</option>
                              <option value="sun">☀️ Soles</option>
                              <option value="hot_springs">♨️ Vapor Caliente</option>
                            </optgroup>
                            <optgroup label="💰 Dinero & Éxito">
                              <option value="money">💰 Bolsas de Dinero</option>
                              <option value="flying_money">💸 Dinero Volando</option>
                              <option value="diamonds">💎 Diamantes</option>
                              <option value="trophies">🏆 Trofeos</option>
                              <option value="hundred">💯 Cien Puntos</option>
                              <option value="party">🎉 Celebración</option>
                            </optgroup>
                            <optgroup label="🚗 Vehículos & Velocidad">
                              <option value="cars">🚗 Automóviles</option>
                              <option value="race_cars">🏎️ Carros de Carrera</option>
                              <option value="motorcycles">🏍️ Motocicletas</option>
                              <option value="trucks">🚛 Camiones</option>
                            </optgroup>
                          </select>
                          <p className="text-xs text-gray-500 mt-1">Selecciona el tipo de partículas animadas</p>
                        </div>

                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">
                            Cantidad de Partículas
                          </label>
                          <input
                            type="range"
                            min="10"
                            max="50"
                            step="5"
                            {...register('hero_config.particles_count')}
                            className="w-full"
                          />
                          <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>Pocas (10)</span>
                            <span>Moderadas (30)</span>
                            <span>Muchas (50)</span>
                          </div>
                        </div>
                      </div>

                      {/* Vista previa */}
                      <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                        <h4 className="text-sm font-bold text-gray-700 mb-2">Vista Previa</h4>
                        <div className="text-center p-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg text-white relative overflow-hidden">
                          <div className="text-2xl font-bold" style={{ color: watch('hero_config.main_text_color') || '#FFFFFF' }}>
                            {watch('hero_config.main_text') || '¡GANA'}
                          </div>
                          <div className="text-3xl font-black" style={{ color: watch('hero_config.accent_text_color') || '#FFD700' }}>
                            {watch('hero_config.accent_text') || 'AHORA!'}
                          </div>
                          {/* Ejemplo de partículas */}
                          <div className="absolute top-2 right-2 text-2xl animate-bounce">
                            {(() => {
                              const particleType = watch('hero_config.particles_type') || 'sparkles';
                              const particleMap = {
                                sparkles: '✨', stars: '⭐', star_sparkles: '💫', brightness: '🔆',
                                rockets: '🚀', lightning: '⚡', comet: '☄️', explosion: '💥',
                                fireworks: '🎆', smoke: '💨', fire: '🔥', chili: '🌶️',
                                volcano: '🌋', sun: '☀️', hot_springs: '♨️', money: '💰',
                                flying_money: '💸', diamonds: '💎', trophies: '🏆',
                                hundred: '💯', party: '🎉', cars: '🚗', race_cars: '🏎️',
                                motorcycles: '🏍️', trucks: '🚛'
                              };
                              return particleMap[particleType] || '✨';
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Información del sitio */}
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-6 border-b border-gray-100">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                    <Globe className="mr-3 text-indigo-600" size={28} />
                    Información del Sitio
                  </h2>
                  <p className="text-gray-600 mt-1">Configura el nombre y descripción de tu plataforma de rifas</p>
                </div>

                <div className="p-8">
                  <div className="grid grid-cols-1 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        🏷️ Nombre del Sitio/Rifa
                      </label>
                      <input
                        type="text"
                        {...register('site_info.site_name')}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                        placeholder="Ej: Rifas Premium 2024"
                      />
                      <p className="text-xs text-gray-500 mt-1">Este nombre aparecerá en el header y en el título de la página</p>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        📝 Tagline o Descripción Corta
                      </label>
                      <input
                        type="text"
                        {...register('site_info.tagline')}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                        placeholder="Ej: Tu oportunidad de ganar"
                      />
                      <p className="text-xs text-gray-500 mt-1">Texto opcional que aparece debajo del nombre del sitio</p>
                    </div>

                    {/* Vista previa del header */}
                    <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                      <h4 className="text-sm font-bold text-gray-700 mb-3">Vista Previa del Header</h4>
                      <div
                        className="p-4 rounded-lg transition-all duration-300"
                        style={{
                          backgroundColor: watch('site_colors.secondary') || '#F5F5DC',
                          borderBottom: `3px solid ${watch('site_colors.primary') || '#8B7355'}`
                        }}
                      >
                        <div className="flex items-center space-x-3">
                          {/* Logo o texto por defecto */}
                          <div
                            className="text-xl font-bold"
                            style={{ color: watch('site_colors.primary') || '#8B7355' }}
                          >
                            RIFAS
                          </div>

                          {/* Nombre del sitio */}
                          {watch('site_info.site_name') && (
                            <div>
                              <h1
                                className="text-lg font-bold"
                                style={{ color: watch('site_colors.primary') || '#8B7355' }}
                              >
                                {watch('site_info.site_name')}
                              </h1>
                              {watch('site_info.tagline') && (
                                <p
                                  className="text-xs opacity-75"
                                  style={{ color: watch('site_colors.primary') || '#8B7355' }}
                                >
                                  {watch('site_info.tagline')}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Imágenes del sitio */}
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-gray-100">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                    <Upload className="mr-3 text-blue-600" size={28} />
                    Imágenes del sitio
                  </h2>
                  <p className="text-gray-600 mt-1">Configura las imágenes principales de tu plataforma</p>
                </div>

                <div className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[
                      { key: 'logo', title: 'Logo del Header', desc: 'Aparece en la navegación principal' },
                      { key: 'banner', title: 'Imagen del Banner', desc: 'Fondo de la sección principal' },
                      { key: 'footer_logo', title: 'Logo del Footer', desc: 'Aparece en el pie de página' }
                    ].map(({ key, title, desc }) => (
                      <div key={key} className="group">
                        <label className="block text-sm font-bold text-gray-700 mb-3">
                          {title}
                        </label>
                        <p className="text-xs text-gray-500 mb-3">{desc}</p>

                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-primary transition-all group-hover:bg-gray-50">
                          {(imagesPreviews[`site_images.${key}`] ||
                            uploadedImageUrls[`site_images.${key}`] ||
                            (siteConfig.site_images?.[key] && !removedImages[`site_images.${key}`])) ? (
                            <div className="relative">
                              <img
                                src={
                                  imagesPreviews[`site_images.${key}`]
                                  || uploadedImageUrls[`site_images.${key}`]
                                  || (siteConfig.site_images?.[key]
                                    ? `${import.meta.env.VITE_BASE_URL}${siteConfig.site_images[key]}`
                                    : '')
                                }
                                alt={title}
                                className="w-full h-32 object-contain rounded-lg"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const uploadKey = `site_images.${key}`;

                                  setImagesPreviews(prev => {
                                    const newPreviews = { ...prev };
                                    delete newPreviews[uploadKey];
                                    return newPreviews;
                                  });

                                  setUploadedImageUrls(prev => {
                                    const newUrls = { ...prev };
                                    delete newUrls[uploadKey];
                                    return newUrls;
                                  });

                                  setRemovedImages(prev => ({
                                    ...prev,
                                    [uploadKey]: true
                                  }));

                                  setValue(`site_images.${key}`, '');
                                  setHasPendingImages(true);

                                  toast.info('Imagen marcada para eliminar. Haz clic en "Guardar Cambios"');
                                }}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors shadow-lg"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <div>
                              {uploadingImages[`site_images.${key}`] ? (
                                <Loading size="small" text="Subiendo..." />
                              ) : (
                                <>
                                  <Upload size={40} className="mx-auto mb-3 text-gray-400" />
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleImageUpload(e, 'site_images', key)}
                                    className="hidden"
                                    id={`${key}-upload`}
                                  />
                                  <label
                                    htmlFor={`${key}-upload`}
                                    className="cursor-pointer bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-6 py-3 rounded-xl font-bold hover:from-blue-600 hover:to-indigo-600 transition-all inline-block"
                                  >
                                    Subir {title}
                                  </label>
                                  <p className="text-xs text-gray-400 mt-2">PNG, JPG hasta 5MB</p>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                        <input
                          type="hidden"
                          {...register(`site_images.${key}`)}
                          value={
                            uploadedImageUrls[`site_images.${key}`]
                            || (siteConfig.site_images?.[key] && !removedImages[`site_images.${key}`]
                              ? `${import.meta.env.VITE_BASE_URL}${siteConfig.site_images[key]}`
                              : ''
                            )
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Información de contacto */}
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 border-b border-gray-100">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                    <Phone className="mr-3 text-green-600" size={28} />
                    Información de contacto
                  </h2>
                  <p className="text-gray-600 mt-1">Datos de contacto que aparecerán en tu sitio</p>
                </div>

                <div className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        📞 Teléfono principal
                      </label>
                      <input
                        type="text"
                        {...register('contact_info.phone')}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                        placeholder="+58 412 123 4567"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        📧 Email de contacto
                      </label>
                      <input
                        type="email"
                        {...register('contact_info.email')}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                        placeholder="contacto@rifas.com"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        📍 Dirección
                      </label>
                      <input
                        type="text"
                        {...register('contact_info.address')}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                        placeholder="Valencia, Carabobo, Venezuela"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Configuración de pagos principales */}
              {/* <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-6 border-b border-gray-100">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                    <Phone className="mr-3 text-yellow-600" size={28} />
                    Información de Pagos Principal
                  </h2>
                  <p className="text-gray-600 mt-1">Configuración principal de métodos de pago</p>
                </div>

                <div className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        💳 Número Pago Móvil
                      </label>
                      <input
                        type="text"
                        {...register('payment_info.pago_movil_number')}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                        placeholder="04125051356"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        🏦 Banco
                      </label>
                      <input
                        type="text"
                        {...register('payment_info.bank_name')}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                        placeholder="Banco de Venezuela"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        🆔 Cédula del Titular
                      </label>
                      <input
                        type="text"
                        {...register('payment_info.cedula')}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                        placeholder="19.260.444"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        👤 Nombre del Titular
                      </label>
                      <input
                        type="text"
                        {...register('payment_info.holder_name')}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                        placeholder="Cindy Vanessa Ortiz Hinojola"
                      />
                    </div>
                  </div>
                </div>
              </div> */}

              {/* Límites del sistema */}
              {/* <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 border-b border-gray-100">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                    <Building className="mr-3 text-purple-600" size={28} />
                    Configuración del sistema
                  </h2>
                  <p className="text-gray-600 mt-1">Límites y configuraciones generales</p>
                </div>

                <div className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        🎯 Máximo de rifas activas
                      </label>
                      <input
                        type="number"
                        min="1"
                        {...register('raffle_limits.max_active')}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        📚 Rifas finalizadas a mostrar
                      </label>
                      <input
                        type="number"
                        min="1"
                        {...register('raffle_limits.max_finished_display')}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div> */}

              {/* Configuración de emails automáticos */}
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 border-b border-gray-100">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                    <MessageCircle className="mr-3 text-green-600" size={28} />
                    Configuración de Emails Automáticos
                  </h2>
                  <p className="text-gray-600 mt-1">Configura el envío automático de emails y notificaciones</p>
                </div>

                <div className="p-8">
                  {/* Estado general de emails */}
                  <div className="mb-8">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">📧 Estado General</h3>
                    <div className="flex items-center space-x-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          {...register('email_settings.enabled')}
                          className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary focus:ring-2"
                        />
                        <span className="ml-2 text-sm font-medium text-gray-900">
                          Habilitar emails automáticos
                        </span>
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Cuando está deshabilitado, no se enviarán emails automáticos (útil para mantenimiento)
                    </p>
                  </div>

                  {/* Configuración del remitente */}
                  <div className="mb-8">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">👤 Información del Remitente</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                          📝 Nombre del remitente
                        </label>
                        <input
                          type="text"
                          {...register('email_settings.from_name')}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                          placeholder="Rifas Premium"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Nombre que aparecerá como remitente en los emails
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                          📧 Email del remitente
                        </label>
                        <input
                          type="email"
                          {...register('email_settings.from_email')}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                          placeholder="onboarding@resend.dev"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Debe ser un dominio verificado en Resend
                        </p>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                          📬 Email de respuesta (opcional)
                        </label>
                        <input
                          type="email"
                          {...register('email_settings.reply_to')}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                          placeholder="rifas@example.com"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Dirección donde llegarán las respuestas de los usuarios
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Tipos de emails habilitados */}
                  <div className="mb-8">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">🔔 Tipos de Emails Habilitados</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl border border-blue-200">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">📧</span>
                          <div>
                            <div className="font-semibold text-gray-900">Confirmación de Compra</div>
                            <div className="text-sm text-gray-600">Se envía inmediatamente al comprar boletos</div>
                          </div>
                        </div>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            {...register('email_settings.send_confirmation')}
                            className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary focus:ring-2"
                          />
                        </label>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-200">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">🔄</span>
                          <div>
                            <div className="font-semibold text-gray-900">Actualización de Estado</div>
                            <div className="text-sm text-gray-600">Se envía al aprobar o rechazar compras</div>
                          </div>
                        </div>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            {...register('email_settings.send_status_updates')}
                            className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary focus:ring-2"
                          />
                        </label>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">🎫</span>
                          <div>
                            <div className="font-semibold text-gray-900">Modificación de Boletos</div>
                            <div className="text-sm text-gray-600">Se envía al agregar o quitar boletos</div>
                          </div>
                        </div>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            {...register('email_settings.send_modifications')}
                            className="w-full w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary focus:ring-2"
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Estado de Resend */}
                  <div className="mb-8">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">📊 Estado del Servicio</h3>
                    <div className="bg-gray-50 rounded-xl p-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">✅</div>
                          <div className="text-sm font-medium text-gray-900">Resend API</div>
                          <div className="text-xs text-gray-500">Conectado</div>
                        </div>

                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">📧</div>
                          <div className="text-sm font-medium text-gray-900">Dominio</div>
                          <div className="text-xs text-gray-500">
                            {watch('email_settings.from_email') || 'No configurado'}
                          </div>
                        </div>

                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">🚀</div>
                          <div className="text-sm font-medium text-gray-900">Estado</div>
                          <div className="text-xs text-gray-500">
                            {watch('email_settings.enabled') ? 'Activo' : 'Inactivo'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Vista previa de email */}
                  <div className="mb-8">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">👀 Vista Previa</h3>
                    <div className="bg-gray-100 rounded-xl p-6">
                      <div className="bg-white rounded-lg p-4 shadow-sm border">
                        <div className="text-sm text-gray-600 mb-2">
                          <strong>De:</strong> {watch('email_settings.from_name') || 'Rifas Premium'} &lt;{watch('email_settings.from_email') || 'onboarding@resend.dev'}&gt;
                        </div>
                        <div className="text-sm text-gray-600 mb-2">
                          <strong>Para:</strong> cliente@ejemplo.com
                        </div>
                        {watch('email_settings.reply_to') && (
                          <div className="text-sm text-gray-600 mb-2">
                            <strong>Responder a:</strong> {watch('email_settings.reply_to')}
                          </div>
                        )}
                        <div className="text-sm text-gray-600 mb-4">
                          <strong>Asunto:</strong> 🎉 Compra Confirmada - {watch('site_info.site_name') || 'Rifas Premium'}
                        </div>
                        <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white p-4 rounded text-center text-sm">
                          <div className="font-bold">¡Compra Registrada Exitosamente!</div>
                          <div className="mt-2 opacity-90">Vista previa del diseño de email</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Información importante */}
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                    <h4 className="font-bold text-blue-900 mb-3">📝 Información Importante:</h4>
                    <ul className="text-sm text-blue-800 space-y-2">
                      <li>• <strong>Dominio verificado:</strong> Para enviar desde tu propio dominio, debes verificarlo en el dashboard de Resend</li>
                      <li>• <strong>Logs:</strong> Todos los emails enviados se registran automáticamente para seguimiento</li>
                      <li>• <strong>Errores:</strong> Si un email falla, se puede reenviar desde el panel de logs</li>
                      <li>• <strong>Personalización:</strong> Los emails usan automáticamente los colores y branding de tu sitio</li>
                    </ul>
                  </div>

                  {/* Botón de prueba de emails */}
                  <div className="mt-6">
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-6">
                      <h4 className="font-bold text-purple-900 mb-3 flex items-center">
                        <TestTube className="mr-2" size={20} />
                        🧪 Probar Configuración de Emails
                      </h4>
                      <p className="text-sm text-purple-800 mb-4">
                        Envía un email de prueba para verificar que la configuración esté funcionando correctamente.
                      </p>

                      <div className="flex items-center space-x-4">
                        <input
                          type="email"
                          value={testEmail}
                          onChange={(e) => setTestEmail(e.target.value)}
                          placeholder="tu@email.com"
                          className="flex-1 px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                        />

                        <select
                          value={testEmailType}
                          onChange={(e) => setTestEmailType(e.target.value)}
                          className="px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                        >
                          <option value="purchase_confirmation">📧 Confirmación</option>
                          <option value="status_update_approved">✅ Aprobado</option>
                          <option value="status_update_rejected">❌ Rechazado</option>
                          <option value="ticket_modification_add">➕ Agregar</option>
                          <option value="ticket_modification_remove">➖ Quitar</option>
                        </select>

                        <button
                          type="button"
                          onClick={handleSendTestEmail}
                          disabled={sendTestEmailMutation.isLoading || !testEmail.trim()}
                          className="bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-purple-700 transition-all disabled:opacity-50 flex items-center space-x-2 text-sm"
                        >
                          {sendTestEmailMutation.isLoading ? (
                            <Loading size="small" text="" />
                          ) : (
                            <Send size={16} />
                          )}
                          <span>{sendTestEmailMutation.isLoading ? 'Enviando...' : 'Enviar Prueba'}</span>
                        </button>
                      </div>

                      {testEmailResult && (
                        <div className={`mt-4 p-3 rounded-lg text-sm ${testEmailResult.success
                          ? 'bg-green-100 text-green-800 border border-green-200'
                          : 'bg-red-100 text-red-800 border border-red-200'
                          }`}>
                          {testEmailResult.success
                            ? '✅ Email de prueba enviado exitosamente!'
                            : `❌ Error: ${testEmailResult.error}`
                          }
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab Diseño */}
          {activeTab === 'design' && (
            <div className="space-y-8">
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 border-b border-gray-100">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                    <Palette className="mr-3 text-purple-600" size={28} />
                    Colores del sitio
                  </h2>
                  <p className="text-gray-600 mt-1">Personaliza la paleta de colores de tu plataforma</p>
                </div>

                <div className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[
                      { key: 'primary', title: 'Color Primario', desc: 'Color principal de la marca', default: '#8B7355' },
                      { key: 'secondary', title: 'Color Secundario', desc: 'Color complementario', default: '#F5F5DC' },
                      { key: 'accent', title: 'Color de Acento', desc: 'Para botones y destacados', default: '#FFD700' }
                    ].map(({ key, title, desc, default: defaultColor }) => (
                      <div key={key} className="group">
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                          {title}
                        </label>
                        <p className="text-xs text-gray-500 mb-3">{desc}</p>
                        <div className="flex items-center space-x-3">
                          <input
                            type="color"
                            onChange={(e) => handleColorChange(key, e.target.value)}
                            defaultValue={siteConfig.site_colors?.[key] || defaultColor}
                            className="w-16 h-12 border-2 border-gray-300 rounded-lg cursor-pointer hover:border-primary transition-colors"
                          />
                          <input
                            type="text"
                            {...register(`site_colors.${key}`)}
                            className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all font-mono"
                            placeholder={defaultColor}
                            onChange={(e) => {
                              setValue(`site_colors.${key}`, e.target.value);
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab Redes Sociales */}
          {activeTab === 'social' && (
            <div className="space-y-8">
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-6 border-b border-gray-100">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                    <MessageCircle className="mr-3 text-blue-600" size={28} />
                    Redes sociales
                  </h2>
                  <p className="text-gray-600 mt-1">Enlaces a tus redes sociales y canales de comunicación</p>
                </div>

                <div className="p-8">
                  <div className="space-y-6">
                    {[
                      { key: 'whatsapp', title: 'WhatsApp', placeholder: '584121234567', icon: '💬', desc: 'Solo número sin espacios ni símbolos' },
                      { key: 'instagram', title: 'Instagram', placeholder: 'https://instagram.com/usuario', icon: '📷', desc: 'URL completa del perfil' },
                      { key: 'facebook', title: 'Facebook', placeholder: 'https://facebook.com/pagina', icon: '📘', desc: 'URL completa de la página' },
                      { key: 'telegram', title: 'Telegram', placeholder: 'https://t.me/canal', icon: '✈️', desc: 'URL del canal o grupo' },
                      { key: 'tiktok', title: 'TikTok', placeholder: 'https://tiktok.com/@usuario', icon: '🎵', desc: 'URL del perfil' }
                    ].map(({ key, title, placeholder, icon, desc }) => (
                      <div key={key} className="group p-6 border-2 border-gray-100 rounded-xl hover:border-primary/30 transition-all bg-gradient-to-r from-gray-50 to-white">
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                          {icon} {title}
                        </label>
                        <p className="text-xs text-gray-500 mb-3">{desc}</p>
                        <input
                          type="text"
                          {...register(`social_media.${key}`)}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                          placeholder={placeholder}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Botón de guardar */}
          <div className="flex justify-end mt-8">
            {(hasPendingImages || Object.keys(removedImages).some(key => removedImages[key])) && (
              <div className="mr-4 flex items-center space-x-2 bg-orange-100 text-orange-800 px-4 py-2 rounded-xl">
                <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
                <span className="text-sm font-medium">
                  {Object.keys(removedImages).some(key => removedImages[key])
                    ? 'Cambios pendientes - Haz clic en Guardar'
                    : 'Imágenes subidas - Haz clic en Guardar'
                  }
                </span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-8 py-4 rounded-xl font-bold transition-all disabled:opacity-50 flex items-center space-x-3 shadow-lg hover:shadow-xl text-lg ${(hasPendingImages || Object.keys(removedImages).some(key => removedImages[key]))
                ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white animate-pulse'
                : 'bg-gradient-to-r from-primary to-accent text-white hover:from-primary/90 hover:to-accent/90'
                }`}
            >
              {isSubmitting ? (
                <>
                  <Loading size="small" text="" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save size={24} />
                  <span>
                    {(hasPendingImages || Object.keys(removedImages).some(key => removedImages[key]))
                      ? '¡GUARDAR CAMBIOS!'
                      : 'Guardar Cambios'
                    }
                  </span>
                  {(hasPendingImages || Object.keys(removedImages).some(key => removedImages[key])) &&
                    <span className="text-xl">⚠️</span>
                  }
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ConfigPage