import { useState, useEffect, useRef } from 'react'
import ModalCotizacionBuzon from './ModalCotizacionBuzon'
import { useBuzon } from '../../../hooks/useBuzon'
import './BuzonPanel.css'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function iniciales(nombre = '') {
  return nombre
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

function formatFecha(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const hoy = new Date()
  const ayer = new Date(hoy)
  ayer.setDate(hoy.getDate() - 1)

  if (d.toDateString() === hoy.toDateString()) {
    return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
  }
  if (d.toDateString() === ayer.toDateString()) return 'Ayer'
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
}

// ─── Mock de datos mientras el backend no está listo ─────────────────────────
// Reemplazar con datos reales de useBuzon cuando el backend implemente
// GET /buzon/hilos y GET /buzon/hilos/:id
const MOCK_HILOS = [
  {
    id: 'h1',
    leido: false,
    remitente: 'Carlos Mejía',
    email_remitente: 'cmejia@ferrelectro.com',
    asunto: 'Re: Cotización COT-2025-0087',
    preview: 'Perfecto, revisé los precios y todo está bien. ¿Podría...',
    fecha: new Date().toISOString(),
    cotizacion_consecutivo: 'COT-2025-0087',
    mensajes: [
      {
        id: 'm1', direccion: 'recibido',
        remitente: 'Carlos Mejía', email: 'cmejia@ferrelectro.com',
        cuerpo: 'Buenos días, necesitamos cotización para 20 breakers trifásicos 3x60A y transformadores. Manejamos proyecto en Bogotá.',
        fecha: new Date(Date.now() - 172800000).toISOString(), adjuntos: [],
      },
      {
        id: 'm2', direccion: 'enviado',
        remitente: 'Ventas Electromanfer', email: 'ventas@electromanfer.com',
        cuerpo: 'Estimado Carlos, adjuntamos cotización con los productos solicitados. Quedo atento a cualquier inquietud.',
        fecha: new Date(Date.now() - 165600000).toISOString(),
        adjuntos: [{ nombre: 'COT-2025-0087.pdf', tipo: 'pdf', tamanio: '142 KB' }],
      },
      {
        id: 'm3', direccion: 'recibido',
        remitente: 'Carlos Mejía', email: 'cmejia@ferrelectro.com',
        cuerpo: 'Perfecto, revisé los precios y todo está bien. ¿Podría confirmarme disponibilidad inmediata de los 20 breakers? Necesitamos entrega esta semana.',
        fecha: new Date().toISOString(), adjuntos: [],
      },
    ],
  },
  {
    id: 'h2', leido: false,
    remitente: 'Laura Torres', email_remitente: 'ltorres@gmail.com',
    asunto: 'Solicitud de cotización tableros eléctricos',
    preview: 'Buenos días, necesitamos cotización urgente para...',
    fecha: new Date(Date.now() - 5400000).toISOString(),
    cotizacion_consecutivo: null,
    mensajes: [
      {
        id: 'm4', direccion: 'recibido',
        remitente: 'Laura Torres', email: 'ltorres@gmail.com',
        cuerpo: 'Buenos días, necesitamos cotización urgente para tableros eléctricos trifásicos 3x100A. Son 5 unidades para una obra en Medellín.',
        fecha: new Date(Date.now() - 5400000).toISOString(), adjuntos: [],
      },
    ],
  },
  {
    id: 'h3', leido: false,
    remitente: 'Pedro Ríos', email_remitente: 'prios@constructora.co',
    asunto: 'Re: Cotización COT-2025-0081',
    preview: '¿Tienen disponibilidad inmediata de los breakers?',
    fecha: new Date(Date.now() - 86400000).toISOString(),
    cotizacion_consecutivo: 'COT-2025-0081',
    mensajes: [],
  },
  {
    id: 'h4', leido: true,
    remitente: 'María Salcedo', email_remitente: 'msalcedo@arq.com',
    asunto: 'Re: Cotización COT-2025-0074',
    preview: 'Muchas gracias, procedemos con el pedido.',
    fecha: new Date(Date.now() - 259200000).toISOString(),
    cotizacion_consecutivo: 'COT-2025-0074',
    mensajes: [],
  },
  {
    id: 'h5', leido: true,
    remitente: 'Constr. Andina S.A.S', email_remitente: 'compras@andina.com',
    asunto: 'Solicitud materiales obra Chapinero',
    preview: 'Adjuntamos lista de materiales para la obra...',
    fecha: new Date(Date.now() - 432000000).toISOString(),
    cotizacion_consecutivo: null,
    mensajes: [],
  },
]

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function Avatar({ nombre, tipo = 'cliente' }) {
  return (
    <div className={`buzon-avatar buzon-avatar--${tipo}`}>
      {iniciales(nombre)}
    </div>
  )
}

function HiloItem({ hilo, activo, onClick }) {
  return (
    <div
      className={`buzon-hilo-item ${activo ? 'buzon-hilo-item--activo' : ''} ${!hilo.leido ? 'buzon-hilo-item--no-leido' : ''}`}
      onClick={() => onClick(hilo)}
    >
      {!hilo.leido && <span className="buzon-hilo-item__dot" />}
      <div className="buzon-hilo-item__row">
        <span className="buzon-hilo-item__remitente">{hilo.remitente}</span>
        <span className="buzon-hilo-item__fecha">{formatFecha(hilo.fecha)}</span>
      </div>
      <div className="buzon-hilo-item__asunto">{hilo.asunto}</div>
      <div className="buzon-hilo-item__preview">{hilo.preview}</div>
      {hilo.cotizacion_consecutivo && (
        <span className="buzon-hilo-item__cot-tag">{hilo.cotizacion_consecutivo}</span>
      )}
    </div>
  )
}

function MensajeBurbuja({ mensaje }) {
  const enviado = mensaje.direccion === 'enviado'
  return (
    <div className={`buzon-msg ${enviado ? 'buzon-msg--enviado' : 'buzon-msg--recibido'}`}>
      <div className="buzon-msg__header">
        <Avatar
          nombre={mensaje.remitente}
          tipo={enviado ? 'asesor' : 'cliente'}
        />
        <span className="buzon-msg__nombre">{mensaje.remitente}</span>
        <span className="buzon-msg__hora">{formatFecha(mensaje.fecha)}</span>
      </div>
      <div className="buzon-msg__cuerpo">{mensaje.cuerpo}</div>
      {mensaje.adjuntos?.map((adj, i) => (
        <div key={i} className="buzon-msg__adjunto">
          <div className="buzon-msg__adjunto-icon">PDF</div>
          <span>{adj.nombre}</span>
          <span className="buzon-msg__adjunto-size">{adj.tamanio}</span>
        </div>
      ))}
    </div>
  )
}

function BarraRespuesta({ onEnviar, loading, onNuevaCotizacion, onAdjuntarCotizacion, adjuntoPrevio = null, onQuitarAdjunto }) {
  const [texto, setTexto] = useState('')
  const textareaRef = useRef(null)

  const handleEnviar = () => {
    if (!texto.trim() && !adjuntoPrevio) return
    onEnviar(texto)
    setTexto('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleEnviar()
  }

  return (
    <div className="buzon-reply">
      {/* Adjunto pre-cargado desde Preview */}
      {adjuntoPrevio && (
        <div className="buzon-reply__adjunto-preview">
          <div className="buzon-msg__adjunto-icon">PDF</div>
          <span className="buzon-reply__adjunto-nombre">{adjuntoPrevio.nombreArchivo}</span>
          <button
            className="buzon-reply__adjunto-quitar"
            onClick={onQuitarAdjunto}
            type="button"
            title="Quitar adjunto"
          >
            ✕
          </button>
        </div>
      )}
      <textarea
        ref={textareaRef}
        className="buzon-reply__input"
        placeholder="Escribe tu respuesta..."
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={3}
      />
      <div className="buzon-reply__footer">
        <div className="buzon-reply__acciones">
          <button
            className="buzon-btn buzon-btn--cot"
            onClick={onNuevaCotizacion}
            type="button"
          >
            <IconCotizacion />
            Generar cotización
          </button>
          <button
            className="buzon-btn buzon-btn--ghost"
            onClick={onAdjuntarCotizacion}
            type="button"
          >
            <IconAdjuntar />
            Adjuntar cotización
          </button>
        </div>
        <div className="buzon-reply__enviar">
          <span className="buzon-reply__hint">Ctrl + Enter para enviar</span>
          <button
            className="buzon-btn buzon-btn--primary"
            onClick={handleEnviar}
            disabled={loading || (!texto.trim() && !adjuntoPrevio)}
            type="button"
          >
            {loading ? 'Enviando...' : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Iconos SVG inline ────────────────────────────────────────────────────────

function IconBandeja() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1" y="3" width="14" height="10" rx="2" />
      <path d="M1 5l7 5 7-5" />
    </svg>
  )
}

function IconEnviados() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M14 2L2 8l4 2 2 4 6-12z" />
    </svg>
  )
}

function IconRedactar() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 3v10M3 8h10" />
    </svg>
  )
}

