import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useCotizacionDraft } from '../hooks/useCotizacionDraft'
import { useCotizaciones } from '../hooks/useCotizaciones'
import { useToast } from '../hooks/useToast'
import CotizacionTabs from '../components/cotizaciones/CotizacionTabs'
import CotizacionForm from '../components/cotizaciones/CotizacionForm'
import CotizacionTable from '../components/cotizaciones/CotizacionTable'
import CotizacionResumen from '../components/cotizaciones/CotizacionResumen'
import PdfPreview from '../components/cotizaciones/PdfPreview'
import FichasPanel from '../components/cotizaciones/FichasPanel'
import HistorialTable from '../components/cotizaciones/HistorialTable'
import Toast from '../components/common/Toast'
import './CotizacionesPage.css'

const TABS_BASE = [
  { id: 'productos', label: 'Productos seleccionados' },
  { id: 'preview', label: 'Vista previa / PDF' },
  { id: 'fichas', label: 'Fichas técnicas' },
  { id: 'historial', label: 'Historial' },
]

export default function CotizacionesPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast, showToast, hideToast } = useToast()

  const {
    selectedProducts = [],
    clienteDraft,
    notas,
    observacionesPdf,
    clearDraft,
  } = useCotizacionDraft()

  const {
    cotizacionActual,
    loadingCrear,
    loadingHistorial,
    loadingEnvio,
    historial,
    crear,
    cargarHistorial,
    handleEnviarEmail,
    handleEnviarWhatsapp,
    limpiarCotizacionActual,
    verCotizacion,
  } = useCotizaciones()

  const [tabActivo, setTabActivo] = useState(
    selectedProducts.length > 0 ? 'productos' : 'historial'
  )

  useEffect(() => {
    cargarHistorial()
  }, [cargarHistorial])

  const handleGenerar = async () => {
    if (!clienteDraft?.nombre_razon_social?.trim()) {
      showToast('Completa la razón social del cliente', 'warning')
      return
    }
    if (selectedProducts.length === 0) {
      showToast('Agrega al menos un producto', 'warning')
      return
    }

    const payload = {
      cliente: clienteDraft,
      notas,
      observaciones_pdf: observacionesPdf,
      items: selectedProducts.map((p) => ({
        cod_ref: p.cod_ref,
        nom_ref: p.nom_ref,
        cantidad: p.cantidad,
        valor_web: p.valor_web,
      })),
    }

    const result = await crear(payload)

    if (result.success) {
      showToast(`Cotización ${result.data.consecutivo} generada`, 'success')
      setTabActivo('preview')
      setTimeout(() => {
        clearDraft()
        cargarHistorial()
      }, 50)
    } else {
      showToast(result.error || 'Error al generar la cotización', 'error')
    }
  }

  const handleEmail = async (id, payload) => {
    const result = await handleEnviarEmail(id, payload)
    if (result.success) {
      showToast('Correo enviado correctamente', 'success')
      cargarHistorial()
    } else {
      showToast('Error al enviar el correo', 'error')
    }
  }

  const handleWhatsapp = async (id, payload) => {
    const result = await handleEnviarWhatsapp(id, payload)
    if (result.success && result.url) {
      window.open(result.url, '_blank', 'noopener,noreferrer')
      showToast('Enlace de WhatsApp generado', 'success')
      cargarHistorial()
    } else {
      showToast('Error al generar el enlace de WhatsApp', 'error')
    }
  }

  const handleTabChange = (id) => {
    setTabActivo(id)
    if (id === 'historial') cargarHistorial()
  }

  // Tabs con badges
  const tabs = TABS_BASE.map((t) => ({
    ...t,
    badge: t.id === 'productos' ? selectedProducts.length || undefined : undefined,
  }))

  // Productos de la cotización actual para fichas
  const itemsCotizacion = cotizacionActual?.cotizaciones_items || selectedProducts

  return (
    <div className="cotizaciones-page">

      <div className="cotizaciones-page__tabs-wrapper">
        <CotizacionTabs
          tabs={tabs}
          active={tabActivo}
          onChange={handleTabChange}
        />
      </div>

      {/* ── Tab: Productos seleccionados ── */}
      {tabActivo === 'productos' && (
        <div className="cotizaciones-page__layout">
          <div className="cotizaciones-page__main">
            <div className="cotizaciones-page__card">
              <div className="cotizaciones-page__card-header">
                <h3 className="cotizaciones-page__card-title">Productos en esta cotización</h3>
              </div>
              <div className="cotizaciones-page__card-body">
                <CotizacionTable onIrAProductos={() => navigate('/productos')} />
              </div>
            </div>

            <div className="cotizaciones-page__card">
              <div className="cotizaciones-page__card-header">
                <h3 className="cotizaciones-page__card-title">Datos del cliente</h3>
              </div>
              <div className="cotizaciones-page__card-body">
                <CotizacionForm />
              </div>
            </div>
          </div>

          <div className="cotizaciones-page__sidebar">
            <CotizacionResumen onGenerar={handleGenerar} loading={loadingCrear} />
          </div>
        </div>
      )}

      {/* ── Tab: Vista previa / PDF ── */}
      {tabActivo === 'preview' && (
        <div className="cotizaciones-page__card">
          <div className="cotizaciones-page__card-header">
            <h3 className="cotizaciones-page__card-title">
              {cotizacionActual ? 'Cotización generada' : 'Vista previa'}
            </h3>
            {cotizacionActual && (
              <button
                className="cotizaciones-page__nueva-btn"
                onClick={() => { limpiarCotizacionActual(); setTabActivo('productos') }}
              >
                + Nueva cotización
              </button>
            )}
          </div>
          <div className="cotizaciones-page__card-body">
            <PdfPreview
              cotizacion={cotizacionActual}
              onEnviarEmail={handleEmail}
              onEnviarWhatsapp={handleWhatsapp}
              loadingEnvio={loadingEnvio}
            />
          </div>
        </div>
      )}

      {/* ── Tab: Fichas técnicas ── */}
      {tabActivo === 'fichas' && (
        <div className="cotizaciones-page__card">
          <div className="cotizaciones-page__card-header">
            <h3 className="cotizaciones-page__card-title">Fichas técnicas</h3>
            <span className="cotizaciones-page__count">
              {itemsCotizacion.length} producto{itemsCotizacion.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="cotizaciones-page__card-body">
            <FichasPanel
              items={itemsCotizacion}
              cotizacion={cotizacionActual}
              onEnviarEmail={handleEmail}
              onEnviarWhatsapp={handleWhatsapp}
              loadingEnvio={loadingEnvio}
            />
          </div>
        </div>
      )}

      {/* ── Tab: Historial ── */}
      {tabActivo === 'historial' && (
        <div className="cotizaciones-page__card">
          <div className="cotizaciones-page__card-header">
            <h3 className="cotizaciones-page__card-title">Historial de cotizaciones</h3>
            <span className="cotizaciones-page__count">
              {historial.length} registro{historial.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="cotizaciones-page__card-body">
            <HistorialTable
              historial={historial}
              loading={loadingHistorial}
              onFiltrar={cargarHistorial}
              onVerDetalle={async (id) => {
                await verCotizacion(id)
                setTabActivo('preview')
              }}
              onDescargar={(cot) => cot.pdf_url && window.open(cot.pdf_url, '_blank')}
              onReenviar={() => setTabActivo('preview')}
            />
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