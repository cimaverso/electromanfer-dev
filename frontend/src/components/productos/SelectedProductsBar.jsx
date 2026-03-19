import { useNavigate } from 'react-router-dom'
import { useCotizacionDraft } from '../../hooks/useCotizacionDraft'
import PrimaryButton from '../common/PrimaryButton'
import './SelectedProductsBar.css'

function formatCOP(value) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value)
}

export default function SelectedProductsBar() {
  const navigate = useNavigate()
  const {
    selectedProducts,
    removeProduct,
    updateQuantity,
    getSubtotal,
    getTotal,
    getTotalItems,
    clearDraft,
  } = useCotizacionDraft()

  if (selectedProducts.length === 0) return null

  return (
    <div className="sel-bar">
      <div className="sel-bar__header">
        <div className="sel-bar__header-left">
          <span className="sel-bar__title">
            Lista de cotización
          </span>
          <span className="sel-bar__count">
            {selectedProducts.length} producto{selectedProducts.length !== 1 ? 's' : ''} ·{' '}
            {getTotalItems()} unidad{getTotalItems() !== 1 ? 'es' : ''}
          </span>
        </div>
        <button
          className="sel-bar__clear"
          onClick={clearDraft}
          title="Limpiar lista"
        >
          Limpiar todo
        </button>
      </div>

      <div className="sel-bar__items">
        {selectedProducts.map((p) => (
          <div key={p.cod_ref} className="sel-bar__item">
            <div className="sel-bar__item-info">
              <span className="sel-bar__item-cod">{p.cod_ref}</span>
              <span className="sel-bar__item-nom">{p.nom_ref}</span>
            </div>

            <div className="sel-bar__item-controls">
              <div className="sel-bar__qty">
                <button
                  className="sel-bar__qty-btn"
                  onClick={() => updateQuantity(p.cod_ref, p.cantidad - 1)}
                  disabled={p.cantidad <= 1}
                  aria-label="Reducir cantidad"
                >
                  −
                </button>
                <input
                  type="number"
                  className="sel-bar__qty-input"
                  value={p.cantidad}
                  min={1}
                  onChange={(e) => updateQuantity(p.cod_ref, e.target.value)}
                  aria-label="Cantidad"
                />
                <button
                  className="sel-bar__qty-btn"
                  onClick={() => updateQuantity(p.cod_ref, p.cantidad + 1)}
                  aria-label="Aumentar cantidad"
                >
                  +
                </button>
              </div>

              <span className="sel-bar__item-subtotal">
                {formatCOP((p.valor_web || 0) * p.cantidad)}
              </span>

              <button
                className="sel-bar__item-remove"
                onClick={() => removeProduct(p.cod_ref)}
                title="Quitar producto"
                aria-label="Quitar producto"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="sel-bar__footer">
        <div className="sel-bar__totals">
          <div className="sel-bar__total-row">
            <span>Subtotal</span>
            <span>{formatCOP(getSubtotal())}</span>
          </div>
          <div className="sel-bar__total-row">
            <span>IVA (19%)</span>
            <span>{formatCOP(getTotal() - getSubtotal())}</span>
          </div>
          <div className="sel-bar__total-row sel-bar__total-row--total">
            <span>Total estimado</span>
            <span>{formatCOP(getTotal())}</span>
          </div>
          <p className="sel-bar__disclaimer">
            * Valores preliminares. El total oficial lo calcula el backend al generar la cotización.
          </p>
        </div>

        <PrimaryButton
          variant="primary"
          size="lg"
          onClick={() => navigate('/cotizaciones')}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          }
        >
          Ir a cotizar ({selectedProducts.length})
        </PrimaryButton>
      </div>
    </div>
  )
}