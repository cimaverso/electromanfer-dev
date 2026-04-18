import { useEffect, useRef, useState, useCallback } from 'react'
import { useRecursos } from '../../hooks/useRecursos'
import './RecursosModal.css'
import { useAuth } from '../../hooks/useAuth'

// ── Tipos aceptados por tab ───────────────────────────────────────────────────
const TIPOS_IMAGEN = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const TIPOS_PDF    = ['application/pdf']

// ── Ícono imagen ──────────────────────────────────────────────────────────────
const IconImagen = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
)

// ── Ícono PDF ─────────────────────────────────────────────────────────────────
const IconPdf = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>
)

// ── Ícono check ───────────────────────────────────────────────────────────────
const IconCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

// ── Ícono trash ───────────────────────────────────────────────────────────────
const IconTrash = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
)

// ── Ícono upload ──────────────────────────────────────────────────────────────
const IconUpload = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
)

// ── Ícono estrella ────────────────────────────────────────────────────────────
const IconStar = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
)

export default function RecursosModal({ codRef, nomRef, onClose }) {
  const [tab, setTab] = useState('imagenes')
  const inputImagenRef = useRef(null)
  const inputPdfRef    = useRef(null)

  // ── Estado drag & drop ────────────────────────────────────────────────────
  const [isDragging, setIsDragging] = useState(false)
  const [dragError,  setDragError]  = useState(null)
  const dragCounter = useRef(0) // contador para evitar flicker al pasar sobre hijos

  const {
    imagenes,
    pdfs,
    loading,
    uploading,
    error,
    setError,
    cargar,
    subir,
    eliminar,
    toggleSel,
    setPrincipal,
    MAX_SELECCION,
  } = useRecursos(codRef)

  const { user } = useAuth()
  const esAdmin = user?.rol === 'ADMINISTRADOR' || user?.rol === 'GERENCIA'

  useEffect(() => { cargar() }, [cargar])

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // ── Handlers drag & drop ──────────────────────────────────────────────────
  const handleDragEnter = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current += 1
    if (dragCounter.current === 1) {
      setIsDragging(true)
      setDragError(null)
    }
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current -= 1
    if (dragCounter.current === 0) setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  const handleDrop = useCallback(async (e) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current = 0
    setIsDragging(false)

    const archivo = e.dataTransfer.files?.[0]
    if (!archivo) return

    const tiposPermitidos = tab === 'imagenes' ? TIPOS_IMAGEN : TIPOS_PDF
    if (!tiposPermitidos.includes(archivo.type)) {
      const esperado = tab === 'imagenes' ? 'imagen (JPG, PNG, WEBP, GIF)' : 'PDF'
      setDragError(`Archivo no válido. Se esperaba un ${esperado}.`)
      return
    }

    setDragError(null)
    await subir(archivo, tab === 'imagenes' ? 'imagen' : 'pdf')
  }, [tab, subir])

  // ── Upload desde input ────────────────────────────────────────────────────
  const handleUpload = async (e, tipo) => {
    const archivo = e.target.files?.[0]
    if (!archivo) return
    e.target.value = ''
    await subir(archivo, tipo)
  }

  const listaActual = tab === 'imagenes' ? imagenes : pdfs
  const tipo        = tab === 'imagenes' ? 'imagen' : 'pdf'
  const selCount    = listaActual.filter((r) => r.seleccionada).length

  return (
    <div
      className="recursos-modal__overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={`recursos-modal ${isDragging ? 'recursos-modal--dragging' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={`Recursos de ${nomRef}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >

        {/* ── Overlay de arrastre ── */}
        {isDragging && (
          <div className="recursos-modal__drop-overlay">
            <div className="recursos-modal__drop-content">
              <IconUpload />
              <span>
                Suelta para subir{' '}
                {tab === 'imagenes' ? 'la imagen' : 'el PDF'}
              </span>
              <span className="recursos-modal__drop-hint">
                {tab === 'imagenes'
                  ? 'JPG, PNG, WEBP o GIF'
                  : 'Solo archivos PDF'}
              </span>
            </div>
          </div>
        )}

        {/* ── Header ── */}
        <div className="recursos-modal__header">
          <div className="recursos-modal__header-info">
            <h3 className="recursos-modal__title">Recursos del producto</h3>
            <p className="recursos-modal__subtitle">{nomRef} · <code>{codRef}</code></p>
          </div>
          <button className="recursos-modal__close" onClick={onClose} aria-label="Cerrar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* ── Tabs ── */}
        <div className="recursos-modal__tabs">
          <button
            className={`recursos-modal__tab ${tab === 'imagenes' ? 'recursos-modal__tab--active' : ''}`}
            onClick={() => { setTab('imagenes'); setError(null); setDragError(null) }}
          >
            <span className="recursos-modal__tab-icon"><IconImagen /></span>
            Imágenes
            <span className="recursos-modal__tab-badge">{imagenes.length}</span>
          </button>
          <button
            className={`recursos-modal__tab ${tab === 'pdfs' ? 'recursos-modal__tab--active' : ''}`}
            onClick={() => { setTab('pdfs'); setError(null); setDragError(null) }}
          >
            <span className="recursos-modal__tab-icon"><IconPdf /></span>
            Fichas PDF
            <span className="recursos-modal__tab-badge">{pdfs.length}</span>
          </button>
        </div>

        {/* ── Toolbar ── */}
        <div className="recursos-modal__toolbar">
          <p className="recursos-modal__sel-info">
            <span className={selCount >= MAX_SELECCION ? 'recursos-modal__sel-info--max' : ''}>
              {selCount} / {MAX_SELECCION} seleccionados
            </span>
            <span className="recursos-modal__sel-hint">
              — se enviarán como adjuntos por email
            </span>
          </p>
          <button
            className="recursos-modal__upload-btn"
            onClick={() => tab === 'imagenes' ? inputImagenRef.current?.click() : inputPdfRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <span className="recursos-modal__spinner" /> : <IconUpload />}
            {uploading ? 'Subiendo...' : `Agregar ${tab === 'imagenes' ? 'imagen' : 'PDF'}`}
          </button>

          <input
            ref={inputImagenRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            style={{ display: 'none' }}
            onChange={(e) => handleUpload(e, 'imagen')}
          />
          <input
            ref={inputPdfRef}
            type="file"
            accept="application/pdf"
            style={{ display: 'none' }}
            onChange={(e) => handleUpload(e, 'pdf')}
          />
        </div>

        {/* ── Error de API ── */}
        {error && (
          <div className="recursos-modal__error">
            <span>⚠ {error}</span>
            <button onClick={() => setError(null)}>✕</button>
          </div>
        )}

        {/* ── Error de drag & drop ── */}
        {dragError && (
          <div className="recursos-modal__error recursos-modal__error--drag">
            <span>⚠ {dragError}</span>
            <button onClick={() => setDragError(null)}>✕</button>
          </div>
        )}

        {/* ── Cuerpo ── */}
        <div className="recursos-modal__body">
          {loading ? (
            <div className="recursos-modal__loading">
              <span className="recursos-modal__spinner recursos-modal__spinner--lg" />
              <span>Cargando recursos...</span>
            </div>
          ) : listaActual.length === 0 ? (
            // Estado vacío — también es zona de drop visible
            <div className="recursos-modal__empty">
              <span className="recursos-modal__empty-icon">
                {tab === 'imagenes' ? <IconImagen /> : <IconPdf />}
              </span>
              <p>No hay {tab === 'imagenes' ? 'imágenes' : 'fichas PDF'} para este producto.</p>
              <p className="recursos-modal__empty-hint">
                Arrastra un archivo aquí o haz clic en "Agregar {tab === 'imagenes' ? 'imagen' : 'PDF'}".
              </p>
            </div>
          ) : (
            <div className={`recursos-modal__grid ${tab === 'pdfs' ? 'recursos-modal__grid--pdfs' : ''}`}>
              {listaActual.map((recurso) => (
                <div
                  key={recurso.id}
                  className={`recursos-modal__item ${recurso.seleccionada ? 'recursos-modal__item--selected' : ''}`}
                >
                  {tab === 'imagenes' ? (
                    <div className="recursos-modal__thumb">
                      <img
                        src={recurso.url}
                        alt={recurso.nombre}
                        onError={(e) => { e.currentTarget.src = '' }}
                      />
                    </div>
                  ) : (
                    <a
                      href={recurso.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="recursos-modal__pdf-thumb"
                      title="Abrir PDF"
                    >
                      <IconPdf />
                    </a>
                  )}

                  <p className="recursos-modal__item-name" title={recurso.nombre}>
                    {recurso.nombre}
                  </p>

                  <div className="recursos-modal__item-actions">
                    {tab === 'imagenes' && (
                      <button
                        className={`recursos-modal__star-btn ${recurso.principal ? 'recursos-modal__star-btn--on' : ''}`}
                        onClick={() => setPrincipal(recurso.id)}
                        title={recurso.principal ? 'Imagen principal' : 'Marcar como principal'}
                      >
                        <IconStar />
                      </button>
                    )}

                    <button
                      className={`recursos-modal__check-btn ${recurso.seleccionada ? 'recursos-modal__check-btn--on' : ''}`}
                      onClick={() => toggleSel(recurso.id, tipo)}
                      title={recurso.seleccionada ? 'Quitar de cotización' : 'Incluir en cotización'}
                    >
                      <IconCheck />
                    </button>

                    {esAdmin && (
                      <button
                        className="recursos-modal__delete-btn"
                        onClick={() => eliminar(recurso.id)}
                        title="Eliminar"
                      >
                        <IconTrash />
                      </button>
                    )}
                  </div>

                  {recurso.seleccionada && (
                    <span className="recursos-modal__selected-badge">✓ En cotización</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="recursos-modal__footer">
          <p className="recursos-modal__footer-note">
            ⭐ La imagen principal aparece en el PDF · ✓ Las seleccionadas se adjuntan en el email
          </p>
          <button className="recursos-modal__done-btn" onClick={onClose}>
            Listo
          </button>
        </div>
      </div>
    </div>
  )
}