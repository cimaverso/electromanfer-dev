import { useState, useEffect } from 'react'
import { buildTextoGuia } from '../../utils/guiaMensajes'
import '../cotizaciones/EmailModal.css'

export default function WhatsappGuiaModal({ guia, onEnviar, onClose, loading = false }) {
  const numGuia = guia?.numero_guia || ''

  const [telefono, setTelefono] = useState(guia?.telefono_destinatario || '')
  const [mensaje, setMensaje]   = useState(buildTextoGuia(guia))
  const [archivosLocales, setArchivosLocales] = useState([])

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleEnviar = () => {
    if (!telefono.trim()) return

    const formData = new FormData()
    formData.append('telefono', telefono.trim())
    formData.append('texto', mensaje)

    // Foto de la guía como adjunto si existe
    if (guia?.foto_guia_path) {
      formData.append('foto_guia_url', guia.foto_guia_path)
      formData.append('foto_guia_nombre', `Foto_guia_${numGuia}.jpg`)
    }

    if (archivosLocales.length > 0) {
      archivosLocales.forEach((adj) =>
        formData.append('archivos_extra', adj.archivo, adj.nombreArchivo)
      )
    }

    onEnviar(guia.id, formData)
  }

  return (
    <div className="email-modal__overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="email-modal" role="dialog" aria-modal="true">

        {/* ── Header ── */}
        <div className="email-modal__header">
          <div>
            <h3 className="email-modal__title">Enviar guía por WhatsApp</h3>
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

          {/* Teléfono */}
          <div className="email-modal__field">
            <label className="email-modal__label">
              Teléfono <span className="email-modal__required">*</span>
            </label>
            <input
              type="tel"
              className="email-modal__input"
              placeholder="3001234567"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              autoFocus
            />
          </div>

          {/* Mensaje */}
          <div className="email-modal__field">
            <label className="email-modal__label">Mensaje</label>
            <textarea
              className="email-modal__textarea"
              rows={10}
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
            />
          </div>

          {/* ── Adjuntos ── */}
          <div className="email-modal__adjuntos">
            <p className="email-modal__adjuntos-title">Adjuntos</p>

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
            disabled={!telefono.trim() || loading}
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
                Enviar WhatsApp
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}