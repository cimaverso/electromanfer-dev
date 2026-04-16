import { useContext, useState } from 'react'
import { AuthContext } from '../context/AuthContext'
import { loginRequest, logoutRequest } from '../api/authApi'


export function useAuth() {
  const context = useContext(AuthContext)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [authError, setAuthError] = useState(null)

  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider')
  }

  const handleLogin = async (email, password) => {
    setIsSubmitting(true)
    setAuthError(null)

    try {
      // ── CONEXIÓN REAL CON EL BACKEND ──
      const data = await loginRequest(email, password)

      // data contiene: { access_token, token_type, user } según tu JSDoc
      context.login(data.access_token, data.user)

      setIsSubmitting(false)
      return { success: true }

    } catch (error) {
      // Manejo de errores basado en la respuesta de Axios
      const message = error.response?.data?.detail
        || 'Error de conexión. Inténtalo más tarde.'

      setAuthError(message)
      setIsSubmitting(false)
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
    isSubmitting,
    authError,
    handleLogin,
    handleLogout,
    clearAuthError: () => setAuthError(null),
  }
}