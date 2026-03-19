import { useState } from 'react'
import PrimaryButton from '../common/PrimaryButton'
import { generarPdfCotizacion } from '../../utils/pdfGenerator'
import './PdfPreview.css'

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
}) {
  const [emailDestino, setEmailDestino] = useState(
    cotizacion?.cliente?.email || ''
  )
  const [telefonoWa, setTelefonoWa] = useState(
    cotizacion?.cliente?.telefono || ''
  )
  const [mostrarEmailForm, setMostrarEmailForm] = useState(false)
  const [mostrarWaForm, setMostrarWaForm] = useState(false)

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

  const handleDescargarPdf = () => {
    generarPdfCotizacion(cotizacion)
  }

  const handleEnviarEmail = () => {
    if (!emailDestino.trim()) return
    onEnviarEmail(cotizacion.id, {
      destino: emailDestino.trim(),
      asunto: `Cotización ${cotizacion.consecutivo} - ELECTROMANFER`,
      mensaje: 'Adjuntamos la cotización solicitada. Quedamos atentos.',
    })
    setMostrarEmailForm(false)
  }

  const handleWhatsapp = () => {
    const tel = telefonoWa.replace(/\D/g, '')
    if (!tel) return
    onEnviarWhatsapp(cotizacion.id, {
      telefono: tel.startsWith('57') ? tel : `57${tel}`,
      mensaje: `Hola, te compartimos la cotización ${cotizacion.consecutivo} generada por ELECTROMANFER.`,
    })
    setMostrarWaForm(false)
  }

  return (
    <div className="pdf-preview">

      {/* Header resultado */}
      <div className="pdf-preview__header">
        <div className="pdf-preview__header-left">
          <span className="pdf-preview__consecutivo">{cotizacion.consecutivo}</span>
          <span className="u-badge u-badge--success">Generada</span>
        </div>
        <div className="pdf-preview__totales">
          <div className="pdf-preview__total-item">
            <span>Subtotal</span>
            <strong>{formatCOP(cotizacion.subtotal)}</strong>
          </div>
          <div className="pdf-preview__total-item">
            <span>IVA</span>
            <strong>{formatCOP(cotizacion.iva_total)}</strong>
          </div>
          <div className="pdf-preview__total-item pdf-preview__total-item--total">
            <span>Total</span>
            <strong>{formatCOP(cotizacion.total)}</strong>
          </div>
        </div>
      </div>

      {/* Nota preliminar */}
      <div className="pdf-preview__nota">
        <span className="pdf-preview__nota-icon">ℹ</span>
        <span>
          PDF preliminar generado desde el frontend. El documento oficial con membrete
          completo lo generará el backend cuando esté conectado.
        </span>
      </div>

      {/* Acciones */}
      <div className="pdf-preview__actions">
        <button
          className="pdf-preview__action-btn pdf-preview__action-btn--primary"
          onClick={handleDescargarPdf}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Descargar PDF preliminar
        </button>

        <button
          className="pdf-preview__action-btn"
          onClick={() => {
            setMostrarEmailForm((v) => !v)
            setMostrarWaForm(false)
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
          Enviar por email
        </button>

        <button
          className="pdf-preview__action-btn pdf-preview__action-btn--whatsapp"
          onClick={() => {
            setMostrarWaForm((v) => !v)
            setMostrarEmailForm(false)
          }}
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Compartir WhatsApp
        </button>
      </div>

      {/* Form email */}
      {mostrarEmailForm && (
        <div className="pdf-preview__form">
          <label className="pdf-preview__form-label">Correo de destino</label>
          <div className="pdf-preview__form-row">
            <input
              type="email"
              className="pdf-preview__form-input"
              placeholder="cliente@empresa.com"
              value={emailDestino}
              onChange={(e) => setEmailDestino(e.target.value)}
            />
            <PrimaryButton
              variant="primary"
              size="sm"
              loading={loadingEnvio}
              disabled={!emailDestino.trim()}
              onClick={handleEnviarEmail}
            >
              Enviar
            </PrimaryButton>
          </div>
        </div>
      )}

      {/* Form WhatsApp */}
      {mostrarWaForm && (
        <div className="pdf-preview__form">
          <label className="pdf-preview__form-label">
            Número WhatsApp (sin +57)
          </label>
          <div className="pdf-preview__form-row">
            <input
              type="text"
              className="pdf-preview__form-input"
              placeholder="3001234567"
              value={telefonoWa}
              onChange={(e) => setTelefonoWa(e.target.value)}
            />
            <PrimaryButton
              variant="primary"
              size="sm"
              loading={loadingEnvio}
              disabled={!telefonoWa.trim()}
              onClick={handleWhatsapp}
            >
              Abrir
            </PrimaryButton>
          </div>
        </div>
      )}

      {/* Resumen de ítems */}
      <div className="pdf-preview__items">
        <h4 className="pdf-preview__items-title">Productos en esta cotización</h4>
        <table className="pdf-preview__items-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Descripción</th>
              <th className="u-text-right">Cant.</th>
              <th className="u-text-right">Precio unit.</th>
              <th className="u-text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {(cotizacion.items || []).map((item) => (
              <tr key={item.cod_ref}>
                <td>
                  <span style={{
                    fontFamily: 'Courier New, monospace',
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-primary)',
                    fontWeight: 'var(--font-weight-semibold)',
                  }}>
                    {item.cod_ref}
                  </span>
                </td>
                <td>{item.nom_ref || item.cod_ref}</td>
                <td className="u-text-right">{item.cantidad}</td>
                <td className="u-text-right">{formatCOP(item.precio_unitario)}</td>
                <td className="u-text-right">
                  <strong>{formatCOP((item.precio_unitario || 0) * item.cantidad)}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="pdf-preview__items-totales">
          <div className="pdf-preview__items-total-row">
            <span>Subtotal</span>
            <span>{formatCOP(cotizacion.subtotal)}</span>
          </div>
          <div className="pdf-preview__items-total-row">
            <span>IVA (19%)</span>
            <span>{formatCOP(cotizacion.iva_total)}</span>
          </div>
          <div className="pdf-preview__items-total-row pdf-preview__items-total-row--final">
            <span>Total</span>
            <span>{formatCOP(cotizacion.total)}</span>
          </div>
        </div>
      </div>

    </div>
  )
}