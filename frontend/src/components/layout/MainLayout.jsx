import { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import './MainLayout.css'

// Mismo nombre de evento que en Sidebar.jsx
const SIDEBAR_EVENT = 'sidebar:toggle'

export default function MainLayout({ children }) {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('sidebar_collapsed') === 'true'
    } catch {
      return false
    }
  })

  useEffect(() => {
    // Escucha el evento custom disparado por Sidebar al togglear
    // Cero delay, cero polling, sincronizado al frame
    const handler = (e) => setCollapsed(e.detail.collapsed)
    window.addEventListener(SIDEBAR_EVENT, handler)
    return () => window.removeEventListener(SIDEBAR_EVENT, handler)
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