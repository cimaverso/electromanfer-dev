import { useState, useEffect } from 'react'
import { useGuias } from '../../hooks/useGuias'
import './GuiasConsolidado.css'
import * as XLSX from 'xlsx'


const ESTADOS_LABEL = {
  generada: 'Generada', despachada: 'Despachada', en_transito: 'En tránsito',
  entregada: 'Entregada', novedad: 'Novedad',
}

function fmt(v) {
  if (!v && v !== 0) return ''
  return new Intl.NumberFormat('es-CO').format(v)
}

const MESES_LABEL = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

export default function GuiasConsolidado({ onClose }) {
  const { consolidado, loadingConsolidado, cargarConsolidado } = useGuias()

  const hoy = new Date()
  const [mes, setMes] = useState(hoy.getMonth() + 1)
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

  // ── Exportar XLSX ────────────────────────────────────────────────────────
  const exportarXLSX = () => {
    const filas = consolidado.map((r) => ({
      'Guía': r.numero_guia,
      'Fecha': r.fecha_despacho,
      'Cotización': r.cotizacion || '',
      'Transportadora': r.transportadora,
      'Destinatario': r.destinatario || '',
      'Ciudad': r.ciudad_destino || '',
      'Unidades': r.unidades ?? '',
      'Peso kg': r.peso_kg ?? '',
      'Valor declarado': r.valor_declarado ?? '',
      'Valor recaudo': r.valor_recaudo ?? '',
      'Costo flete': r.costo_flete ?? '',
      'Estado': ESTADOS_LABEL[r.estado] || r.estado,
      'Ref. interna': r.referencia_interna || '',
    }))

    const hoja = XLSX.utils.json_to_sheet(filas)
    const libro = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(libro, hoja, 'Consolidado')
    XLSX.writeFile(libro, `consolidado_guias_${MESES_LABEL[mes - 1]}_${anio}.xlsx`)
  }

  // ── Exportar PDF (texto simple via jsPDF si está disponible, sino HTML print) ──
  const exportarPDF = () => {
    const contenido = `
    <html>
    <head>
      <meta charset="utf-8">
      <title>Consolidado guías ${MESES_LABEL[mes - 1]} ${anio}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; font-size: 10px; color: #1a1a1a; padding: 24px; }
        .header { background: #4a7c10; color: white; padding: 16px 20px; border-radius: 6px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }
        .header h1 { font-size: 15px; font-weight: bold; }
        .header p { font-size: 10px; opacity: 0.85; margin-top: 2px; }
        .logo { font-size: 18px; font-weight: bold; letter-spacing: 1px; }
        .resumen { display: flex; gap: 16px; margin-bottom: 14px; }
        .resumen-card { background: #f0f4e8; border-left: 3px solid #4a7c10; padding: 8px 14px; border-radius: 4px; }
        .resumen-card span { display: block; }
        .resumen-card .label { color: #666; font-size: 9px; text-transform: uppercase; }
        .resumen-card .value { font-size: 14px; font-weight: bold; color: #4a7c10; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        thead tr { background: #4a7c10; color: white; }
        th { padding: 6px 8px; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; }
        td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; font-size: 9px; }
        tr:nth-child(even) td { background: #f9fafb; }
        .total-row td { background: #f0f4e8 !important; font-weight: bold; border-top: 2px solid #4a7c10; }
        .right { text-align: right; }
        .footer { margin-top: 16px; color: #999; font-size: 8px; text-align: right; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="logo">⚡ ELECTROMANFER</div>
          <p>Consolidado de guías de envío</p>
        </div>
        <div style="text-align:right">
          <div style="font-size:13px;font-weight:bold">${MESES_LABEL[mes - 1]} ${anio}</div>
          <div style="font-size:9px;opacity:0.8">Generado: ${new Date().toLocaleDateString('es-CO')}</div>
        </div>
      </div>

      <div class="resumen">
        <div class="resumen-card">
          <span class="label">Total guías</span>
          <span class="value">${totalGuias}</span>
        </div>
        <div class="resumen-card">
          <span class="label">Total fletes</span>
          <span class="value">${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(totalFlete)}</span>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Guía</th>
            <th>Fecha</th>
            <th>Transportadora</th>
            <th>Destinatario</th>
            <th>Ciudad</th>
            <th class="right">Flete</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          ${consolidado.map((r) => `
            <tr>
              <td>${r.numero_guia}</td>
              <td>${r.fecha_despacho}</td>
              <td>${r.transportadora}</td>
              <td>${r.destinatario || '—'}</td>
              <td>${r.ciudad_destino || '—'}</td>
              <td class="right">${r.costo_flete ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(r.costo_flete) : '—'}</td>
              <td>${ESTADOS_LABEL[r.estado] || r.estado}</td>
            </tr>`).join('')}
          <tr class="total-row">
            <td colspan="5">TOTAL</td>
            <td class="right">${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(totalFlete)}</td>
            <td></td>
          </tr>
        </tbody>
      </table>
      <div class="footer">Electromanfer Ltda. — Sistema de Gestión Comercial</div>
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
          <button className="consolidado__export-btn consolidado__export-btn--csv" onClick={exportarXLSX} disabled={consolidado.length === 0}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Exportar XLSX
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