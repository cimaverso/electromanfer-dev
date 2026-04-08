import { useState, useEffect, useRef } from 'react'
import { getRecursos } from '../../api/recursosApi'
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

  // ── Firma imagen ──────────────────────────────────────────────────────────
  const [firmaB64, setFirmaB64] = useState(null)
  const [firmaLoading, setFirmaLoading] = useState(true)
  const [mostrarFirma, setMostrarFirma] = useState(true)

  // ── Recursos de los productos ─────────────────────────────────────────────
  const [imagenes, setImagenes] = useState([])  // [{ id, nombre, url, cod_ref }]
  const [pdfs, setPdfs] = useState([])  // [{ id, nombre, url, cod_ref }]
  const [adjImgs, setAdjImgs] = useState([])  // ids seleccionados
  const [adjPdfs, setAdjPdfs] = useState([])  // ids seleccionados
  const [recursosLoading, setRecursosLoading] = useState(true)

  // ── PDF de cotización en base64 ───────────────────────────────────────────
  const pdfB64Ref = useRef(null)

  // Cierra con Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Carga firma, recursos y PDF en paralelo al montar
  useEffect(() => {
    const cargarTodo = async () => {
      const items = cotizacion?.cotizaciones_items || []

      // 1. Firma
      cargarBase64('/firma_harvie.jpeg')
        .then(setFirmaB64)
        .finally(() => setFirmaLoading(false))

      // 2. Recursos de todos los productos
      setRecursosLoading(true)
      const todasImagenes = []
      const todosPdfs = []

      items.forEach((item) => {
        (item.imagenes_urls || []).forEach((url, i) => {
          todasImagenes.push({ id: `${item.cod_ref}-img-${i}`, nombre: url.split('/').pop(), url, cod_ref: item.cod_ref })
        });
        (item.fichas_urls || []).forEach((url, i) => {
          todosPdfs.push({ id: `${item.cod_ref}-pdf-${i}`, nombre: url.split('/').pop(), url, cod_ref: item.cod_ref })
        })
      })  

      setImagenes(todasImagenes)
      setPdfs(todosPdfs)
      setAdjImgs(todasImagenes.map((i) => i.id))
      setAdjPdfs(todosPdfs.map((p) => p.id))
      setRecursosLoading(false)

      // 3. Genera PDF como blob y lo convierte a base64
      try {
        const blob = await generarPdfCotizacion(cotizacion, [], [], false)
          .then((blobUrl) => fetch(blobUrl).then((r) => r.blob()))
        pdfB64Ref.current = await blobToBase64(blob)
      } catch { /* el backend puede generarlo también */ }
    }

    cargarTodo()
  }, [cotizacion])

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
      firma_base64: firmaB64,           // imagen firma para embeber en HTML
      pdf_base64: pdfB64Ref.current,  // PDF cotización
      adjuntos_imagenes: imagenesAdj,
      adjuntos_pdfs: pdfsAdj,
    })
  }

  const cargando = firmaLoading || recursosLoading

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

          {/* Firma imagen */}
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
              {firmaLoading && <span className="email-modal__dot-loading" />}
            </button>

            {mostrarFirma && (
              <div className="email-modal__firma-preview">
                {firmaLoading ? (
                  <div className="email-modal__firma-placeholder">
                    <span className="email-modal__spinner email-modal__spinner--sm" />
                    <span>Cargando firma...</span>
                  </div>
                ) : firmaB64 ? (
                  <img
                    src={firmaB64}
                    alt="Firma Harvey Cano - Electromanfer"
                    className="email-modal__firma-img"
                  />
                ) : (
                  <p className="email-modal__firma-error">
                    No se pudo cargar la firma. Verifica que <code>public/harvie_firma.png</code> existe.
                  </p>
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


            {/* Imágenes */}
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

            {/* Fichas PDF */}
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