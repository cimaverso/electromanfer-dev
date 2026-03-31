import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import './Sidebar.css'

const NAV_ITEMS = [
  {
    path: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    path: '/productos',
    label: 'Productos',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
  },
  {
    path: '/cotizaciones',
    label: 'Cotizaciones',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
]

// Evento custom para sincronizar estado sin polling
const SIDEBAR_EVENT = 'sidebar:toggle'

export default function Sidebar() {
  const navigate = useNavigate()
  const { user, handleLogout } = useAuth()

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('sidebar_collapsed') === 'true'
    } catch {
      return false
    }
  })

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem('sidebar_collapsed', String(next))
      // Dispara evento custom para que MainLayout reaccione instantáneamente
      window.dispatchEvent(new CustomEvent(SIDEBAR_EVENT, { detail: { collapsed: next } }))
      return next
    })
  }

  const onLogout = () => {
    handleLogout()
    navigate('/login', { replace: true })
  }

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>

      {/* ── Logo ── */}
      <div className="sidebar__logo">
        {collapsed ? (
          /* Colapsado: solo el ícono/inicial del logo */
          <img
            src="/logo_electromanfer.svg"
            alt="Electromanfer"
            className="sidebar__logo-img sidebar__logo-img--collapsed"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
              e.currentTarget.nextSibling && (e.currentTarget.nextSibling.style.display = 'flex')
            }}
          />
        ) : (
          /* Expandido: logo completo con letras */
          <img
            src="/logo_completo.png"
            alt="Electromanfer"
            className="sidebar__logo-img"
            onError={(e) => {
              // Fallback: texto si la imagen no carga
              e.currentTarget.style.display = 'none'
            }}
          />
        )}

        {/* Fallback texto (si ambas imágenes fallan) */}
        {!collapsed && (
          <div className="sidebar__logo-text" style={{ display: 'none' }}>
            <span className="sidebar__logo-name">ELECTROMANFER</span>
            <span className="sidebar__logo-sub">Panel Admin</span>
          </div>
        )}
      </div>

      {/* ── Navegación ── */}
      <nav className="sidebar__nav">
        <ul className="sidebar__nav-list">
          {NAV_ITEMS.map((item) => (
            <li key={item.path} className="sidebar__nav-item">
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `sidebar__nav-link ${isActive ? 'sidebar__nav-link--active' : ''}`
                }
              >
                <span className="sidebar__nav-icon">{item.icon}</span>
                {!collapsed && (
                  <span className="sidebar__nav-label">{item.label}</span>
                )}
                {collapsed && (
                  <span className="sidebar__tooltip">{item.label}</span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* ── Footer: usuario + logout ── */}
      <div className="sidebar__footer">
        <div className="sidebar__user" title={collapsed ? (user?.usuario || 'Usuario') : undefined}>
          <div className="sidebar__user-avatar">
            {user?.usuario?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          {!collapsed && (
            <div className="sidebar__user-info">
              <span className="sidebar__user-name">{user?.usuario || 'Usuario'}</span>
              <span className="sidebar__user-role">{user?.rol || 'Asesor'}</span>
            </div>
          )}
          {collapsed && (
            <span className="sidebar__tooltip">{user?.usuario || 'Usuario'}</span>
          )}
        </div>

        <button
          className="sidebar__logout"
          onClick={onLogout}
          title={collapsed ? 'Cerrar sesión' : undefined}
        >
          <span className="sidebar__nav-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </span>
          {!collapsed && (
            <span className="sidebar__nav-label">Cerrar sesión</span>
          )}
          {collapsed && (
            <span className="sidebar__tooltip">Cerrar sesión</span>
          )}
        </button>
      </div>

      {/* ── Botón colapsar ── */}
      <button
        className="sidebar__toggle"
        onClick={toggleCollapsed}
        aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
        title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`sidebar__toggle-icon ${collapsed ? 'sidebar__toggle-icon--rotated' : ''}`}
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
    </aside>
  )
}