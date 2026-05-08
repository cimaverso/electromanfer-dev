import { useState, useEffect, useRef } from 'react'
import ModalCotizacionBuzon from './ModalCotizacionBuzon'
import { useBuzon } from '../../../hooks/useBuzon'
import axiosClient from '../../../api/axiosClient'
import { listarFirmas } from '../../../api/firmasApi'
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

// ─── Helper: carga imagen como base64 (igual que EmailModal) ─────────────────
function cargarBase64(url) {
  return new Promise((resolve) => {
    if (!url) return resolve(null)
    if (url.startsWith('data:')) return resolve(url)
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      canvas.getContext('2d').drawImage(img, 0, 0)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => resolve(null)
    img.src = url
  })
}

// ─── Mock de datos ────────────────────────────────────────────────────────────
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
        {hilo.mensajes_count > 1 && (
          <span className="buzon-hilo-item__count">{hilo.mensajes_count}</span>
        )}
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
        <Avatar nombre={mensaje.remitente} tipo={enviado ? 'asesor' : 'cliente'} />
        <span className="buzon-msg__nombre">{mensaje.remitente}</span>
        <span className="buzon-msg__hora">{formatFecha(mensaje.fecha)}</span>
      </div>

      {mensaje.cuerpo_html ? (
        <iframe
          srcDoc={mensaje.cuerpo_html}
          className="buzon-msg__iframe"
          sandbox="allow-same-origin"
          title="correo"
        />
      ) : (
        <div className="buzon-msg__cuerpo">{mensaje.cuerpo}</div>
      )}

      {mensaje.adjuntos?.length > 0 && (
        <div className="buzon-msg__adjuntos">
          {mensaje.adjuntos.map((adj, i) => {
            const esImagen = adj.tipo?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(adj.nombre)
            return (
              <div key={i} className="buzon-msg__adjunto">
                <span className={`buzon-msg__adjunto-icon ${esImagen ? 'buzon-msg__adjunto-icon--img' : 'buzon-msg__adjunto-icon--pdf'}`}>
                  {esImagen ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  )}
                </span>
                <span className="buzon-msg__adjunto-nombre">{adj.nombre}</span>
                <span className="buzon-msg__adjunto-size">{adj.tamanio}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── BarraRespuesta ───────────────────────────────────────────────────────────

function BarraRespuesta({ onEnviar, loading, onNuevaCotizacion, onAdjuntarCotizacion, adjuntoPrevio = null, onQuitarAdjunto }) {
  const [texto, setTexto] = useState('')
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)
  const firmaFileRef = useRef(null)
  const apiBase = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:8000'

  // ── Estado acordeón ────────────────────────────────────────────────────────
  const [adjuntosAbierto, setAdjuntosAbierto] = useState(true)
  const [firmaAbierta, setFirmaAbierta] = useState(false)

  // ── Estado firma (mismo patrón que EmailModal) ─────────────────────────────
  const [firmas, setFirmas] = useState([])
  const [firmaSeleccionada, setFirmaSeleccionada] = useState(null)
  const [firmaB64, setFirmaB64] = useState(null)
  const [firmaLoading, setFirmaLoading] = useState(true)
  const [selectorFirmaAbierto, setSelectorFirmaAbierto] = useState(false)
  const [subiendoFirma, setSubiendoFirma] = useState(false)

  // Carga firmas al montar
  useEffect(() => {
    let cancelado = false
    const cargar = async () => {
      setFirmaLoading(true)
      try {
        const lista = await listarFirmas()
        if (cancelado) return
        setFirmas(lista)
        if (lista.length > 0) {
          setFirmaSeleccionada(lista[0])
          const b64 = await cargarBase64(lista[0].url)
          if (!cancelado) setFirmaB64(b64)
        }
      } catch {
        // silencioso — mock no falla
      } finally {
        if (!cancelado) setFirmaLoading(false)
      }
    }
    cargar()
    return () => { cancelado = true }
  }, [])

  const handleSeleccionarFirma = async (firma) => {
    setFirmaSeleccionada(firma)
    setSelectorFirmaAbierto(false)
    setFirmaLoading(true)
    const b64 = await cargarBase64(firma.url)
    setFirmaB64(b64)
    setFirmaLoading(false)
  }

  const handleNuevaFirma = async (e) => {
    const archivo = e.target.files?.[0]
    if (!archivo) return
    e.target.value = ''
    setSubiendoFirma(true)
    try {
      // Importa dinámicamente para no romper si firmasApi no exporta subirFirma
      const { subirFirma } = await import('../../../api/firmasApi')
      const formData = new FormData()
      formData.append('nombre', archivo.name.replace(/\.[^.]+$/, ''))
      formData.append('archivo', archivo)
      const nueva = await subirFirma(formData)
      setFirmas((prev) => [...prev, nueva])
      handleSeleccionarFirma(nueva)
    } catch {
      // silencioso
    } finally {
      setSubiendoFirma(false)
    }
  }

  // ── Helpers adjuntos ───────────────────────────────────────────────────────
  const handleEnviar = () => {
    if (!texto.trim() && !adjuntoPrevio) return
    onEnviar(texto, firmaSeleccionada)
    setTexto('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleEnviar()
  }

  const resolverNombre = (adj) => {
    if (typeof adj === 'string') return adj.split('/').pop() || 'archivo'
    return adj?.nombre || adj?.url?.split('/').pop() || 'archivo'
  }

  const numImagenes = adjuntoPrevio?.adjuntosImagenes?.length || 0
  const numFichas = adjuntoPrevio?.adjuntosPdfs?.length || 0
  const numLocales = adjuntoPrevio?.archivosLocales?.length || 0
  const totalAdjuntos = (adjuntoPrevio?.nombreArchivo ? 1 : 0) + numImagenes + numFichas + numLocales
  const hayAdjuntos = totalAdjuntos > 0

  return (
    <div className="buzon-reply">

      {/* ── Acordeón: Adjuntos ── */}
      {hayAdjuntos && (
        <div className="buzon-acordeon">
          {/* Cabecera del acordeón adjuntos */}
          <button
            type="button"
            className="buzon-acordeon__header"
            onClick={() => setAdjuntosAbierto((v) => !v)}
          >
            <span className="buzon-acordeon__icon buzon-acordeon__icon--pdf">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}>
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
            </span>
            <span className="buzon-acordeon__label">
              Adjuntos
              <span className="buzon-acordeon__badge">{totalAdjuntos}</span>
            </span>
            <button
              type="button"
              className="buzon-acordeon__quitar"
              onClick={(e) => { e.stopPropagation(); onQuitarAdjunto() }}
              title="Quitar todos los adjuntos"
            >
              ✕
            </button>
            <svg
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
              className="buzon-acordeon__chevron"
              style={{ transform: adjuntosAbierto ? 'rotate(180deg)' : 'rotate(0deg)' }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {/* Contenido colapsable adjuntos */}
          <div className={`buzon-acordeon__body ${adjuntosAbierto ? 'buzon-acordeon__body--open' : ''}`}>
            <div className="buzon-acordeon__content">

              {/* PDF cotización */}
              {adjuntoPrevio?.nombreArchivo && (
                <div className="buzon-reply__ficha-item">
                  <span className="buzon-reply__adjunto-icon buzon-reply__adjunto-icon--pdf">PDF</span>
                  <span className="buzon-reply__ficha-nombre">{adjuntoPrevio.nombreArchivo}</span>
                </div>
              )}

              {/* Imágenes de productos */}
              {numImagenes > 0 && (
                <div className="buzon-acordeon__grupo">
                  <span className="buzon-acordeon__grupo-label">
                    🖼 {numImagenes} imagen{numImagenes !== 1 ? 'es' : ''} de productos
                  </span>
                  {adjuntoPrevio.adjuntosImagenes.map((adj, i) => (
                    <div key={i} className="buzon-reply__ficha-item">
                      <span className="buzon-reply__adjunto-icon buzon-reply__adjunto-icon--img-sm">IMG</span>
                      <span className="buzon-reply__ficha-nombre" title={resolverNombre(adj)}>
                        {resolverNombre(adj)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Fichas técnicas */}
              {numFichas > 0 && (
                <div className="buzon-acordeon__grupo">
                  <span className="buzon-acordeon__grupo-label">
                    📄 {numFichas} ficha{numFichas !== 1 ? 's' : ''} técnica{numFichas !== 1 ? 's' : ''}
                  </span>
                  {adjuntoPrevio.adjuntosPdfs.map((adj, i) => (
                    <div key={i} className="buzon-reply__ficha-item">
                      <span className="buzon-reply__adjunto-icon buzon-reply__adjunto-icon--sm">PDF</span>
                      <span className="buzon-reply__ficha-nombre" title={resolverNombre(adj)}>
                        {resolverNombre(adj)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Archivos locales adjuntados manualmente */}
              {numLocales > 0 && (
                <div className="buzon-acordeon__grupo">
                  <span className="buzon-acordeon__grupo-label">
                    📎 {numLocales} archivo{numLocales !== 1 ? 's' : ''} adjunto{numLocales !== 1 ? 's' : ''}
                  </span>
                  {adjuntoPrevio.archivosLocales.map((adj, i) => {
                    const esImagen = /\.(jpg|jpeg|png|gif|webp)$/i.test(adj.nombreArchivo)
                    return (
                      <div key={i} className="buzon-reply__ficha-item">
                        <span className={`buzon-reply__adjunto-icon ${esImagen ? 'buzon-reply__adjunto-icon--img-sm' : 'buzon-reply__adjunto-icon--sm'}`}>
                          {esImagen ? 'IMG' : 'PDF'}
                        </span>
                        <span className="buzon-reply__ficha-nombre" title={adj.nombreArchivo}>
                          {adj.nombreArchivo}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ── Acordeón: Firma ── */}
      <div className="buzon-acordeon">
        {/* Cabecera del acordeón firma */}
        <button
          type="button"
          className="buzon-acordeon__header"
          onClick={() => setFirmaAbierta((v) => !v)}
        >
          <span className="buzon-acordeon__icon buzon-acordeon__icon--firma">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}>
              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
            </svg>
          </span>
          <span className="buzon-acordeon__label">
            Firma del correo
            {firmaSeleccionada && !firmaLoading && (
              <span className="buzon-acordeon__firma-nombre">{firmaSeleccionada.nombre}</span>
            )}
            {firmaLoading && <span className="buzon-acordeon__dot-loading" />}
          </span>
          <svg
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"
            className="buzon-acordeon__chevron"
            style={{ transform: firmaAbierta ? 'rotate(180deg)' : 'rotate(0deg)' }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {/* Contenido colapsable firma */}
        <div className={`buzon-acordeon__body ${firmaAbierta ? 'buzon-acordeon__body--open' : ''}`}>
          <div className="buzon-acordeon__content buzon-acordeon__content--firma">

            {firmaLoading ? (
              <div className="buzon-acordeon__firma-placeholder">
                <span className="buzon-acordeon__spinner" />
                <span>Cargando firma...</span>
              </div>
            ) : firmaB64 ? (
              <div
                className="buzon-acordeon__firma-preview"
                onClick={() => setSelectorFirmaAbierto((v) => !v)}
                title="Clic para cambiar firma"
              >
                <img src={firmaB64} alt={firmaSeleccionada?.nombre || 'Firma'} className="buzon-acordeon__firma-img" />
                <div className="buzon-acordeon__firma-overlay">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  <span>Cambiar firma</span>
                </div>
              </div>
            ) : firmas.length === 0 ? (
              <div className="buzon-acordeon__firma-placeholder">
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                  No hay firmas disponibles.
                </span>
                <button
                  type="button"
                  className="buzon-acordeon__firma-agregar"
                  onClick={() => firmaFileRef.current?.click()}
                  disabled={subiendoFirma}
                >
                  {subiendoFirma ? <span className="buzon-acordeon__spinner" /> : '+'}
                  {subiendoFirma ? 'Subiendo...' : 'Agregar firma'}
                </button>
              </div>
            ) : (
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-danger)', margin: 0 }}>
                No se pudo cargar la imagen.
              </p>
            )}

            {/* Selector de firmas */}
            {selectorFirmaAbierto && firmas.length > 0 && (
              <div className="buzon-acordeon__firma-selector">
                <p className="buzon-acordeon__firma-selector-title">Selecciona una firma</p>
                {firmas.map((firma) => (
                  <button
                    key={firma.id}
                    type="button"
                    className={`buzon-acordeon__firma-opcion ${firmaSeleccionada?.id === firma.id ? 'buzon-acordeon__firma-opcion--active' : ''}`}
                    onClick={() => handleSeleccionarFirma(firma)}
                  >
                    <img
                      src={firma.url}
                      alt={firma.nombre}
                      className="buzon-acordeon__firma-opcion-img"
                      onError={(e) => { e.target.style.display = 'none' }}
                    />
                    <span className="buzon-acordeon__firma-opcion-nombre">{firma.nombre}</span>
                    {firmaSeleccionada?.id === firma.id && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, color: 'var(--color-primary)', flexShrink: 0 }}>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                ))}
                <button
                  type="button"
                  className="buzon-acordeon__firma-agregar"
                  onClick={() => firmaFileRef.current?.click()}
                  disabled={subiendoFirma}
                >
                  {subiendoFirma ? <span className="buzon-acordeon__spinner" /> : '+'}
                  {subiendoFirma ? 'Subiendo...' : 'Agregar firma'}
                </button>
              </div>
            )}

            <input
              ref={firmaFileRef}
              type="file"
              accept="image/jpeg,image/png"
              style={{ display: 'none' }}
              onChange={handleNuevaFirma}
            />

          </div>
        </div>
      </div>

      {/* ── Textarea ── */}
      <textarea
        ref={textareaRef}
        className="buzon-reply__input"
        placeholder="Escribe tu respuesta..."
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={3}
      />

      {/* ── Footer: acciones + enviar ── */}
      <div className="buzon-reply__footer">
        <div className="buzon-reply__acciones">
          <button className="buzon-btn buzon-btn--cot" onClick={onNuevaCotizacion} type="button">
            <IconCotizacion />
            Generar cotización
          </button>
          <button className="buzon-btn buzon-btn--ghost" onClick={() => fileInputRef.current?.click()} type="button">
            <IconAdjuntar />
            Adjuntar archivo
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => {
              const archivos = Array.from(e.target.files || [])
              if (!archivos.length) return
              const adjuntos = archivos.map((archivo) => ({
                blobUrl: URL.createObjectURL(archivo),
                nombreArchivo: archivo.name,
                esLocal: true,
                archivo,
              }))
              onAdjuntarCotizacion(adjuntos)
              e.target.value = ''
            }}
          />
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

function IconChevron({ collapsed }) {
  return (
    <svg
      width="13" height="13" viewBox="0 0 16 16" fill="none"
      stroke="currentColor" strokeWidth="1.5"
      style={{ transition: 'transform 0.25s', transform: collapsed ? 'rotate(90deg)' : 'rotate(-90deg)' }}
    >
      <path d="M4 6l4 4 4-4" />
    </svg>
  )
}

// ─── Modal redactar ───────────────────────────────────────────────────────────

function ModalRedactar({ onEnviar, onClose, loading }) {
  const [destinatario, setDestinatario] = useState('')
  const [asunto, setAsunto] = useState('')
  const [cuerpo, setCuerpo] = useState('')

  const handleEnviar = () => {
    if (!destinatario.trim() || !asunto.trim() || !cuerpo.trim()) return
    onEnviar({ destinatario, asunto, cuerpo })
  }

  return (
    <div className="buzon-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="buzon-modal">
        <div className="buzon-modal__header">
          <span className="buzon-modal__title">Redactar correo</span>
          <button className="buzon-modal__close" onClick={onClose} type="button">✕</button>
        </div>
        <div className="buzon-modal__body">
          <input
            className="buzon-modal__field"
            placeholder="Para: destinatario@email.com"
            value={destinatario}
            onChange={(e) => setDestinatario(e.target.value)}
            autoFocus
          />
          <input
            className="buzon-modal__field"
            placeholder="Asunto"
            value={asunto}
            onChange={(e) => setAsunto(e.target.value)}
          />
          <textarea
            className="buzon-modal__body-input"
            placeholder="Escribe tu mensaje..."
            rows={6}
            value={cuerpo}
            onChange={(e) => setCuerpo(e.target.value)}
          />
        </div>
        <div className="buzon-modal__footer">
          <button className="buzon-btn" onClick={onClose} type="button">Cancelar</button>
          <button
            className="buzon-btn buzon-btn--primary"
            onClick={handleEnviar}
            disabled={loading || !destinatario.trim() || !asunto.trim() || !cuerpo.trim()}
            type="button"
          >
            {loading ? 'Enviando...' : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── BuzonPanel principal ─────────────────────────────────────────────────────

export default function BuzonPanel() {
const {
    hilos: hilosApi,
    hiloActivo: hiloActivoApi,
    loadingHilos,
    loadingHilo,
    loadingEnvio,
    loadingSync,
    sinLeer,
    error,
    cargarHilos,
    abrirHilo,
    responder,
    redactar,
    sincronizar,
  } = useBuzon()

  const usandoMock = false // ← cambiar a false cuando el backend esté listo

  const [hilosMock, setHilosMock] = useState(MOCK_HILOS)
  const [hiloActivoMock, setHiloActivoMock] = useState(null)
  const [bandejaActiva, setBandejaActiva] = useState('inbox')
  const [modalCotizacion, setModalCotizacion] = useState(false)
  const [modalRedactar, setModalRedactar] = useState(false)
  const [adjuntoReply, setAdjuntoReply] = useState(null)
  const [sidebarColapsado, setSidebarColapsado] = useState(false)
  const mensajesEndRef = useRef(null)

  const hilos = usandoMock ? hilosMock : hilosApi
  const hiloActivo = usandoMock ? hiloActivoMock : hiloActivoApi

  useEffect(() => {
    if (mensajesEndRef.current) {
      mensajesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [hiloActivo?.mensajes?.length])

  const hiloEsActivo = (hilo) => {
    if (usandoMock) return hiloActivoMock?.id === hilo.id
    return hiloActivoApi?.id === hilo.id
  }

  const handleAbrirHilo = (hilo) => {
    if (usandoMock) {
      setHiloActivoMock(hilo)
      setHilosMock((prev) =>
        prev.map((h) => (h.id === hilo.id ? { ...h, leido: true } : h))
      )
    } else {
      abrirHilo(hilo.id)
    }
  }

  const handleResponder = async (texto) => {
    if (!hiloActivo) return
    if (usandoMock) {
      const nuevo = {
        id: `m-${Date.now()}`,
        direccion: 'enviado',
        remitente: 'Ventas Electromanfer',
        email: 'ventas@electromanfer.com',
        cuerpo: texto,
        fecha: new Date().toISOString(),
        adjuntos: adjuntoReply?.nombreArchivo
          ? [{ nombre: adjuntoReply.nombreArchivo, tipo: 'pdf', tamanio: '~150 KB' }]
          : [],
      }
      setHilosMock((prev) =>
        prev.map((h) =>
          h.id === hiloActivo.id
            ? { ...h, mensajes: [...(h.mensajes || []), nuevo] }
            : h
        )
      )
      setHiloActivoMock((prev) =>
        prev ? { ...prev, mensajes: [...(prev.mensajes || []), nuevo] } : prev
      )
    } else {
      await responder(hiloActivo.id, { cuerpo: texto, adjuntos: adjuntoReply ? [adjuntoReply] : [] })
    }
  }

  const handleCotizacionGenerada = (adjuntos) => {
    setAdjuntoReply(adjuntos)
    setModalCotizacion(false)
  }

  const handleCambiarBandeja = (bandeja) => {
    setBandejaActiva(bandeja)
    if (!usandoMock) cargarHilos(bandeja)
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

  const gridColumns = sidebarColapsado ? '52px 340px 1fr' : '220px 340px 1fr'

  return (
    <div
      className={`buzon-root ${sidebarColapsado ? 'buzon-root--collapsed' : ''}`}
      style={{ gridTemplateColumns: gridColumns }}
    >

      {/* ── Sidebar ── */}
      <div className={`buzon-sidebar ${sidebarColapsado ? 'buzon-sidebar--collapsed' : ''}`}>

        <button
          className="buzon-sidebar__toggle"
          onClick={() => setSidebarColapsado((v) => !v)}
          type="button"
          title={sidebarColapsado ? 'Expandir panel' : 'Colapsar panel'}
        >
          <IconChevron collapsed={sidebarColapsado} />
        </button>

        <div className="buzon-sidebar__cuenta">
          <div className="buzon-sidebar__dot" />
          {!sidebarColapsado && (
            <span className="buzon-sidebar__email">ventas@electromanfer.com</span>
          )}
        </div>

        <nav className="buzon-sidebar__nav">
          <button
            className={`buzon-nav-item ${bandejaActiva === 'inbox' ? 'buzon-nav-item--activo' : ''}`}
            onClick={() => handleCambiarBandeja('inbox')}
            type="button"
            title="Bandeja de entrada"
          >
            <IconBandeja />
            {!sidebarColapsado && <span>Bandeja de entrada</span>}
            {!sidebarColapsado && sinLeerTotal > 0 && (
              <span className="buzon-nav-badge">{sinLeerTotal}</span>
            )}
            {sidebarColapsado && sinLeerTotal > 0 && (
              <span className="buzon-nav-badge--dot" />
            )}
          </button>

          <button
            className={`buzon-nav-item ${bandejaActiva === 'sent' ? 'buzon-nav-item--activo' : ''}`}
            onClick={() => handleCambiarBandeja('sent')}
            type="button"
            title="Enviados"
          >
            <IconEnviados />
            {!sidebarColapsado && <span>Enviados</span>}
          </button>
        </nav>

        <div className="buzon-sidebar__divider" />

        <div className="buzon-sidebar__acciones">
          <button
            className="buzon-nav-item"
            onClick={() => setModalRedactar(true)}
            type="button"
            title="Redactar"
          >
            <IconRedactar />
            {!sidebarColapsado && <span>Redactar</span>}
          </button>

          <button
            className="buzon-nav-item buzon-nav-item--cot"
            onClick={() => setModalCotizacion(true)}
            type="button"
            title="Nueva cotización"
          >
            <IconCotizacion />
            {!sidebarColapsado && <span>Nueva cotización</span>}
          </button>

          <button
            className="buzon-nav-item buzon-nav-item--sync"
            onClick={() => !usandoMock && sincronizar()}
            disabled={loadingSync}
            type="button"
            title="Sincronizar"
          >
            <IconSync spin={loadingSync} />
            {!sidebarColapsado && <span>Sincronizar</span>}
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
              activo={hiloEsActivo(hilo)}
              onClick={handleAbrirHilo}
            />
          ))
        )}
      </div>

      {/* ── Vista de hilo ── */}
      <div className="buzon-hilo">
        {!hiloActivo ? (
          <div className="buzon-hilo__vacio">
            <div className="buzon-hilo__vacio-icon"><IconBandeja /></div>
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
              onEnviar={(texto, firma) => { handleResponder(texto); setAdjuntoReply(null) }}
              loading={loadingEnvio}
              adjuntoPrevio={adjuntoReply}
              onQuitarAdjunto={() => setAdjuntoReply(null)}
              onNuevaCotizacion={() => setModalCotizacion(true)}
              onAdjuntarCotizacion={(adjuntos) => {
                const lista = Array.isArray(adjuntos) ? adjuntos : [adjuntos]
                setAdjuntoReply({ archivosLocales: lista })
              }}
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