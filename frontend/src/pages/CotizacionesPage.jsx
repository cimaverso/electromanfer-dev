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
import BuzonPanel from '../components/cotizaciones/Buzon/BuzonPanel'
import Toast from '../components/common/Toast'
import './CotizacionesPage.css'

const TABS_BASE = [
  { id: 'productos', label: 'Productos seleccionados' },
  { id: 'preview',   label: 'Vista previa / PDF' },
  { id: 'fichas',    label: 'Fichas técnicas' },
  { id: 'historial', label: 'Historial' },
  { id: 'buzon',     label: 'Buzón' },
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
    editandoId,
    editandoConsecutivo,
    buzonHiloOrigen,
    clearDraft,
    loadFromHistorial,
    setBuzonOrigen,
    clearBuzonOrigen,
  } = useCotizacionDraft()

  const {
    cotizacionActual,
    loadingCrear,
    loadingHistorial,
    loadingEnvio,
    historial,
    crear,
    editar,
    marcarEfectiva,
    cargarHistorial,
    handleEnviarEmail,
    handleEnviarWhatsapp,
    limpiarCotizacionActual,
    verCotizacion,
  } = useCotizaciones()

  const [tabActivo, setTabActivo] = useState(
    selectedProducts.length > 0 ? 'productos' : 'historial'
  )

  // Cuando se vuelve al Buzón desde Preview, este id indica qué hilo abrir
  const [hiloInicialBuzon, setHiloInicialBuzon] = useState(null)
  // PDF pre-adjunto al volver al hilo desde Preview
  const [adjuntoPendiente, setAdjuntoPendiente] = useState(null)

  const hoyColombia = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })
  const filtrosHoy = { fecha_inicio: hoyColombia, fecha_fin: hoyColombia }

  useEffect(() => {
    cargarHistorial(filtrosHoy)
  }, [cargarHistorial])

  // ─── Payload compartido entre crear y editar ──────────────────────────────
  const buildPayload = () => ({
    cliente: clienteDraft,
    notas,
    observaciones_pdf: observacionesPdf,
    items: selectedProducts.map((p) => ({
      cod_ref:   p.cod_ref,
      nom_ref:   p.nom_ref,
      cod_tip:   p.cod_tip  || null,
      nom_tip:   p.nom_tip  || null,
      cantidad:  p.cantidad,
      valor_web: p.valor_web,
    })),
  })

  // ─── Generar ──────────────────────────────────────────────────────────────
  const handleGenerar = async () => {
    if (!clienteDraft?.nombre_razon_social?.trim()) {
      showToast('Completa la razón social del cliente', 'warning')
      return
    }
    if (selectedProducts.length === 0) {
      showToast('Agrega al menos un producto', 'warning')
      return
    }

    const payload = buildPayload()

    if (editandoId) {
      const result = await editar(editandoId, payload)
      if (result.success) {
        showToast(`Cotización ${result.data.consecutivo} actualizada`, 'success')
        setTabActivo('preview')
        setTimeout(() => { clearDraft(); cargarHistorial() }, 50)
      } else {
        showToast(result.error || 'Error al actualizar la cotización', 'error')
      }
      return
    }

    const result = await crear(payload)
    if (result.success) {
      showToast(`Cotización ${result.data.consecutivo} generada`, 'success')
      setTabActivo('preview')
      setTimeout(() => { clearDraft(); cargarHistorial() }, 50)
    } else {
      showToast(result.error || 'Error al generar la cotización', 'error')
    }
  }

  // ─── Marcar efectiva ──────────────────────────────────────────────────────
  const handleMarcarEfectiva = async (id) => {
    const result = await marcarEfectiva(id)
    if (result.success) {
      showToast('Cotización marcada como efectiva', 'success')
      cargarHistorial()
    } else {
      showToast(result.error || 'Endpoint pendiente de implementación en backend', 'warning')
    }
  }

  // ─── Editar desde historial ───────────────────────────────────────────────
  const handleEditarDesdeHistorial = async (cot) => {
    let cotCompleta = cot
    if (!cot.cotizaciones_items || cot.cotizaciones_items.length === 0) {
      cotCompleta = await verCotizacion(cot.id)
      if (!cotCompleta) {
        showToast('No se pudo cargar la cotización para editar', 'error')
        return
      }
    }
    loadFromHistorial(cotCompleta)
    setTabActivo('productos')
    showToast(`Editando cotización ${cotCompleta.consecutivo}`, 'info')
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

  // ─── Adjuntar PDF al hilo y volver al Buzón ─────────────────────────────
  const handleAdjuntarAHilo = ({ blobUrl, nombreArchivo }) => {
    // Guardamos el adjunto pendiente para que BuzonPanel lo pre-cargue
    setAdjuntoPendiente({ blobUrl, nombreArchivo })
    setHiloInicialBuzon(buzonHiloOrigen)
    clearBuzonOrigen()
    setTabActivo('buzon')
  }

  const handleTabChange = (id) => {
    setTabActivo(id)
    if (id === 'historial') cargarHistorial(filtrosHoy)
    // Al salir del buzón manualmente, limpiar el hilo inicial
    if (id !== 'buzon') setHiloInicialBuzon(null)
  }

  // ─── Generar cotización desde Buzón ──────────────────────────────────────
  // hilo: { hiloId, remitente, emailRemitente, asunto }
  const handleGenerarDesdeBuzon = (hilo) => {
    setBuzonOrigen(hilo)
    setTabActivo('productos')
  }

  // ─── Volver al hilo desde Preview ────────────────────────────────────────
  const handleVolverAlHilo = () => {
    setHiloInicialBuzon(buzonHiloOrigen)
    clearBuzonOrigen()
    setTabActivo('buzon')
  }

  const tabs = TABS_BASE.map((t) => ({
    ...t,
    badge: t.id === 'productos' ? selectedProducts.length || undefined : undefined,
  }))

  const itemsCotizacion = cotizacionActual?.cotizaciones_items || selectedProducts
  const labelBotonGenerar = editandoId ? 'Volver a generar' : 'Generar cotización'

  return (
    <div className="cotizaciones-page">

      {/* ── Banner edición ── */}
      {editandoId && (
        <div className="cotizaciones-page__edit-banner">
          <span className="cotizaciones-page__edit-banner-icon">✏️</span>
          <span>
            Editando{' '}
            <strong>{editandoConsecutivo || `#${editandoId}`}</strong>
            {' '}
          </span>
          <button
            className="cotizaciones-page__edit-banner-cancel"
            onClick={() => { clearDraft(); showToast('Edición cancelada', 'info') }}
          >
            Cancelar edición
          </button>
        </div>
      )}

      {/* ── Banner contexto buzón — visible mientras el asesor arma la cotización ── */}
      {buzonHiloOrigen && !editandoId && (
        <div className="cotizaciones-page__buzon-banner">
          <span>✉️</span>
          <span>
            Cotización para{' '}
            <strong>{buzonHiloOrigen.remitente}</strong>
            {' · '}
            <em>{buzonHiloOrigen.asunto}</em>
          </span>
          <button
            className="cotizaciones-page__edit-banner-cancel"
            onClick={() => { clearBuzonOrigen(); showToast('Hilo desvinculado', 'info') }}
          >
            Desvincular
          </button>
        </div>
      )}

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
                <h3 className="cotizaciones-page__card-title">
                  {editandoId
                    ? `${editandoConsecutivo || `#${editandoId}`}`
                    : 'Productos en esta cotización'}
                </h3>
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
            <CotizacionResumen
              onGenerar={handleGenerar}
              loading={loadingCrear}
              labelBoton={labelBotonGenerar}
            />
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
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {/* Botón de retorno al hilo — solo cuando viene del buzón y ya hay cotización */}
              {buzonHiloOrigen && cotizacionActual && (
                <button
                  className="cotizaciones-page__buzon-volver-btn"
                  onClick={handleVolverAlHilo}
                >
                  ✉️ Responder a {buzonHiloOrigen.remitente}
                </button>
              )}
              {cotizacionActual && (
                <button
                  className="cotizaciones-page__nueva-btn"
                  onClick={() => {
                    limpiarCotizacionActual()
                    clearDraft()
                    clearBuzonOrigen()
                    setTabActivo('productos')
                  }}
                >
                  + Nueva cotización
                </button>
              )}
            </div>
          </div>
          <div className="cotizaciones-page__card-body">
            <PdfPreview
              cotizacion={cotizacionActual}
              onEnviarEmail={handleEmail}
              onEnviarWhatsapp={handleWhatsapp}
              loadingEnvio={loadingEnvio}
              buzonHiloOrigen={buzonHiloOrigen}
              onAdjuntarAHilo={buzonHiloOrigen ? handleAdjuntarAHilo : null}
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
              onEditar={handleEditarDesdeHistorial}
              onMarcarEfectiva={handleMarcarEfectiva}
            />
          </div>
        </div>
      )}

      {/* ── Tab: Buzón ── */}
      {tabActivo === 'buzon' && (
        <BuzonPanel
          hiloInicialId={hiloInicialBuzon?.hiloId || null}
          adjuntoPendiente={adjuntoPendiente}
          onAdjuntoMontado={() => setAdjuntoPendiente(null)}
          onGenerarCotizacion={handleGenerarDesdeBuzon}
        />
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