import { useState, useEffect, useRef } from 'react'
import { generarPdfCotizacion } from '../../utils/pdfGenerator'
import EmailModal from './EmailModal'
import './PdfPreview.css'
import { getRecursos } from '../../api/recursosApi'

function formatCOP(value) {
  if (!value && value !== 0) return '—'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value)
}

export default function PdfPreview({
  cotizacion,
  onEnviarEmail,
  onEnviarWhatsapp,
  loadingEnvio,
  imagenesDisponibles = [],
  pdfsDisponibles = [],
}) {
  const [blobUrl, setBlobUrl] = useState(null)
  const [generando, setGenerando] = useState(false)
  const [mostrarEmailModal, setMostrarEmailModal] = useState(false)
  const [mostrarWaForm, setMostrarWaForm] = useState(false)
  const [telefonoWa, setTelefonoWa] = useState('')
  const blobUrlRef = useRef(null)

  // Genera el PDF como blob al montar o cuando cambia la cotización
  useEffect(() => {
    if (!cotizacion) return

    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }

    setBlobUrl(null)
    setGenerando(true)

    async function generarConImagenes() {
      const items = cotizacion.cotizaciones_items || []
      const imagenesPorCodRef = {}
      const codRefs = [...new Set(items.map((i) => i.cod_ref))]

      await Promise.all(
        codRefs.map(async (cod) => {
          try {
            const recursos = await getRecursos(cod)
            const principal = recursos.find((r) => r.tipo === 'imagen' && r.principal)
              || recursos.find((r) => r.tipo === 'imagen')
            if (principal) imagenesPorCodRef[cod] = principal.url
          } catch {
            const item = items.find((i) => i.cod_ref === cod)
            if (item?.imagen_url) imagenesPorCodRef[cod] = item.imagen_url
          }
        })
      )

      const urlsImagenes = imagenesDisponibles.map((i) => i.url)
      const urlsPdfs = pdfsDisponibles.map((p) => p.url)
      return generarPdfCotizacion(cotizacion, urlsImagenes, urlsPdfs, false, imagenesPorCodRef)
    }

    generarConImagenes()
      .then((url) => {
        blobUrlRef.current = url
        setBlobUrl(url)
      })
      .catch(() => setBlobUrl(null))
      .finally(() => setGenerando(false))

    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
      }
    }
  }, [cotizacion])

  // Sincroniza teléfono WA con cliente
  useEffect(() => {
    setTelefonoWa(cotizacion?.cliente?.telefono || '')
  }, [cotizacion])

  if (!cotizacion) {
    return (
      <div className="pdf-preview pdf-preview--empty">
        <div className="pdf-preview__empty-icon">📄</div>
        <p className="pdf-preview__empty-text">
          Genera una cotización para ver la vista previa aquí.
        </p>
      </div>
    )
  }

  // ── Descarga reutilizando el blob ya generado ─────────────────────────────
  const handleDescargarPdf = () => {
    if (!blobUrl) return
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = `${cotizacion.consecutivo}.pdf`
    a.click()
  }

  const handleEnviarEmailModal = (id, payload) => {
    onEnviarEmail(id, payload)
    setMostrarEmailModal(false)
  }

  const handleWhatsapp = () => {
    const tel = telefonoWa.replace(/\D/g, '')
    if (!tel) return
    onEnviarWhatsapp(cotizacion.id, {
      telefono: tel.startsWith('57') ? tel : `57${tel}`,
      mensaje: `Hola, te compartimos la cotización *${cotizacion.consecutivo}* generada por ELECTROMANFER LTDA.\n\nQuedamos atentos.`,
    })
    setMostrarWaForm(false)
  }

  return (
    <>
      <div className="pdf-preview">

        {/* ── Barra superior ── */}
        <div className="pdf-preview__toolbar">
          <div className="pdf-preview__toolbar-left">
            <span className="pdf-preview__consecutivo">{cotizacion.consecutivo}</span>
            <span className="u-badge u-badge--success">Generada</span>
            <div className="pdf-preview__totales">
              <span className="pdf-preview__total-chip">
                Sub: <strong>{formatCOP(cotizacion.subtotal)}</strong>
              </span>
              <span className="pdf-preview__total-chip">
                IVA: <strong>{formatCOP(cotizacion.iva)}</strong>
              </span>
              <span className="pdf-preview__total-chip pdf-preview__total-chip--main">
                Total: <strong>{formatCOP(cotizacion.total)}</strong>
              </span>
            </div>
          </div>

          <div className="pdf-preview__toolbar-actions">
            {/* Descargar */}
            <button
              className="pdf-preview__action-btn pdf-preview__action-btn--primary"
              onClick={handleDescargarPdf}
              disabled={generando || !blobUrl}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Descargar PDF
            </button>

            {/* Email */}
            <button
              className="pdf-preview__action-btn"
              onClick={() => { setMostrarEmailModal(true); setMostrarWaForm(false) }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              Email
            </button>

            {/* WhatsApp */}
            <button
              className="pdf-preview__action-btn pdf-preview__action-btn--whatsapp"
              onClick={() => { setMostrarWaForm((v) => !v); setMostrarEmailModal(false) }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              WhatsApp
            </button>
          </div>
        </div>

        {/* Form WhatsApp inline */}
        {mostrarWaForm && (
          <div className="pdf-preview__wa-form">
            <span className="pdf-preview__wa-form-label">Número (sin +57):</span>
            <input
              type="text"
              className="pdf-preview__wa-input"
              placeholder="3001234567"
              value={telefonoWa}
              onChange={(e) => setTelefonoWa(e.target.value)}
              autoFocus
            />
            <button
              className="pdf-preview__wa-btn"
              disabled={!telefonoWa.trim() || loadingEnvio}
              onClick={handleWhatsapp}
            >
              Abrir WhatsApp
            </button>
            <p className="pdf-preview__wa-note">
              El PDF se adjunta manualmente en WhatsApp Web.
            </p>
          </div>
        )}

        {/* ── Visor PDF ── */}
        <div className="pdf-preview__viewer">
          {generando && (
            <div className="pdf-preview__loading">
              <span className="pdf-preview__spinner" />
              <span>Generando vista previa...</span>
            </div>
          )}

          {!generando && blobUrl && (
            <iframe
              src={blobUrl}
              className="pdf-preview__iframe"
              title={`Vista previa ${cotizacion.consecutivo}`}
            />
          )}

          {!generando && !blobUrl && (
            <div className="pdf-preview__viewer-error">
              <span>No se pudo generar la vista previa.</span>
              <button onClick={() => window.location.reload()}>Reintentar</button>
            </div>
          )}
        </div>
      </div>

      {mostrarEmailModal && (
        <EmailModal
          cotizacion={cotizacion}
          imagenesDisponibles={imagenesDisponibles}
          pdfsDisponibles={pdfsDisponibles}
          onEnviar={handleEnviarEmailModal}
          onClose={() => setMostrarEmailModal(false)}
          loading={loadingEnvio}
        />
      )}
    </>
  )
}