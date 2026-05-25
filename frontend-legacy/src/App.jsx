import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Secondhome from './pages/Secondhome'
import RaffleDetails from './pages/RaffleDetails'
import Login from './pages/Login'
import AdminLayout from './pages/AdminLayout'
import ProtectedRoute from './components/common/ProtectedRoute'
import { useInAppBrowserRedirect } from './hooks/useInAppBrowserRedirect'

function App() {
  useInAppBrowserRedirect({
    redirectDelay: 1500,
    useDefaultAndroidBrowser: true
  })

  return (
    <Routes>
      {/* Rutas públicas */}
      <Route path="/" element={<Home />} />
      <Route path="/Secondhome" element={<Secondhome />} />
      <Route path="/raffle/:id" element={<RaffleDetails />} />
      <Route path="/login" element={<Login />} />

      {/* Rutas protegidas del admin - TODAS las rutas /admin/* van aquí */}
      <Route path="/admin/*" element={
        <ProtectedRoute>
          <AdminLayout />
        </ProtectedRoute>
      } />
    </Routes>
  )
}

export default App