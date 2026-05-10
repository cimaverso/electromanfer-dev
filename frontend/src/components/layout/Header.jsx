import { useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from './MainLayout'
import './Header.css'

const PAGE_TITLES = {
  '/dashboard':    { title: 'Dashboard',    subtitle: 'Resumen general del sistema' },
  '/productos':    { title: 'Productos',    subtitle: 'Busca y agrega productos a cotización' },
  '/cotizaciones': { title: 'Cotizaciones', subtitle: 'Gestiona y genera cotizaciones' },
}

// ─── Icono Sol (light mode) ───
function IconSun() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1"  x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22"  x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1"  y1="12" x2="3"  y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  )
}

// ─── Icono Luna (dark mode) ───
function IconMoon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

// ─── Icono Hamburguesa ───
function IconMenu() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
      <line x1="3" y1="6"  x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}

export default function Header({ collapsed, onMenuToggle }) {
  const location = useLocation()
  const { user } = useAuth()
  const { theme, toggleTheme } = useTheme()

  const current = PAGE_TITLES[location.pathname] || {
    title: 'ELECTROMANFER',
    subtitle: 'Panel administrativo',
  }

  const now = new Date()
  const dateStr = now.toLocaleDateString('es-CO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <header
      className="header"
      style={{
        left: collapsed
          ? 'var(--sidebar-width-closed)'
          : 'var(--sidebar-width-open)',
      }}
    >
      <div className="header__left">
        {/* Hamburguesa — solo visible en mobile */}
        <button
          className="header__menu-btn"
          onClick={onMenuToggle}
          aria-label="Abrir menú"
        >
          <IconMenu />
        </button>

        <div className="header__titles">
          <h1 className="header__title">{current.title}</h1>
          <p className="header__subtitle">{current.subtitle}</p>
        </div>
      </div>

      <div className="header__right">
        <span className="header__date">{dateStr}</span>

        {/* Toggle dark / light */}
        <button
          className="header__theme-btn"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
        >
          {theme === 'dark' ? <IconSun /> : <IconMoon />}
        </button>

        {/* Chip usuario */}
        <div className="header__user-chip">
          <div className="header__user-avatar">
            {user?.usuario?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <span className="header__user-name">{user?.usuario || 'Usuario'}</span>
        </div>
      </div>
    </header>
  )
}