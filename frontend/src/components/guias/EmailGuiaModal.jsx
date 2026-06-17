import { useState, useEffect, useRef } from 'react'
import { listarFirmas, subirFirma, eliminarFirma, guardarFirmaPreferida } from '../../api/firmasApi'
import '../cotizaciones/EmailModal.css'

// ── Helper: carga imagen como base64 ─────────────────────────────────────────
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

function fmtFecha(str) {
  if (!str) return '—'
  return new Date(str + 'T00:00:00').toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

const ESTADO_LABELS = {
  generada:    'Generada',
  despachada:  'Despachada',
  en_transito: 'En tránsito',
  entregada:   'Entregada',
  novedad:     'Novedad',
}

export default function EmailGuiaModal({ guia, onEnviar, onClose, loading = false }) {
  const numGuia = guia?.numero_guia || ''

  // ── Estado del formulario ─────────────────────────────────────────────────
  const [destino, setDestino] = useState('')
  const [asunto, setAsunto] = useState(`Guía de envío ${numGuia} - ELECTROMANFER LTDA.`)
  const [cuerpo, setCuerpo] = useState(buildCuerpo(guia))

  // ── Firmas ────────────────────────────────────────────────────────────────
  const [firmas, setFirmas]                   = useState([])
  const [firmaSeleccionada, setFirmaSeleccionada] = useState(null)
  const [firmaB64, setFirmaB64]               = useState(null)
  const [firmaLoading, setFirmaLoading]       = useState(true)
  const [mostrarFirma, setMostrarFirma]       = useState(true)
  const [selectorAbierto, setSelectorAbierto] = useState(false)
  const [subiendoFirma, setSubiendoFirma]     = useState(false)

  const fileInputRef    = useRef(null)
  const adjuntarInputRef = useRef(null)

  // ── Archivos locales adicionales ──────────────────────────────────────────
  const [archivosLocales, setArchivosLocales] = useState([])

  // ── Escape ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        if (selectorAbierto) setSelectorAbierto(false)
        else onClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, selectorAbierto])

  // ── Carga firmas al montar ────────────────────────────────────────────────
  useEffect(() => {
    const cargarFirmas = async () => {
      setFirmaLoading(true)
      try {
        const lista = await listarFirmas()
        setFirmas(lista)
        if (lista.length > 0) {
          setFirmaSeleccionada(lista[0])
          const b64 = await cargarBase64(lista[0].url)
          setFirmaB64(b64)
        }
      } catch {
        setFirmas([])
      } finally {
        setFirmaLoading(false)
      }
    }
    cargarFirmas()
  }, [])

  // ── Handlers firma ────────────────────────────────────────────────────────
  const handleNuevaFirma = async (e) => {
    const archivo = e.target.files?.[0]
    if (!archivo) return
    e.target.value = ''
    setSubiendoFirma(true)
    try {
      const formData = new FormData()
      formData.append('nombre', archivo.name.replace(/\.[^.]+$/, ''))
      formData.append('archivo', archivo)
      const nueva = await subirFirma(formData)
      setFirmas((prev) => [...prev, nueva])
      handleSeleccionarFirma(nueva)
    } catch { /* silencioso */ }
    finally { setSubiendoFirma(false) }
  }

  const handleSeleccionarFirma = async (firma) => {
    setFirmaSeleccionada(firma)
    setSelectorAbierto(false)
    setFirmaLoading(true)
    const b64 = await cargarBase64(firma.url)
    setFirmaB64(b64)
    setFirmaLoading(false)
    try { await guardarFirmaPreferida(firma.id) } catch { /* silencioso */ }
  }

  const handleEliminarFirma = async (firmaId) => {
    try {
      await eliminarFirma(firmaId)
      setFirmas((prev) => prev.filter((f) => f.id !== firmaId))
      if (firmaSeleccionada?.id === firmaId) {
        setFirmaSeleccionada(null)
        setFirmaB64(null)
      }
    } catch { /* silencioso */ }
  }

  // ── Enviar ────────────────────────────────────────────────────────────────
  const handleEnviar = () => {
    if (!destino.trim()) return

    const formData = new FormData()
    formData.append('destino', destino.trim())
    formData.append('asunto', asunto)
    formData.append('cuerpo', cuerpo)
    if (firmaSeleccionada?.url) formData.append('firma_url', firmaSeleccionada.url)

    // Foto de la guía como adjunto si existe
    if (guia?.foto_guia_path) {
      formData.append(
        'adjuntos_imagenes_urls',
        JSON.stringify([{ url: guia.foto_guia_path, nombre: `Foto_guia_${numGuia}.jpg` }])
      )
    }

    // Archivos locales adicionales
    if (archivosLocales.length > 0) {
      archivosLocales.forEach((adj) =>
        formData.append('archivos_extra', adj.archivo, adj.nombreArchivo)
      )
    }

    onEnviar(guia.id, formData)
  }

  return (
    <div
      className="email-modal__overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="email-modal" role="dialog" aria-modal="true">

        {/* ── Header ── */}
        <div className="email-modal__header">
          <div>
            <h3 className="email-modal__title">Enviar guía por email</h3>
            <p className="email-modal__subtitle">{numGuia}</p>
          </div>
          <button className="email-modal__close" onClick={onClose} aria-label="Cerrar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* ── Body ── */}
        <div className="email-modal__body">

          {/* Para */}
          <div className="email-modal__field">
            <label className="email-modal__label">
              Para <span className="email-modal__required">*</span>
            </label>
            <input
              type="email"
              className="email-modal__input"
              placeholder="cliente@empresa.com"
              value={destino}
              onChange={(e) => setDestino(e.target.value)}
              autoFocus
            />
          </div>

          {/* Asunto */}
          <div className="email-modal__field">
            <label className="email-modal__label">Asunto</label>
            <input
              type="text"
              className="email-modal__input"
              value={asunto}
              onChange={(e) => setAsunto(e.target.value)}
            />
          </div>

          {/* Cuerpo */}
          <div className="email-modal__field">
            <label className="email-modal__label">Mensaje</label>
            <textarea
              className="email-modal__textarea"
              rows={8}
              value={cuerpo}
              onChange={(e) => setCuerpo(e.target.value)}
            />
          </div>

          {/* ── Firma ── */}
          <div className="email-modal__firma-section">
            <button
              className="email-modal__firma-toggle"
              onClick={() => setMostrarFirma((v) => !v)}
              type="button"
            >
              <svg
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round"
                style={{ width: 14, height: 14, transform: mostrarFirma ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
              Firma del correo
              {firmaSeleccionada && !firmaLoading && (
                <span className="email-modal__firma-nombre">{firmaSeleccionada.nombre}</span>
              )}
              {firmaLoading && <span className="email-modal__dot-loading" />}
            </button>

            {mostrarFirma && (
              <div className="email-modal__firma-wrapper">
                <div
                  className="email-modal__firma-preview email-modal__firma-preview--clickable"
                  onClick={() => setSelectorAbierto((v) => !v)}
                  title="Clic para cambiar firma"
                >
                  {firmaLoading ? (
                    <div className="email-modal__firma-placeholder">
                      <span className="email-modal__spinner email-modal__spinner--sm" />
                      <span>Cargando firma...</span>
                    </div>
                  ) : firmaB64 ? (
                    <>
                      <img src={firmaB64} alt={firmaSeleccionada?.nombre || 'Firma'} className="email-modal__firma-img" />
                      <div className="email-modal__firma-overlay">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        <span>Cambiar firma</span>
                      </div>
                    </>
                  ) : firmas.length === 0 ? (
                    <div className="email-modal__firma-placeholder">
                      <p className="email-modal__firma-error">No hay firmas disponibles.</p>
                      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png" style={{ display: 'none' }} onChange={handleNuevaFirma} />
                    </div>
                  ) : (
                    <p className="email-modal__firma-error">No se pudo cargar la imagen.</p>
                  )}
                </div>

                {selectorAbierto && firmas.length > 0 && (
                  <div className="email-modal__firma-selector">
                    <p className="email-modal__firma-selector-title">Selecciona una firma</p>
                    <div className="email-modal__firma-opciones">
                      {firmas.map((firma) => (
                        <div key={firma.id} className="email-modal__firma-opcion-wrapper">
                          <button
                            type="button"
                            className={`email-modal__firma-opcion ${firmaSeleccionada?.id === firma.id ? 'email-modal__firma-opcion--active' : ''}`}
                            onClick={() => handleSeleccionarFirma(firma)}
                          >
                            <img src={firma.url} alt={firma.nombre} className="email-modal__firma-opcion-img" onError={(e) => { e.target.style.display = 'none' }} />
                            <div className="email-modal__firma-opcion-info">
                              <span className="email-modal__firma-opcion-nombre">{firma.nombre}</span>
                            </div>
                            {firmaSeleccionada?.id === firma.id && (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16, color: 'var(--color-primary)', flexShrink: 0 }}>
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </button>
                          <button
                            type="button"
                            className="email-modal__firma-eliminar"
                            onClick={(e) => { e.stopPropagation(); handleEliminarFirma(firma.id) }}
                            title="Eliminar firma"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6l-1 14H6L5 6" />
                              <path d="M10 11v6M14 11v6" />
                              <path d="M9 6V4h6v2" />
                            </svg>
                          </button>
                        </div>
                      ))}
                      <button type="button" className="email-modal__firma-agregar" onClick={() => fileInputRef.current?.click()} disabled={subiendoFirma}>
                        {subiendoFirma ? <span className="email-modal__spinner email-modal__spinner--sm" /> : <span className="email-modal__firma-agregar-icon">+</span>}
                        <span>{subiendoFirma ? 'Subiendo...' : 'Agregar firma'}</span>
                      </button>
                      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png" style={{ display: 'none' }} onChange={handleNuevaFirma} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Adjuntos ── */}
          <div className="email-modal__adjuntos">
            <p className="email-modal__adjuntos-title">Adjuntos</p>

            {/* Foto de guía — fija si existe */}
            {guia?.foto_guia_path ? (
              <div className="email-modal__adj-item email-modal__adj-item--fixed">
                <span className="email-modal__adj-check email-modal__adj-check--on">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <span className="email-modal__adj-icon email-modal__adj-icon--img">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                </span>
                <span className="email-modal__adj-nombre">Foto_guia_{numGuia}.jpg</span>
                <span className="email-modal__adj-tag">Incluida</span>
              </div>
            ) : (
              <p className="email-modal__adj-empty">Esta guía no tiene foto adjunta.</p>
            )}

            {/* Archivos locales adicionales */}
            {archivosLocales.length > 0 && (
              <>
                <p className="email-modal__adj-grupo">Archivos adjuntados</p>
                {archivosLocales.map((adj, i) => {
                  const esImagen = /\.(jpg|jpeg|png|gif|webp)$/i.test(adj.nombreArchivo)
                  return (
                    <div key={i} className="email-modal__adj-item email-modal__adj-item--on">
                      <span className={`email-modal__adj-icon ${esImagen ? 'email-modal__adj-icon--img' : 'email-modal__adj-icon--pdf'}`}>
                        {esImagen ? (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <polyline points="21 15 16 10 5 21" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                        )}
                      </span>
                      <span className="email-modal__adj-nombre">{adj.nombreArchivo}</span>
                      <button
                        type="button"
                        className="email-modal__adj-quitar"
                        onClick={() => setArchivosLocales((prev) => prev.filter((_, idx) => idx !== i))}
                        title="Quitar archivo"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}>
                          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  )
                })}
              </>
            )}

            <input
              ref={adjuntarInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => {
                const archivos = Array.from(e.target.files || [])
                if (!archivos.length) return
                setArchivosLocales((prev) => [
                  ...prev,
                  ...archivos.map((archivo) => ({ archivo, nombreArchivo: archivo.name })),
                ])
                e.target.value = ''
              }}
            />
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="email-modal__footer">
          <button className="email-modal__cancel-btn" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button
            type="button"
            className="email-modal__adjuntar-btn"
            onClick={() => adjuntarInputRef.current?.click()}
            disabled={loading}
            title="Adjuntar archivo desde PC"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
            Adjuntar
          </button>
          <button
            className="email-modal__send-btn"
            onClick={handleEnviar}
            disabled={!destino.trim() || loading || firmaLoading}
          >
            {loading ? (
              <>
                <span className="email-modal__spinner" />
                Enviando...
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
                Enviar email
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Cuerpo inicial con datos de la guía ───────────────────────────────────────
function buildCuerpo(guia) {
  if (!guia) return ''
  const estado = ESTADO_LABELS[guia.estado] || guia.estado || '—'
  const fecha  = guia.fecha_despacho
    ? new Date(guia.fecha_despacho + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—'

  return `Estimado cliente,

Le informamos que su pedido ha sido despachado. A continuación los detalles del envío:

──────────────────────────────
Número de guía:    ${guia.numero_guia || '—'}
Transportadora:    ${guia.transportadora || '—'}
Fecha de despacho: ${fecha}
Destinatario:      ${guia.destinatario || '—'}
Ciudad destino:    ${guia.ciudad_destino || '—'}${guia.direccion_destino ? `\nDirección:         ${guia.direccion_destino}` : ''}${guia.unidades ? `\nUnidades:          ${guia.unidades}` : ''}
Estado actual:     ${estado}
──────────────────────────────
${guia.observaciones ? `\nObservaciones: ${guia.observaciones}\n` : ''}
Para rastrear su envío, comuníquese directamente con la transportadora indicando el número de guía.

Quedamos atentos a cualquier inquietud.

Atentamente,`
}