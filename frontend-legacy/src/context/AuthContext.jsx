import React, { createContext, useContext, useState, useEffect } from 'react'
import { authAPI } from '../services/api'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log('🚀 AuthProvider initialized');
    const token = localStorage.getItem('token')
    if (token) {
      console.log('🎫 Token found in localStorage, verifying...');
      verifyToken()
    } else {
      console.log('❌ No token found in localStorage');
      setLoading(false)
    }
  }, [])

  const verifyToken = async () => {
    try {
      console.log('🔍 Verifying stored token...');
      const response = await authAPI.verifyToken()
      console.log('✅ Token valid, user authenticated:', response.data.user.username);
      setUser(response.data.user)
    } catch (error) {
      console.error('❌ Token verification failed:', error.response?.data || error.message);
      localStorage.removeItem('token')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const login = async (credentials) => {
    try {
      console.log('🔐 Starting login process...');
      const response = await authAPI.login(credentials)
      const { token, user } = response.data

      console.log('💾 Storing token and setting user...');
      localStorage.setItem('token', token)
      setUser(user)

      console.log('✅ Login process completed successfully for:', user.username);
      return response
    } catch (error) {
      console.error('❌ Login process failed:', error.response?.data || error.message);
      throw error
    }
  }

  const logout = () => {
    console.log('🚪 Logging out user...');
    localStorage.removeItem('token')
    setUser(null)
    console.log('✅ User logged out successfully');
  }

  const contextValue = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user
  }

  console.log('🔄 AuthContext state:', {
    hasUser: !!user,
    loading,
    isAuthenticated: !!user,
    username: user?.username
  });

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}