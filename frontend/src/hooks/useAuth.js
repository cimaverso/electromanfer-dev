import { useContext, useState } from 'react'
import { AuthContext } from '../context/AuthContext'
import { loginRequest } from '../api/authApi'

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

    // ── MOCK TEMPORAL — eliminar cuando FastAPI esté listo ──
    await new Promise((r) => setTimeout(r, 800))

    if (email === 'admin@electromanfer.com' && password === 'admin123') {
      context.login('mock-token-temporal', {
        id: 1,
        nombre: 'Alejandro González',
        email: 'admin@electromanfer.com',
        rol: 'administrador',
      })
      setIsSubmitting(false)
      return { success: true }
    }

    setAuthError('Credenciales incorrectas. Verifica e intenta de nuevo.')
    setIsSubmitting(false)
    return { success: false }
    // ── FIN MOCK ──
  }

  const handleLogout = () => {
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