function IconCotizacion() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="2" width="12" height="12" rx="2" />
      <path d="M5 8h6M5 5h4M5 11h3" />
    </svg>
  )
}

function IconAdjuntar() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 8V5a4 4 0 118 0v6a2 2 0 01-4 0V6" />
    </svg>
  )
}

function IconSync({ spin }) {
  return (
    <svg
      width="14" height="14" viewBox="0 0 16 16" fill="none"
      stroke="currentColor" strokeWidth="1.5"
      style={spin ? { animation: 'buzon-spin 1s linear infinite' } : {}}
    >
      <path d="M13 8A5 5 0 112 5.5" />
      <path d="M2 3v3h3" />
    </svg>
  )
}

// ─── Modal redactar nuevo correo ──────────────────────────────────────────────

function ModalRedactar({ onEnviar, onClose, loading }) {
  const [destinatario, setDestinatario] = useState('')
  const [asunto, setAsunto] = useState('')
  const [cuerpo, setCuerpo] = useState('')

  const handleEnviar = () => {
    if (!destinatario.trim() || !asunto.trim() || !cuerpo.trim()) return
    onEnviar({ destinatario, asunto, cuerpo })
  }

  return (
    <div className="buzon-modal-overlay" onClick={onClose}>
      <div className="buzon-modal" onClick={(e) => e.stopPropagation()}>
        <div className="buzon-modal__header">
          <span className="buzon-modal__title">Nuevo correo</span>
          <button className="buzon-modal__close" onClick={onClose} type="button">✕</button>
        </div>
        <div className="buzon-modal__body">
          <input
            className="buzon-modal__field"
            placeholder="Para: correo@cliente.com"
            value={destinatario}
            onChange={(e) => setDestinatario(e.target.value)}
          />
          <input
            className="buzon-modal__field"
            placeholder="Asunto"
            value={asunto}
            onChange={(e) => setAsunto(e.target.value)}
          />
          <textarea
            className="buzon-modal__body-input"
            placeholder="Escribe el mensaje..."
            rows={8}
            value={cuerpo}
            onChange={(e) => setCuerpo(e.target.value)}
          />
        </div>
        <div className="buzon-modal__footer">
          <button className="buzon-btn buzon-btn--ghost" onClick={onClose} type="button">
            Cancelar
          </button>
          <button
            className="buzon-btn buzon-btn--primary"
            onClick={handleEnviar}
            disabled={loading}
            type="button"
          >
            {loading ? 'Enviando...' : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function BuzonPanel({ onGenerarCotizacion, hiloInicialId = null, adjuntoPendiente = null, onAdjuntoMontado = null }) {
  const {
    hilos: hilosReales,
    hiloActivo: hiloActivoReal,
    bandeja,
    sinLeer,
    loadingHilos,
    loadingHilo,
    loadingEnvio,
    loadingSync,
    error,
    cargarHilos,
    abrirHilo,
    responder,
    redactar,
    sincronizar,
    cerrarHilo,
  } = useBuzon()

  // ── Usar mock mientras el backend no esté listo ──
  // Cuando el backend implemente los endpoints, eliminar estas líneas
  // y usar directamente hilosReales / hiloActivoReal
  const [hilosMock, setHilosMock] = useState(MOCK_HILOS)
  const [hiloActivoMock, setHiloActivoMock] = useState(null)
  const usandoMock = true // Cambiar a false cuando el backend esté listo

  const hilos = usandoMock ? hilosMock : hilosReales
  const hiloActivo = usandoMock ? hiloActivoMock : hiloActivoReal
  // ────────────────────────────────────────────────

  const [bandejaActiva, setBandejaActiva] = useState('inbox')
  const [modalRedactar, setModalRedactar] = useState(false)
  const mensajesEndRef = useRef(null)

  useEffect(() => {
    if (!usandoMock) cargarHilos('inbox')
  }, [])

  // Si se regresa desde Preview con un hilo específico, abrirlo automáticamente
  useEffect(() => {
    if (!hiloInicialId) return
    const hilo = (usandoMock ? hilosMock : hilosReales).find((h) => h.id === hiloInicialId)
    if (hilo) handleAbrirHilo(hilo)
  }, [hiloInicialId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    mensajesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [hiloActivo?.mensajes?.length])

  // Pre-carga el PDF adjunto cuando se viene desde Preview
  const [adjuntoReply, setAdjuntoReply] = useState(null)
  const [modalCotizacion, setModalCotizacion] = useState(false)
  useEffect(() => {
    if (!adjuntoPendiente) return
    setAdjuntoReply(adjuntoPendiente)
    onAdjuntoMontado?.()
  }, [adjuntoPendiente])

  const handleAbrirHilo = (hilo) => {
    if (usandoMock) {
      setHilosMock((prev) =>
        prev.map((h) => (h.id === hilo.id ? { ...h, leido: true } : h))
      )
      setHiloActivoMock(hilo)
    } else {
      abrirHilo(hilo.id)
    }
  }

  const handleCotizacionGenerada = ({ blobUrl, nombreArchivo, cotizacion }) => {
    if (blobUrl && nombreArchivo) {
      setAdjuntoReply({ blobUrl, nombreArchivo })
    }
    setModalCotizacion(false)
  }

  const handleCambiarBandeja = (b) => {
    setBandejaActiva(b)
    if (usandoMock) {
      setHiloActivoMock(null)
    } else {
      cargarHilos(b)
      cerrarHilo()
    }
  }

  const handleResponder = async (texto) => {
    if (usandoMock) {
      const nuevoMsg = {
        id: `m_${Date.now()}`,
        direccion: 'enviado',
        remitente: 'Ventas Electromanfer',
        email: 'ventas@electromanfer.com',
        cuerpo: texto,
        fecha: new Date().toISOString(),
        adjuntos: [],
      }
      setHiloActivoMock((prev) => ({
        ...prev,
        mensajes: [...(prev.mensajes || []), nuevoMsg],
      }))
    } else {
      const result = await responder(hiloActivo.id, { cuerpo: texto })
      if (!result.success) console.error(result.error)
    }
  }

  const handleRedactar = async (payload) => {
    if (!usandoMock) {
      const result = await redactar(payload)
      if (result.success) setModalRedactar(false)
    } else {
      setModalRedactar(false)
    }
  }

  const sinLeerTotal = usandoMock
    ? hilosMock.filter((h) => !h.leido).length
    : sinLeer

  return (
    <div className="buzon-root">

      {/* ── Sidebar ── */}
      <div className="buzon-sidebar">
        <div className="buzon-sidebar__cuenta">
          <div className="buzon-sidebar__dot" />
          <span className="buzon-sidebar__email">ventas@electromanfer.com</span>
        </div>

        <nav className="buzon-sidebar__nav">
          <button
            className={`buzon-nav-item ${bandejaActiva === 'inbox' ? 'buzon-nav-item--activo' : ''}`}
            onClick={() => handleCambiarBandeja('inbox')}
            type="button"
          >
            <IconBandeja />
            <span>Bandeja de entrada</span>
            {sinLeerTotal > 0 && (
              <span className="buzon-nav-badge">{sinLeerTotal}</span>
            )}
          </button>

          <button
            className={`buzon-nav-item ${bandejaActiva === 'sent' ? 'buzon-nav-item--activo' : ''}`}
            onClick={() => handleCambiarBandeja('sent')}
            type="button"
          >
            <IconEnviados />
            <span>Enviados</span>
          </button>
        </nav>

        <div className="buzon-sidebar__divider" />

        <div className="buzon-sidebar__acciones">
          <button
            className="buzon-nav-item"
            onClick={() => setModalRedactar(true)}
            type="button"
          >
            <IconRedactar />
            <span>Redactar</span>
          </button>

          <button
            className="buzon-nav-item buzon-nav-item--cot"
            onClick={() => setModalCotizacion(true)}
            type="button"
          >
            <IconCotizacion />
            <span>Nueva cotización</span>
          </button>

          <button
            className="buzon-nav-item buzon-nav-item--sync"
            onClick={() => !usandoMock && sincronizar()}
            disabled={loadingSync}
            type="button"
          >
            <IconSync spin={loadingSync} />
            <span>Sincronizar</span>
          </button>
        </div>
      </div>

      {/* ── Lista de hilos ── */}
      <div className="buzon-lista">
        <div className="buzon-lista__header">
          <span className="buzon-lista__titulo">
            {bandejaActiva === 'inbox' ? 'Recibidos' : 'Enviados'}
          </span>
          {sinLeerTotal > 0 && bandejaActiva === 'inbox' && (
            <span className="buzon-lista__sin-leer">{sinLeerTotal} sin leer</span>
          )}
        </div>

        <input
          className="buzon-lista__search"
          placeholder="Buscar correos..."
          onChange={(e) => {
            if (!usandoMock) cargarHilos(bandejaActiva, { q: e.target.value })
          }}
        />

        {loadingHilos ? (
          <div className="buzon-lista__empty">Cargando...</div>
        ) : hilos.length === 0 ? (
          <div className="buzon-lista__empty">Sin correos</div>
        ) : (
          hilos.map((hilo) => (
            <HiloItem
              key={hilo.id}
              hilo={hilo}
              activo={hiloActivo?.id === hilo.id}
              onClick={handleAbrirHilo}
            />
          ))
        )}
      </div>

      {/* ── Vista de hilo ── */}
      <div className="buzon-hilo">
        {!hiloActivo ? (
          <div className="buzon-hilo__vacio">
            <div className="buzon-hilo__vacio-icon">
              <IconBandeja />
            </div>
            <span>Selecciona un correo para leerlo</span>
          </div>
        ) : (
          <>
            <div className="buzon-hilo__header">
              <div className="buzon-hilo__asunto">{hiloActivo.asunto}</div>
              <div className="buzon-hilo__meta">
                {hiloActivo.remitente} · {hiloActivo.mensajes?.length || 0} mensaje{hiloActivo.mensajes?.length !== 1 ? 's' : ''}
                {hiloActivo.cotizacion_consecutivo && (
                  <span className="buzon-hilo__cot-tag">{hiloActivo.cotizacion_consecutivo}</span>
                )}
              </div>
            </div>

            <div className="buzon-hilo__acciones">
              {hiloActivo.cotizacion_consecutivo && (
                <button
                  className="buzon-btn buzon-btn--cot"
                  onClick={onGenerarCotizacion}
                  type="button"
                >
                  <IconCotizacion />
                  Generar cotización
                </button>
              )}
              {!hiloActivo.cotizacion_consecutivo && (
                <button
                  className="buzon-btn buzon-btn--cot"
                  onClick={onGenerarCotizacion}
                  type="button"
                >
                  <IconCotizacion />
                  Crear cotización para este cliente
                </button>
              )}
            </div>

            <div className="buzon-hilo__mensajes">
              {loadingHilo ? (
                <div className="buzon-lista__empty">Cargando mensajes...</div>
              ) : (
                hiloActivo.mensajes?.map((msg) => (
                  <MensajeBurbuja key={msg.id} mensaje={msg} />
                ))
              )}
              <div ref={mensajesEndRef} />
            </div>

            <BarraRespuesta
              onEnviar={(texto) => { handleResponder(texto); setAdjuntoReply(null) }}
              loading={loadingEnvio}
              adjuntoPrevio={adjuntoReply}
              onQuitarAdjunto={() => setAdjuntoReply(null)}
              onNuevaCotizacion={() => setModalCotizacion(true)}
              onAdjuntarCotizacion={() => {}}
            />
          </>
        )}
      </div>

      {/* ── Modal cotización desde buzón ── */}
      {modalCotizacion && (
        <ModalCotizacionBuzon
          hilo={hiloActivo ? {
            hiloId: hiloActivo.id,
            remitente: hiloActivo.remitente,
            emailRemitente: hiloActivo.email_remitente,
            asunto: hiloActivo.asunto,
          } : null}
          onClose={() => setModalCotizacion(false)}
          onCotizacionGenerada={handleCotizacionGenerada}
        />
      )}

      {/* ── Modal redactar ── */}
      {modalRedactar && (
        <ModalRedactar
          onEnviar={handleRedactar}
          onClose={() => setModalRedactar(false)}
          loading={loadingEnvio}
        />
      )}

      {error && !usandoMock && (
        <div className="buzon-error">{error}</div>
      )}
    </div>
  )
}