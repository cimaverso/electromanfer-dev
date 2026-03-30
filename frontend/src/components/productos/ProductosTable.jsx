import { useState, useEffect } from 'react'
import { useCotizacionDraft } from '../../hooks/useCotizacionDraft'
import PrimaryButton from '../common/PrimaryButton'
import RecursosModal from './RecursosModal'
import { contarRecursos } from '../../api/recursosApi'
import './ProductosTable.css'

function formatCOP(value) {
  if (!value && value !== 0) return '—'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value)
}

export default function ProductosTable({ productos = [], onVerDetalle }) {
  const { addProduct, removeProduct, isProductoAgregado } = useCotizacionDraft()

  // Modal de recursos: guarda { codRef, nomRef } del producto activo
  const [modalRecursos, setModalRecursos] = useState(null)

  // Contadores de recursos por cod_ref: { [cod_ref]: { imagenes: n, pdfs: n } }
  const [contadores, setContadores] = useState({})

  // Carga contadores cuando cambia la lista de productos
  useEffect(() => {
    if (!productos.length) return
    productos.forEach(async (p) => {
      try {
        const counts = await contarRecursos(p.cod_ref)
        setContadores((prev) => ({ ...prev, [p.cod_ref]: counts }))
      } catch {
        // silencioso — el ícono queda opaco si falla
      }
    })
  }, [productos])

  const handleAgregar = (producto) => {
    if (isProductoAgregado(producto.cod_ref)) {
      removeProduct(producto.cod_ref)
    } else {
      addProduct(producto)
    }
  }

  const abrirRecursos = (producto) => {
    setModalRecursos({ codRef: producto.cod_ref, nomRef: producto.nom_ref })
  }

  const cerrarRecursos = () => {
    // Al cerrar, recarga contadores del producto que se editó
    if (modalRecursos) {
      contarRecursos(modalRecursos.codRef)
        .then((counts) =>
          setContadores((prev) => ({ ...prev, [modalRecursos.codRef]: counts }))
        )
        .catch(() => {})
    }
    setModalRecursos(null)
  }

  return (
    <>
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
            {productos.map((producto) => {
              const agregado = isProductoAgregado(producto.cod_ref)
              const counts = contadores[producto.cod_ref]
              const tieneImagenes = (counts?.imagenes ?? 0) > 0
              const tienePdfs = (counts?.pdfs ?? 0) > 0

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

                  {/* ── Columna Recursos ── */}
                  <td>
                    <div className="productos-table__recursos">

                      {/* Un solo ícono — resaltado si tiene imágenes O PDFs */}
                      <button
                        className={`productos-table__recurso-btn ${(tieneImagenes || tienePdfs) ? 'productos-table__recurso-btn--active' : ''}`}
                        onClick={() => abrirRecursos(producto)}
                        title={
                          (tieneImagenes || tienePdfs)
                            ? `${counts?.imagenes ?? 0} img · ${counts?.pdfs ?? 0} PDF — clic para gestionar`
                            : 'Sin recursos — clic para agregar imágenes o fichas PDF'
                        }
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21 15 16 10 5 21" />
                        </svg>
                        {(tieneImagenes || tienePdfs) && (
                          <span className="productos-table__recurso-count">
                            {(counts?.imagenes ?? 0) + (counts?.pdfs ?? 0)}
                          </span>
                        )}
                      </button>

                      {/* Ícono detalle (lupa) */}
                      <button
                        className="productos-table__recurso-btn"
                        onClick={() => onVerDetalle(producto.cod_ref)}
                        title="Ver detalle del producto"
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

      {/* ── Modal de recursos (fuera del wrapper para evitar z-index issues) ── */}
      {modalRecursos && (
        <RecursosModal
          codRef={modalRecursos.codRef}
          nomRef={modalRecursos.nomRef}
          onClose={cerrarRecursos}
        />
      )}
    </>
  )
}