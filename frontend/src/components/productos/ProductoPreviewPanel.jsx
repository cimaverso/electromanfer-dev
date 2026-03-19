import { useState, useEffect } from 'react'
import { useCotizacionDraft } from '../../hooks/useCotizacionDraft'
import LoadingSpinner from '../common/LoadingSpinner'
import PrimaryButton from '../common/PrimaryButton'
import './ProductoPreviewPanel.css'

function formatCOP(value) {
  if (!value && value !== 0) return '—'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value)
}

export default function ProductoPreviewPanel({ producto, loading, onClose }) {
  const { addProduct, removeProduct, isProductoAgregado } = useCotizacionDraft()
  
  // Estado para controlar el fallo de carga de la imagen
  const [imageError, setImageError] = useState(false)

  // Reseteamos el estado de error de imagen cuando cambia el producto evaluado
  useEffect(() => {
    setImageError(false)
  }, [producto?.cod_ref])

  const agregado = producto ? isProductoAgregado(producto.cod_ref) : false

  const handleToggle = () => {
    if (!producto) return
    if (agregado) {
      removeProduct(producto.cod_ref)
    } else {
      addProduct(producto)
    }
  }

  const isOpen = loading || !!producto

  return (
    <>
      {isOpen && (
        <div className="preview-panel__overlay" onClick={onClose} />
      )}

      <div className={`preview-panel ${isOpen ? 'preview-panel--open' : ''}`}>
        <div className="preview-panel__header">
          <h3 className="preview-panel__title">
            {loading ? 'Cargando...' : 'Detalle del producto'}
          </h3>
          <button
            className="preview-panel__close"
            onClick={onClose}
            aria-label="Cerrar panel"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="preview-panel__body">
          {loading && (
            <LoadingSpinner size="md" text="Cargando detalle..." />
          )}

          {!loading && producto && (
            <>
              <div className="preview-panel__image-wrapper">
                {/* Renderizado condicional basado en estado, no en mutación del DOM */}
                {producto.imagen_url && !imageError ? (
                  <img
                    src={producto.imagen_url}
                    alt={producto.nom_ref}
                    className="preview-panel__image"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <div className="preview-panel__image-fallback">
                    <span>📦</span>
                    <span>Sin imagen</span>
                  </div>
                )}
              </div>

              <div className="preview-panel__data">
                <span className="preview-panel__cod">{producto.cod_ref}</span>
                <h4 className="preview-panel__nom">{producto.nom_ref}</h4>

                {producto.nom_tip && (
                  <span className="u-badge u-badge--info preview-panel__tipo">
                    {producto.nom_tip}
                  </span>
                )}

                <div className="preview-panel__stats">
                  <div className="preview-panel__stat">
                    <span className="preview-panel__stat-label">Precio unitario</span>
                    <span className="preview-panel__stat-value preview-panel__stat-value--precio">
                      {formatCOP(producto.valor_web)}
                    </span>
                  </div>
                  <div className="preview-panel__stat">
                    <span className="preview-panel__stat-label">Saldo disponible</span>
                    <span className={`preview-panel__stat-value ${
                      producto.saldo > 0
                        ? 'preview-panel__stat-value--ok'
                        : 'preview-panel__stat-value--agotado'
                    }`}>
                      {producto.saldo ?? '—'} unidades
                    </span>
                  </div>
                </div>

                {producto.ficha_tecnica_url && (
                  <a
                    href={producto.ficha_tecnica_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="preview-panel__ficha-btn"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                    Ver ficha técnica (PDF)
                  </a>
                )}
              </div>

              <div className="preview-panel__footer">
                <PrimaryButton
                  variant={agregado ? 'secondary' : 'primary'}
                  size="lg"
                  onClick={handleToggle}
                >
                  {agregado ? '✓ Agregado — Click para quitar' : '+ Agregar a cotización'}
                </PrimaryButton>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}