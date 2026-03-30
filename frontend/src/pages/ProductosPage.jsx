import { useProductos } from '../hooks/useProductos'
import { useToast } from '../hooks/useToast'
import SearchInput from '../components/common/SearchInput'
import LoadingSpinner from '../components/common/LoadingSpinner'
import EmptyState from '../components/common/EmptyState'
import Toast from '../components/common/Toast'
import ProductosTable from '../components/productos/ProductosTable'
import ProductoPreviewPanel from '../components/productos/ProductoPreviewPanel'
import SelectedProductsBar from '../components/productos/SelectedProductsBar'
import { useCotizacionDraft } from '../hooks/useCotizacionDraft'
import { useEffect, useRef } from 'react'
import './ProductosPage.css'

export default function ProductosPage() {
  const {
    resultados,
    loading,
    error,
    query,
    setQuery,
    buscar,
    productoSeleccionado,
    loadingDetalle,
    verDetalle,
    cerrarDetalle,
  } = useProductos()

  const { selectedProducts } = useCotizacionDraft()
  const { toast, showToast, hideToast } = useToast()

  const prevCount = useRef(selectedProducts.length)
  useEffect(() => {
    const curr = selectedProducts.length
    if (curr > prevCount.current) {
      showToast('Producto agregado a la cotización', 'success')
    }
    prevCount.current = curr
  }, [selectedProducts.length, showToast])

  const handleSearch = () => {
    buscar(query)
  }

  const hasBuscado = !loading && (resultados.length > 0 || error !== null || query.trim() !== '')

  return (
    <div className="productos-page">

      {/* ── Buscador ── */}
      <div className="productos-page__search-section">
        <div className="productos-page__search-header">
          <h2 className="productos-page__search-title">Buscar productos</h2>
          <p className="productos-page__search-desc">
            Busca por nombre, código o tipo de producto. Agrega los que necesites a la cotización.
          </p>
        </div>
        <SearchInput
          value={query}
          onChange={setQuery}
          onSearch={handleSearch}
          loading={loading}
          placeholder="Ej: termomagnético, cable, luminaria..."
        />
      </div>

      {/* ── Resultados ── */}
      <div className="productos-page__results">
        {loading && (
          <LoadingSpinner size="md" text="Buscando productos..." />
        )}

        {!loading && error && (
          <EmptyState
            icon="⚠️"
            title="Error al buscar"
            desc={error}
            action={
              <button
                className="productos-page__retry"
                onClick={handleSearch}
              >
                Intentar de nuevo
              </button>
            }
          />
        )}

        {!loading && !error && hasBuscado && resultados.length === 0 && (
          <EmptyState
            icon="🔍"
            title="Sin resultados"
            desc={`No encontramos productos para "${query}". Intenta con otro término.`}
          />
        )}

        {!loading && !error && resultados.length > 0 && (
          <>
            <div className="productos-page__results-header">
              <span className="productos-page__results-count">
                {resultados.length} resultado{resultados.length !== 1 ? 's' : ''} para "{query}"
              </span>
            </div>

            {/* ── Contenedor con scroll — máx 20 filas visibles, resto a scroll ── */}
            <div className="productos-page__table-scroll">
              <ProductosTable
                productos={resultados}
                onVerDetalle={verDetalle}
              />
            </div>
          </>
        )}

        {!loading && !error && !hasBuscado && (
          <EmptyState
            icon="📦"
            title="Busca un producto para comenzar"
            desc="Escribe el nombre, código o tipo de producto en el buscador y presiona Buscar."
          />
        )}
      </div>

      {/* ── Barra de seleccionados ── */}
      <SelectedProductsBar />

      {/* ── Panel de detalle ── */}
      <ProductoPreviewPanel
        producto={productoSeleccionado}
        loading={loadingDetalle}
        onClose={cerrarDetalle}
      />

      {/* ── Toast ── */}
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onClose={hideToast}
      />
    </div>
  )
}