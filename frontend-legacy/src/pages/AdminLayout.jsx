import React, { useState } from 'react'
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom'
import { useQuery } from 'react-query'
import {
  LayoutDashboard,
  Calendar,
  BarChart3,
  Plus,
  Settings,
  LogOut,
  Menu,
  X,
  Moon,
  Sun,
  User,
  Shield,
  Ticket,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { configAPI } from '../services/api'
import usePageTitle from '../hooks/usePageTitle'

import Dashboard from '../components/admin/Dashboard'
import RaffleHistory from '../components/admin/RaffleHistory'
import TicketsSold from '../components/admin/TicketsSold'
import CreateRaffle from '../components/admin/CreateRaffle'
import ConfigPage from '../components/admin/ConfigPage'
import SalesAnalyticsDashboard from '../components/admin/SalesTable'
import EditRaffle from '../components/admin/EditRaffle'

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const { user, logout } = useAuth()
  const location = useLocation()

  const { data: config } = useQuery('config', configAPI.getAll)
  const siteName = config?.data?.site_info?.site_name || 'Panel Admin'

  // rutas
  const navigation = [
    {
      name: 'Dashboard',
      href: '/admin',
      icon: LayoutDashboard,
      current: location.pathname === '/admin',
      description: 'Resumen general',
      color: 'from-blue-500 to-blue-600',
    },
    {
      name: 'Mis Rifas',
      href: '/admin/raffles',
      icon: Calendar,
      current:
        location.pathname === '/admin/raffles' ||
        location.pathname.startsWith('/admin/edit'),
      description: 'Gestionar rifas',
      color: 'from-purple-500 to-purple-600',
    },
    {
      name: 'Análisis de Ventas',
      href: '/admin/analytics',
      icon: BarChart3,
      current: location.pathname === '/admin/analytics',
      description: 'Estadísticas y métricas',
      color: 'from-green-500 to-green-600',
    },
    {
      name: 'Boletos Vendidos',
      href: '/admin/tickets',
      icon: Ticket,
      current: location.pathname === '/admin/tickets',
      description: 'Ver boletos',
      color: 'from-orange-500 to-orange-600',
    },
    {
      name: 'Nueva Rifa',
      href: '/admin/create',
      icon: Plus,
      current: location.pathname === '/admin/create',
      description: 'Crear nueva',
      color: 'from-indigo-500 to-indigo-600',
    },
    {
      name: 'Configuración',
      href: '/admin/config',
      icon: Settings,
      current: location.pathname === '/admin/config',
      description: 'Ajustes del sitio',
      color: 'from-gray-500 to-gray-600',
    },
  ]

  const getCurrentPageTitle = () => {
    const current = navigation.find((nav) => nav.current)
    return current ? current.name : siteName
  }

  usePageTitle(getCurrentPageTitle())

  const handleLogout = () => {
    logout()
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'dark' : ''}`}>
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        {/* Sidebar móvil */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white dark:bg-gray-800 shadow-2xl">
              <div className="absolute top-0 right-0 -mr-12 pt-2">
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="ml-1 flex items-center justify-center h-10 w-10 rounded-full bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 transition-all"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
                {/* Logo móvil */}
                <div className="flex-shrink-0 flex items-center px-4 mb-8">
                  <div className="bg-gradient-to-r from-primary to-accent p-3 rounded-xl">
                    <Shield className="h-8 w-8 text-white" />
                  </div>
                  <div className="ml-3">
                    <div className="text-xl font-bold text-gray-900 dark:text-white">
                      {siteName}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Gestión de rifas
                    </div>
                  </div>
                </div>
                <nav className="px-2 space-y-2">
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all ${item.current
                        ? `bg-gradient-to-r ${item.color} text-white shadow-lg`
                        : 'text-gray-600 hover:bg-white hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 hover:shadow-md'
                        }`}
                    >
                      <item.icon className="mr-3 h-5 w-5" />
                      <div>
                        <div>{item.name}</div>
                        <div className="text-xs opacity-70">
                          {item.description}
                        </div>
                      </div>
                    </Link>
                  ))}
                </nav>
              </div>
            </div>
          </div>
        )}

        {/* Sidebar desktop */}
        {sidebarOpen && (
          <div className="hidden lg:flex lg:w-80 lg:flex-col lg:fixed lg:inset-y-0 lg:z-40">
            <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-gray-800 shadow-xl border-r border-gray-200 dark:border-gray-700">
              <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
                {/* Logo desktop */}
                <div className="flex items-center flex-shrink-0 px-6 mb-8">
                  <div className="bg-gradient-to-r from-primary to-accent p-3 rounded-xl">
                    <Shield className="h-8 w-8 text-white" />
                  </div>
                  <div className="ml-3">
                    <div className="text-xl font-bold text-gray-900 dark:text-white">
                      {siteName}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Gestión de rifas
                    </div>
                  </div>
                </div>
                <nav className="flex-1 px-3 space-y-2">
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`group flex items-center px-4 py-4 text-sm font-medium rounded-xl transition-all hover:scale-105 ${item.current
                        ? `bg-gradient-to-r ${item.color} text-white shadow-lg transform scale-105`
                        : 'text-gray-600 hover:bg-white hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 hover:shadow-md'
                        }`}
                    >
                      <div
                        className={`p-2 rounded-lg mr-3 ${item.current
                          ? 'bg-white/20'
                          : 'bg-gray-100 dark:bg-gray-600 group-hover:bg-primary/10'
                          }`}
                      >
                        <item.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-semibold">{item.name}</div>
                        <div className="text-xs opacity-70">
                          {item.description}
                        </div>
                      </div>
                    </Link>
                  ))}
                </nav>
              </div>
              {/* Usuario y acciones */}
              <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 p-4">
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-xl p-4">
                  <div className="flex items-center">
                    <div className="bg-gradient-to-r from-primary to-accent p-2 rounded-lg">
                      <User className="h-5 w-5 text-white" />
                    </div>
                    <div className="ml-3 flex-1">
                      <div className="text-sm font-bold text-gray-900 dark:text-white">
                        {user?.username}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                        {user?.role}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setDarkMode(!darkMode)}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-all"
                        title={darkMode ? 'Modo claro' : 'Modo oscuro'}
                      >
                        {darkMode ? <Sun size={16} /> : <Moon size={16} />}
                      </button>
                      <button
                        onClick={handleLogout}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                        title="Cerrar sesión"
                      >
                        <LogOut size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Contenido principal */}
        <div
          className={`flex flex-col flex-1 transition-all ${sidebarOpen ? 'lg:pl-80' : 'lg:pl-0'
            }`}
        >
          {/* Header móvil */}
          <div className="lg:hidden sticky top-0 z-30">
            <div className="flex items-center justify-between bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 shadow-sm">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
              >
                <Menu size={24} />
              </button>
              <div className="flex items-center space-x-2">
                <div className="bg-gradient-to-r from-primary to-accent p-2 rounded-lg">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                    {getCurrentPageTitle()}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
                >
                  {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                </button>
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                >
                  <LogOut size={20} />
                </button>
              </div>
            </div>
          </div>

          {/* Header desktop */}
          <div className="hidden lg:block sticky top-0 z-30 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100 rounded-lg transition"
                >
                  {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {getCurrentPageTitle()}
                  </h1>
                  <div className="flex items-center mt-1 text-sm text-gray-500 dark:text-gray-400">
                    <span>{siteName}</span>
                    <span className="mx-2">/</span>
                    <span className="text-gray-900 dark:text-white font-medium">
                      {navigation.find((nav) => nav.current)?.description ||
                        'Página actual'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                    Sistema activo
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Rutas internas */}
          <main className="flex-1 p-6">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/raffles" element={<RaffleHistory />} />
              <Route path="/edit/:id" element={<EditRaffle />} />
              <Route path="/analytics" element={<SalesAnalyticsDashboard />} />
              <Route path="/tickets" element={<TicketsSold />} />
              <Route path="/create" element={<CreateRaffle />} />
              <Route path="/config" element={<ConfigPage />} />
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  )
}

export default AdminLayout