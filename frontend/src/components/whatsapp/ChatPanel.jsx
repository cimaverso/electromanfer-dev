import { useState, useEffect, useRef } from 'react'
import axiosClient from '../../api/axiosClient'
import { useWhatsapp } from '../../hooks/useWhatsapp'
import ModalCotizacionBuzon from '../cotizaciones/Buzon/ModalCotizacionBuzon'
import ModalGuiaBuzon from '../cotizaciones/Buzon/ModalGuiaBuzon'
import { buildTextoGuia } from '../../utils/guiaMensajes'
import './ChatPanel.css'

// ─── Helpers ──────────────────────────────────────────────────────────────────
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

// ─── Iconos ───────────────────────────────────────────────────────────────────
function IconChat() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg> }
function IconAdjuntar() { return <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 8V5a4 4 0 118 0v6a2 2 0 01-4 0V6" /></svg> }
function IconAtras() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg> }
function IconEnviar() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg> }
function IconCotizacion() { return <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="12" height="12" rx="2" /><path d="M5 8h6M5 5h4M5 11h3" /></svg> }
function IconGuia() { return <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2L2 9l5 1 1 5 6-13z" /><path d="M8 8l4-4" /></svg> }
function IconAudio() { return <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="6" y="1" width="4" height="8" rx="2" /><path d="M3 7a5 5 0 0 0 10 0" /><line x1="8" y1="12" x2="8" y2="15" /></svg> }
function IconDots() { return <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><circle cx="8" cy="3" r="1.4" /><circle cx="8" cy="8" r="1.4" /><circle cx="8" cy="13" r="1.4" /></svg> }
function IconPin() { return <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 2l5 5-3 1-3 3-1 3-3-3-3 3v-2l3-3-3-3 3-1 1-3z" /></svg> }
function IconMute() { return <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 6h3l4-3v10l-4-3H2z" /><line x1="11" y1="5" x2="15" y2="11" /><line x1="15" y1="5" x2="11" y2="11" /></svg> }
function IconEraser() { return <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 2l3 3-7 7H4l-2-2z" /><path d="M7 12h6" /></svg> }
function IconTrash() { return <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 4h12" /><path d="M5 4V2h6v2" /><path d="M4 4l1 10h6l1-10" /></svg> }

// ─── Item de la lista de chats ─────────────────────────────────────────────────
function ChatItem({ chat, activo, onClick }) {
  return (
    <div
      className={['wap-chat-item', activo ? 'wap-chat-item--activo' : '', chat.no_leidos > 0 ? 'wap-chat-item--no-leido' : ''].filter(Boolean).join(' ')}
      onClick={() => onClick(chat)}
    >
      <div className="wap-avatar">{iniciales(chat.nombre)}</div>
      <div className="wap-chat-item__body">
        <div className="wap-chat-item__row">
          <span className="wap-chat-item__nombre">
            {chat.is_pinned && <IconPin />} {chat.nombre}
          </span>
          <span className="wap-chat-item__fecha">{formatFecha(chat.fecha)}</span>
        </div>
        <div className="wap-chat-item__row">
          <span className="wap-chat-item__preview">
            {chat.is_muted && <IconMute />} {chat.ultimo_mensaje || 'Sin mensajes'}
          </span>
          {chat.no_leidos > 0 && <span className="wap-chat-item__badge">{chat.no_leidos}</span>}
        </div>
      </div>
    </div>
  )
}

// ─── Burbuja de mensaje ─────────────────────────────────────────────────────────
function MediaAdjunto({ mediaId, tipo }) {
  const [url, setUrl] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!mediaId) return
    let objectUrl = null
    let cancelado = false

    axiosClient.get(`/whatsapp/media/${mediaId}`, { responseType: 'blob' })
      .then((res) => {
        if (cancelado) return
        objectUrl = URL.createObjectURL(res.data)
        setUrl(objectUrl)
      })
      .catch(() => { if (!cancelado) setError(true) })

    return () => {
      cancelado = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [mediaId])

  if (error) return <div className="wap-msg__adjunto-error">No se pudo cargar el archivo</div>
  if (!url) return <div className="wap-msg__adjunto-cargando">Cargando adjunto...</div>

  if (tipo === 'image') return <img src={url} alt="Imagen enviada" className="wap-msg__imagen" />
  if (tipo === 'audio') return <audio src={url} controls className="wap-msg__audio" />
  if (tipo === 'video') return <video src={url} controls className="wap-msg__video" />
  return (
    <a href={url} download className="wap-msg__adjunto">
      <span className="wap-msg__adjunto-icon">📎</span>
      <span className="wap-msg__adjunto-nombre">Descargar archivo</span>
    </a>
  )
}

function MensajeBurbuja({ mensaje }) {
  const enviado = mensaje.direccion === 'enviado'
  const esMedia = ['image', 'audio', 'video', 'document'].includes(mensaje.tipo)
  return (
    <div className={`wap-msg ${enviado ? 'wap-msg--enviado' : 'wap-msg--recibido'}`}>
      <div className="wap-msg__bubble">
        {mensaje.media_nombre && (
          <div className="wap-msg__adjunto">
            <span className="wap-msg__adjunto-icon">📎</span>
            <span className="wap-msg__adjunto-nombre">{mensaje.media_nombre}</span>
          </div>
        )}
        {esMedia && mensaje.media_id && <MediaAdjunto mediaId={mensaje.media_id} tipo={mensaje.tipo} />}
        {mensaje.texto && <div className="wap-msg__texto">{mensaje.texto}</div>}
        <span className="wap-msg__hora">{formatFecha(mensaje.fecha)}</span>
      </div>
    </div>
  )
}

// ─── Barra de envío ──────────────────────────────────────────────────────────
function BarraEnvio({ onEnviarTexto, onAdjuntar, onGenerarCotizacion, onEnviarGuia, loading, progreso }) {
  const [texto, setTexto] = useState('')
  const fileInputRef = useRef(null)
  const audioInputRef = useRef(null)

  const handleEnviar = () => {
    if (!texto.trim()) return
    onEnviarTexto(texto)
    setTexto('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleEnviar()
    }
  }

  return (
    <div className="wap-reply">
      <textarea
        className="wap-reply__input"
        placeholder="Escribe un mensaje..."
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={3}
      />
      <div className="wap-reply__footer">
        <div className="wap-reply__acciones">
          <button className="wap-btn wap-btn--cot" onClick={onGenerarCotizacion} type="button">
            <IconCotizacion /> Generar cotización
          </button>
          <button className="wap-btn wap-btn--guia" onClick={onEnviarGuia} type="button">
            <IconGuia /> Guía
          </button>
          <button className="wap-btn wap-btn--ghost" onClick={() => fileInputRef.current?.click()} type="button">
            <IconAdjuntar /> Adjuntar
          </button>
          <button className="wap-btn wap-btn--ghost" onClick={() => audioInputRef.current?.click()} type="button">
            <IconAudio /> Audio
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            style={{ display: 'none' }}
            onChange={(e) => {
              const archivo = e.target.files?.[0]
              if (archivo) onAdjuntar(archivo)
              e.target.value = ''
            }}
          />
          <input
            ref={audioInputRef}
            type="file"
            accept="audio/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              const archivo = e.target.files?.[0]
              if (archivo) onAdjuntar(archivo)
              e.target.value = ''
            }}
          />
        </div>
        <div className="wap-reply__enviar">
          <span className="wap-reply__hint">Ctrl + Enter</span>
          <button className="wap-btn wap-btn--primary" onClick={handleEnviar} disabled={loading || !!progreso || !texto.trim()} type="button">
            {loading ? 'Enviando...' : 'Enviar'}
          </button>
        </div>
      </div>
      {progreso && (
        <div className="wap-reply__progreso">
          Enviando {progreso.actual} de {progreso.total}...
        </div>
      )}
    </div>
  )
}

// ─── ChatPanel principal ────────────────────────────────────────────────────────
// chatInicialId: string|null — si viene, abre ese chat automáticamente al montar
// onChatMontado: () => void — callback para limpiar el chatInicialId en el padre
export default function ChatPanel({ chatInicialId = null, onChatMontado = null }) {
  const {
    chats, chatActivo, sinLeer,
    loadingChats, loadingChat, loadingEnvio, error,
    cargarChats, abrirChat, enviar, enviarConAdjunto, cerrarChat, limpiarError,
    togglePin, toggleMute, vaciarConversacion, eliminarConversacion,
  } = useWhatsapp()

  const [terminoBusqueda, setTerminoBusqueda] = useState('')
  const [menuAbiertoId, setMenuAbiertoId] = useState(null)
  const [modalCotizacion, setModalCotizacion] = useState(false)
  const [modalGuia, setModalGuia] = useState(false)
  const [errorEnvio, setErrorEnvio] = useState(null)
  const [progresoEnvio, setProgresoEnvio] = useState(null)
  const [vistaMovil, setVistaMovil] = useState('lista')
  const mensajesEndRef = useRef(null)
  const busquedaTimeoutRef = useRef(null)
  const primerRenderBusqueda = useRef(true)
  const menuHeaderRef = useRef(null)

  useEffect(() => {
    if (!menuAbiertoId) return
    const handleClickFuera = (e) => {
      if (menuHeaderRef.current && !menuHeaderRef.current.contains(e.target)) {
        setMenuAbiertoId(null)
      }
    }
    document.addEventListener('mousedown', handleClickFuera)
    return () => document.removeEventListener('mousedown', handleClickFuera)
  }, [menuAbiertoId])

  useEffect(() => { cargarChats() }, []) // eslint-disable-line

  useEffect(() => {
    if (primerRenderBusqueda.current) {
      primerRenderBusqueda.current = false
      return
    }
    if (busquedaTimeoutRef.current) clearTimeout(busquedaTimeoutRef.current)
    busquedaTimeoutRef.current = setTimeout(() => {
      cargarChats(terminoBusqueda ? { q: terminoBusqueda } : {})
    }, 400)
    return () => clearTimeout(busquedaTimeoutRef.current)
  }, [terminoBusqueda]) // eslint-disable-line

  useEffect(() => {
    if (!chatInicialId) return
    handleAbrirChat({ id: chatInicialId })
    onChatMontado?.()
  }, [chatInicialId]) // eslint-disable-line

  useEffect(() => {
    mensajesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatActivo?.mensajes?.length])

  const handleToggleMenu = (chatId) => setMenuAbiertoId((prev) => (prev === chatId ? null : chatId))
  const handleFijar = async (chatId) => { setMenuAbiertoId(null); await togglePin(chatId) }
  const handleSilenciar = async (chatId) => { setMenuAbiertoId(null); await toggleMute(chatId) }
  const handleVaciar = async (chatId) => {
    setMenuAbiertoId(null)
    if (!window.confirm('¿Vaciar esta conversación? Se borrarán todos los mensajes.')) return
    await vaciarConversacion(chatId)
  }
  const handleEliminar = async (chatId) => {
    setMenuAbiertoId(null)
    if (!window.confirm('¿Eliminar este chat? Esta acción no se puede deshacer.')) return
    await eliminarConversacion(chatId)
  }

  const handleAbrirChat = (chat) => {
    abrirChat(chat.id)
    setVistaMovil('chat')
  }

  const handleVolverALista = () => {
    setVistaMovil('lista')
    cerrarChat()
  }

  const handleEnviarTexto = async (texto) => {
    if (!chatActivo) return
    await enviar(chatActivo.id, texto)
  }

  const handleAdjuntar = async (archivo) => {
    if (!chatActivo) return
    const formData = new FormData()
    formData.append('archivo', archivo)
    formData.append('texto', '')
    await enviarConAdjunto(chatActivo.id, formData)
  }

  // ── Guía seleccionada desde el chat → texto + foto directo al chat ───────
  const handleSeleccionarGuia = async (guia) => {
    setModalGuia(false)
    if (!chatActivo) return
    const texto = buildTextoGuia(guia)
    await enviar(chatActivo.id, texto)
    if (guia.foto_guia_path) {
      try {
        const blob = await fetch(guia.foto_guia_path).then((r) => r.blob())
        const archivo = new File([blob], `Foto_guia_${guia.numero_guia}.jpg`, { type: blob.type })
        const formData = new FormData()
        formData.append('archivo', archivo)
        formData.append('texto', '')
        await enviarConAdjunto(chatActivo.id, formData)
      } catch (e) {
        console.error('Error enviando foto de guía por WhatsApp:', e)
      }
    }
  }

  // ── Cotización generada desde el chat → se envía directo como adjunto ────
  const handleCotizacionGenerada = async ({ blobUrl, nombreArchivo, cotizacion, adjuntosImagenes = [], adjuntosPdfs = [] }) => {
    setModalCotizacion(false)
    if (!chatActivo) return

    if (!blobUrl) {
      setErrorEnvio(`La cotización ${cotizacion?.consecutivo || ''} se creó, pero falló la generación del PDF. Revísala en el módulo de Cotizaciones y envíala manualmente.`)
      return
    }

    const fallos = []
    const extras = [...adjuntosImagenes, ...adjuntosPdfs]
    const total = 1 + extras.length
    let actual = 0
    setProgresoEnvio({ actual, total })

    try {
      actual += 1
      setProgresoEnvio({ actual, total })
      const blob = await fetch(blobUrl).then((r) => r.blob())
      const archivo = new File([blob], nombreArchivo, { type: 'application/pdf' })
      const formData = new FormData()
      formData.append('archivo', archivo)
      formData.append('texto', `Cotización ${cotizacion?.consecutivo || ''}`.trim())
      await enviarConAdjunto(chatActivo.id, formData)
    } catch (e) {
      console.error('Error enviando PDF de cotización por WhatsApp:', e)
      fallos.push(nombreArchivo || 'PDF de cotización')
    }

    for (const adj of extras) {
      const nombre = adj.nombre || adj.url?.split('/').pop() || 'archivo'
      try {
        actual += 1
        setProgresoEnvio({ actual, total })
        const blob = await fetch(adj.url).then((r) => r.blob())
        const archivo = new File([blob], nombre, { type: blob.type })
        const formData = new FormData()
        formData.append('archivo', archivo)
        formData.append('texto', '')
        await enviarConAdjunto(chatActivo.id, formData)
      } catch (e) {
        console.error(`Error enviando adjunto "${nombre}" por WhatsApp:`, e)
        fallos.push(nombre)
      }
    }

    setProgresoEnvio(null)
    if (fallos.length > 0) {
      setErrorEnvio(`No se pudieron enviar: ${fallos.join(', ')}. Revísalos manualmente.`)
    }
  }

  return (
    <div className={['wap-root', vistaMovil === 'chat' ? 'wap-root--mobile-chat' : ''].filter(Boolean).join(' ')}>

      {/* ── Lista de chats ── */}
      <div className="wap-lista">
        <div className="wap-lista__header">
          <span className="wap-lista__titulo">Chats</span>
          {sinLeer > 0 && <span className="wap-lista__sin-leer">{sinLeer} sin leer</span>}
        </div>
        <input
          className="wap-lista__search"
          placeholder="Buscar chats..."
          value={terminoBusqueda}
          onChange={(e) => setTerminoBusqueda(e.target.value)}
        />
        {loadingChats ? (
          <div className="wap-lista__empty">Cargando...</div>
        ) : chats.length === 0 ? (
          <div className="wap-lista__empty">Sin conversaciones</div>
        ) : (
          chats.map((chat) => (
            <ChatItem key={chat.id} chat={chat} activo={chatActivo?.id === chat.id} onClick={handleAbrirChat} />
          ))
        )}
      </div>

      {/* ── Conversación ── */}
      <div className="wap-conversacion">
        {!chatActivo ? (
          <div className="wap-vacio">
            <div className="wap-vacio-icon"><IconChat /></div>
            <span>Selecciona un chat para ver la conversación</span>
          </div>
        ) : (
          <>
            <div className="wap-conversacion__header">
              <button className="wap-conversacion__volver" onClick={handleVolverALista} type="button"><IconAtras /></button>
              <div className="wap-avatar">{iniciales(chatActivo.nombre)}</div>
              <div className="wap-conversacion__info">
                <span className="wap-conversacion__nombre">{chatActivo.nombre}</span>
                <span className="wap-conversacion__telefono">{chatActivo.telefono}</span>
              </div>
              <div className="wap-conversacion__menu-wrapper" ref={menuHeaderRef}>
                <button
                  className="wap-conversacion__menu-btn"
                  onClick={(e) => { e.stopPropagation(); handleToggleMenu(chatActivo.id) }}
                  type="button"
                  title="Más opciones"
                >
                  <IconDots />
                </button>
                {menuAbiertoId === chatActivo.id && (
                  <div className="wap-chat-item__menu" onClick={(e) => e.stopPropagation()}>
                    <button className="wap-chat-item__menu-item" onClick={() => handleFijar(chatActivo.id)} type="button">
                      <IconPin /> {chats.find((c) => c.id === chatActivo.id)?.is_pinned ? 'Desfijar chat' : 'Fijar chat'}
                    </button>
                    <button className="wap-chat-item__menu-item" onClick={() => handleSilenciar(chatActivo.id)} type="button">
                      <IconMute /> {chats.find((c) => c.id === chatActivo.id)?.is_muted ? 'Activar sonido' : 'Silenciar'}
                    </button>
                    <button className="wap-chat-item__menu-item" onClick={() => handleVaciar(chatActivo.id)} type="button">
                      <IconEraser /> Vaciar conversación
                    </button>
                    <div className="wap-chat-item__menu-divider" />
                    <button className="wap-chat-item__menu-item wap-chat-item__menu-item--danger" onClick={() => handleEliminar(chatActivo.id)} type="button">
                      <IconTrash /> Eliminar chat
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="wap-conversacion__mensajes">
              {loadingChat ? (
                <div className="wap-lista__empty">Cargando mensajes...</div>
              ) : chatActivo.mensajes?.length === 0 ? (
                <div className="wap-lista__empty">Aún no hay mensajes</div>
              ) : (
                chatActivo.mensajes?.map((msg) => <MensajeBurbuja key={msg.id} mensaje={msg} />)
              )}
              <div ref={mensajesEndRef} />
            </div>
            <BarraEnvio
              onEnviarTexto={handleEnviarTexto}
              onAdjuntar={handleAdjuntar}
              onGenerarCotizacion={() => setModalCotizacion(true)}
              onEnviarGuia={() => setModalGuia(true)}
              loading={loadingEnvio}
              progreso={progresoEnvio}
            />
          </>
        )}
      </div>

      {modalCotizacion && chatActivo && (
        <ModalCotizacionBuzon
          hilo={{ remitente: chatActivo.nombre, telefono: chatActivo.telefono }}
          onClose={() => setModalCotizacion(false)}
          onCotizacionGenerada={handleCotizacionGenerada}
        />
      )}

      {modalGuia && chatActivo && (
        <ModalGuiaBuzon
          onClose={() => setModalGuia(false)}
          onSeleccionar={handleSeleccionarGuia}
        />
      )}

      {(error || errorEnvio) && (
        <div className="wap-error">
          <span>{error || errorEnvio}</span>
          <button
            className="wap-error__cerrar"
            onClick={() => { limpiarError(); setErrorEnvio(null) }}
            type="button"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}