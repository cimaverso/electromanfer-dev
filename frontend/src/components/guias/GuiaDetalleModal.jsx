import { useState } from 'react'
import EmailGuiaModal from './EmailGuiaModal'
import './GuiaDetalleModal.css'

const ESTADOS = ['generada', 'despachada', 'en_transito', 'entregada', 'novedad']

const ESTADO_CONFIG = {
  generada:    { label: 'Generada',    color: 'var(--color-info)',    bg: 'var(--color-info-soft)' },
  despachada:  { label: 'Despachada',  color: 'var(--color-primary)', bg: 'var(--color-primary-soft)' },
  en_transito: { label: 'En tránsito', color: 'var(--color-warning)', bg: 'var(--color-warning-soft)' },
  entregada:   { label: 'Entregada',   color: 'var(--color-success)', bg: 'var(--color-success-soft)' },
  novedad:     { label: 'Novedad',     color: 'var(--color-danger)',  bg: 'var(--color-danger-soft)' },
}

function fmt(valor) {
  if (!valor && valor !== 0) return '—'
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(valor)
}

function fmtFecha(str) {
  if (!str) return '—'
  return new Date(str).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtHora(str) {
  if (!str) return ''
  return new Date(str).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function GuiaDetalleModal({
  guia,
  onClose,
  onCambiarEstado,
  onEditar,
  onEnviarCorreo,   // se mantiene — recibe (id, formData) desde GuiasPage
  loadingEstado = false,
}) {
  const [nuevoEstado, setNuevoEstado] = useState('')
  const [nota, setNota]               = useState('')
  const [mostrarCambioEstado, setMostrarCambioEstado] = useState(false)
  const [fotoAmpliada, setFotoAmpliada] = useState(false)
  const [modalEmail, setModalEmail]   = useState(false)   // ← NUEVO

  if (!guia) return null

  const cfg = ESTADO_CONFIG[guia.estado] || { label: guia.estado, color: 'var(--color-text-muted)', bg: 'var(--color-surface-2)' }

  const handleCambiarEstado = () => {
    if (!nuevoEstado) return
    onCambiarEstado(guia.id, nuevoEstado, nota)
    setMostrarCambioEstado(false)
    setNuevoEstado('')
    setNota('')
  }

  // Abre el EmailGuiaModal — onEnviarCorreo lo maneja GuiasPage
  const handleAbrirEmail = () => setModalEmail(true)

  const handleEnviarEmail = (id, formData) => {
    setModalEmail(false)
    if (onEnviarCorreo) onEnviarCorreo(id, formData)
  }

  return (
    <>
      <div className="guia-detalle__overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
        <div className="guia-detalle">

          {/* ── Header ── */}
          <div className="guia-detalle__header">
            <div className="guia-detalle__header-left">
              <h2 className="guia-detalle__title">{guia.numero_guia}</h2>
              <span
                className="guia-detalle__badge"
                style={{ color: cfg.color, background: cfg.bg }}
              >
                {cfg.label}
              </span>
            </div>
            <div className="guia-detalle__header-actions">
              {onEditar && (
                <button className="guia-detalle__action-btn" onClick={() => onEditar(guia)} title="Editar guía">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              )}
              {/* Botón email — abre EmailGuiaModal */}
              <button
                className="guia-detalle__action-btn guia-detalle__action-btn--email"
                onClick={handleAbrirEmail}
                title="Enviar por correo"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                <span>Enviar por correo</span>
              </button>
              <button className="guia-detalle__close" onClick={onClose} aria-label="Cerrar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          {/* ── Body ── */}
          <div className="guia-detalle__body">
            <div className="guia-detalle__cols">

              {/* Columna izquierda — datos */}
              <div className="guia-detalle__info">

                <div className="guia-detalle__group">
                  <p className="guia-detalle__group-title">Envío</p>
                  <div className="guia-detalle__rows">
                    <div className="guia-detalle__row">
                      <span className="guia-detalle__row-label">Transportadora</span>
                      <span className="guia-detalle__row-value">{guia.transportadora || '—'}</span>
                    </div>
                    <div className="guia-detalle__row">
                      <span className="guia-detalle__row-label">Fecha despacho</span>
                      <span className="guia-detalle__row-value">{fmtFecha(guia.fecha_despacho)}</span>
                    </div>
                    {guia.cotizacion_consecutivo && (
                      <div className="guia-detalle__row">
                        <span className="guia-detalle__row-label">Cotización</span>
                        <span className="guia-detalle__row-value guia-detalle__row-value--cot">{guia.cotizacion_consecutivo}</span>
                      </div>
                    )}
                    {guia.referencia_interna && (
                      <div className="guia-detalle__row">
                        <span className="guia-detalle__row-label">Ref. interna</span>
                        <span className="guia-detalle__row-value">{guia.referencia_interna}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="guia-detalle__group">
                  <p className="guia-detalle__group-title">Destinatario</p>
                  <div className="guia-detalle__rows">
                    <div className="guia-detalle__row">
                      <span className="guia-detalle__row-label">Nombre</span>
                      <span className="guia-detalle__row-value">{guia.destinatario || '—'}</span>
                    </div>
                    <div className="guia-detalle__row">
                      <span className="guia-detalle__row-label">Ciudad</span>
                      <span className="guia-detalle__row-value">{guia.ciudad_destino || '—'}</span>
                    </div>
                    {guia.direccion_destino && (
                      <div className="guia-detalle__row">
                        <span className="guia-detalle__row-label">Dirección</span>
                        <span className="guia-detalle__row-value">{guia.direccion_destino}</span>
                      </div>
                    )}
                    {guia.telefono_destinatario && (
                      <div className="guia-detalle__row">
                        <span className="guia-detalle__row-label">Teléfono</span>
                        <span className="guia-detalle__row-value">{guia.telefono_destinatario}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="guia-detalle__group">
                  <p className="guia-detalle__group-title">Valores</p>
                  <div className="guia-detalle__rows">
                    <div className="guia-detalle__row">
                      <span className="guia-detalle__row-label">Unidades</span>
                      <span className="guia-detalle__row-value">{guia.unidades ?? '—'}</span>
                    </div>
                    <div className="guia-detalle__row">
                      <span className="guia-detalle__row-label">Peso</span>
                      <span className="guia-detalle__row-value">{guia.peso_kg ? `${guia.peso_kg} kg` : '—'}</span>
                    </div>
                    <div className="guia-detalle__row">
                      <span className="guia-detalle__row-label">Valor declarado</span>
                      <span className="guia-detalle__row-value">{fmt(guia.valor_declarado)}</span>
                    </div>
                    {guia.valor_recaudo > 0 && (
                      <div className="guia-detalle__row">
                        <span className="guia-detalle__row-label">Recaudo</span>
                        <span className="guia-detalle__row-value">{fmt(guia.valor_recaudo)}</span>
                      </div>
                    )}
                    <div className="guia-detalle__row guia-detalle__row--highlight">
                      <span className="guia-detalle__row-label">Costo flete</span>
                      <span className="guia-detalle__row-value">{fmt(guia.costo_flete)}</span>
                    </div>
                  </div>
                </div>

                {guia.observaciones && (
                  <div className="guia-detalle__group">
                    <p className="guia-detalle__group-title">Observaciones</p>
                    <p className="guia-detalle__obs">{guia.observaciones}</p>
                  </div>
                )}

                {guia.foto_guia_path && (
                  <div className="guia-detalle__group">
                    <p className="guia-detalle__group-title">Foto de guía</p>
                    <img
                      src={guia.foto_guia_path}
                      alt="Foto de guía"
                      className="guia-detalle__foto-thumb"
                      onClick={() => setFotoAmpliada(true)}
                      title="Click para ampliar"
                    />
                  </div>
                )}

              </div>

              {/* Columna derecha — historial + cambiar estado */}
              <div className="guia-detalle__right">

                <div className="guia-detalle__estado-box">
                  <p className="guia-detalle__group-title">Cambiar estado</p>
                  {!mostrarCambioEstado ? (
                    <button
                      className="guia-detalle__cambiar-estado-btn"
                      onClick={() => setMostrarCambioEstado(true)}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="17 1 21 5 17 9" />
                        <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                        <polyline points="7 23 3 19 7 15" />
                        <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                      </svg>
                      Actualizar estado
                    </button>
                  ) : (
                    <div className="guia-detalle__cambio-form">
                      <select
                        className="guia-detalle__estado-select"
                        value={nuevoEstado}
                        onChange={(e) => setNuevoEstado(e.target.value)}
                      >
                        <option value="">Seleccionar nuevo estado...</option>
                        {ESTADOS.filter((e) => e !== guia.estado).map((e) => (
                          <option key={e} value={e}>{ESTADO_CONFIG[e]?.label || e}</option>
                        ))}
                      </select>
                      <textarea
                        className="guia-detalle__nota-input"
                        placeholder="Nota opcional (ej: recogida sin novedad)"
                        rows={2}
                        value={nota}
                        onChange={(e) => setNota(e.target.value)}
                      />
                      <div className="guia-detalle__cambio-actions">
                        <button
                          className="guia-detalle__cambio-cancel"
                          onClick={() => { setMostrarCambioEstado(false); setNuevoEstado(''); setNota('') }}
                        >
                          Cancelar
                        </button>
                        <button
                          className="guia-detalle__cambio-save"
                          onClick={handleCambiarEstado}
                          disabled={!nuevoEstado || loadingEstado}
                        >
                          {loadingEstado ? 'Guardando...' : 'Confirmar'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="guia-detalle__historial">
                  <p className="guia-detalle__group-title">Historial de estados</p>
                  {(guia.historial || []).length === 0 ? (
                    <p className="guia-detalle__historial-empty">Sin registros</p>
                  ) : (
                    <ol className="guia-detalle__timeline">
                      {[...(guia.historial || [])].reverse().map((h, i) => {
                        const hcfg = ESTADO_CONFIG[h.estado] || { label: h.estado, color: 'var(--color-text-muted)' }
                        return (
                          <li key={h.id || i} className="guia-detalle__timeline-item">
                            <span className="guia-detalle__timeline-dot" style={{ background: hcfg.color }} />
                            <div className="guia-detalle__timeline-content">
                              <span className="guia-detalle__timeline-estado" style={{ color: hcfg.color }}>
                                {hcfg.label}
                              </span>
                              <span className="guia-detalle__timeline-fecha">{fmtHora(h.created_at)}</span>
                              {h.nota && <span className="guia-detalle__timeline-nota">{h.nota}</span>}
                            </div>
                          </li>
                        )
                      })}
                    </ol>
                  )}
                </div>

              </div>
            </div>
          </div>
        </div>

        {fotoAmpliada && (
          <div className="guia-detalle__foto-overlay" onClick={() => setFotoAmpliada(false)}>
            <img src={guia.foto_guia_path} alt="Foto de guía ampliada" className="guia-detalle__foto-full" />
          </div>
        )}
      </div>

      {/* ── EmailGuiaModal — se monta fuera del overlay del detalle ── */}
      {modalEmail && (
        <EmailGuiaModal
          guia={guia}
          onEnviar={handleEnviarEmail}
          onClose={() => setModalEmail(false)}
        />
      )}
    </>
  )
}