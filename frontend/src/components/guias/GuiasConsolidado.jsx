import { useState, useEffect } from 'react'
import { useGuias } from '../../hooks/useGuias'
import './GuiasConsolidado.css'

const ESTADOS_LABEL = {
  generada: 'Generada', despachada: 'Despachada', en_transito: 'En tránsito',
  entregada: 'Entregada', novedad: 'Novedad',
}

function fmt(v) {
  if (!v && v !== 0) return ''
  return new Intl.NumberFormat('es-CO').format(v)
}

const MESES_LABEL = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

export default function GuiasConsolidado({ onClose }) {
  const { consolidado, loadingConsolidado, cargarConsolidado } = useGuias()

  const hoy = new Date()
  const [mes,  setMes]  = useState(hoy.getMonth() + 1)
  const [anio, setAnio] = useState(hoy.getFullYear())
  const [trans, setTrans] = useState('')
  const [estado, setEstado] = useState('')

  useEffect(() => {
    cargarConsolidado({ mes, anio })
  }, [])

  const handleFiltrar = () => {
    cargarConsolidado({ mes, anio, transportadora: trans || undefined, estado: estado || undefined })
  }

  const totalFlete = consolidado.reduce((acc, r) => acc + (Number(r.costo_flete) || 0), 0)
  const totalGuias = consolidado.length

  // ── Exportar CSV ────────────────────────────────────────────────────────
  const exportarCSV = () => {
    const cols = ['Guía','Fecha','Cotización','Transportadora','Destinatario','Ciudad','Unidades','Peso kg','Valor declarado','Valor recaudo','Costo flete','Estado','Ref. interna']
    const filas = consolidado.map((r) => [
      r.numero_guia, r.fecha_despacho, r.cotizacion, r.transportadora,
      r.destinatario, r.ciudad_destino, r.unidades, r.peso_kg,
      r.valor_declarado, r.valor_recaudo, r.costo_flete, ESTADOS_LABEL[r.estado] || r.estado,
      r.referencia_interna,
    ])

    const esc = (v) => {
      if (v === null || v === undefined) return ''
      const s = String(v)
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
    }

    const csv = [cols, ...filas].map((row) => row.map(esc).join(',')).join('\r\n')
    const bom  = '\uFEFF'
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `consolidado_guias_${MESES_LABEL[mes - 1]}_${anio}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Exportar PDF (texto simple via jsPDF si está disponible, sino HTML print) ──
  const exportarPDF = () => {
    const contenido = `
      <html>
      <head>
        <meta charset="utf-8">
        <title>Consolidado guías ${MESES_LABEL[mes - 1]} ${anio}</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 11px; color: #111; margin: 20px; }
          h2   { font-size: 14px; margin-bottom: 4px; }
          p    { margin: 2px 0 10px; color: #666; }
          table { width: 100%; border-collapse: collapse; }
          th   { background: #5E8A1A; color: #fff; padding: 5px 8px; text-align: left; font-size: 10px; }
          td   { padding: 4px 8px; border-bottom: 1px solid #e5e7eb; font-size: 10px; }
          tr:nth-child(even) td { background: #f9fafb; }
          .total { font-weight: bold; background: #f0f4e8 !important; }
          .right { text-align: right; }
        </style>
      </head>
      <body>
        <h2>Consolidado de guías — ${MESES_LABEL[mes - 1]} ${anio}</h2>
        <p>${totalGuias} guía${totalGuias !== 1 ? 's' : ''} · Total fletes: $${new Intl.NumberFormat('es-CO').format(totalFlete)} COP</p>
        <table>
          <thead>
            <tr>
              <th>Guía</th><th>Fecha</th><th>Transportadora</th>
              <th>Destinatario</th><th>Ciudad</th>
              <th class="right">Flete ($)</th><th>Estado</th>
            </tr>
          </thead>
          <tbody>
            ${consolidado.map((r) => `
              <tr>
                <td>${r.numero_guia}</td>
                <td>${r.fecha_despacho}</td>
                <td>${r.transportadora}</td>
                <td>${r.destinatario || ''}</td>
                <td>${r.ciudad_destino || ''}</td>
                <td class="right">${fmt(r.costo_flete)}</td>
                <td>${ESTADOS_LABEL[r.estado] || r.estado}</td>
              </tr>`).join('')}
            <tr class="total">
              <td colspan="5">TOTAL</td>
              <td class="right">${fmt(totalFlete)}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </body>
      </html>
    `
    const ventana = window.open('', '_blank')
    ventana.document.write(contenido)
    ventana.document.close()
    ventana.focus()
    setTimeout(() => { ventana.print() }, 400)
  }

  return (
    <div className="consolidado__overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="consolidado">

        {/* ── Header ── */}
        <div className="consolidado__header">
          <h2 className="consolidado__title">Consolidado de guías</h2>
          <button className="consolidado__close" onClick={onClose} aria-label="Cerrar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* ── Filtros ── */}
        <div className="consolidado__filtros">
          <select className="consolidado__select" value={mes} onChange={(e) => setMes(Number(e.target.value))}>
            {MESES_LABEL.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <input
            type="number" className="consolidado__input-anio"
            value={anio} min="2020" max="2099"
            onChange={(e) => setAnio(Number(e.target.value))}
          />
          <input
            type="text" className="consolidado__input"
            placeholder="Transportadora" value={trans}
            onChange={(e) => setTrans(e.target.value)}
          />
          <select className="consolidado__select" value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="">Todos los estados</option>
            {Object.entries(ESTADOS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button className="consolidado__filtrar-btn" onClick={handleFiltrar} disabled={loadingConsolidado}>
            {loadingConsolidado ? 'Cargando...' : 'Aplicar'}
          </button>
        </div>

        {/* ── Resumen ── */}
        <div className="consolidado__resumen">
          <div className="consolidado__resumen-item">
            <span className="consolidado__resumen-label">Total guías</span>
            <span className="consolidado__resumen-value">{totalGuias}</span>
          </div>
          <div className="consolidado__resumen-item consolidado__resumen-item--highlight">
            <span className="consolidado__resumen-label">Total fletes</span>
            <span className="consolidado__resumen-value">
              {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(totalFlete)}
            </span>
          </div>
        </div>

        {/* ── Tabla ── */}
        <div className="consolidado__table-wrap">
          {loadingConsolidado ? (
            <div className="consolidado__loading">Cargando datos...</div>
          ) : consolidado.length === 0 ? (
            <div className="consolidado__empty">Sin registros para los filtros seleccionados.</div>
          ) : (
            <table className="consolidado__table">
              <thead>
                <tr>
                  <th>Guía</th>
                  <th>Fecha</th>
                  <th>Transportadora</th>
                  <th>Destinatario</th>
                  <th>Ciudad</th>
                  <th>Uds</th>
                  <th>Flete</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {consolidado.map((r, i) => (
                  <tr key={i}>
                    <td className="consolidado__td-guia">{r.numero_guia}</td>
                    <td>{r.fecha_despacho}</td>
                    <td>{r.transportadora}</td>
                    <td>{r.destinatario || '—'}</td>
                    <td>{r.ciudad_destino || '—'}</td>
                    <td>{r.unidades ?? '—'}</td>
                    <td className="consolidado__td-flete">
                      {r.costo_flete ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(r.costo_flete) : '—'}
                    </td>
                    <td>{ESTADOS_LABEL[r.estado] || r.estado}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="consolidado__total-row">
                  <td colSpan="6">TOTAL</td>
                  <td className="consolidado__td-flete">
                    {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(totalFlete)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        {/* ── Footer exportar ── */}
        <div className="consolidado__footer">
          <button className="consolidado__cancel-btn" onClick={onClose}>Cerrar</button>
          <button className="consolidado__export-btn consolidado__export-btn--csv" onClick={exportarCSV} disabled={consolidado.length === 0}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Exportar CSV
          </button>
          <button className="consolidado__export-btn consolidado__export-btn--pdf" onClick={exportarPDF} disabled={consolidado.length === 0}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            Exportar PDF
          </button>
        </div>
      </div>
    </div>
  )
}