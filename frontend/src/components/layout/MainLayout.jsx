import { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import './MainLayout.css'

export default function MainLayout({ children }) {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('sidebar_collapsed') === 'true'
    } catch {
      return false
    }
  })

  // Escucha cambios en localStorage para sincronizar
  // cuando Sidebar actualiza el estado de colapso
  useEffect(() => {
    const handleStorage = () => {
      const val = localStorage.getItem('sidebar_collapsed') === 'true'
      setCollapsed(val)
    }

    // Polling liviano: revisa cada 100ms si cambió
    // Es más simple que un evento custom y funciona en Windows
    const interval = setInterval(handleStorage, 100)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="main-layout">
      <Sidebar />

      <div
        className={`main-layout__content ${collapsed ? 'main-layout__content--collapsed' : ''}`}
      >
        <Header collapsed={collapsed} />

        <main className="main-layout__main">
          {children}
        </main>
      </div>
    </div>
  )
}