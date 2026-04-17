import { useState, useRef, useEffect } from 'react'
import { useProductosInternos } from '../../hooks/useProductosInternos'
import { useCotizacionDraft } from '../../hooks/useCotizacionDraft'
import { useToast } from '../../hooks/useToast'
import ProductoInternoForm from './internos/ProductoInternoForm'
import RecursosModal from './RecursosModal'
import { contarRecursos } from '../../api/recursosApi'
import SearchInput from '../common/SearchInput'
import LoadingSpinner from '../common/LoadingSpinner'
import EmptyState from '../common/EmptyState'
import Toast from '../common/Toast'
import './ProductosInternosList.css'

function formatPrecio(valor) {
  if (!valor && valor !== 0) return '—'
  return `$ ${Number(valor).toLocaleString('es-CO')}`
}

export default function ProductosInternosList() {
  const {
    resultados,
    loading,
    loadingForm,
    query,
    setQuery,
    buscar,
    crear,
    actualizar,
    eliminar,
  } = useProductosInternos()

  const { addProduct, isProductoAgregado } = useCotizacionDraft()
  const { toast, showToast, hideToast } = useToast()

  const [modalAbierto, setModalAbierto] = useState(false)
  const [productoEditar, setProductoEditar] = useState(null)
  const [confirmEliminar, setConfirmEliminar] = useState(null)
  const [recursoActivo, setRecursoActivo] = useState(null)
  const [contadores, setContadores] = useState({})

  useEffect(() => {
    if (!resultados.length) return
    resultados.forEach(async (p) => {
      try {
        const counts = await contarRecursos(p.cod_ref)
        setContadores((prev) => ({ ...prev, [p.cod_ref]: counts }))
      } catch { /* silencioso */ }
    })
  }, [resultados])

  const prevCount = useRef(0)
  const { selectedProducts } = useCotizacionDraft()

  useEffect(() => {
    buscar('')
  }, [buscar])

  useEffect(() => {
    const curr = selectedProducts.length
    if (curr > prevCount.current) {
      showToast('Producto agregado a la cotización', 'success')
    }
    prevCount.current = curr
  }, [selectedProducts.length, showToast])

  const handleBuscar = () => buscar(query)

  const handleAbrirCrear = () => {
    setProductoEditar(null)
    setModalAbierto(true)
  }

  const handleAbrirEditar = (producto) => {
    setProductoEditar(producto)
    setModalAbierto(true)
  }

  const handleGuardar = async (payload) => {
    if (productoEditar) {
      const result = await actualizar(productoEditar.cod_ref, payload)
      if (result.success) {
        showToast('Producto actualizado', 'success')
        setModalAbierto(false)
      } else {
        showToast(result.error, 'error')
      }
    } else {
      const result = await crear(payload)
      if (result.success) {
        showToast('Producto creado correctamente', 'success')
        setModalAbierto(false)
      } else {
        showToast(result.error, 'error')
      }
    }
  }

  const handleEliminar = async (id) => {
    const result = await eliminar(id)
    if (result.success) {
      showToast('Producto eliminado', 'success')
    } else {
      showToast(result.error, 'error')
    }
    setConfirmEliminar(null)
  }

  const handleAgregar = (producto) => {
    addProduct({
      cod_ref: producto.cod_ref,
      nom_ref: producto.nom_ref,
      tipo: producto.tipo || 'GENERAL',
      saldo: producto.saldo || 0,
      valor_web: producto.valor_web || 0,
    })
  }

  const hasBuscado = !loading && (resultados.length > 0 || query.trim() !== '')

  return (
    <div className="pi-list">

      {/* ─── Header ─── */}
      <div className="pi-list__header">
        <div>
          <h2 className="pi-list__title">Productos internos</h2>
          <p className="pi-list__desc">
            Productos personalizados o bajo pedido. Créalos aquí y agrégalos a la cotización.
          </p>
        </div>
        <button className="pi-list__btn-nuevo" onClick={handleAbrirCrear}>
          + Nuevo producto
        </button>
      </div>

      {/* ─── Buscador ─── */}
      <SearchInput
        value={query}
        onChange={setQuery}
        onSearch={handleBuscar}
        loading={loading}
        placeholder="Buscar por código, nombre o tipo..."
      />

      {/* ─── Resultados ─── */}
      <div className="pi-list__results">
        {loading && <LoadingSpinner size="md" text="Buscando productos..." />}

        {!loading && hasBuscado && resultados.length === 0 && (
          <EmptyState
            icon="🔍"
            title="Sin resultados"
            desc={`No hay productos internos para "${query}".`}
            action={
              <button className="pi-list__btn-empty" onClick={handleAbrirCrear}>
                + Crear producto
              </button>
            }
          />
        )}

        {!loading && !hasBuscado && resultados.length === 0 && (
          <EmptyState
            icon="📦"
            title="Sin productos internos"
            desc="Crea tu primer producto interno para comenzar."
            action={
              <button className="pi-list__btn-empty" onClick={handleAbrirCrear}>
                + Crear producto
              </button>
            }
          />
        )}

        {!loading && resultados.length > 0 && (
          <>
            <div className="pi-list__results-header">
              <span className="pi-list__count">
                {resultados.length} producto{resultados.length !== 1 ? 's' : ''}
                {query.trim() ? ` para "${query}"` : ' registrados'}
              </span>
            </div>
            <div className="pi-list__table-scroll">
              <table className="pi-list__table">
                <thead>
                  <tr>
                    <th>CÓDIGO</th>
                    <th>NOMBRE</th>
                    <th>TIPO</th>
                    <th>SALDO</th>
                    <th>PRECIO</th>
                    <th>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {resultados.map((p) => (
                    <tr key={p.id || p.cod_ref}>
                      <td><span className="pi-list__cod">{p.cod_ref}</span></td>
                      <td className="pi-list__nom">{p.nom_ref}</td>
                      <td>
                        {p.nom_tip ? (
                          <span className="pi-list__badge">{p.nom_tip}</span>
                        ) : '—'}
                      </td>
                      <td>{p.saldo ?? 0}</td>
                      <td className="pi-list__precio">{formatPrecio(p.valor_web)}</td>
                      <td>
                        <div className="pi-list__actions">
                          <button
                            className="pi-list__action-btn pi-list__action-btn--edit"
                            title="Editar"
                            onClick={() => handleAbrirEditar(p)}
                          >
                            ✎
                          </button>
                          <button
                            className={`pi-list__action-btn pi-list__action-btn--recursos ${((contadores[p.cod_ref]?.imagenes ?? 0) + (contadores[p.cod_ref]?.pdfs ?? 0)) > 0 ? 'pi-list__action-btn--recursos-active' : ''}`}
                            title={
                              ((contadores[p.cod_ref]?.imagenes ?? 0) + (contadores[p.cod_ref]?.pdfs ?? 0)) > 0
                                ? `${contadores[p.cod_ref]?.imagenes ?? 0} img · ${contadores[p.cod_ref]?.pdfs ?? 0} PDF`
                                : 'Sin recursos — clic para agregar'
                            }
                            onClick={() => setRecursoActivo({ cod_ref: p.cod_ref, nom_ref: p.nom_ref })}
                            style={{ position: 'relative' }}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                              <rect x="3" y="3" width="18" height="18" rx="2" />
                              <circle cx="8.5" cy="8.5" r="1.5" />
                              <polyline points="21 15 16 10 5 21" />
                            </svg>
                            {((contadores[p.cod_ref]?.imagenes ?? 0) + (contadores[p.cod_ref]?.pdfs ?? 0)) > 0 && (
                              <span className="productos-table__recurso-count">
                                {(contadores[p.cod_ref]?.imagenes ?? 0) + (contadores[p.cod_ref]?.pdfs ?? 0)}
                              </span>
                            )}
                          </button>
                          <button
                            className="pi-list__action-btn pi-list__action-btn--delete"
                            title="Eliminar"
                            onClick={() => setConfirmEliminar(p)}
                          >
                            ✕
                          </button>
                          <button
                            className={`pi-list__btn-agregar ${isProductoAgregado(p.cod_ref) ? 'pi-list__btn-agregar--added' : ''}`}
                            onClick={() => handleAgregar(p)}
                            disabled={isProductoAgregado(p.cod_ref)}
                          >
                            {isProductoAgregado(p.cod_ref) ? '✓ Agregado' : '+ Agregar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* ─── Modal recursos ─── */}
      {recursoActivo && (
        <RecursosModal
          codRef={recursoActivo.cod_ref}
          nomRef={recursoActivo.nom_ref}
          onClose={() => {
            contarRecursos(recursoActivo.cod_ref)
              .then((counts) =>
                setContadores((prev) => ({ ...prev, [recursoActivo.cod_ref]: counts }))
              )
              .catch(() => { })
            setRecursoActivo(null)
          }}
        />
      )}

      {/* ─── Modal crear/editar ─── */}
      {modalAbierto && (
        <ProductoInternoForm
          producto={productoEditar}
          loading={loadingForm}
          onGuardar={handleGuardar}
          onCerrar={() => setModalAbierto(false)}
        />
      )}

      {/* ─── Confirm eliminar ─── */}
      {confirmEliminar && (
        <div className="pi-list__confirm-overlay" onClick={() => setConfirmEliminar(null)}>
          <div className="pi-list__confirm" onClick={(e) => e.stopPropagation()}>
            <p className="pi-list__confirm-msg">
              ¿Eliminar <strong>{confirmEliminar.nom_ref}</strong>?<br />
              <span>Esta acción no se puede deshacer.</span>
            </p>
            <div className="pi-list__confirm-actions">
              <button
                className="pi-form__btn pi-form__btn--cancel"
                onClick={() => setConfirmEliminar(null)}
              >
                Cancelar
              </button>
              <button
                className="pi-list__btn-danger"
                onClick={() => handleEliminar(confirmEliminar.cod_ref)}
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onClose={hideToast}
      />
    </div>
  )
}