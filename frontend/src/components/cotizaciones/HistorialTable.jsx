import { useState, useEffect, useRef } from 'react'
import EmptyState from '../common/EmptyState'
import LoadingSpinner from '../common/LoadingSpinner'
import './HistorialTable.css'
import { useAuth } from '../../hooks/useAuth'

function formatCOP(value) {
  if (!value && value !== 0) return '—'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value)
}

const ESTADO_CONFIG = {
  generada:         { label: 'Generada',      cls: 'u-badge u-badge--info' },
  enviada_email:    { label: 'Email enviado', cls: 'u-badge u-badge--success' },
  enviada_whatsapp: { label: 'WhatsApp',      cls: 'u-badge u-badge--success' },
  editada:          { label: 'Editada',       cls: 'u-badge u-badge--warning' },
  efectiva:         { label: 'Efectiva',      cls: 'u-badge u-badge--primary' },
  anulada:          { label: 'Anulada',       cls: 'u-badge u-badge--danger' },
}

// Qué estados permiten editar y marcar efectiva
const PUEDE_ANULAR   = new Set(['generada', 'enviada_email', 'enviada_whatsapp', 'editada'])
const EDITABLES      = new Set(['generada', 'enviada_email', 'enviada_whatsapp', 'editada'])
const PUEDE_EFECTIVA = new Set(['generada', 'enviada_email', 'enviada_whatsapp', 'editada'])

function EstadoBadge({ estado }) {
  const cfg = ESTADO_CONFIG[estado] || { label: estado, cls: 'u-badge' }
  return <span className={cfg.cls}>{cfg.label}</span>
}

function IconoCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function IconoAnular() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
    </svg>
  )
}

function IconoEditar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

