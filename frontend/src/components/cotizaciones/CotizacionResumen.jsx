import { useCotizacionDraft } from '../../hooks/useCotizacionDraft'
import PrimaryButton from '../common/PrimaryButton'
import './CotizacionResumen.css'

function formatCOP(value) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value)
}

export default function CotizacionResumen({ onGenerar, loading }) {
  const {
    selectedProducts = [],
    clienteDraft,
    getSubtotal,
    getIva,
    getTotal,
  } = useCotizacionDraft()

  const tieneProductos = selectedProducts.length > 0
  const tieneCliente = !!(clienteDraft?.nombre_razon_social?.trim())
  const puedeGenerar = tieneProductos && tieneCliente && !loading

  const validaciones = [
    {
      ok: tieneProductos,
      msg: 'Agrega al menos un producto',
    },
    {
      ok: tieneCliente,
      msg: 'Completa la razón social del cliente',
    },
  ]

  return (
    <div className="cot-resumen">
      <h4 className="cot-resumen__title">Resumen de cotización</h4>

      {/* Totales preliminares */}
      <div className="cot-resumen__totales">
        <div className="cot-resumen__row">
          <span className="cot-resumen__row-label">Subtotal</span>
          <span className="cot-resumen__row-value">{formatCOP(getSubtotal())}</span>
        </div>
        <div className="cot-resumen__row">
          <span className="cot-resumen__row-label">IVA (19%)</span>
          <span className="cot-resumen__row-value">{formatCOP(getIva())}</span>
        </div>
        <div className="cot-resumen__row cot-resumen__row--total">
          <span className="cot-resumen__row-label">Total estimado</span>
          <span className="cot-resumen__row-value">{formatCOP(getTotal())}</span>
        </div>
      </div>

      <p className="cot-resumen__disclaimer">
        * Valores preliminares. El cálculo oficial y el PDF los genera el backend.
      </p>

      {/* Validaciones */}
      {!puedeGenerar && (
        <div className="cot-resumen__validaciones">
          {validaciones.map((v, i) => (
            !v.ok && (
              <div key={i} className="cot-resumen__validacion">
                <span className="cot-resumen__validacion-icon">○</span>
                <span>{v.msg}</span>
              </div>
            )
          ))}
        </div>
      )}

      {/* Botón generar */}
      <PrimaryButton
        variant="primary"
        size="lg"
        loading={loading}
        disabled={!puedeGenerar}
        onClick={onGenerar}
      >
        {loading ? 'Generando cotización...' : 'Generar cotización'}
      </PrimaryButton>
    </div>
  )
}