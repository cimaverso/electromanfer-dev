import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getMetricas } from '../api/dashboardApi'
import LoadingSpinner from '../components/common/LoadingSpinner'
import PrimaryButton from '../components/common/PrimaryButton'
import './DashboardPage.css'

// ─── Mock temporal mientras backend no tenga el endpoint ─────────────────────
const MOCK_METRICAS = {
  cotizaciones_hoy: 4,
  cotizaciones_mes: 87,
  cotizaciones_pendientes: 12,
  monto_total_mes: 14850000,
  variacion_mes: 8.4,
  cotizaciones_recientes: [
    { id: 1, consecutivo: 'COT-2026-000087', cliente: 'Constructora Los Andes S.A.', total: 2395000, estado: 'enviada_email', fecha: '2026-03-18' },
    { id: 2, consecutivo: 'COT-2026-000086', cliente: 'Industria del Norte S.A.S.', total: 870000, estado: 'generada', fecha: '2026-03-18' },
    { id: 3, consecutivo: 'COT-2026-000085', cliente: 'Ferretería Central Ltda.', total: 1240000, estado: 'enviada_whatsapp', fecha: '2026-03-17' },
    { id: 4, consecutivo: 'COT-2026-000084', cliente: 'Eléctricos del Valle', total: 560000, estado: 'generada', fecha: '2026-03-17' },
    { id: 5, consecutivo: 'COT-2026-000083', cliente: 'Grupo Constructor Medellín', total: 3180000, estado: 'anulada', fecha: '2026-03-16' },
  ],
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatCOP(value) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

const ESTADO_CONFIG = {
  generada:          { label: 'Generada',      className: 'u-badge u-badge--info' },
  enviada_email:     { label: 'Email enviado', className: 'u-badge u-badge--success' },
  enviada_whatsapp:  { label: 'WhatsApp',      className: 'u-badge u-badge--success' },
  enviada_ambos:     { label: 'Enviada',       className: 'u-badge u-badge--success' },
  anulada:           { label: 'Anulada',       className: 'u-badge u-badge--danger' },
}

function EstadoBadge({ estado }) {
  const config = ESTADO_CONFIG[estado] || { label: estado, className: 'u-badge' }
  return <span className={config.className}>{config.label}</span>
}

// ─── Tarjeta de métrica ───────────────────────────────────────────────────────
function MetricCard({ icon, label, value, sub, accent }) {
  return (
    <div className={`dash-metric ${accent ? 'dash-metric--accent' : ''}`}>
      <div className="dash-metric__icon">{icon}</div>
      <div className="dash-metric__body">
        <span className="dash-metric__label">{label}</span>
        <span className="dash-metric__value">{value}</span>
        {sub && <span className="dash-metric__sub">{sub}</span>}
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [metricas, setMetricas] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function fetchMetricas() {
      setLoading(true)
      setError(null)
      try {
        const data = await getMetricas()
        if (!cancelled) setMetricas(data)
      } catch {
        // Si el backend no está listo, usa mock y no muestra error
        if (!cancelled) {
          setMetricas(MOCK_METRICAS)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchMetricas()
    return () => { cancelled = true }
  }, [])

  const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Buenos días'
    if (hour < 18) return 'Buenas tardes'
    return 'Buenas noches'
  }

  if (loading) {
    return <LoadingSpinner size="lg" text="Cargando métricas..." fullPage />
  }

  return (
    <div className="dashboard">

      {/* ── Saludo ── */}
      <div className="dashboard__welcome">
        <div>
          <h2 className="dashboard__welcome-title">
            {greeting()}, {user?.usu_nombre?.split(' ')[0] || 'Asesor'} 👋
          </h2>
          <p className="dashboard__welcome-sub">
            Aquí tienes el resumen de actividad de ELECTROMANFER
          </p>
        </div>
        <PrimaryButton
          variant="primary"
          size="md"
          onClick={() => navigate('/productos')}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          }
        >
          Nueva cotización
        </PrimaryButton>
      </div>

      {/* ── Métricas ── */}
      <div className="dashboard__metrics">
        <MetricCard
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          }
          label="Cotizaciones hoy"
          value={metricas.cotizaciones_hoy}
          sub="documentos generados"
        />
        <MetricCard
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          }
          label="Cotizaciones del mes"
          value={metricas.cotizaciones_mes}
          sub={
            metricas.variacion_mes >= 0
              ? `↑ ${metricas.variacion_mes}% vs mes anterior`
              : `↓ ${Math.abs(metricas.variacion_mes)}% vs mes anterior`
          }
        />
        <MetricCard
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          }
          label="Pendientes de envío"
          value={metricas.cotizaciones_pendientes}
          sub="requieren seguimiento"
        />
        <MetricCard
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          }
          label="Monto total del mes"
          value={formatCOP(metricas.monto_total_mes)}
          sub="en cotizaciones generadas"
          accent
        />
      </div>

      {/* ── Cotizaciones recientes ── */}
      <div className="dashboard__section">
        <div className="dashboard__section-header">
          <h3 className="dashboard__section-title">Cotizaciones recientes</h3>
          <button
            className="dashboard__section-link"
            onClick={() => navigate('/cotizaciones')}
          >
            Ver todas →
          </button>
        </div>

        <div className="dashboard__table-wrapper">
          {error && (
            <div className="dashboard__error">
              <span>⚠</span> No se pudo cargar la información en tiempo real.
            </div>
          )}

          <table className="dashboard__table">
            <thead>
              <tr>
                <th>Consecutivo</th>
                <th>Cliente</th>
                <th>Total</th>
                <th>Estado</th>
                <th>Fecha</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {metricas.cotizaciones_recientes.map((cot) => (
                <tr key={cot.id}>
                  <td>
                    <span className="dashboard__consecutivo">{cot.consecutivo}</span>
                  </td>
                  <td>{cot.cliente}</td>
                  <td>
                    <span className="dashboard__monto">{formatCOP(cot.total)}</span>
                  </td>
                  <td>
                    <EstadoBadge estado={cot.estado} />
                  </td>
                  <td className="u-text-muted">
                    {new Date(cot.fecha + 'T00:00:00').toLocaleDateString('es-CO', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td>
                    <button
                      className="dashboard__action-btn"
                      onClick={() => navigate('/cotizaciones')}
                      title="Ver cotización"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Accesos rápidos ── */}
      <div className="dashboard__shortcuts">
        <div className="dashboard__shortcut" onClick={() => navigate('/productos')}>
          <div className="dashboard__shortcut-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          </div>
          <div className="dashboard__shortcut-body">
            <span className="dashboard__shortcut-label">Buscar productos</span>
            <span className="dashboard__shortcut-desc">Agrega productos a una nueva cotización</span>
          </div>
          <svg className="dashboard__shortcut-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>

        <div className="dashboard__shortcut" onClick={() => navigate('/cotizaciones')}>
          <div className="dashboard__shortcut-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <div className="dashboard__shortcut-body">
            <span className="dashboard__shortcut-label">Historial de cotizaciones</span>
            <span className="dashboard__shortcut-desc">Consulta, descarga o reenvía cotizaciones</span>
          </div>
          <svg className="dashboard__shortcut-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      </div>

    </div>
  )
}