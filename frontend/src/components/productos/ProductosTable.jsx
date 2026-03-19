import { useCotizacionDraft } from '../../hooks/useCotizacionDraft'
import PrimaryButton from '../common/PrimaryButton'
import './ProductosTable.css'

function formatCOP(value) {
  if (!value && value !== 0) return '—'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value)
}

// Se asigna un arreglo vacío por defecto a 'productos' para evitar crashes si es undefined
export default function ProductosTable({ productos = [], onVerDetalle }) {
  const { addProduct, removeProduct, isProductoAgregado } = useCotizacionDraft()

  const handleAgregar = (producto) => {
    if (isProductoAgregado(producto.cod_ref)) {
      removeProduct(producto.cod_ref)
    } else {
      addProduct(producto)
    }
  }

  return (
    <div className="productos-table-wrapper">
      <table className="productos-table">
        <thead>
          <tr>
            <th>Código</th>
            <th>Nombre</th>
            <th>Tipo</th>
            <th className="u-text-right">Saldo</th>
            <th className="u-text-right">Precio</th>
            <th>Recursos</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          {/* Si 'productos' está vacío, simplemente no renderiza filas, pero no colapsa */}
          {productos.map((producto) => {
            const agregado = isProductoAgregado(producto.cod_ref)
            return (
              <tr
                key={producto.cod_ref}
                className={agregado ? 'productos-table__row--agregado' : ''}
              >
                <td>
                  <span className="productos-table__cod">{producto.cod_ref}</span>
                </td>
                <td>
                  <span className="productos-table__nombre">{producto.nom_ref}</span>
                </td>
                <td>
                  <span className="u-badge u-badge--info">
                    {producto.nom_tip || producto.cod_tip || '—'}
                  </span>
                </td>
                <td className="u-text-right">
                  <span className={`productos-table__saldo ${
                    producto.saldo > 0
                      ? 'productos-table__saldo--ok'
                      : 'productos-table__saldo--agotado'
                  }`}>
                    {producto.saldo ?? '—'}
                  </span>
                </td>
                <td className="u-text-right">
                  <span className="productos-table__precio">
                    {formatCOP(producto.valor_web)}
                  </span>
                </td>
                <td>
                  <div className="productos-table__recursos">
                    {producto.imagen_url ? (
                      <a
                        href={producto.imagen_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="productos-table__recurso-btn"
                        title="Ver imagen"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21 15 16 10 5 21" />
                        </svg>
                      </a>
                    ) : (
                      <span className="productos-table__recurso-btn productos-table__recurso-btn--disabled" title="Sin imagen">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21 15 16 10 5 21" />
                        </svg>
                      </span>
                    )}
                    {producto.ficha_tecnica_url ? (
                      <a
                        href={producto.ficha_tecnica_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="productos-table__recurso-btn"
                        title="Ver ficha técnica"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="16" y1="13" x2="8" y2="13" />
                          <line x1="16" y1="17" x2="8" y2="17" />
                        </svg>
                      </a>
                    ) : (
                      <span className="productos-table__recurso-btn productos-table__recurso-btn--disabled" title="Sin ficha técnica">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                      </span>
                    )}
                    <button
                      className="productos-table__recurso-btn"
                      onClick={() => onVerDetalle(producto.cod_ref)}
                      title="Ver detalle"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                    </button>
                  </div>
                </td>
                <td>
                  <PrimaryButton
                    variant={agregado ? 'secondary' : 'primary'}
                    size="sm"
                    onClick={() => handleAgregar(producto)}
                    icon={
                      agregado ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                      )
                    }
                  >
                    {agregado ? 'Agregado' : 'Agregar'}
                  </PrimaryButton>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}