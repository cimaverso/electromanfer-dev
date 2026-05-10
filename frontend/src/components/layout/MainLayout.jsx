import { useState, useEffect, createContext, useContext } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import './MainLayout.css'

// ─── Mismo evento que Sidebar usa para sincronizar collapse ───
const SIDEBAR_EVENT = 'sidebar:toggle'

// ─── Theme Context — accesible desde cualquier componente hijo ───
export const ThemeContext = createContext({
  theme: 'dark',
  toggleTheme: () => {},
})
export const useTheme = () => useContext(ThemeContext)

export default function MainLayout({ children }) {
  // ── Collapsed sidebar ──
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebar_collapsed') === 'true' } catch { return false }
  })

  // ── Mobile sidebar open/close ──
  const [mobileOpen, setMobileOpen] = useState(false)

  // ── Tema dark / light ──
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('app_theme') || 'dark' } catch { return 'dark' }
  })

  // Aplica el tema al <html> como data-theme attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('app_theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))

  // Escucha el evento de colapso del Sidebar
  useEffect(() => {
    const handler = (e) => setCollapsed(e.detail.collapsed)
    window.addEventListener(SIDEBAR_EVENT, handler)
    return () => window.removeEventListener(SIDEBAR_EVENT, handler)
  }, [])

  // Cierra sidebar mobile al cambiar de ruta (escucha popstate + custom event)
  useEffect(() => {
    const close = () => setMobileOpen(false)
    window.addEventListener('sidebar:close-mobile', close)
    return () => window.removeEventListener('sidebar:close-mobile', close)
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <div className="main-layout">
        <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />

        {/* Overlay mobile — toca fuera y cierra */}
        {mobileOpen && (
          <div
            className="main-layout__overlay"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
        )}

        <div className={`main-layout__content ${collapsed ? 'main-layout__content--collapsed' : ''}`}>
          <Header
            collapsed={collapsed}
            onMenuToggle={() => setMobileOpen((v) => !v)}
          />

          <main className="main-layout__main">
            {children}
          </main>
        </div>
      </div>
    </ThemeContext.Provider>
  )
}