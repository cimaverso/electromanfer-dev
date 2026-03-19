import { useState } from 'react'
import EmptyState from '../common/EmptyState'
import LoadingSpinner from '../common/LoadingSpinner'
import './HistorialTable.css'

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
  enviada_ambos:    { label: 'Enviada',       cls: 'u-badge u-badge--success' },
  anulada:          { label: 'Anulada',       cls: 'u-badge u-badge--danger' },
}

function EstadoBadge({ estado }) {
  const cfg = ESTADO_CONFIG[estado] || { label: estado, cls: 'u-badge' }
  return <span className={cfg.cls}>{cfg.label}</span>
}

export default function HistorialTable({
  historial = [],
  loading,
  onFiltrar,
  onVerDetalle,
  onDescargar, // Nota: onDescargar no se está usando en el componente, deberíamos evaluar si quitarlo o implementarlo
  onReenviar,
}) {
  const [filtros, setFiltros] = useState({
    fecha_inicio: '',
    fecha_fin: '',
    cliente: '',
    consecutivo: '',
    estado: '',
  })

  const handleFiltro = (field, value) => {
    const nuevos = { ...filtros, [field]: value }
    setFiltros(nuevos)
  }

  const handleBuscar = () => {
    // Solo enviamos los filtros que tengan algún valor
    const limpio = Object.fromEntries(
      Object.entries(filtros).filter(([, v]) => v !== '')
    )
    onFiltrar(limpio)
  }

  const handleLimpiar = () => {
    const vacios = {
      fecha_inicio: '',
      fecha_fin: '',
      cliente: '',
      consecutivo: '',
      estado: '',
    }
    setFiltros(vacios)
    // Aseguramos que el componente padre entienda que se limpiaron todos los filtros
    onFiltrar({}) 
  }

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
              <option value="enviada_ambos">Enviada</option>
              <option value="anulada">Anulada</option>
            </select>
          </div>
        </div>

        <div className="hist-table__filtro-actions">
          <button className="hist-table__filtro-btn" onClick={handleBuscar}>
            Buscar
          </button>
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
          title="Sin cotizaciones"
          desc="No hay cotizaciones que coincidan con los filtros aplicados."
        />
      )}

      {!loading && historial.length > 0 && (
        <div className="hist-table__wrapper">
          <table className="hist-table__table">
            <thead>
              <tr>
                {/* 6 Columnas declaradas */}
                <th>Consecutivo</th>
                <th>Cliente</th>
                <th className="u-text-right">Total</th>
                <th>Estado</th>
                <th>Fecha</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {historial.map((cot) => (
                <tr key={cot.id}>
                  {/* Celda 1 */}
                  <td>
                    <span className="hist-table__consecutivo">
                      {cot.consecutivo}
                    </span>
                  </td>
                  {/* Celda 2 */}
                  <td>
                    <span className="hist-table__cliente">
                      {cot.cliente?.nombre_razon_social || cot.cliente || '—'}
                    </span>
                  </td>
                  {/* Celda 3 */}
                  <td className="u-text-right">
                    <span className="hist-table__total">
                      {formatCOP(cot.total)}
                    </span>
                  </td>
                  {/* Celda 4 */}
                  <td>
                    <EstadoBadge estado={cot.estado} />
                  </td>
                  {/* Celda 5: Fecha correctamente contenida */}
                  <td className="u-text-muted">
                    {cot.fecha_generacion
                      ? new Date(cot.fecha_generacion).toLocaleDateString('es-CO', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '—'}
                  </td>
                  {/* Celda 6 */}
                  <td>
                    <div className="hist-table__acciones">
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
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}