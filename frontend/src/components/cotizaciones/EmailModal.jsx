import { useState, useEffect, useRef } from 'react'
import { listarFirmas, subirFirma, eliminarFirma } from '../../api/firmasApi'
import { generarPdfCotizacion } from '../../utils/pdfGenerator'
import './EmailModal.css'

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

// ── Helper: convierte blob a base64 ──────────────────────────────────────────
function blobToBase64(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => resolve(null)
    reader.readAsDataURL(blob)
  })
}

export default function EmailModal({ cotizacion, onEnviar, onClose, loading = false }) {
  const nombreCliente = cotizacion?.clientes?.nombre_contacto
    || cotizacion?.clientes?.nombre_razon_social
    || 'Cliente'
  const empresa = cotizacion?.clientes?.nombre_razon_social || ''
  const numCot = cotizacion?.consecutivo || ''

  // ── Estado del formulario ─────────────────────────────────────────────────
  const [destino, setDestino] = useState(cotizacion?.cliente?.email || '')
  const [asunto, setAsunto] = useState(`Cotización ${numCot} - ELECTROMANFER LTDA.`)
  const [cuerpo, setCuerpo] = useState(
    `Estimado Cliente ${nombreCliente}:\n\nReciba un cordial saludo. En atención a su solicitud, adjunto cotización:\n\nNúmero Cotización: ${numCot}\n${empresa}\n\nQuedamos atentos a cualquier inquietud o comentario adicional.\n\nAtentamente,`
  )

  // ── Firmas ────────────────────────────────────────────────────────────────
  const [firmas, setFirmas] = useState([])
  const [firmaSeleccionada, setFirmaSeleccionada] = useState(null) // objeto firma
  const [firmaB64, setFirmaB64] = useState(null)
  const [firmaLoading, setFirmaLoading] = useState(true)
  const [mostrarFirma, setMostrarFirma] = useState(true)
  const [selectorAbierto, setSelectorAbierto] = useState(false)

  // ── Recursos de los productos ─────────────────────────────────────────────
  const [imagenes, setImagenes] = useState([])
  const [pdfs, setPdfs] = useState([])
  const [adjImgs, setAdjImgs] = useState([])
  const [adjPdfs, setAdjPdfs] = useState([])
  const [recursosLoading, setRecursosLoading] = useState(true)

  // ── PDF de cotización en base64 ───────────────────────────────────────────
  const pdfB64Ref = useRef(null)
  const fileInputRef = useRef(null)
  const [subiendoFirma, setSubiendoFirma] = useState(false)

  // Cierra con Escape
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

  // Carga firmas, recursos y PDF al montar
  useEffect(() => {
    const cargarTodo = async () => {
      const items = cotizacion?.cotizaciones_items || []

      // 1. Firmas disponibles
      setFirmaLoading(true)
      try {
        const lista = await listarFirmas()
        setFirmas(lista)
        if (lista.length > 0) {
          // Por defecto: primera firma
          setFirmaSeleccionada(lista[0])
          const b64 = await cargarBase64(lista[0].url)
          setFirmaB64(b64)
        }
      } catch {
        setFirmas([])
      } finally {
        setFirmaLoading(false)
      }

      // 2. Recursos de todos los productos
      setRecursosLoading(true)
      const todasImagenes = []
      const todosPdfs = []
      items.forEach((item) => {
        ; (item.imagenes_urls || []).forEach((recurso, i) => {
          const url = typeof recurso === 'string' ? recurso : recurso.url
          const nombre = recurso.nombre || url.split('/').pop()
          todasImagenes.push({ id: `${item.cod_ref}-img-${i}`, nombre, url, cod_ref: item.cod_ref })
        })
          ; (item.fichas_urls || []).forEach((recurso, i) => {
            const url = typeof recurso === 'string' ? recurso : recurso.url
            const nombre = recurso.nombre || url.split('/').pop()
            todosPdfs.push({ id: `${item.cod_ref}-pdf-${i}`, nombre, url, cod_ref: item.cod_ref })
          })
      })
      setImagenes(todasImagenes)
      setPdfs(todosPdfs)
      setAdjImgs(todasImagenes.map((i) => i.id))
      setAdjPdfs(todosPdfs.map((p) => p.id))
      setRecursosLoading(false)

      // 3. PDF como base64
      try {
        const imagenesPorCodRef = {}
        todasImagenes.forEach((img) => {
          if (!imagenesPorCodRef[img.cod_ref]) {
            imagenesPorCodRef[img.cod_ref] = img.url
          }
        })
        const blobUrl = await generarPdfCotizacion(cotizacion, [], [], false, imagenesPorCodRef)
        console.log('blobUrl generado:', blobUrl)
        if (blobUrl) {
          const response = await fetch(blobUrl)
          const blob = await response.blob()
          pdfB64Ref.current = await blobToBase64(blob)
          console.log('PDF listo, tamaño:', pdfB64Ref.current?.length)
        }
      } catch (e) {
        console.error('Error generando PDF:', e)
      }
    }

    cargarTodo()
  }, [cotizacion])

  // Cuando cambia la firma seleccionada, recarga el base64
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
    } catch {
      // silencioso — el mock no falla, el real puede fallar por tipo/tamaño
    } finally {
      setSubiendoFirma(false)
    }
  }

  const handleSeleccionarFirma = async (firma) => {
    setFirmaSeleccionada(firma)
    setSelectorAbierto(false)
    setFirmaLoading(true)
    const b64 = await cargarBase64(firma.url)
    setFirmaB64(b64)
    setFirmaLoading(false)
  }

  const toggleAdj = (id, setFn) => {
    setFn((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  const handleEnviar = () => {
    if (!destino.trim()) return
    const imagenesAdj = imagenes
      .filter((i) => adjImgs.includes(i.id))
      .map((i) => ({ nombre: i.nombre, url: i.url, base64: i.url.startsWith('data:') ? i.url : null }))
    const pdfsAdj = pdfs
      .filter((p) => adjPdfs.includes(p.id))
      .map((p) => ({ nombre: p.nombre, url: p.url }))

    onEnviar(cotizacion.id, {
      destino: destino.trim(),
      asunto,
      cuerpo,
      firma_url: firmaSeleccionada?.url || null,
      firma_id: firmaSeleccionada?.id || null,
      pdf_base64: pdfB64Ref.current,
      adjuntos_imagenes: imagenesAdj,
      adjuntos_pdfs: pdfsAdj,
    })
  }

  const cargando = firmaLoading || recursosLoading


  const handleEliminarFirma = async (firmaId) => {
    try {
      await eliminarFirma(firmaId)
      setFirmas((prev) => prev.filter((f) => f.id !== firmaId))
      if (firmaSeleccionada?.id === firmaId) {
        setFirmaSeleccionada(null)
        setFirmaB64(null)
      }
    } catch {
      // silencioso
    }
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
            <h3 className="email-modal__title">Enviar cotización por email</h3>
            <p className="email-modal__subtitle">{numCot}</p>
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
              rows={6}
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
                {/* Imagen clickeable */}
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
                      <p className="email-modal__firma-error">
                        No hay firmas disponibles.
                      </p>
                      <button
                        type="button"
                        className="email-modal__firma-agregar"
                        onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}
                        disabled={subiendoFirma}
                      >
                        {subiendoFirma
                          ? <span className="email-modal__spinner email-modal__spinner--sm" />
                          : <span className="email-modal__firma-agregar-icon">+</span>
                        }
                        <span>{subiendoFirma ? 'Subiendo...' : 'Agregar firma'}</span>
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png"
                        style={{ display: 'none' }}
                        onChange={handleNuevaFirma}
                      />
                    </div>
                  ) : (
                    <p className="email-modal__firma-error">No se pudo cargar la imagen.</p>
                  )}
                </div>

                {/* Selector de firmas */}
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
                            <img
                              src={firma.url}
                              alt={firma.nombre}
                              className="email-modal__firma-opcion-img"
                              onError={(e) => { e.target.style.display = 'none' }}
                            />
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
                      {/* Botón agregar nueva firma */}
                      <button
                        type="button"
                        className="email-modal__firma-agregar"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={subiendoFirma}
                      >
                        {subiendoFirma ? (
                          <span className="email-modal__spinner email-modal__spinner--sm" />
                        ) : (
                          <span className="email-modal__firma-agregar-icon">+</span>
                        )}
                        <span>{subiendoFirma ? 'Subiendo...' : 'Agregar firma'}</span>
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png"
                        style={{ display: 'none' }}
                        onChange={handleNuevaFirma}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Adjuntos */}
          <div className="email-modal__adjuntos">
            <p className="email-modal__adjuntos-title">
              Adjuntos
              {recursosLoading && <span className="email-modal__dot-loading" />}
            </p>

            {!recursosLoading && imagenes.length > 0 && (
              <>
                <p className="email-modal__adj-grupo">Imágenes de productos</p>
                {imagenes.map((img) => (
                  <button
                    key={img.id}
                    className={`email-modal__adj-item ${adjImgs.includes(img.id) ? 'email-modal__adj-item--on' : ''}`}
                    onClick={() => toggleAdj(img.id, setAdjImgs)}
                    type="button"
                  >
                    <span className={`email-modal__adj-check ${adjImgs.includes(img.id) ? 'email-modal__adj-check--on' : ''}`}>
                      {adjImgs.includes(img.id) && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </span>
                    <span className="email-modal__adj-icon email-modal__adj-icon--img">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                    </span>
                    <span className="email-modal__adj-nombre">
                      <span className="email-modal__adj-cod">{img.cod_ref}</span> {img.nombre}
                    </span>
                  </button>
                ))}
              </>
            )}

            {!recursosLoading && pdfs.length > 0 && (
              <>
                <p className="email-modal__adj-grupo">Fichas técnicas PDF</p>
                {pdfs.map((pdf) => (
                  <button
                    key={pdf.id}
                    className={`email-modal__adj-item ${adjPdfs.includes(pdf.id) ? 'email-modal__adj-item--on' : ''}`}
                    onClick={() => toggleAdj(pdf.id, setAdjPdfs)}
                    type="button"
                  >
                    <span className={`email-modal__adj-check ${adjPdfs.includes(pdf.id) ? 'email-modal__adj-check--on' : ''}`}>
                      {adjPdfs.includes(pdf.id) && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </span>
                    <span className="email-modal__adj-icon email-modal__adj-icon--pdf">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    </span>
                    <span className="email-modal__adj-nombre">
                      <span className="email-modal__adj-cod">{pdf.cod_ref}</span> {pdf.nombre}
                    </span>
                  </button>
                ))}
              </>
            )}

            {!recursosLoading && imagenes.length === 0 && pdfs.length === 0 && (
              <p className="email-modal__adj-empty">
                Sin imágenes ni fichas técnicas. Agrégalas desde Productos → Recursos.
              </p>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="email-modal__footer">
          <button className="email-modal__cancel-btn" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button
            className="email-modal__send-btn"
            onClick={handleEnviar}
            disabled={!destino.trim() || loading || cargando}
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