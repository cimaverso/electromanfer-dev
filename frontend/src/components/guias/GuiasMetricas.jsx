import './GuiasMetricas.css'

const ESTADOS_CONFIG = {
  generada:    { label: 'Generada',    color: 'var(--color-info)' },
  despachada:  { label: 'Despachada',  color: 'var(--color-primary)' },
  en_transito: { label: 'En tránsito', color: 'var(--color-warning)' },
  entregada:   { label: 'Entregada',   color: 'var(--color-success)' },
  novedad:     { label: 'Novedad',     color: 'var(--color-danger)' },
}

function fmt(valor) {
  if (!valor && valor !== 0) return '—'
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(valor)
}

export default function GuiasMetricas({ metricas, loading }) {
  if (loading) {
    return (
      <div className="guias-metricas guias-metricas--loading">
        <div className="guias-metricas__skeleton" />
        <div className="guias-metricas__skeleton" />
        <div className="guias-metricas__skeleton" />
      </div>
    )
  }

  if (!metricas) return null

  const variacion = metricas.total_mes_anterior > 0
    ? ((metricas.total_mes - metricas.total_mes_anterior) / metricas.total_mes_anterior * 100).toFixed(1)
    : null

  const totalEstados = Object.values(metricas.por_estado || {}).reduce((a, b) => a + b, 0) || 1

  return (
    <div className="guias-metricas">

      {/* ── Tarjeta mes actual ── */}
      <div className="guias-metricas__card">
        <span className="guias-metricas__card-label">Fletes mes actual</span>
        <span className="guias-metricas__card-value">{fmt(metricas.total_mes)}</span>
        <span className="guias-metricas__card-sub">
          {metricas.cantidad_mes} guía{metricas.cantidad_mes !== 1 ? 's' : ''}
        </span>
        {variacion !== null && (
          <span className={`guias-metricas__variacion ${Number(variacion) >= 0 ? 'guias-metricas__variacion--up' : 'guias-metricas__variacion--down'}`}>
            {Number(variacion) >= 0 ? '▲' : '▼'} {Math.abs(variacion)}% vs mes anterior
          </span>
        )}
      </div>

      {/* ── Tarjeta mes anterior ── */}
      <div className="guias-metricas__card">
        <span className="guias-metricas__card-label">Mes anterior</span>
        <span className="guias-metricas__card-value guias-metricas__card-value--muted">{fmt(metricas.total_mes_anterior)}</span>
        <span className="guias-metricas__card-sub">Referencia comparativa</span>
      </div>

      {/* ── Tarjeta año ── */}
      <div className="guias-metricas__card">
        <span className="guias-metricas__card-label">Acumulado año</span>
        <span className="guias-metricas__card-value">{fmt(metricas.total_anio)}</span>
        <span className="guias-metricas__card-sub">Todos los meses</span>
      </div>

      {/* ── Tarjeta estados ── */}
      <div className="guias-metricas__card guias-metricas__card--estados">
        <span className="guias-metricas__card-label">Guías por estado</span>
        <div className="guias-metricas__estados-lista">
          {Object.entries(metricas.por_estado || {}).map(([estado, cantidad]) => {
            const cfg = ESTADOS_CONFIG[estado] || { label: estado, color: 'var(--color-text-muted)' }
            const pct = Math.round((cantidad / totalEstados) * 100)
            return (
              <div key={estado} className="guias-metricas__estado-row">
                <span className="guias-metricas__estado-dot" style={{ background: cfg.color }} />
                <span className="guias-metricas__estado-label">{cfg.label}</span>
                <div className="guias-metricas__estado-bar-wrap">
                  <div className="guias-metricas__estado-bar" style={{ width: `${pct}%`, background: cfg.color }} />
                </div>
                <span className="guias-metricas__estado-count">{cantidad}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Tarjeta top transportadoras ── */}
      <div className="guias-metricas__card guias-metricas__card--top">
        <span className="guias-metricas__card-label">Top transportadoras (mes)</span>
        <div className="guias-metricas__top-lista">
          {(metricas.top_transportadoras || []).map((t, i) => (
            <div key={t.nombre} className="guias-metricas__top-row">
              <span className="guias-metricas__top-rank">#{i + 1}</span>
              <span className="guias-metricas__top-nombre">{t.nombre}</span>
              <span className="guias-metricas__top-cantidad">{t.cantidad} guías</span>
              <span className="guias-metricas__top-total">{fmt(t.total)}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}