export default function HistorialTable({
  historial = [],
  loading,
  onFiltrar,
  onVerDetalle,
  onDescargar,
  onReenviar,
  onEditar,
  onMarcarEfectiva,
  onAnular,
}) {
  const hoyColombia = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })

  const [filtros, setFiltros] = useState({
    fecha_inicio: hoyColombia,
    fecha_fin: hoyColombia,
    cliente: '',
    consecutivo: '',
    estado: '',
  })

  const { user } = useAuth()
  const esAdmin = user?.rol === 'ADMINISTRADOR' || user?.rol === 'GERENCIA'
  const debounceRef = useRef(null)

  const handleFiltro = (field, value) => {
    const nuevos = { ...filtros, [field]: value }
    setFiltros(nuevos)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const limpio = Object.fromEntries(
        Object.entries(nuevos).filter(([, v]) => v !== '')
      )
      onFiltrar(limpio)
    }, 500)
  }

  const handleLimpiar = () => {
    const vacios = {
      fecha_inicio: hoyColombia,
      fecha_fin: hoyColombia,
      cliente: '',
      consecutivo: '',
      estado: '',
    }
    setFiltros(vacios)
    onFiltrar({ fecha_inicio: hoyColombia, fecha_fin: hoyColombia })
  }

  useEffect(() => {
    const limpio = Object.fromEntries(
      Object.entries(filtros).filter(([, v]) => v !== '')
    )
    onFiltrar(limpio)
  }, [])

  console.log('onAnular:', onAnular)

  return (
    <div className="hist-table">

      {/* Filtros */}
      <div className="hist-table__filtros">
        <div className="hist-table__filtro-grid">
          <div className="hist-table__filtro-field">
            <label className="hist-table__filtro-label">Desde</label>
            <input
              type="date"
              className="hist-table__filtro-input"
              value={filtros.fecha_inicio}
              onChange={(e) => handleFiltro('fecha_inicio', e.target.value)}
            />
          </div>
          <div className="hist-table__filtro-field">
            <label className="hist-table__filtro-label">Hasta</label>
            <input
              type="date"
              className="hist-table__filtro-input"
              value={filtros.fecha_fin}
              onChange={(e) => handleFiltro('fecha_fin', e.target.value)}
            />
          </div>
          <div className="hist-table__filtro-field">
            <label className="hist-table__filtro-label">Cliente</label>
            <input
              type="text"
              className="hist-table__filtro-input"
              placeholder="Nombre o razón social"
              value={filtros.cliente}
              onChange={(e) => handleFiltro('cliente', e.target.value)}
            />
          </div>
          <div className="hist-table__filtro-field">
            <label className="hist-table__filtro-label">Consecutivo</label>
            <input
              type="text"
              className="hist-table__filtro-input"
              placeholder="COT-2026-000001"
              value={filtros.consecutivo}
              onChange={(e) => handleFiltro('consecutivo', e.target.value)}
            />
          </div>
          <div className="hist-table__filtro-field">
            <label className="hist-table__filtro-label">Estado</label>
            <select
              className="hist-table__filtro-input"
              value={filtros.estado}
              onChange={(e) => handleFiltro('estado', e.target.value)}
            >
              <option value="">Todos</option>
              <option value="generada">Generada</option>
              <option value="enviada_email">Email enviado</option>
              <option value="enviada_whatsapp">WhatsApp</option>
              <option value="editada">Editada</option>
              <option value="efectiva">Efectiva</option>
              <option value="anulada">Anulada</option>
            </select>
          </div>
        </div>
        <div className="hist-table__filtro-actions">
          <button
            className="hist-table__filtro-btn hist-table__filtro-btn--ghost"
            onClick={handleLimpiar}
          >
            Limpiar
          </button>
        </div>
      </div>

      {/* Contenido */}
      {loading && <LoadingSpinner size="md" text="Cargando historial..." />}

      {!loading && historial.length === 0 && (
        <EmptyState
          icon="📋"
          title="Sin cotizaciones hoy"
          desc="No hay cotizaciones para hoy. Usa los filtros para buscar en otras fechas."
        />
      )}

      {!loading && historial.length > 0 && (
        <div className="hist-table__wrapper">
          <table className="hist-table__table">
            <thead>
              <tr>
                <th>Consecutivo</th>
                <th>Cliente</th>
                <th>Notas</th>
                <th className="u-text-right">Total</th>
                <th>Estado</th>
                {esAdmin && <th>Usuario</th>}
                <th>Fecha</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {historial.map((cot) => (
                <tr key={cot.id}>
                  <td>
                    <span className="hist-table__consecutivo">{cot.consecutivo}</span>
                  </td>
                  <td>
                    <span className="hist-table__cliente">
                      {cot.clientes?.nombre_razon_social || '—'}
                    </span>
                  </td>
                  <td>
                    <span className="hist-table__notas">{cot.notas || '—'}</span>
                  </td>
                  <td className="u-text-right">
                    <span className="hist-table__total">{formatCOP(cot.total)}</span>
                  </td>
                  <td>
                    <EstadoBadge estado={cot.estado} />
                  </td>
                  {esAdmin && (
                    <td>
                      <span className="hist-table__notas">{cot.usuario_nombre || '—'}</span>
                    </td>
                  )}
                  <td className="u-text-muted">
                    {cot.created_at
                      ? new Date(cot.created_at).toLocaleDateString('es-CO', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '—'}
                  </td>
                  <td>
                    <div className="hist-table__acciones">

                      {/* Ver detalle — siempre visible */}
                      <button
                        className="hist-table__accion-btn"
                        onClick={() => onVerDetalle(cot.id)}
                        title="Ver cotización"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </button>

                      {/* Marcar efectiva — generada, enviada_email, enviada_whatsapp, editada */}
                      {onMarcarEfectiva && PUEDE_EFECTIVA.has(cot.estado) && (
                        <button
                          className="hist-table__accion-btn hist-table__accion-btn--efectiva"
                          onClick={() => onMarcarEfectiva(cot.id)}
                          title="Marcar como efectiva"
                        >
                          <IconoCheck />
                        </button>
                      )}

                      {/* Editar — generada, enviada_email, enviada_whatsapp, editada */}
                      {onEditar && EDITABLES.has(cot.estado) && (
                        <button
                          className="hist-table__accion-btn hist-table__accion-btn--edit"
                          onClick={() => onEditar(cot)}
                          title="Editar cotización"
                        >
                          <IconoEditar />
                        </button>
                      )}

                      {/* Descargar PDF — siempre si existe */}
                      {cot.pdf_url && (
                        <a
                          href={cot.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hist-table__accion-btn"
                          title="Descargar PDF"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                          </svg>
                        </a>
                      )}

                      {/* Anular — generada, enviada_email, enviada_whatsapp, editada */}
                      {onAnular && PUEDE_ANULAR.has(cot.estado) && (
                        <button
                          className="hist-table__accion-btn hist-table__accion-btn--anular"
                          onClick={() => onAnular(cot.id)}
                          title="Anular cotización"
                        >
                          <IconoAnular />
                        </button>
                      )}

                      {/* Reenviar — solo si es editable (no efectiva ni anulada) */}
                      {EDITABLES.has(cot.estado) && (
                        <button
                          className="hist-table__accion-btn"
                          onClick={() => onReenviar(cot)}
                          title="Reenviar"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="22" y1="2" x2="11" y2="13" />
                            <polygon points="22 2 15 22 11 13 2 9 22 2" />
                          </svg>
                        </button>
                      )}

                    </div>
                  </td>                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}