import { useState, useEffect, useRef } from 'react'
import { useWhatsapp } from '../../hooks/useWhatsapp'
import './SeleccionarChatModal.css'

function iniciales(nombre = '') {
  return nombre.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
}

function formatFecha(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const hoy = new Date()
  const ayer = new Date(hoy)
  ayer.setDate(hoy.getDate() - 1)
  if (d.toDateString() === hoy.toDateString())
    return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
  if (d.toDateString() === ayer.toDateString()) return 'Ayer'
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
}

// ─── Modal: seleccionar chat existente para enviar un adjunto ────────────────
// onSeleccionar: (chat) => void — el padre decide qué enviar y cómo
export default function SeleccionarChatModal({ onSeleccionar, onClose, titulo = 'Enviar por WhatsApp' }) {
  const { chats, loadingChats, cargarChats } = useWhatsapp()
  const [query, setQuery] = useState('')
  const timeoutRef = useRef(null)
  const primerRender = useRef(true)

  useEffect(() => { cargarChats() }, []) // eslint-disable-line

  useEffect(() => {
    if (primerRender.current) { primerRender.current = false; return }
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      cargarChats(query ? { q: query } : {})
    }, 400)
    return () => clearTimeout(timeoutRef.current)
  }, [query]) // eslint-disable-line

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="scm-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="scm-modal">
        <div className="scm-modal__header">
          <span className="scm-modal__title">{titulo}</span>
          <button className="scm-close" onClick={onClose} type="button" aria-label="Cerrar">✕</button>
        </div>
        <input
          className="scm-search"
          placeholder="Buscar chat por nombre o teléfono..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <div className="scm-lista">
          {loadingChats ? (
            <div className="scm-lista__empty">Cargando chats...</div>
          ) : chats.length === 0 ? (
            <div className="scm-lista__empty">Sin conversaciones</div>
          ) : (
            chats.map((chat) => (
              <div key={chat.id} className="scm-chat-item" onClick={() => onSeleccionar(chat)}>
                <div className="scm-avatar">{iniciales(chat.nombre)}</div>
                <div className="scm-chat-item__body">
                  <div className="scm-chat-item__row">
                    <span className="scm-chat-item__nombre">{chat.nombre}</span>
                    <span className="scm-chat-item__fecha">{formatFecha(chat.fecha)}</span>
                  </div>
                  <span className="scm-chat-item__telefono">{chat.telefono}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
