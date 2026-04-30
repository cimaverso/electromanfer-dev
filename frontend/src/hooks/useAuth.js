import { useContext } from 'react'
import { AuthContext } from '../context/AuthContext'
import { loginRequest, logoutRequest } from '../api/authApi'

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider')
  }

  const handleLogin = async (email, password) => {
    context.setIsSubmitting(true)
    context.setAuthError(null)

    try {
      const data = await loginRequest(email, password)
      context.login(data.access_token, data.user)
      context.setIsSubmitting(false)
      return { success: true }
    } catch (error) {
      const message = error.response?.data?.detail || 'Error de conexión. Inténtalo más tarde.'
      context.setAuthError(message)
      context.setIsSubmitting(false)
      return { success: false }
    }
  }

  const handleLogout = async () => {
    try {
      await logoutRequest()
    } catch (e) {
      console.log('logout error:', e)
    }
    context.logout()
  }

  return {
    user: context.user,
    token: context.token,
    isAuthenticated: context.isAuthenticated,
    isLoading: context.isLoading,
    isSubmitting: context.isSubmitting,
    authError: context.authError,
    handleLogin,
    handleLogout,
    clearAuthError: context.clearAuthError,
  }
}