import { useState, useEffect, useCallback } from 'react'
import { useProductos } from '../../../hooks/useProductos'
import { useCotizacionDraft } from '../../../hooks/useCotizacionDraft'
import { useCotizaciones } from '../../../hooks/useCotizaciones'
import { getRecursos } from '../../../api/recursosApi'
import { listarCotizaciones } from '../../../api/cotizacionesApi'
import { generarPdfCotizacion } from '../../../utils/pdfGenerator'
import SearchInput from '../../common/SearchInput'
import LoadingSpinner from '../../common/LoadingSpinner'
import ProductosTable from '../../productos/ProductosTable'
import CotizacionTable from '../CotizacionTable'
import CotizacionForm from '../CotizacionForm'
import CotizacionResumen from '../CotizacionResumen'
import './ModalCotizacionBuzon.css'

// ─── Helper: construye imagenesPorCodRef igual que PdfPreview ────────────────
async function cargarImagenesParaPdf(items = []) {
  const imagenesPorCodRef = {}
  const codRefs = [...new Set(items.map((i) => i.cod_ref))]
  await Promise.all(
    codRefs.map(async (cod) => {
      try {
        const recursos = await getRecursos(cod)
        const principal =
          recursos.find((r) => r.tipo === 'imagen' && r.principal) ||
          recursos.find((r) => r.tipo === 'imagen')
        if (principal) imagenesPorCodRef[cod] = principal.url
      } catch {
        // sin imagen para este cod_ref — quedará como placeholder en el PDF
      }
    })
  )
  return imagenesPorCodRef
}

