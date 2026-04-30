import { createContext, useState, useEffect, useCallback } from 'react'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [authError, setAuthError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('access_token')
      const storedUser = localStorage.getItem('user')
      if (storedToken && storedUser) {
        setToken(storedToken)
        setUser(JSON.parse(storedUser))
      }
    } catch {
      localStorage.removeItem('access_token')
      localStorage.removeItem('user')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const login = useCallback((accessToken, userData) => {
    localStorage.setItem('access_token', accessToken)
    localStorage.setItem('user', JSON.stringify(userData))
    setToken(accessToken)
    setUser(userData)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
  }, [])

  const clearAuthError = useCallback(() => setAuthError(null), [])

  const value = {
    user,
    token,
    isAuthenticated: !!token,
    isLoading,
    authError,
    setAuthError,
    isSubmitting,
    setIsSubmitting,
    clearAuthError,
    login,
    logout,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}