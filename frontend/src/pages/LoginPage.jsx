import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import './LoginPage.css'

export default function LoginPage() {
  const navigate = useNavigate()
  const { handleLogin, isAuthenticated, isSubmitting, authError, clearAuthError } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true })
    }
  }, [isAuthenticated, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) return
    const result = await handleLogin(email.trim(), password)
    if (result.success) {
      navigate('/dashboard', { replace: true })
    }
  }

  const handleEmailChange = (e) => {
    clearAuthError()
    setEmail(e.target.value)
  }

  const handlePasswordChange = (e) => {
    clearAuthError()
    setPassword(e.target.value)
  }

  return (
    <div className="login-page">
      <div className="login-page__bg">
        <div className="login-page__bg-orb login-page__bg-orb--1" />
        <div className="login-page__bg-orb login-page__bg-orb--2" />
      </div>

      <div className="login-page__container">
        {/* Panel izquierdo — branding */}
        <div className="login-page__brand">
          <div className="login-page__brand-content">

            {/* Logo imagen — letras negras, fondo claro del panel */}
            <div className="login-page__logo-wrapper">
              <img
                src="/logo_completo.png"
                alt="Electromanfer"
                className="login-page__logo-img"
                onError={(e) => {
                  // Fallback si la imagen no carga
                  e.currentTarget.style.display = 'none'
                  document.getElementById('login-logo-fallback').style.display = 'block'
                }}
              />
              <span
                id="login-logo-fallback"
                className="login-page__logo-fallback"
                style={{ display: 'none' }}
              >
                ⚡
              </span>
            </div>

            <p className="login-page__brand-subtitle">La Tienda Ambiental</p>
            <div className="login-page__brand-divider" />
            <p className="login-page__brand-desc">
              Panel administrativo para gestión de productos, cotizaciones y seguimiento comercial.
            </p>
            <div className="login-page__brand-features">
              <div className="login-page__feature">
                <span className="login-page__feature-dot" />
                Cotizaciones en menos de 2 minutos
              </div>
              <div className="login-page__feature">
                <span className="login-page__feature-dot" />
                Catálogo de productos centralizado
              </div>
              <div className="login-page__feature">
                <span className="login-page__feature-dot" />
                Historial y trazabilidad completa
              </div>
            </div>
          </div>
        </div>

        {/* Panel derecho — formulario */}
        <div className="login-page__form-panel">
          <div className="login-page__form-card">
            <div className="login-page__form-header">
              <h2 className="login-page__form-title">Bienvenido</h2>
              <p className="login-page__form-subtitle">
                Ingresa tus credenciales para continuar
              </p>
            </div>

            <form className="login-page__form" onSubmit={handleSubmit} noValidate>
              {authError && (
                <div className="login-page__error" role="alert">
                  <span className="login-page__error-icon">⚠</span>
                  <span>{authError}</span>
                </div>
              )}

              <div className="login-page__field">
                <label className="login-page__label" htmlFor="login-email">
                  Correo electrónico
                </label>
                <div className="login-page__input-wrapper">
                  <span className="login-page__input-icon">✉</span>
                  <input
                    id="login-email"
                    type="email"
                    className="login-page__input"
                    placeholder="usuario@electromanfer.com"
                    value={email}
                    onChange={handleEmailChange}
                    disabled={isSubmitting}
                    autoComplete="email"
                    autoFocus
                    required
                  />
                </div>
              </div>

              <div className="login-page__field">
                <label className="login-page__label" htmlFor="login-password">
                  Contraseña
                </label>
                <div className="login-page__input-wrapper">
                  <span className="login-page__input-icon">🔒</span>
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    className="login-page__input login-page__input--password"
                    placeholder="••••••••"
                    value={password}
                    onChange={handlePasswordChange}
                    disabled={isSubmitting}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className="login-page__toggle-password"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? '🙈' : '👁'}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="login-page__submit"
                disabled={isSubmitting || !email.trim() || !password.trim()}
              >
                {isSubmitting ? (
                  <span className="login-page__submit-loading">
                    <span className="login-page__spinner" />
                    Verificando...
                  </span>
                ) : (
                  'Ingresar al sistema'
                )}
              </button>
            </form>

            <p className="login-page__footer">
              ELECTROMANFER © {new Date().getFullYear()} · Sistema Administrativo
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}