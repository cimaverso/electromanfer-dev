import { useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import './Header.css'

const PAGE_TITLES = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Resumen general del sistema' },
  '/productos': { title: 'Productos', subtitle: 'Busca y agrega productos a cotización' },
  '/cotizaciones': { title: 'Cotizaciones', subtitle: 'Gestiona y genera cotizaciones' },
}

export default function Header({ collapsed }) {
  const location = useLocation()
  const { user } = useAuth()

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
        <div className="header__titles">
          <h1 className="header__title">{current.title}</h1>
          <p className="header__subtitle">{current.subtitle}</p>
        </div>
      </div>

      <div className="header__right">
        <span className="header__date">{dateStr}</span>

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