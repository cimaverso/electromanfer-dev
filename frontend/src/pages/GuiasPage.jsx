import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useGuias } from '../hooks/useGuias'
import { useToast } from '../hooks/useToast'
import { redactarCorreo } from '../api/buzonApi'
import GuiasMetricas from '../components/guias/GuiasMetricas'
import GuiaFormModal from '../components/guias/GuiaFormModal'
import GuiaDetalleModal from '../components/guias/GuiaDetalleModal'
import GuiasConsolidado from '../components/guias/GuiasConsolidado'
import Toast from '../components/common/Toast'
import LoadingSpinner from '../components/common/LoadingSpinner'
import EmptyState from '../components/common/EmptyState'
import './GuiasPage.css'

const ESTADOS_CONFIG = {
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
  return new Date(str + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

const FILTROS_INIT = { estado: '', transportadora: '', fecha_inicio: '', fecha_fin: '', buscar: '' }

export default function GuiasPage() {
  const { user } = useAuth()
  const isAdmin = ['admin', 'ADMIN', 'ADMINISTRADOR'].includes(user?.rol)
  const { toast, showToast, hideToast } = useToast()

  const {
    guias, guiaActual,
    metricas, loadingMetricas,
    loadingLista, loadingGuardar, loadingEstado, loadingDetalle,
    error,
    cargarGuias, cargarDetalle, limpiarDetalle,
    crear, editar, cambiarEstado,
    cargarMetricas,
    clearError,
  } = useGuias()

  const [filtros, setFiltros]                   = useState(FILTROS_INIT)
  const [buscarInput, setBuscarInput]           = useState('')
  const [modalForm, setModalForm]               = useState(false)
  const [guiaEditando, setGuiaEditando]         = useState(null)
  const [modalDetalle, setModalDetalle]         = useState(false)
  const [modalConsolidado, setModalConsolidado] = useState(false)
  const [loadingEmail, setLoadingEmail]         = useState(false)

  const hoy = new Date()
  const [mesMet, setMesMet] = useState(hoy.getMonth() + 1)
  const [anioMet, setAnioMet] = useState(hoy.getFullYear())

  useEffect(() => {
    cargarGuias()
  }, [])

  useEffect(() => {
    if (isAdmin) cargarMetricas({ mes: mesMet, anio: anioMet })
  }, [isAdmin])

  useEffect(() => {
    if (error) {
      showToast(error, 'error')
      clearError()
    }
  }, [error])

  // ── Filtros ──────────────────────────────────────────────────────────────
  const handleFiltroChange = (e) => {
    const { name, value } = e.target
    const nuevos = { ...filtros, [name]: value }
    setFiltros(nuevos)
    cargarGuias(nuevos)
  }

  const handleBuscar = useCallback(() => {
    const nuevos = { ...filtros, buscar: buscarInput }
    setFiltros(nuevos)
    cargarGuias(nuevos)
  }, [filtros, buscarInput, cargarGuias])

  const handleBuscarKey = (e) => {
    if (e.key === 'Enter') handleBuscar()
  }

  const limpiarFiltros = () => {
    setFiltros(FILTROS_INIT)
    setBuscarInput('')
    cargarGuias({})
  }

  const hayFiltrosActivos = Object.values(filtros).some((v) => v !== '')

  // ── CRUD ─────────────────────────────────────────────────────────────────
  const handleCrear = async (formData) => {
    const res = await crear(formData)
    if (res.success) {
      showToast('Guía creada correctamente', 'success')
      setModalForm(false)
      if (isAdmin) cargarMetricas({ mes: mesMet, anio: anioMet })
    } else {
      showToast(res.error || 'Error al crear la guía', 'error')
    }
  }

  const handleEditar = async (formData) => {
    const res = await editar(guiaEditando.id, formData)
    if (res.success) {
      showToast('Guía actualizada correctamente', 'success')
      setModalForm(false)
      setGuiaEditando(null)
      if (modalDetalle) await cargarDetalle(res.data.id)
    } else {
      showToast(res.error || 'Error al actualizar la guía', 'error')
    }
  }

  const handleGuardar = (formData) => {
    if (guiaEditando) return handleEditar(formData)
    return handleCrear(formData)
  }

  const handleAbrirEditar = (guia) => {
    setGuiaEditando(guia)
    setModalDetalle(false)
    setModalForm(true)
  }

  const handleVerDetalle = async (guia) => {
    await cargarDetalle(guia.id)
    setModalDetalle(true)
  }

  const handleCambiarEstado = async (id, estado, nota) => {
    const res = await cambiarEstado(id, estado, nota)
    if (res.success) {
      showToast('Estado actualizado', 'success')
      if (isAdmin) cargarMetricas({ mes: mesMet, anio: anioMet })
    } else {
      showToast(res.error || 'Error al cambiar estado', 'error')
    }
  }

  // ── Enviar guía por correo via Buzón ─────────────────────────────────────
  const handleEnviarCorreo = async (_guiaId, formData) => {
    setLoadingEmail(true)
    try {
      await redactarCorreo(formData)
      showToast('Correo enviado correctamente', 'success')
    } catch {
      showToast('Error al enviar el correo', 'error')
    } finally {
      setLoadingEmail(false)
    }
  }

  // ── Métricas — cambiar mes ────────────────────────────────────────────────
  const handleCambiarMesMet = (mes, anio) => {
    setMesMet(mes)
    setAnioMet(anio)
    cargarMetricas({ mes, anio })
  }

  const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

  return (
    <div className="guias-page">

      {/* ── Cabecera ── */}
      <div className="guias-page__header">
        <div className="guias-page__header-left">
          <h1 className="guias-page__title">Guías de envío</h1>
          <span className="guias-page__count">{guias.length} registro{guias.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* ── Métricas (solo admin) ── */}
      {isAdmin && (
        <div className="guias-page__metricas-wrap">
          <div className="guias-page__metricas-controls">
            <span className="guias-page__metricas-label">Métricas de</span>
            <select
              className="guias-page__mes-select"
              value={mesMet}
              onChange={(e) => handleCambiarMesMet(Number(e.target.value), anioMet)}
            >
              {MESES.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
            <input
              type="number"
              className="guias-page__anio-input"
              value={anioMet}
              min="2020"
              max="2099"
              onChange={(e) => handleCambiarMesMet(mesMet, Number(e.target.value))}
            />
          </div>
          <GuiasMetricas metricas={metricas} loading={loadingMetricas} />
        </div>
      )}

      {/* ── Filtros + acciones ── */}
      <div className="guias-page__filtros">
        <div className="guias-page__buscar">
          <input
            type="text"
            className="guias-page__buscar-input"
            placeholder="Buscar por guía, destinatario, ciudad..."
            value={buscarInput}
            onChange={(e) => setBuscarInput(e.target.value)}
            onKeyDown={handleBuscarKey}
          />
          <button className="guias-page__buscar-btn" onClick={handleBuscar}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
        </div>

        <select name="estado" className="guias-page__filtro-select" value={filtros.estado} onChange={handleFiltroChange}>
          <option value="">Todos los estados</option>
          {Object.entries(ESTADOS_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        <div className="guias-page__fechas">
          <input type="date" name="fecha_inicio" className="guias-page__filtro-input" value={filtros.fecha_inicio} onChange={handleFiltroChange} />
          <span className="guias-page__fecha-sep">–</span>
          <input type="date" name="fecha_fin" className="guias-page__filtro-input" value={filtros.fecha_fin} onChange={handleFiltroChange} />
        </div>

        {hayFiltrosActivos && (
          <button className="guias-page__limpiar-btn" onClick={limpiarFiltros}>
            Limpiar filtros
          </button>
        )}

        {/* Botones de acción — junto a los filtros */}
        <div className="guias-page__filtros-actions">
          {isAdmin && (
            <button
              className="guias-page__consolidado-btn"
              onClick={() => setModalConsolidado(true)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Exportar consolidado</span>
            </button>
          )}
          <button
            className="guias-page__nueva-btn"
            onClick={() => { setGuiaEditando(null); setModalForm(true) }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nueva guía
          </button>
        </div>
      </div>

      {/* ── Tabla ── */}
      <div className="guias-page__card">
        {loadingLista ? (
          <div className="guias-page__loading">
            <LoadingSpinner />
          </div>
        ) : guias.length === 0 ? (
          <EmptyState
            title="Sin guías"
            description={hayFiltrosActivos ? 'No hay resultados para los filtros aplicados.' : 'Aún no hay guías registradas. Crea la primera.'}
          />
        ) : (
          <>
            {/* Tabla desktop */}
            <div className="guias-page__table-wrap">
              <table className="guias-page__table">
                <thead>
                  <tr>
                    <th>Guía</th>
                    <th>Transportadora</th>
                    <th>Destinatario</th>
                    <th>Ciudad</th>
                    <th>Fecha</th>
                    <th>Costo flete</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {guias.map((g) => {
                    const cfg = ESTADOS_CONFIG[g.estado] || { label: g.estado, color: 'var(--color-text-muted)', bg: 'var(--color-surface-2)' }
                    return (
                      <tr key={g.id} className="guias-page__table-row" onClick={() => handleVerDetalle(g)}>
                        <td>
                          <span className="guias-page__guia-num">{g.numero_guia}</span>
                          {g.cotizacion_consecutivo && (
                            <span className="guias-page__cot-ref">{g.cotizacion_consecutivo}</span>
                          )}
                        </td>
                        <td>{g.transportadora}</td>
                        <td>{g.destinatario || '—'}</td>
                        <td>{g.ciudad_destino || '—'}</td>
                        <td>{fmtFecha(g.fecha_despacho)}</td>
                        <td className="guias-page__td-flete">{fmt(g.costo_flete)}</td>
                        <td>
                          <span
                            className="guias-page__badge"
                            style={{ color: cfg.color, background: cfg.bg }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {cfg.label}
                          </span>
                        </td>
                        <td className="guias-page__td-actions" onClick={(e) => e.stopPropagation()}>
                          <button
                            className="guias-page__action-btn"
                            onClick={() => handleAbrirEditar(g)}
                            title="Editar"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Cards móvil */}
            <div className="guias-page__cards">
              {guias.map((g) => {
                const cfg = ESTADOS_CONFIG[g.estado] || { label: g.estado, color: 'var(--color-text-muted)', bg: 'var(--color-surface-2)' }
                return (
                  <div key={g.id} className="guias-page__card-item" onClick={() => handleVerDetalle(g)}>
                    <div className="guias-page__card-item-header">
                      <span className="guias-page__guia-num">{g.numero_guia}</span>
                      <span className="guias-page__badge" style={{ color: cfg.color, background: cfg.bg }}>{cfg.label}</span>
                    </div>
                    <div className="guias-page__card-item-body">
                      <span className="guias-page__card-item-trans">{g.transportadora}</span>
                      {g.destinatario && <span className="guias-page__card-item-dest">{g.destinatario}</span>}
                      <span className="guias-page__card-item-ciudad">{g.ciudad_destino || '—'} · {fmtFecha(g.fecha_despacho)}</span>
                    </div>
                    <div className="guias-page__card-item-footer">
                      <span className="guias-page__card-item-flete">{fmt(g.costo_flete)}</span>
                      <button
                        className="guias-page__action-btn"
                        onClick={(e) => { e.stopPropagation(); handleAbrirEditar(g) }}
                        title="Editar"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* ── Modales ── */}
      {modalForm && (
        <GuiaFormModal
          guia={guiaEditando}
          onGuardar={handleGuardar}
          onClose={() => { setModalForm(false); setGuiaEditando(null) }}
          loading={loadingGuardar}
        />
      )}

      {modalDetalle && guiaActual && (
        <GuiaDetalleModal
          guia={guiaActual}
          onClose={() => { setModalDetalle(false); limpiarDetalle() }}
          onCambiarEstado={handleCambiarEstado}
          onEditar={handleAbrirEditar}
          onEnviarCorreo={handleEnviarCorreo}
          loadingEstado={loadingEstado}
        />
      )}

      {modalDetalle && loadingDetalle && !guiaActual && (
        <div className="guias-page__detalle-loading">
          <LoadingSpinner />
        </div>
      )}

      {modalConsolidado && (
        <GuiasConsolidado onClose={() => setModalConsolidado(false)} />
      )}

      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={hideToast} />
    </div>
  )
}