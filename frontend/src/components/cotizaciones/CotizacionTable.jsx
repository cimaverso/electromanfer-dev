import { useCotizacionDraft } from '../../hooks/useCotizacionDraft'
import EmptyState from '../common/EmptyState'
import './CotizacionTable.css'

function formatCOP(value) {
  if (!value && value !== 0) return '—'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value)
}

export default function CotizacionTable({ onIrAProductos }) {
  const { selectedProducts = [], updateQuantity, removeProduct } = useCotizacionDraft()

  if (selectedProducts.length === 0) {
    return (
      <EmptyState
        icon="🛒"
        title="No hay productos en esta cotización"
        desc="Ve al módulo de productos, busca y agrega los que necesitas."
        action={
          <button className="cot-table__go-btn" onClick={onIrAProductos}>
            Ir a buscar productos
          </button>
        }
      />
    )
  }

  return (
    <div className="cot-table-wrapper">
      <table className="cot-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Código</th>
            <th>Descripción</th>
            <th className="u-text-right">Precio unit.</th>
            <th>Cantidad</th>
            <th className="u-text-right">Subtotal</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {selectedProducts.map((p, index) => {
            const subtotal = (p.valor_web || 0) * p.cantidad
            return (
              <tr key={p.cod_ref}>
                <td className="cot-table__num">{index + 1}</td>
                <td>
                  <span className="cot-table__cod">{p.cod_ref}</span>
                </td>
                <td>
                  <span className="cot-table__nom">{p.nom_ref}</span>
                  {p.nom_tip && (
                    <span className="cot-table__tipo">{p.nom_tip}</span>
                  )}
                </td>
                <td className="u-text-right">
                  <span className="cot-table__precio">{formatCOP(p.valor_web)}</span>
                </td>
                <td>
                  <div className="cot-table__qty">
                    <button
                      className="cot-table__qty-btn"
                      onClick={() => updateQuantity(p.cod_ref, p.cantidad - 1)}
                      disabled={p.cantidad <= 1}
                      aria-label="Reducir"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      className="cot-table__qty-input"
                      value={p.cantidad}
                      min={1}
                      onChange={(e) => updateQuantity(p.cod_ref, e.target.value)}
                      aria-label="Cantidad"
                    />
                    <button
                      className="cot-table__qty-btn"
                      onClick={() => updateQuantity(p.cod_ref, p.cantidad + 1)}
                      aria-label="Aumentar"
                    >
                      +
                    </button>
                  </div>
                </td>
                <td className="u-text-right">
                  <span className="cot-table__subtotal">{formatCOP(subtotal)}</span>
                </td>
                <td>
                  <button
                    className="cot-table__remove"
                    onClick={() => removeProduct(p.cod_ref)}
                    title="Quitar producto"
                    aria-label="Quitar producto"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6" />
                      <path d="M14 11v6" />
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}