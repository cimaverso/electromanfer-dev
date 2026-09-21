import { useState, useEffect, useRef, useMemo } from 'react'
import axiosClient from '../../api/axiosClient'
import { buscarGlobal } from '../../api/whatsappApi'
import { useWhatsapp } from '../../hooks/useWhatsapp'
import { useAuth } from '../../hooks/useAuth'
import ModalCotizacionBuzon from '../cotizaciones/Buzon/ModalCotizacionBuzon'
import ModalGuiaBuzon from '../cotizaciones/Buzon/ModalGuiaBuzon'
import ConfirmModal from './ConfirmModal'
import PlantillasModal from './PlantillasModal'
import { buildTextoGuia } from '../../utils/guiaMensajes'
import { formatTelefono, nombreVisible, sinNombreGuardado } from '../../utils/formatTelefono'
import AvatarChat from './AvatarChat'
import './ChatPanel.css'

// ─── Helpers ──────────────────────────────────────────────────────────────────
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
function IconBuscar() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg> }
function IconArriba() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15" /></svg> }
function IconAbajo() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg> }
function IconCerrar() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg> }
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
function resaltar(texto, termino) {
  const i = texto.toLowerCase().indexOf(termino.toLowerCase())
  if (i < 0) return texto
  return (
    <>
      {texto.slice(0, i)}
      <mark>{texto.slice(i, i + termino.length)}</mark>
      {texto.slice(i + termino.length)}
    </>
  )
}