// ─── Modal historial ──────────────────────────────────────────────────────────
function ModalHistorial({ onSeleccionar, onClose }) {
  const [query, setQuery] = useState('')
  const [resultados, setResultados] = useState([])
  const [loading, setLoading] = useState(false)

  const buscar = useCallback(async (q) => {
    setLoading(true)
    try {
      const data = await listarCotizaciones(q ? { consecutivo: q } : {})
      setResultados(Array.isArray(data) ? data.slice(0, 30) : [])
    } catch {
      setResultados([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { buscar('') }, [])

  useEffect(() => {
    const t = setTimeout(() => buscar(query), 300)
    return () => clearTimeout(t)
  }, [query, buscar])

  const formatFecha = (iso) =>
    iso ? new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

  const estadoBadge = (e) => ({
    generada: { label: 'Generada', cls: 'badge--info' },
    enviada:  { label: 'Enviada',  cls: 'badge--warning' },
    efectiva: { label: 'Efectiva', cls: 'badge--success' },
    anulada:  { label: 'Anulada',  cls: 'badge--danger' },
  }[e] || { label: e, cls: '' })

  return (
    <div className="mcb-overlay mcb-overlay--top" onClick={onClose}>
      <div className="mcb-historial" onClick={(e) => e.stopPropagation()}>
        <div className="mcb-historial__header">
          <span className="mcb-historial__title">Seleccionar cotización a editar</span>
          <button className="mcb-close" onClick={onClose} type="button">✕</button>
        </div>
        <div className="mcb-historial__search">
          <input
            className="mcb-historial__input"
            placeholder="Buscar por consecutivo..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>
        <div className="mcb-historial__lista">
          {loading && <div className="mcb-historial__empty">Buscando...</div>}
          {!loading && resultados.length === 0 && (
            <div className="mcb-historial__empty">Sin resultados</div>
          )}
          {!loading && resultados.map((cot) => {
            const { label, cls } = estadoBadge(cot.estado)
            return (
              <div key={cot.id} className="mcb-historial__item" onClick={() => onSeleccionar(cot)}>
                <div className="mcb-historial__item-row">
                  <span className="mcb-historial__consecutivo">{cot.consecutivo}</span>
                  <span className={`mcb-badge ${cls}`}>{label}</span>
                  <span className="mcb-historial__fecha">{formatFecha(cot.created_at)}</span>
                </div>
                <div className="mcb-historial__cliente">
                  {cot.clientes?.nombre_razon_social || '—'}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Modal principal ──────────────────────────────────────────────────────────
export default function ModalCotizacionBuzon({ hilo, onClose, onCotizacionGenerada }) {
  const {
    clienteDraft,
    editandoId,
    editandoConsecutivo,
    selectedProducts,
    setClienteDraft,
    clearDraft,
    loadFromHistorial,
  } = useCotizacionDraft()

  const { crear, editar, verCotizacion, loadingCrear } = useCotizaciones()

  // Buscador de productos — mismo hook que ProductosPage
  const {
    resultados,
    loading: loadingBusqueda,
    error: errorBusqueda,
    query,
    setQuery,
    buscar,
    verDetalle,
  } = useProductos()

  const [mostrarHistorial, setMostrarHistorial] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)
  const [generandoPdf, setGenerandoPdf] = useState(false)
  const [tabBuscador, setTabBuscador] = useState('buscar') // 'buscar' | 'seleccionados'

  const hasBuscado = !loadingBusqueda && (resultados.length > 0 || errorBusqueda !== null || query.trim() !== '')

  // Pre-llenar cliente con datos del remitente del hilo
  useEffect(() => {
    if (!hilo?.emailRemitente) return
    if (!clienteDraft?.email && !clienteDraft?.nombre_razon_social) {
      setClienteDraft({
        nombre_razon_social: hilo.remitente || '',
        email: hilo.emailRemitente || '',
        nit_cedula: '',
        telefono: '',
        ciudad: '',
        direccion: '',
        nombre_contacto: '',
      })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Generar PDF con imágenes (igual que PdfPreview) ──────────────────────
  const generarConImagenes = async (cotizacion) => {
    const items = cotizacion.cotizaciones_items || []
    const imagenesPorCodRef = await cargarImagenesParaPdf(items)
    return generarPdfCotizacion(cotizacion, [], [], false, imagenesPorCodRef)
  }

  // ── Crear / editar cotización ─────────────────────────────────────────────
  const handleGenerar = async () => {
    setErrorMsg(null)
    if (!clienteDraft?.nombre_razon_social?.trim()) {
      setErrorMsg('Completa la razón social del cliente')
      return
    }
    if (selectedProducts.length === 0) {
      setErrorMsg('Agrega al menos un producto')
      return
    }

    const payload = {
      cliente: clienteDraft,
      notas: '',
      observaciones_pdf: '',
      items: selectedProducts.map((p) => ({
        cod_ref:   p.cod_ref,
        nom_ref:   p.nom_ref,
        cod_tip:   p.cod_tip  || null,
        nom_tip:   p.nom_tip  || null,
        cantidad:  p.cantidad,
        valor_web: p.valor_web,
      })),
    }

    const result = editandoId
      ? await editar(editandoId, payload)
      : await crear(payload)

    if (!result.success) {
      setErrorMsg(result.error || 'Error al generar la cotización')
      return
    }

    // Generar PDF con imágenes reales
    setGenerandoPdf(true)
    try {
      const blobUrl = await generarConImagenes(result.data)
      onCotizacionGenerada({
        blobUrl,
        nombreArchivo: `${result.data.consecutivo}.pdf`,
        cotizacion: result.data,
      })
    } catch {
      // PDF falló pero la cotización se generó — notificar igual
      onCotizacionGenerada({ blobUrl: null, nombreArchivo: '', cotizacion: result.data })
    } finally {
      setGenerandoPdf(false)
    }

    clearDraft()
    onClose()
  }

  // ── Seleccionar del historial para editar ─────────────────────────────────
  const handleSeleccionarHistorial = async (cot) => {
    let cotCompleta = cot
    if (!cot.cotizaciones_items || cot.cotizaciones_items.length === 0) {
      cotCompleta = await verCotizacion(cot.id)
    }
    if (cotCompleta) {
      loadFromHistorial(cotCompleta)
      setTabBuscador('seleccionados')
    }
    setMostrarHistorial(false)
  }

  const loadingTotal = loadingCrear || generandoPdf
  const tituloModal = editandoId
    ? `Editando ${editandoConsecutivo || `#${editandoId}`}`
    : `Nueva cotización · ${hilo?.remitente || ''}`

  return (
    <>
      <div className="mcb-overlay" onClick={onClose}>
        <div className="mcb-modal" onClick={(e) => e.stopPropagation()}>

          {/* ── Header ── */}
          <div className="mcb-modal__header">
            <div className="mcb-modal__header-left">
              <span className="mcb-modal__title">{tituloModal}</span>
              {hilo?.asunto && (
                <span className="mcb-modal__hilo-ref">✉️ Re: {hilo.asunto}</span>
              )}
            </div>
            <div className="mcb-modal__header-actions">
              <button
                className="mcb-btn mcb-btn--ghost"
                onClick={() => setMostrarHistorial(true)}
                type="button"
              >
                📋 Editar cotización existente
              </button>
              {editandoId && (
                <button
                  className="mcb-btn mcb-btn--ghost"
                  onClick={() => { clearDraft(); setTabBuscador('buscar') }}
                  type="button"
                >
                  + Nueva
                </button>
              )}
              <button className="mcb-close" onClick={onClose} type="button">✕</button>
            </div>
          </div>

          {/* ── Cuerpo: 3 columnas ── */}
          <div className="mcb-modal__body">

            {/* ── Columna 1: Buscador + resultados ── */}
            <div className="mcb-col mcb-col--busqueda">
              <div className="mcb-col__tabs">
                <button
                  className={`mcb-col__tab ${tabBuscador === 'buscar' ? 'mcb-col__tab--active' : ''}`}
                  onClick={() => setTabBuscador('buscar')}
                  type="button"
                >
                  Buscar productos
                </button>
                <button
                  className={`mcb-col__tab ${tabBuscador === 'seleccionados' ? 'mcb-col__tab--active' : ''}`}
                  onClick={() => setTabBuscador('seleccionados')}
                  type="button"
                >
                  Seleccionados
                  {selectedProducts.length > 0 && (
                    <span className="mcb-col__tab-badge">{selectedProducts.length}</span>
                  )}
                </button>
              </div>

              {tabBuscador === 'buscar' && (
                <div className="mcb-col__scroll">
                  <div className="mcb-search-wrap">
                    <SearchInput
                      value={query}
                      onChange={setQuery}
                      onSearch={() => buscar(query)}
                      loading={loadingBusqueda}
                      placeholder="Buscar por nombre, código..."
                    />
                  </div>

                  {loadingBusqueda && (
                    <LoadingSpinner size="sm" text="Buscando..." />
                  )}

                  {!loadingBusqueda && errorBusqueda && (
                    <div className="mcb-empty">⚠️ {errorBusqueda}</div>
                  )}

                  {!loadingBusqueda && !errorBusqueda && hasBuscado && resultados.length === 0 && (
                    <div className="mcb-empty">Sin resultados para "{query}"</div>
                  )}

                  {!loadingBusqueda && !errorBusqueda && resultados.length > 0 && (
                    <div className="mcb-tabla-wrap">
                      <ProductosTable
                        productos={resultados}
                        onVerDetalle={verDetalle}
                      />
                    </div>
                  )}

                  {!loadingBusqueda && !errorBusqueda && !hasBuscado && (
                    <div className="mcb-empty">
                      📦 Escribe un producto y presiona Buscar
                    </div>
                  )}
                </div>
              )}

              {tabBuscador === 'seleccionados' && (
                <div className="mcb-col__scroll">
                  <CotizacionTable onIrAProductos={() => setTabBuscador('buscar')} />
                </div>
              )}
            </div>

            {/* ── Columna 2: Datos del cliente ── */}
            <div className="mcb-col mcb-col--form">
              <div className="mcb-col__label">Datos del cliente</div>
              <div className="mcb-col__scroll">
                <CotizacionForm />
              </div>
            </div>

            {/* ── Columna 3: Resumen + generar ── */}
            <div className="mcb-col mcb-col--resumen">
              <div className="mcb-col__label">Resumen</div>
              <div className="mcb-col__scroll">
                {errorMsg && (
                  <div className="mcb-error">{errorMsg}</div>
                )}
                {generandoPdf && (
                  <div className="mcb-generando">
                    <span className="mcb-generando__spinner" />
                    Generando PDF con imágenes...
                  </div>
                )}
                <CotizacionResumen
                  onGenerar={handleGenerar}
                  loading={loadingTotal}
                  labelBoton={
                    generandoPdf
                      ? 'Generando PDF...'
                      : editandoId
                        ? 'Actualizar y adjuntar'
                        : 'Generar y adjuntar al hilo'
                  }
                />
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Modal historial anidado */}
      {mostrarHistorial && (
        <ModalHistorial
          onSeleccionar={handleSeleccionarHistorial}
          onClose={() => setMostrarHistorial(false)}
        />
      )}
    </>
  )
}