function ChatItem({ chat, activo, onClick }) {
  return (
    <div
      className={['wap-chat-item', activo ? 'wap-chat-item--activo' : '', chat.no_leidos > 0 ? 'wap-chat-item--no-leido' : ''].filter(Boolean).join(' ')}
      onClick={() => onClick(chat)}
    >
      <AvatarChat chat={chat} className="wap-avatar" />
      <div className="wap-chat-item__body">
        <div className="wap-chat-item__row">
          <span className="wap-chat-item__nombre">
            {chat.is_pinned && <IconPin />} {nombreVisible(chat)}
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
// onAbrir({ url, tipo, nombre }) — dispara la previsualización en el ChatPanel padre
// Etiqueta y color del ícono según la extensión del archivo
function iconoDocumento(nombre = '') {
  const ext = (nombre.match(/\.(\w{2,5})$/)?.[1] || '').toLowerCase()
  if (ext === 'pdf') return { etiqueta: 'PDF', color: '#d9534f' }
  if (['xls', 'xlsx', 'csv'].includes(ext)) return { etiqueta: 'XLS', color: '#1f8f4e' }
  if (['doc', 'docx'].includes(ext)) return { etiqueta: 'DOC', color: '#2b6cb0' }
  if (['ppt', 'pptx'].includes(ext)) return { etiqueta: 'PPT', color: '#d9822b' }
  if (['zip', 'rar', '7z'].includes(ext)) return { etiqueta: 'ZIP', color: '#7c5cbf' }
  return { etiqueta: ext ? ext.toUpperCase().slice(0, 4) : 'ARCH', color: '#6b7280' }
}

function MediaAdjunto({ mediaId, mediaLocal, tipo, nombre, onAbrir }) {
  const [urlRemota, setUrl] = useState(null)
  const [error, setError] = useState(false)
  // Recién enviado desde la app: se usa el archivo local (sin descargar nada)
  const urlLocal = useMemo(() => (mediaLocal ? URL.createObjectURL(mediaLocal) : null), [mediaLocal])
  const url = urlLocal || urlRemota

  useEffect(() => {
    if (mediaLocal || !mediaId) return
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
  }, [mediaId, mediaLocal])

  if (error) return <div className="wap-msg__adjunto-error">No se pudo cargar el archivo</div>
  if (!url) return <div className="wap-msg__adjunto-cargando">Cargando adjunto...</div>

  if (tipo === 'image') {
    return (
      <img
        src={url}
        alt="Imagen enviada"
        className="wap-msg__imagen"
        onClick={() => onAbrir({ url, tipo, nombre })}
      />
    )
  }
  if (tipo === 'audio') return <audio src={url} controls className="wap-msg__audio" />
  if (tipo === 'video') return <video src={url} controls className="wap-msg__video" />

  const icono = iconoDocumento(nombre)
  const esPdf = icono.etiqueta === 'PDF'
  // Documento (hoy solo llegan PDFs por el input de adjuntar) — click abre
  // el visor en vez de forzar la descarga; el visor trae su propio botón.
  return (
    <a
      href={url}
      className="wap-msg__adjunto"
      // Solo el PDF se previsualiza; Excel/Word/etc. se descargan
      download={esPdf ? undefined : (nombre || true)}
      onClick={esPdf ? (e) => { e.preventDefault(); onAbrir({ url, tipo, nombre }) } : undefined}
    >
      <span className="wap-msg__doc-icon" style={{ background: icono.color }}>{icono.etiqueta}</span>
      <span className="wap-msg__adjunto-nombre">{nombre || 'Ver archivo'}</span>
      <span className="wap-msg__doc-accion">{esPdf ? 'Ver' : 'Descargar'}</span>
    </a>
  )
}

// Plantilla: usa las partes estructuradas de CimAPI; si no vienen, cae al texto plano
function PlantillaContenido({ plantilla, texto, termino }) {
  const res = (t) => (termino ? resaltar(t, termino) : t)
  const { header, body, footer, buttons = [] } = plantilla || { body: texto }
  return (
    <>
      {header && <div className="wap-msg__texto wap-msg__plantilla-header">{res(header)}</div>}
      {body && <div className="wap-msg__texto">{res(body)}</div>}
      {footer && <div className="wap-msg__plantilla-pie">{footer}</div>}
      {buttons.length > 0 && (
        <div className="wap-msg__plantilla-botones">
          {buttons.map((b, i) => <div key={i} className="wap-msg__plantilla-boton">{b.text}</div>)}
        </div>
      )}
    </>
  )
}

function MensajeBurbuja({ mensaje, onAbrirMedia, termino = '', activo = false }) {
  const enviado = mensaje.direccion === 'enviado'
  const esMedia = ['image', 'audio', 'video', 'document'].includes(mensaje.tipo)
  const esTemplate = mensaje.tipo === 'template'
  // Si el "texto" es solo el nombre del archivo, no se repite bajo la vista previa
  const soloNombre = esMedia && mensaje.texto && (mensaje.texto === mensaje.media_nombre || (/^\S+\.\w{2,5}$/.test(mensaje.texto) || (mensaje.tipo === 'document' && /\.\w{2,5}$/.test(mensaje.texto))))
  const textoVisible = mensaje.tipo === 'audio' || soloNombre ? '' : mensaje.texto
  return (
    <div
      data-msg-id={mensaje.id}
      className={`wap-msg${esTemplate ? ' wap-msg--plantilla' : ''} ${enviado ? 'wap-msg--enviado' : 'wap-msg--recibido'}${activo ? ' wap-msg--match-activo' : ''}`}
    >
      <div className="wap-msg__bubble">
        {esTemplate && <div className="wap-msg__plantilla-tag">Plantilla</div>}
        {esMedia && (mensaje.media_id || mensaje.media_local) && (
          <MediaAdjunto
            mediaId={mensaje.media_id}
            mediaLocal={mensaje.media_local}
            tipo={mensaje.tipo}
            nombre={mensaje.media_nombre || mensaje.texto}
            onAbrir={onAbrirMedia}
          />
        )}
        {esTemplate
          ? <PlantillaContenido plantilla={mensaje.plantilla} texto={textoVisible} termino={termino} />
          : textoVisible && <div className="wap-msg__texto">{termino ? resaltar(textoVisible, termino) : textoVisible}</div>}
        <span className="wap-msg__hora">{formatFecha(mensaje.fecha)}</span>
      </div>
    </div>
  )
}

// ─── Lightbox de previsualización (imágenes y PDFs) ────────────────────────────
function LightboxModal({ media, onClose }) {
  useEffect(() => {
    if (!media) return
    const handleKeyDown = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [media, onClose])

  if (!media) return null
  const esPdf = media.tipo === 'document'

  return (
    <div className="wap-lightbox-overlay" onClick={onClose}>
      <div className="wap-lightbox" onClick={(e) => e.stopPropagation()}>
        <div className="wap-lightbox__header">
          <span className="wap-lightbox__nombre">{media.nombre || (esPdf ? 'Documento' : 'Imagen')}</span>
          <div className="wap-lightbox__acciones">
            <a href={media.url} download={media.nombre || true} className="wap-lightbox__descargar" title="Descargar">⬇</a>
            <button className="wap-lightbox__cerrar" onClick={onClose} type="button" aria-label="Cerrar">✕</button>
          </div>
        </div>
        <div className="wap-lightbox__cuerpo">
          {esPdf ? (
            <iframe src={media.url} title={media.nombre || 'Documento'} className="wap-lightbox__iframe" />
          ) : (
            <img src={media.url} alt={media.nombre || 'Imagen'} className="wap-lightbox__img" />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Barra de envío ──────────────────────────────────────────────────────────
function BarraEnvio({ onEnviarTexto, onAdjuntar, onGenerarCotizacion, onEnviarGuia, onPlantillas, loading, progreso }) {
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
          <button className="wap-btn wap-btn--ghost" onClick={onPlantillas} type="button">
            Plantillas
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
    chats, chatActivo,
    loadingChats, loadingChat, loadingEnvio, error,
    cargarChats, abrirChat, enviar, enviarConAdjunto, enviarPlantilla, cerrarChat, limpiarError,
    togglePin, toggleMute, vaciarConversacion, eliminarConversacion,
    lineas, lineaSeleccionada, cargarLineas, seleccionarLinea,
  } = useWhatsapp()
  const { user } = useAuth()

  const [terminoBusqueda, setTerminoBusqueda] = useState('')
  const [busquedaChatAbierta, setBusquedaChatAbierta] = useState(false)
  const [terminoChat, setTerminoChat] = useState('')
  const [indiceSel, setIndiceSel] = useState(null)
  const mensajesRef = useRef(null)
  const [resultadosMensajes, setResultadosMensajes] = useState([])
  const [buscandoMensajes, setBuscandoMensajes] = useState(false)
  const [menuAbiertoId, setMenuAbiertoId] = useState(null)
  const [confirmacion, setConfirmacion] = useState(null)
  const [modalCotizacion, setModalCotizacion] = useState(false)
  const [modalGuia, setModalGuia] = useState(false)
  const [modalPlantillas, setModalPlantillas] = useState(false)
  const [errorEnvio, setErrorEnvio] = useState(null)
  const [progresoEnvio, setProgresoEnvio] = useState(null)
  const [vistaMovil, setVistaMovil] = useState('lista')
  const [mediaPreview, setMediaPreview] = useState(null)
  const mensajesEndRef = useRef(null)
  const menuHeaderRef = useRef(null)
  const [menuLineaAbierto, setMenuLineaAbierto] = useState(false)
  const menuLineaRef = useRef(null)

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

  useEffect(() => {
    if (!menuLineaAbierto) return
    const handleClickFuera = (e) => {
      if (menuLineaRef.current && !menuLineaRef.current.contains(e.target)) {
        setMenuLineaAbierto(false)
      }
    }
    document.addEventListener('mousedown', handleClickFuera)
    return () => document.removeEventListener('mousedown', handleClickFuera)
  }, [menuLineaAbierto])

  // ── Líneas de WhatsApp disponibles (Harvey/Cimaverso) ─────────────────────
  useEffect(() => { cargarLineas(user?.id) }, [user?.id]) // eslint-disable-line

  useEffect(() => { cargarChats() }, [lineaSeleccionada]) // eslint-disable-line

  // Los chats ya están en memoria: se filtran al instante, sin volver al servidor
  const chatsVisibles = useMemo(() => {
    const q = terminoBusqueda.trim().toLowerCase()
    if (!q) return chats
    return chats.filter((c) => c.nombre.toLowerCase().includes(q) || c.telefono.includes(q))
  }, [chats, terminoBusqueda])

  // ── Búsqueda dentro de la conversación abierta (sobre los mensajes cargados) ──
  const terminoChatLimpio = terminoChat.trim()
  const coincidenciasChat = useMemo(() => {
    if (!terminoChatLimpio) return []
    const q = terminoChatLimpio.toLowerCase()
    return (chatActivo?.mensajes || [])
      .filter((m) => m.tipo !== 'audio' && m.texto && m.texto.toLowerCase().includes(q))
      .map((m) => m.id)
  }, [chatActivo?.mensajes, terminoChatLimpio])
  // Sin selección explícita, se parte del más reciente
  const indiceActivo = coincidenciasChat.length === 0
    ? -1
    : indiceSel != null && indiceSel < coincidenciasChat.length ? indiceSel : coincidenciasChat.length - 1
  const idCoincidenciaActiva = indiceActivo >= 0 ? coincidenciasChat[indiceActivo] : null

  useEffect(() => {
    if (idCoincidenciaActiva == null) return
    mensajesRef.current
      ?.querySelector(`[data-msg-id="${idCoincidenciaActiva}"]`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [idCoincidenciaActiva])

  const cerrarBusquedaChat = () => {
    setBusquedaChatAbierta(false)
    setTerminoChat('')
    setIndiceSel(null)
  }

  const moverCoincidencia = (delta) => {
    const total = coincidenciasChat.length
    if (total === 0) return
    setIndiceSel((indiceActivo + delta + total) % total)
  }

  // Búsqueda híbrida: además de filtrar chats, busca la frase dentro de los mensajes
  useEffect(() => {
    const q = terminoBusqueda.trim()
    if (q.length < 2) return
    const controller = new AbortController()
    const t = setTimeout(async () => {
      setBuscandoMensajes(true)
      try {
        const { mensajes } = await buscarGlobal(q, lineaSeleccionada?.id, controller.signal)
        setResultadosMensajes(mensajes)
      } catch (e) {
        if (e?.code !== 'ERR_CANCELED') setResultadosMensajes([])
      } finally {
        if (!controller.signal.aborted) setBuscandoMensajes(false)
      }
    }, 300)
    return () => { clearTimeout(t); controller.abort() }
  }, [terminoBusqueda, lineaSeleccionada])

  useEffect(() => {
    if (!chatInicialId) return
    handleAbrirChat({ id: chatInicialId })
    onChatMontado?.()
  }, [chatInicialId]) // eslint-disable-line

  useEffect(() => {
    if (terminoChatLimpio) return
    mensajesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatActivo?.mensajes?.length]) // eslint-disable-line

  const handleToggleMenu = (chatId) => setMenuAbiertoId((prev) => (prev === chatId ? null : chatId))
  const handleFijar = async (chatId) => { setMenuAbiertoId(null); await togglePin(chatId) }
  const handleSilenciar = async (chatId) => { setMenuAbiertoId(null); await toggleMute(chatId) }
  const handleVaciar = (chatId) => {
    setMenuAbiertoId(null)
    setConfirmacion({
      tipo: 'vaciar',
      chatId,
      titulo: 'Vaciar conversación',
      mensaje: '¿Vaciar esta conversación? Se borrarán todos los mensajes.',
      textoAceptar: 'Vaciar',
      peligroso: false,
    })
  }
  const handleEliminar = (chatId) => {
    setMenuAbiertoId(null)
    setConfirmacion({
      tipo: 'eliminar',
      chatId,
      titulo: 'Eliminar chat',
      mensaje: '¿Eliminar este chat? Esta acción no se puede deshacer.',
      textoAceptar: 'Eliminar',
      peligroso: true,
    })
  }

  const handleConfirmarAccion = async () => {
    if (!confirmacion) return
    const { tipo, chatId } = confirmacion
    setConfirmacion(null)
    if (tipo === 'vaciar') await vaciarConversacion(chatId)
    if (tipo === 'eliminar') await eliminarConversacion(chatId)
  }

  const handleAbrirChat = (chat) => {
    cerrarBusquedaChat()
    abrirChat(chat.id)
    setVistaMovil('chat')
  }

  const handleVolverALista = () => {
    cerrarBusquedaChat()
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
        </div>
        <div className="wap-lista__search-row">
          <input
            className="wap-lista__search"
            placeholder="Buscar chats..."
            value={terminoBusqueda}
            onChange={(e) => setTerminoBusqueda(e.target.value)}
          />
          {lineas.length > 0 && (
            <div className="wap-lineas" ref={menuLineaRef}>
              <button
                className="wap-lineas__btn"
                onClick={() => setMenuLineaAbierto((v) => !v)}
                type="button"
                aria-label="Elegir línea de WhatsApp"
                title={lineaSeleccionada?.nombre || 'Elegir línea'}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <rect x="2" y="3" width="12" height="3" rx="1" /><rect x="2" y="10" width="12" height="3" rx="1" />
                </svg>
                <span className="wap-lineas__dot" />
              </button>
              {menuLineaAbierto && (
                <div className="wap-lineas__menu">
                  <div className="wap-lineas__menu-titulo">Mostrar línea</div>
                  {lineas.map((linea) => (
                    <button
                      key={linea.id}
                      className={['wap-lineas__opcion', lineaSeleccionada?.id === linea.id ? 'wap-lineas__opcion--activa' : ''].filter(Boolean).join(' ')}
                      onClick={() => { seleccionarLinea(linea, user?.id); setMenuLineaAbierto(false) }}
                      type="button"
                    >
                      <span className="wap-lineas__punto" />
                      {linea.nombre}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        {lineaSeleccionada && (
          <div className="wap-lista__linea-activa">
            Mostrando: <strong>{lineaSeleccionada.nombre}</strong>
          </div>
        )}
        {loadingChats ? (
          <div className="wap-lista__empty">Cargando...</div>
        ) : chatsVisibles.length === 0 ? (
          !(terminoBusqueda.trim().length >= 2 && (buscandoMensajes || resultadosMensajes.length > 0)) && (
            <div className="wap-lista__empty">Sin conversaciones</div>
          )
        ) : (
          chatsVisibles.map((chat) => (
            <ChatItem key={chat.id} chat={chat} activo={chatActivo?.id === chat.id} onClick={handleAbrirChat} />
          ))
        )}
        {terminoBusqueda.trim().length >= 2 && (buscandoMensajes || resultadosMensajes.length > 0) && (
          <div className="wap-busqueda">
            <div className="wap-busqueda__titulo">Mensajes</div>
            {buscandoMensajes && resultadosMensajes.length === 0 ? (
              <div className="wap-lista__empty">Buscando...</div>
            ) : (
              resultadosMensajes.map((m) => (
                <button
                  key={m.message_id}
                  type="button"
                  className="wap-busqueda__item"
                  onClick={() => handleAbrirChat({ id: m.conversation_id })}
                >
                  <span className="wap-busqueda__nombre">
                    {m.nombre}
                    {m.matches > 1 && <span className="wap-busqueda__count">{m.matches} coincidencias</span>}
                  </span>
                  <span className="wap-busqueda__snippet">{resaltar(m.snippet, terminoBusqueda.trim())}</span>
                </button>
              ))
            )}
          </div>
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
              <AvatarChat chat={chatActivo} className="wap-avatar" />
              <div className="wap-conversacion__info">
                <span className="wap-conversacion__nombre">{nombreVisible(chatActivo)}</span>
                {!sinNombreGuardado(chatActivo.nombre) && <span className="wap-conversacion__telefono">{formatTelefono(chatActivo.telefono)}</span>}
              </div>
              <button
                className="wap-conversacion__menu-btn wap-conversacion__buscar-btn"
                onClick={() => (busquedaChatAbierta ? cerrarBusquedaChat() : setBusquedaChatAbierta(true))}
                type="button"
                title="Buscar en la conversación"
              >
                <IconBuscar />
              </button>
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
            {busquedaChatAbierta && (
              <div className="wap-chatsearch">
                <input
                  className="wap-chatsearch__input"
                  placeholder="Buscar en esta conversación..."
                  value={terminoChat}
                  autoFocus
                  onChange={(e) => { setTerminoChat(e.target.value); setIndiceSel(null) }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') cerrarBusquedaChat()
                    else if (e.key === 'Enter') { e.preventDefault(); moverCoincidencia(e.shiftKey ? 1 : -1) }
                  }}
                />
                <span className="wap-chatsearch__count">
                  {terminoChatLimpio
                    ? coincidenciasChat.length === 0 ? 'Sin resultados' : `${indiceActivo + 1} de ${coincidenciasChat.length}`
                    : ''}
                </span>
                <button type="button" className="wap-chatsearch__btn" onClick={() => moverCoincidencia(-1)} disabled={coincidenciasChat.length === 0} title="Anterior (más antiguo)"><IconArriba /></button>
                <button type="button" className="wap-chatsearch__btn" onClick={() => moverCoincidencia(1)} disabled={coincidenciasChat.length === 0} title="Siguiente (más reciente)"><IconAbajo /></button>
                <button type="button" className="wap-chatsearch__btn" onClick={cerrarBusquedaChat} title="Cerrar"><IconCerrar /></button>
              </div>
            )}
            <div className="wap-conversacion__mensajes" ref={mensajesRef}>
              {loadingChat ? (
                <div className="wap-lista__empty">Cargando mensajes...</div>
              ) : chatActivo.mensajes?.length === 0 ? (
                <div className="wap-lista__empty">Aún no hay mensajes</div>
              ) : (
                chatActivo.mensajes?.map((msg) => (
                  <MensajeBurbuja
                    key={msg.id}
                    mensaje={msg}
                    onAbrirMedia={setMediaPreview}
                    termino={terminoChatLimpio}
                    activo={msg.id === idCoincidenciaActiva}
                  />
                ))
              )}
              <div ref={mensajesEndRef} />
            </div>
            <BarraEnvio
              onEnviarTexto={handleEnviarTexto}
              onAdjuntar={handleAdjuntar}
              onGenerarCotizacion={() => setModalCotizacion(true)}
              onEnviarGuia={() => setModalGuia(true)}
              onPlantillas={() => setModalPlantillas(true)}
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

      {modalPlantillas && chatActivo && (
        <PlantillasModal
          lineaId={lineaSeleccionada?.id}
          lineaNombre={lineaSeleccionada?.nombre}
          onEnviar={(datos) => enviarPlantilla(chatActivo.id, datos)}
          onClose={() => setModalPlantillas(false)}
        />
      )}

      {modalGuia && chatActivo && (
        <ModalGuiaBuzon
          onClose={() => setModalGuia(false)}
          onSeleccionar={handleSeleccionarGuia}
        />
      )}

      {confirmacion && (
        <ConfirmModal
          titulo={confirmacion.titulo}
          mensaje={confirmacion.mensaje}
          textoAceptar={confirmacion.textoAceptar}
          peligroso={confirmacion.peligroso}
          onAceptar={handleConfirmarAccion}
          onCancelar={() => setConfirmacion(null)}
        />
      )}

      <LightboxModal media={mediaPreview} onClose={() => setMediaPreview(null)} />

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
