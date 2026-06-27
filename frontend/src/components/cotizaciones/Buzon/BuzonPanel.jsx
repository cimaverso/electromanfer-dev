import { useState, useEffect, useRef } from 'react'
import ModalCotizacionBuzon from './ModalCotizacionBuzon'
import ModalGuiaBuzon from './ModalGuiaBuzon'
import { useBuzon } from '../../../hooks/useBuzon'
import axiosClient from '../../../api/axiosClient'
import { listarFirmas, guardarFirmaPreferida } from '../../../api/firmasApi'
import './BuzonPanel.css'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

function iniciales(nombre = '') {
  return nombre.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
}

function formatFecha(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const hoy = new Date()
  const ayer = new Date(hoy)
  ayer.setDate(hoy.getDate() - 1)
  if (d.toDateString() === hoy.toDateString())
    return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
  if (d.toDateString() === ayer.toDateString()) return 'Ayer'
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
}

function cargarBase64(url) {
  return new Promise((resolve) => {
    if (!url) return resolve(null)
    if (url.startsWith('data:')) return resolve(url)
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      canvas.getContext('2d').drawImage(img, 0, 0)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => resolve(null)
    img.src = url
  })
}

// ─── Neutraliza colores hardcodeados ANTES de meter el HTML al iframe ─────────
function neutralizarColoresDark(html) {
  // ── 1. Atributos style="" inline ──────────────────────────────────────────
  html = html.replace(/style="([^"]*)"/gi, (_match, estilos) => {
    let s = estilos

    // background / background-color claro → transparent
    s = s.replace(
      /background(?:-color)?\s*:\s*(?:#(?:[fFeEdDcCbB][0-9a-fA-F]{2}|[fFeEdDcCbB]{2}[0-9a-fA-F]{4}|[fF]{3,6})|white|rgb\(\s*(?:1[89]\d|2\d{2})\s*,\s*(?:1[89]\d|2\d{2})\s*,\s*(?:1[89]\d|2\d{2})\s*\))\s*(?:!important\s*)?/gi,
      'background: transparent '
    )

    // color oscuro → inherit
    s = s.replace(
      /(?<![a-zA-Z-])color\s*:\s*(?:#[0-3][0-9a-fA-F]{2}|#[0-3][0-9a-fA-F]{5}|black|rgb\(\s*[0-6]?\d\s*,\s*[0-6]?\d\s*,\s*[0-6]?\d\s*\)|rgba\(\s*[0-6]?\d\s*,\s*[0-6]?\d\s*,\s*[0-6]?\d\s*,\s*[01](?:\.\d+)?\s*\))\s*(?:!important\s*)?/gi,
      'color: inherit '
    )

    return `style="${s.trim()}"`
  })

  // ── 2. Bloques <style> internos del correo ────────────────────────────────
  html = html.replace(/<style([^>]*)>([\s\S]*?)<\/style>/gi, (_match, attrs, css) => {
    let c = css

    c = c.replace(
      /(?<![a-zA-Z-])color\s*:\s*(?:#[0-3][0-9a-fA-F]{2}|#[0-3][0-9a-fA-F]{5}|black|rgb\(\s*[0-6]?\d\s*,\s*[0-6]?\d\s*,\s*[0-6]?\d\s*\))\s*(?:!important\s*)?/gi,
      'color: inherit '
    )

    c = c.replace(
      /background(?:-color)?\s*:\s*(?:#(?:[fFeEdDcCbB][0-9a-fA-F]{2}|[fF]{3,6})|white|rgb\(\s*(?:1[89]\d|2\d{2})\s*,\s*(?:1[89]\d|2\d{2})\s*,\s*(?:1[89]\d|2\d{2})\s*\))\s*(?:!important\s*)?/gi,
      'background: transparent '
    )

    return `<style${attrs}>${c}</style>`
  })

  return html
}

// ─── Inyección de estilos en el iframe del correo ────────────────────────────
function buildSrcDoc(htmlOriginal, enviado = false) {
  if (!htmlOriginal) return null
  const dark = document.documentElement.getAttribute('data-theme') !== 'light'

  const html = dark ? neutralizarColoresDark(htmlOriginal) : htmlOriginal

  const styleDark = `<style>
    html, body {
      background: transparent !important;
      margin: 0; padding: 0;
      font-family: system-ui, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: #E2E8F0;
    }
    a { color: #9DBE5A !important; }
    table, td, th { border-color: rgba(255,255,255,0.1) !important; }
    img { max-width: 100%; }
  </style>`

  const styleLight = `<style>
    html, body {
      background: transparent !important;
      margin: 0; padding: 0;
      font-family: system-ui, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: #111827;
    }
    a { color: #5E8A1A; }
    img { max-width: 100%; }
  </style>`

  const style = dark ? styleDark : styleLight

  if (/<head[\s>]/i.test(html)) {
    return html.replace(/<head([\s>])/i, `<head$1${style}`)
  }
  return `<!DOCTYPE html><html><head>${style}</head><body>${html}</body></html>`
}

// ─── Helper fetch adjunto ─────────────────────────────────────────────────────
async function fetchAdjuntoBlobUrl(mensajeId, attachmentId, nombre, tipo) {
  const token = localStorage.getItem('access_token')
  const url = `${BASE_URL}/emails/${mensajeId}/adjunto/${attachmentId}?nombre=${encodeURIComponent(nombre)}&tipo=${encodeURIComponent(tipo)}`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error(`Error ${res.status}`)
  const arrayBuffer = await res.arrayBuffer()
  let mimeReal = tipo
  if (!mimeReal || mimeReal === 'application/octet-stream') {
    if (/\.pdf$/i.test(nombre)) mimeReal = 'application/pdf'
    else if (/\.(jpg|jpeg)$/i.test(nombre)) mimeReal = 'image/jpeg'
    else if (/\.png$/i.test(nombre)) mimeReal = 'image/png'
    else if (/\.gif$/i.test(nombre)) mimeReal = 'image/gif'
    else if (/\.webp$/i.test(nombre)) mimeReal = 'image/webp'
  }
  const blob = new Blob([arrayBuffer], { type: mimeReal })
  return URL.createObjectURL(blob)
}

// ─── Visor PDF con pdfjs-dist ────────────────────────────────────────────────
function VisorPDF({ blobUrl }) {
  const contenedorRef = useRef(null)
  const [paginas, setPaginas] = useState(0)
  const [paginaActual, setPaginaActual] = useState(1)
  const [escala, setEscala] = useState(0.75)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(false)
  const pdfRef = useRef(null)
  const renderizandoRef = useRef(false)

  const renderizarPagina = async (pdf, numPagina, escalaActual) => {
    if (renderizandoRef.current) return
    renderizandoRef.current = true
    try {
      const pagina = await pdf.getPage(numPagina)
      const viewport = pagina.getViewport({ scale: escalaActual })
      const contenedor = contenedorRef.current
      if (!contenedor) return
      contenedor.innerHTML = ''
      const canvas = document.createElement('canvas')
      canvas.width = viewport.width
      canvas.height = viewport.height
      canvas.style.display = 'block'
      canvas.style.margin = '0 auto'
      contenedor.appendChild(canvas)
      await pagina.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
    } finally {
      renderizandoRef.current = false
    }
  }

  useEffect(() => {
    let cancelado = false
    const cargar = async () => {
      setCargando(true)
      setError(false)
      try {
        const pdfjsLib = await import('pdfjs-dist')
        const workerSrc = await import('pdfjs-dist/build/pdf.worker.mjs?url')
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc.default
        const pdf = await pdfjsLib.getDocument(blobUrl).promise
        if (cancelado) return
        pdfRef.current = pdf
        setPaginas(pdf.numPages)
        setPaginaActual(1)
        await renderizarPagina(pdf, 1, escala)
        if (!cancelado) setCargando(false)
      } catch (e) {
        console.error('VisorPDF error:', e)
        if (!cancelado) { setError(true); setCargando(false) }
      }
    }
    cargar()
    return () => { cancelado = true }
  }, [blobUrl])

  useEffect(() => {
    if (!pdfRef.current || cargando) return
    renderizarPagina(pdfRef.current, paginaActual, escala)
  }, [paginaActual, escala])

  const cambiarEscala = (delta) => setEscala((e) => Math.min(3, Math.max(0.5, +(e + delta).toFixed(1))))

  return (
    <div className="badj-pdfjs">
      <div className="badj-pdfjs__barra">
        <div className="badj-pdfjs__grupo">
          <button type="button" className="badj-pdfjs__btn" onClick={() => setPaginaActual((p) => Math.max(1, p - 1))} disabled={paginaActual <= 1} title="Página anterior">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <span className="badj-pdfjs__info">
            <span className="badj-pdfjs__info-val">{paginaActual}</span>
            <span className="badj-pdfjs__info-sep">/</span>
            <span className="badj-pdfjs__info-val">{paginas}</span>
          </span>
          <button type="button" className="badj-pdfjs__btn" onClick={() => setPaginaActual((p) => Math.min(paginas, p + 1))} disabled={paginaActual >= paginas} title="Página siguiente">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        </div>
        <div className="badj-pdfjs__divider" />
        <div className="badj-pdfjs__grupo">
          <button type="button" className="badj-pdfjs__btn" onClick={() => cambiarEscala(-0.1)} disabled={escala <= 0.5} title="Reducir zoom">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}><line x1="5" y1="12" x2="19" y2="12" /></svg>
          </button>
          <span className="badj-pdfjs__zoom-val">{Math.round(escala * 100)}%</span>
          <button type="button" className="badj-pdfjs__btn" onClick={() => cambiarEscala(0.1)} disabled={escala >= 3} title="Aumentar zoom">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          </button>
        </div>
        <div className="badj-pdfjs__divider" />
        <div className="badj-pdfjs__grupo">
          {[75, 90].map((z) => (
            <button key={z} type="button" className={`badj-pdfjs__preset ${Math.round(escala * 100) === z ? 'badj-pdfjs__preset--active' : ''}`} onClick={() => setEscala(z / 100)}>{z}%</button>
          ))}
        </div>
      </div>
      <div className="badj-pdfjs__canvas-wrap">
        {cargando && <div className="badj-pdfjs__loading"><span className="badj-spinner" /><span>Cargando PDF...</span></div>}
        {error && <div className="badj-pdfjs__loading"><span style={{ color: 'var(--color-danger, #e55)' }}>No se pudo cargar el PDF</span></div>}
        <div ref={contenedorRef} style={{ display: cargando || error ? 'none' : 'block', padding: '16px' }} />
      </div>
    </div>
  )
}

function ModalVisorAdjunto({ blobUrl, nombre, tipo, onClose }) {
  const esImagen = tipo?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(nombre)
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])
  return (
    <div className="badj-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="badj-modal">
        <div className="badj-modal__header">
          <div className="badj-modal__titulo">
            <span className={`badj-modal__tipo-icon ${esImagen ? 'badj-modal__tipo-icon--img' : 'badj-modal__tipo-icon--pdf'}`}>
              {esImagen ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
              )}
            </span>
            <span className="badj-modal__nombre">{nombre}</span>
          </div>
          <div className="badj-modal__acciones">
            <a href={blobUrl} download={nombre} className="badj-btn badj-btn--dl" title="Descargar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
              Descargar
            </a>
            <button type="button" className="badj-btn badj-btn--cerrar" onClick={onClose} title="Cerrar (Esc)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
        </div>
        <div className="badj-modal__cuerpo">
          {esImagen ? <img src={blobUrl} alt={nombre} className="badj-modal__imagen" /> : <VisorPDF blobUrl={blobUrl} />}
        </div>
      </div>
    </div>
  )
}

// ─── AdjuntoItem ──────────────────────────────────────────────────────────────
function AdjuntoItem({ adj, mensajeId }) {
  const [estado, setEstado] = useState('idle')
  const [blobUrl, setBlobUrl] = useState(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const tieneAttachmentId = !!adj.attachment_id
  const esImagen = adj.tipo?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(adj.nombre)
  const esPdf = adj.tipo === 'application/pdf' || /\.pdf$/i.test(adj.nombre)
  const esVisualizable = esImagen || esPdf
  useEffect(() => { return () => { if (blobUrl) URL.revokeObjectURL(blobUrl) } }, [blobUrl])
  const handleClick = async () => {
    if (!tieneAttachmentId || estado === 'cargando') return
    if (esVisualizable) {
      if (blobUrl) { setModalAbierto(true); return }
      setEstado('cargando')
      try {
        const url = await fetchAdjuntoBlobUrl(mensajeId, adj.attachment_id, adj.nombre, adj.tipo)
        setBlobUrl(url); setModalAbierto(true); setEstado('idle')
      } catch { setEstado('error') }
      return
    }
    setEstado('cargando')
    try {
      const url = await fetchAdjuntoBlobUrl(mensajeId, adj.attachment_id, adj.nombre, adj.tipo)
      const a = document.createElement('a'); a.href = url; a.download = adj.nombre; a.click()
      setTimeout(() => URL.revokeObjectURL(url), 5000); setEstado('idle')
    } catch { setEstado('error') }
  }
  const iconoTipo = esImagen ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
  )
  const iconoAccion = estado === 'cargando' ? <span className="badj-spinner" />
    : estado === 'error' ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12, color: 'var(--color-danger, #e55)' }}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
      : tieneAttachmentId ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12, opacity: 0.5 }}>{esVisualizable ? <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></> : <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></>}</svg>
        : null
  return (
    <>
      <div className={['buzon-msg__adjunto', tieneAttachmentId ? 'buzon-msg__adjunto--clickable' : '', estado === 'error' ? 'buzon-msg__adjunto--error' : ''].filter(Boolean).join(' ')} onClick={handleClick} title={!tieneAttachmentId ? adj.nombre : estado === 'error' ? 'Error al obtener el archivo' : esVisualizable ? `Ver ${adj.nombre}` : `Descargar ${adj.nombre}`}>
        <span className={`buzon-msg__adjunto-icon ${esImagen ? 'buzon-msg__adjunto-icon--img' : 'buzon-msg__adjunto-icon--pdf'}`}>{iconoTipo}</span>
        <span className="buzon-msg__adjunto-nombre">{adj.nombre}</span>
        <span className="buzon-msg__adjunto-size">{adj.tamanio}</span>
        <span className="buzon-msg__adjunto-accion">{iconoAccion}</span>
      </div>
      {modalAbierto && blobUrl && <ModalVisorAdjunto blobUrl={blobUrl} nombre={adj.nombre} tipo={adj.tipo} onClose={() => setModalAbierto(false)} />}
    </>
  )
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────
function Avatar({ nombre, tipo = 'cliente' }) {
  return <div className={`buzon-avatar buzon-avatar--${tipo}`}>{iniciales(nombre)}</div>
}

function HiloItem({ hilo, activo, onClick }) {
  return (
    <div className={['buzon-hilo-item', activo ? 'buzon-hilo-item--activo' : '', !hilo.leido ? 'buzon-hilo-item--no-leido' : ''].filter(Boolean).join(' ')} onClick={() => onClick(hilo)}>
      {!hilo.leido && <span className="buzon-hilo-item__dot" />}
      <div className="buzon-hilo-item__row">
        <span className="buzon-hilo-item__remitente">{hilo.remitente}</span>
        {hilo.mensajes_count > 1 && <span className="buzon-hilo-item__count">{hilo.mensajes_count}</span>}
        <span className="buzon-hilo-item__fecha">{formatFecha(hilo.fecha)}</span>
      </div>
      <div className="buzon-hilo-item__asunto">{hilo.asunto}</div>
      {hilo.cotizacion_consecutivo && <span className="buzon-hilo-item__cot-tag">{hilo.cotizacion_consecutivo}</span>}
    </div>
  )
}

function MensajeBurbuja({ mensaje }) {
  const enviado = mensaje.direccion === 'enviado'
  const [tema, setTema] = useState(document.documentElement.getAttribute('data-theme') || 'dark')
  useEffect(() => {
    const observer = new MutationObserver(() => { setTema(document.documentElement.getAttribute('data-theme') || 'dark') })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])
  const tieneCid = mensaje.cuerpo_html && /src=["']cid:/i.test(mensaje.cuerpo_html)
  const srcDocFinal = mensaje.cuerpo_html ? buildSrcDoc(mensaje.cuerpo_html, enviado) : null
  return (
    <div className={`buzon-msg ${enviado ? 'buzon-msg--enviado' : 'buzon-msg--recibido'}`}>
      <div className="buzon-msg__header">
        <Avatar nombre={mensaje.remitente} tipo={enviado ? 'asesor' : 'cliente'} />
        <span className="buzon-msg__nombre">{mensaje.remitente}</span>
        <span className="buzon-msg__hora">{formatFecha(mensaje.fecha)}</span>
      </div>
      {srcDocFinal ? (
        <iframe key={tema} srcDoc={srcDocFinal} className="buzon-msg__iframe" sandbox="allow-same-origin" title="correo" onLoad={(e) => { try { const doc = e.target.contentDocument; if (doc) { const h = doc.documentElement.scrollHeight; e.target.style.height = Math.min(Math.max(h, 60), 500) + 'px' } } catch { } }} />
      ) : (
        <div className="buzon-msg__cuerpo">{mensaje.cuerpo}</div>
      )}
      {mensaje.adjuntos?.length > 0 && (
        <div className="buzon-msg__adjuntos">
          {mensaje.adjuntos.map((adj, i) => <AdjuntoItem key={i} adj={adj} mensajeId={mensaje.id} />)}
        </div>
      )}
    </div>
  )
}

// ─── BarraRespuesta ───────────────────────────────────────────────────────────
function BarraRespuesta({
  onEnviar, loading, onNuevaCotizacion, onAdjuntarCotizacion,
  adjuntoPrevio = null, onQuitarAdjunto,
  onEnviarGuia,
  textoInicial = '',
  onTextoInicialUsado,
}) {
  const [texto, setTexto] = useState('')
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)
  const firmaFileRef = useRef(null)
  const [adjuntosAbierto, setAdjuntosAbierto] = useState(true)
  const [firmaAbierta, setFirmaAbierta] = useState(false)
  const [firmas, setFirmas] = useState([])
  const [firmaSeleccionada, setFirmaSeleccionada] = useState(null)
  const [firmaB64, setFirmaB64] = useState(null)
  const [firmaLoading, setFirmaLoading] = useState(true)
  const [selectorFirmaAbierto, setSelectorFirmaAbierto] = useState(false)
  const [subiendoFirma, setSubiendoFirma] = useState(false)

  useEffect(() => {
    let cancelado = false
    const cargar = async () => {
      setFirmaLoading(true)
      try {
        const lista = await listarFirmas()
        if (cancelado) return
        setFirmas(lista)
        if (lista.length > 0) {
          setFirmaSeleccionada(lista[0])
          const b64 = await cargarBase64(lista[0].url)
          if (!cancelado) setFirmaB64(b64)
        }
      } catch { /* silencioso */ } finally {
        if (!cancelado) setFirmaLoading(false)
      }
    }
    cargar()
    return () => { cancelado = true }
  }, [])

  // Aplica texto inicial cuando llega una guía seleccionada
  useEffect(() => {
    if (!textoInicial) return
    setTexto(textoInicial)
    onTextoInicialUsado?.()
    textareaRef.current?.focus()
  }, [textoInicial]) // eslint-disable-line

  const handleSeleccionarFirma = async (firma) => {
    setFirmaSeleccionada(firma)
    setSelectorFirmaAbierto(false)
    setFirmaLoading(true)
    const b64 = await cargarBase64(firma.url)
    setFirmaB64(b64)
    setFirmaLoading(false)
    try { await guardarFirmaPreferida(firma.id) } catch { /* silencioso */ }
  }

  const handleNuevaFirma = async (e) => {
    const archivo = e.target.files?.[0]
    if (!archivo) return
    e.target.value = ''
    setSubiendoFirma(true)
    try {
      const { subirFirma } = await import('../../../api/firmasApi')
      const formData = new FormData()
      formData.append('nombre', archivo.name.replace(/\.[^.]+$/, ''))
      formData.append('archivo', archivo)
      const nueva = await subirFirma(formData)
      setFirmas((prev) => [...prev, nueva])
      handleSeleccionarFirma(nueva)
    } catch { /* silencioso */ } finally { setSubiendoFirma(false) }
  }

  const handleEnviar = () => {
    if (!texto.trim() && !adjuntoPrevio) return
    onEnviar(texto, firmaSeleccionada)
    setTexto('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleEnviar()
  }

  const resolverNombre = (adj) => {
    if (typeof adj === 'string') return adj.split('/').pop() || 'archivo'
    return adj?.nombre || adj?.url?.split('/').pop() || 'archivo'
  }

  const numImagenes = adjuntoPrevio?.adjuntosImagenes?.length || 0
  const numFichas = adjuntoPrevio?.adjuntosPdfs?.length || 0
  const numLocales = adjuntoPrevio?.archivosLocales?.length || 0
  const totalAdjuntos = (adjuntoPrevio?.nombreArchivo ? 1 : 0) + numImagenes + numFichas + numLocales
  const hayAdjuntos = totalAdjuntos > 0

  return (
    <div className="buzon-reply">
      {/* Acordeón Adjuntos */}
      {hayAdjuntos && (
        <div className="buzon-acordeon">
          <button type="button" className="buzon-acordeon__header" onClick={() => setAdjuntosAbierto((v) => !v)}>
            <span className="buzon-acordeon__icon buzon-acordeon__icon--pdf">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
            </span>
            <span className="buzon-acordeon__label">Adjuntos <span className="buzon-acordeon__badge">{totalAdjuntos}</span></span>
            <button type="button" className="buzon-acordeon__quitar" onClick={(e) => { e.stopPropagation(); onQuitarAdjunto() }} title="Quitar todos">✕</button>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="buzon-acordeon__chevron" style={{ transform: adjuntosAbierto ? 'rotate(180deg)' : 'rotate(0deg)' }}><polyline points="6 9 12 15 18 9" /></svg>
          </button>
          <div className={`buzon-acordeon__body ${adjuntosAbierto ? 'buzon-acordeon__body--open' : ''}`}>
            <div className="buzon-acordeon__content">
              {adjuntoPrevio?.nombreArchivo && (
                <div className="buzon-reply__ficha-item">
                  <span className="buzon-reply__adjunto-icon buzon-reply__adjunto-icon--pdf">PDF</span>
                  <span className="buzon-reply__ficha-nombre">{adjuntoPrevio.nombreArchivo}</span>
                </div>
              )}
              {numImagenes > 0 && (
                <div className="buzon-acordeon__grupo">
                  <span className="buzon-acordeon__grupo-label">🖼 {numImagenes} imagen{numImagenes !== 1 ? 'es' : ''}</span>
                  {adjuntoPrevio.adjuntosImagenes.map((adj, i) => (
                    <div key={i} className="buzon-reply__ficha-item">
                      <span className="buzon-reply__adjunto-icon buzon-reply__adjunto-icon--img-sm">IMG</span>
                      <span className="buzon-reply__ficha-nombre" title={resolverNombre(adj)}>{resolverNombre(adj)}</span>
                    </div>
                  ))}
                </div>
              )}
              {numFichas > 0 && (
                <div className="buzon-acordeon__grupo">
                  <span className="buzon-acordeon__grupo-label">📄 {numFichas} ficha{numFichas !== 1 ? 's' : ''}</span>
                  {adjuntoPrevio.adjuntosPdfs.map((adj, i) => (
                    <div key={i} className="buzon-reply__ficha-item">
                      <span className="buzon-reply__adjunto-icon buzon-reply__adjunto-icon--sm">PDF</span>
                      <span className="buzon-reply__ficha-nombre" title={resolverNombre(adj)}>{resolverNombre(adj)}</span>
                    </div>
                  ))}
                </div>
              )}
              {numLocales > 0 && (
                <div className="buzon-acordeon__grupo">
                  <span className="buzon-acordeon__grupo-label">📎 {numLocales} archivo{numLocales !== 1 ? 's' : ''}</span>
                  {adjuntoPrevio.archivosLocales.map((adj, i) => {
                    const esImagen = /\.(jpg|jpeg|png|gif|webp)$/i.test(adj.nombreArchivo)
                    return (
                      <div key={i} className="buzon-reply__ficha-item">
                        <span className={`buzon-reply__adjunto-icon ${esImagen ? 'buzon-reply__adjunto-icon--img-sm' : 'buzon-reply__adjunto-icon--sm'}`}>{esImagen ? 'IMG' : 'PDF'}</span>
                        <span className="buzon-reply__ficha-nombre" title={adj.nombreArchivo}>{adj.nombreArchivo}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Acordeón Firma */}
      <div className="buzon-acordeon">
        <button type="button" className="buzon-acordeon__header" onClick={() => setFirmaAbierta((v) => !v)}>
          <span className="buzon-acordeon__icon buzon-acordeon__icon--firma">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>
          </span>
          <span className="buzon-acordeon__label">
            Firma del correo
            {firmaSeleccionada && !firmaLoading && <span className="buzon-acordeon__firma-nombre">{firmaSeleccionada.nombre}</span>}
            {firmaLoading && <span className="buzon-acordeon__dot-loading" />}
          </span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="buzon-acordeon__chevron" style={{ transform: firmaAbierta ? 'rotate(180deg)' : 'rotate(0deg)' }}><polyline points="6 9 12 15 18 9" /></svg>
        </button>
        <div className={`buzon-acordeon__body ${firmaAbierta ? 'buzon-acordeon__body--open' : ''}`}>
          <div className="buzon-acordeon__content buzon-acordeon__content--firma">
            {firmaLoading ? (
              <div className="buzon-acordeon__firma-placeholder"><span className="buzon-acordeon__spinner" /><span>Cargando firma...</span></div>
            ) : firmaB64 ? (
              <div className="buzon-acordeon__firma-preview" onClick={() => setSelectorFirmaAbierto((v) => !v)} title="Clic para cambiar firma">
                <img src={firmaB64} alt={firmaSeleccionada?.nombre || 'Firma'} className="buzon-acordeon__firma-img" />
                <div className="buzon-acordeon__firma-overlay">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                  <span>Cambiar firma</span>
                </div>
              </div>
            ) : firmas.length === 0 ? (
              <div className="buzon-acordeon__firma-placeholder"><span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>No hay firmas disponibles.</span></div>
            ) : (
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-danger)', margin: 0 }}>No se pudo cargar la imagen.</p>
            )}
            {selectorFirmaAbierto && firmas.length > 0 && (
              <div className="buzon-acordeon__firma-selector">
                <p className="buzon-acordeon__firma-selector-title">Selecciona una firma</p>
                {firmas.map((firma) => (
                  <button key={firma.id} type="button" className={`buzon-acordeon__firma-opcion ${firmaSeleccionada?.id === firma.id ? 'buzon-acordeon__firma-opcion--active' : ''}`} onClick={() => handleSeleccionarFirma(firma)}>
                    <img src={firma.url} alt={firma.nombre} className="buzon-acordeon__firma-opcion-img" onError={(e) => { e.target.style.display = 'none' }} />
                    <span className="buzon-acordeon__firma-opcion-nombre">{firma.nombre}</span>
                    {firmaSeleccionada?.id === firma.id && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, color: 'var(--color-primary)', flexShrink: 0 }}><polyline points="20 6 9 17 4 12" /></svg>}
                  </button>
                ))}
                <button type="button" className="buzon-acordeon__firma-agregar" onClick={() => firmaFileRef.current?.click()} disabled={subiendoFirma}>
                  {subiendoFirma ? <span className="buzon-acordeon__spinner" /> : '+'} {subiendoFirma ? 'Subiendo...' : 'Agregar firma'}
                </button>
              </div>
            )}
            <input ref={firmaFileRef} type="file" accept="image/jpeg,image/png" style={{ display: 'none' }} onChange={handleNuevaFirma} />
          </div>
        </div>
      </div>

      {/* Textarea */}
      <textarea ref={textareaRef} className="buzon-reply__input" placeholder="Escribe tu respuesta..." value={texto} onChange={(e) => setTexto(e.target.value)} onKeyDown={handleKeyDown} rows={3} />

      {/* Footer */}
      <div className="buzon-reply__footer">
        <div className="buzon-reply__acciones">
          <button className="buzon-btn buzon-btn--cot" onClick={onNuevaCotizacion} type="button">
            <IconCotizacion /> Generar cotización
          </button>
          {onEnviarGuia && (
            <button className="buzon-btn buzon-btn--guia" onClick={onEnviarGuia} type="button">
              <IconGuia /> Guía
            </button>
          )}
          <button className="buzon-btn buzon-btn--ghost" onClick={() => fileInputRef.current?.click()} type="button">
            <IconAdjuntar /> Adjuntar
          </button>
          <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" multiple style={{ display: 'none' }}
            onChange={(e) => {
              const archivos = Array.from(e.target.files || [])
              if (!archivos.length) return
              const adjuntos = archivos.map((archivo) => ({ blobUrl: URL.createObjectURL(archivo), nombreArchivo: archivo.name, esLocal: true, archivo }))
              onAdjuntarCotizacion(adjuntos)
              e.target.value = ''
            }}
          />
        </div>
        <div className="buzon-reply__enviar">
          <span className="buzon-reply__hint">Ctrl + Enter</span>
          <button className="buzon-btn buzon-btn--primary" onClick={handleEnviar} disabled={loading || (!texto.trim() && !adjuntoPrevio)} type="button">
            {loading ? 'Enviando...' : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Iconos ───────────────────────────────────────────────────────────────────
function IconBandeja() { return <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="3" width="14" height="10" rx="2" /><path d="M1 5l7 5 7-5" /></svg> }
function IconEnviados() { return <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2L2 8l4 2 2 4 6-12z" /></svg> }
function IconRedactar() { return <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 3v10M3 8h10" /></svg> }
function IconCotizacion() { return <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="12" height="12" rx="2" /><path d="M5 8h6M5 5h4M5 11h3" /></svg> }
function IconGuia() { return <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2L2 9l5 1 1 5 6-13z" /><path d="M8 8l4-4" /></svg> }
function IconAdjuntar() { return <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 8V5a4 4 0 118 0v6a2 2 0 01-4 0V6" /></svg> }
function IconSync({ spin }) {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={spin ? { animation: 'buzon-spin 1s linear infinite' } : {}}><path d="M13 8A5 5 0 112 5.5" /><path d="M2 3v3h3" /></svg>
}
function IconChevron({ collapsed }) {
  return <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ transition: 'transform 0.25s', transform: collapsed ? 'rotate(90deg)' : 'rotate(-90deg)' }}><path d="M4 6l4 4 4-4" /></svg>
}
function IconAtras() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
}

// ─── Modal redactar ───────────────────────────────────────────────────────────
function ModalRedactar({ onEnviar, onClose, loading }) {
  const [destinatario, setDestinatario] = useState('')
  const [asunto, setAsunto] = useState('')
  const [cuerpo, setCuerpo] = useState('')
  return (
    <div className="buzon-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="buzon-modal">
        <div className="buzon-modal__header">
          <span className="buzon-modal__title">Redactar correo</span>
          <button className="buzon-modal__close" onClick={onClose} type="button">✕</button>
        </div>
        <div className="buzon-modal__body">
          <input className="buzon-modal__field" placeholder="Para: destinatario@email.com" value={destinatario} onChange={(e) => setDestinatario(e.target.value)} autoFocus />
          <input className="buzon-modal__field" placeholder="Asunto" value={asunto} onChange={(e) => setAsunto(e.target.value)} />
          <textarea className="buzon-modal__body-input" placeholder="Escribe tu mensaje..." rows={6} value={cuerpo} onChange={(e) => setCuerpo(e.target.value)} />
        </div>
        <div className="buzon-modal__footer">
          <button className="buzon-btn" onClick={onClose} type="button">Cancelar</button>
          <button className="buzon-btn buzon-btn--primary" onClick={() => { if (destinatario.trim() && asunto.trim() && cuerpo.trim()) onEnviar({ destinatario, asunto, cuerpo }) }} disabled={loading || !destinatario.trim() || !asunto.trim() || !cuerpo.trim()} type="button">
            {loading ? 'Enviando...' : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Helper: construye texto de guía para pre-rellenar el textarea ────────────
function buildTextoGuia(guia) {
  const ESTADO_LABELS = {
    generada: 'Generada', despachada: 'Despachada', en_transito: 'En tránsito',
    entregada: 'Entregada', novedad: 'Novedad',
  }
  const fecha = guia.fecha_despacho
    ? new Date(guia.fecha_despacho + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—'
  return `Estimado cliente,

Le informamos que su pedido ha sido despachado. A continuación los detalles del envío:

──────────────────────────────
Número de guía:    ${guia.numero_guia || '—'}
Transportadora:    ${guia.transportadora || '—'}
Fecha de despacho: ${fecha}
Destinatario:      ${guia.destinatario || '—'}
Ciudad destino:    ${guia.ciudad_destino || '—'}${guia.direccion_destino ? `\nDirección:         ${guia.direccion_destino}` : ''}
Estado actual:     ${ESTADO_LABELS[guia.estado] || guia.estado || '—'}
──────────────────────────────
${guia.observaciones ? `\nObservaciones: ${guia.observaciones}\n` : ''}
Para rastrear su envío comuníquese con la transportadora indicando el número de guía.

Quedamos atentos a cualquier inquietud.

Atentamente,`
}

// ─── BuzonPanel principal ─────────────────────────────────────────────────────
export default function BuzonPanel({ onGenerarCotizacion, hiloInicialId = null, adjuntoPendiente = null, onAdjuntoMontado = null }) {
  const {
    hilos: hilosReales, hiloActivo: hiloActivoReal, sinLeer,
    loadingHilos, loadingHilo, loadingEnvio, loadingSync, error,
    cargarHilos, abrirHilo, responder, redactar, sincronizar, cerrarHilo, enviarConAdjuntos,
    paginaActual, hayPaginaSiguiente, irPaginaSiguiente, irPaginaAnterior,
  } = useBuzon()

  const hilos = hilosReales
  const hiloActivo = hiloActivoReal

  const [bandejaActiva, setBandejaActiva] = useState('inbox')
  const [modalRedactar, setModalRedactar] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [sidebarColapsado, setSidebarColapsado] = useState(false)
  const [adjuntoReply, setAdjuntoReply] = useState(null)
  const [modalCotizacion, setModalCotizacion] = useState(false)
  const [modalGuia, setModalGuia] = useState(false)
  const [vistaMovil, setVistaMovil] = useState('lista')
  const [textoGuia, setTextoGuia] = useState('')

  const mensajesEndRef = useRef(null)

  useEffect(() => { cargarHilos('inbox') }, [])

  useEffect(() => {
    if (!hiloInicialId) return
    const hilo = hilosReales.find((h) => h.id === hiloInicialId)
    if (hilo) handleAbrirHilo(hilo)
  }, [hiloInicialId]) // eslint-disable-line

  useEffect(() => {
    mensajesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [hiloActivo?.mensajes?.length])

  useEffect(() => {
    if (!adjuntoPendiente) return
    setAdjuntoReply(adjuntoPendiente)
    onAdjuntoMontado?.()
  }, [adjuntoPendiente])

  const hiloActivoKey = hiloActivo?.hilo_message_id || hiloActivo?.id || null
  const hiloEsActivo = (hilo) => {
    if (!hiloActivoKey) return false
    return hilo.hilo_message_id === hiloActivoKey || hilo.id === hiloActivoKey
  }

  const handleAbrirHilo = (hilo) => {
    abrirHilo(hilo.hilo_message_id || hilo.id, bandejaActiva)
    setVistaMovil('hilo')
  }

  const handleVolverALista = () => {
    setVistaMovil('lista')
    cerrarHilo()
  }

  const handleCotizacionGenerada = ({ blobUrl, nombreArchivo, cotizacion, adjuntosImagenes = [], adjuntosPdfs = [] }) => {
    if (blobUrl && nombreArchivo) setAdjuntoReply({ blobUrl, nombreArchivo, cotizacion, adjuntosImagenes, adjuntosPdfs })
    setModalCotizacion(false)
  }

  const handleCambiarBandeja = (b) => {
    setBandejaActiva(b)
    cargarHilos(b)
    cerrarHilo()
    setVistaMovil('lista')
  }

  // ── Selección de guía: pre-rellena textarea + adjunta foto ────────────────
  const handleSeleccionarGuia = async (guia) => {
    const texto = buildTextoGuia(guia)
    const archivosLocales = []
    if (guia.foto_guia_path) {
      try {
        const res = await fetch(guia.foto_guia_path)
        const blob = await res.blob()
        const ext = guia.foto_guia_path.split('.').pop() || 'jpg'
        const archivo = new File([blob], `Foto_guia_${guia.numero_guia}.${ext}`, { type: blob.type })
        archivosLocales.push({ archivo, nombreArchivo: archivo.name })
      } catch { /* sin foto, no es bloqueante */ }
    }
    if (archivosLocales.length > 0) {
      setAdjuntoReply((prev) => ({
        ...prev,
        archivosLocales: [...(prev?.archivosLocales || []), ...archivosLocales],
      }))
    }
    setTextoGuia(texto)
  }

  const handleResponder = async (texto, firmaSeleccionada) => {
    if (adjuntoReply?.cotizacion?.id) {
      setEnviando(true)
      try {
        const blob = await fetch(adjuntoReply.blobUrl).then((r) => r.blob())
        const formData = new FormData()
        formData.append('destino', hiloActivo?.email_remitente || '')
        formData.append('asunto', hiloActivo?.asunto ? `Re: ${hiloActivo.asunto}` : `Cotización ${adjuntoReply.cotizacion.consecutivo}`)
        formData.append('cuerpo', texto.trim() || `Estimado cliente, adjuntamos la cotización ${adjuntoReply.cotizacion.consecutivo}. Quedamos atentos.`)
        formData.append('in_reply_to', hiloActivo?.last_message_id || hiloActivo?.message_id || '')
        formData.append('references', hiloActivo?.last_message_id || hiloActivo?.message_id || '')
        if (firmaSeleccionada?.url) formData.append('firma_url', firmaSeleccionada.url)
        formData.append('pdf_cotizacion', blob, `${adjuntoReply.cotizacion.consecutivo}.pdf`)
        const imagenesUrls = (adjuntoReply.adjuntosImagenes || []).map((a) => ({ url: a.url || a, nombre: a.nombre || (a.url || a).split('/').pop() })).filter((a) => a.url)
        if (imagenesUrls.length > 0) formData.append('adjuntos_imagenes_urls', JSON.stringify(imagenesUrls))
        const fichasUrls = (adjuntoReply.adjuntosPdfs || []).map((a) => ({ url: a.url || a, nombre: a.nombre || (a.url || a).split('/').pop() })).filter((a) => a.url)
        if (fichasUrls.length > 0) formData.append('adjuntos_pdfs_urls', JSON.stringify(fichasUrls))
        if (adjuntoReply?.archivosLocales?.length > 0) adjuntoReply.archivosLocales.forEach((adj) => formData.append('archivos_extra', adj.archivo, adj.nombreArchivo))
        await axiosClient.post(`/cotizaciones/${adjuntoReply.cotizacion.id}/enviar-email`, formData, { timeout: 120000 })
        setAdjuntoReply(null)
      } catch (err) { console.error('Error enviando cotización desde buzón:', err) } finally { setEnviando(false) }
      return
    }

    if (adjuntoReply?.archivosLocales?.length > 0) {
      setEnviando(true)
      try {
        const formData = new FormData()
        formData.append('thread_id', hiloActivo.id)
        formData.append('destino', hiloActivo.email_remitente)
        formData.append('asunto', hiloActivo.asunto ? `Re: ${hiloActivo.asunto}` : '(Sin asunto)')
        formData.append('cuerpo', texto.trim() || 'Adjuntamos los archivos solicitados.')
        formData.append('in_reply_to', hiloActivo.last_message_id || hiloActivo.message_id || '')
        formData.append('references', hiloActivo.last_message_id || hiloActivo.message_id || '')
        if (firmaSeleccionada?.url) formData.append('firma_url', firmaSeleccionada.url)
        adjuntoReply.archivosLocales.forEach((adj) => formData.append('archivos', adj.archivo, adj.nombreArchivo))
        await enviarConAdjuntos(formData)
        setAdjuntoReply(null)
      } catch (err) { console.error('Error enviando archivos locales:', err) } finally { setEnviando(false) }
      return
    }

    const result = await responder(hiloActivo.id, {
      thread_id: hiloActivo.id,
      destino: hiloActivo.email_remitente,
      asunto: hiloActivo.asunto ? `Re: ${hiloActivo.asunto}` : '(Sin asunto)',
      cuerpo: texto,
      in_reply_to: hiloActivo.last_message_id || hiloActivo.message_id || null,
      references: hiloActivo.last_message_id || hiloActivo.message_id || null,
      firma_url: firmaSeleccionada?.url || null,
    })
    if (!result.success) console.error(result.error)
  }

  const gridColumns = sidebarColapsado ? '52px 340px 1fr' : '220px 340px 1fr'
  const sinLeerTotal = sinLeer

  return (
    <div
      className={['buzon-root', vistaMovil === 'hilo' ? 'buzon-root--mobile-hilo' : ''].filter(Boolean).join(' ')}
      style={{ gridTemplateColumns: gridColumns }}
    >
      {/* ── Barra navegación mobile ── */}
      <div className="buzon-mobile-nav">
        <button className={`buzon-mobile-nav__tab ${bandejaActiva === 'inbox' ? 'buzon-mobile-nav__tab--active' : ''}`} onClick={() => handleCambiarBandeja('inbox')} type="button">
          <IconBandeja /><span>Recibidos</span>
          {sinLeerTotal > 0 && <span className="buzon-mobile-nav__badge">{sinLeerTotal}</span>}
        </button>
        <button className={`buzon-mobile-nav__tab ${bandejaActiva === 'sent' ? 'buzon-mobile-nav__tab--active' : ''}`} onClick={() => handleCambiarBandeja('sent')} type="button">
          <IconEnviados /><span>Enviados</span>
        </button>
        <button className="buzon-mobile-nav__sync" onClick={() => sincronizar()} disabled={loadingSync} type="button" title="Sincronizar">
          <IconSync spin={loadingSync} />
        </button>
      </div>

      {/* ── Sidebar desktop ── */}
      <div className={`buzon-sidebar ${sidebarColapsado ? 'buzon-sidebar--collapsed' : ''}`}>
        <button className="buzon-sidebar__toggle" onClick={() => setSidebarColapsado((v) => !v)} type="button" title={sidebarColapsado ? 'Expandir' : 'Colapsar'}>
          <IconChevron collapsed={sidebarColapsado} />
        </button>
        <div className="buzon-sidebar__cuenta">
          <div className="buzon-sidebar__dot" />
          {!sidebarColapsado && <span className="buzon-sidebar__email">ventas@electromanfer.com</span>}
        </div>
        <nav className="buzon-sidebar__nav">
          <button className={`buzon-nav-item ${bandejaActiva === 'inbox' ? 'buzon-nav-item--activo' : ''}`} onClick={() => handleCambiarBandeja('inbox')} type="button" title="Bandeja de entrada">
            <IconBandeja />
            {!sidebarColapsado && <span>Bandeja de entrada</span>}
            {sinLeerTotal > 0 && <span className="buzon-nav-badge">{sinLeerTotal}</span>}
          </button>
          <button className={`buzon-nav-item ${bandejaActiva === 'sent' ? 'buzon-nav-item--activo' : ''}`} onClick={() => handleCambiarBandeja('sent')} type="button" title="Enviados">
            <IconEnviados />{!sidebarColapsado && <span>Enviados</span>}
          </button>
        </nav>
        <div className="buzon-sidebar__divider" />
        <div className="buzon-sidebar__acciones">
          <button className="buzon-nav-item buzon-nav-item--cot" onClick={() => setModalCotizacion(true)} type="button" title="Nueva cotización">
            <IconCotizacion />{!sidebarColapsado && <span>Nueva cotización</span>}
          </button>
          <button className="buzon-nav-item buzon-nav-item--guia" onClick={() => setModalGuia(true)} type="button" title="Enviar guía">
            <IconGuia />{!sidebarColapsado && <span>Enviar guía</span>}
          </button>
          <button className="buzon-nav-item buzon-nav-item--sync" onClick={() => sincronizar()} disabled={loadingSync} type="button" title="Sincronizar">
            <IconSync spin={loadingSync} />{!sidebarColapsado && <span>Sincronizar</span>}
          </button>
        </div>
      </div>

      {/* ── Lista de hilos ── */}
      <div className="buzon-lista">
        <div className="buzon-lista__header">
          <span className="buzon-lista__titulo">{bandejaActiva === 'inbox' ? 'Recibidos' : 'Enviados'}</span>
          {sinLeerTotal > 0 && bandejaActiva === 'inbox' && <span className="buzon-lista__sin-leer">{sinLeerTotal} sin leer</span>}
        </div>
        <input className="buzon-lista__search" placeholder="Buscar correos..." onChange={(e) => cargarHilos(bandejaActiva, { q: e.target.value })} />
        {loadingHilos ? (
          <div className="buzon-lista__empty">Cargando...</div>
        ) : hilos.length === 0 ? (
          <div className="buzon-lista__empty">Sin correos</div>
        ) : (
          hilos.map((hilo) => <HiloItem key={hilo.id} hilo={hilo} activo={hiloEsActivo(hilo)} onClick={handleAbrirHilo} />)
        )}
        {!loadingHilos && (paginaActual > 1 || hayPaginaSiguiente) && (
          <div className="buzon-paginacion">
            <button className="buzon-paginacion__btn" onClick={irPaginaAnterior} disabled={paginaActual <= 1} title="Página anterior" type="button">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <span className="buzon-paginacion__pagina">{paginaActual}</span>
            <button className="buzon-paginacion__btn" onClick={irPaginaSiguiente} disabled={!hayPaginaSiguiente} title="Página siguiente" type="button">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          </div>
        )}
      </div>

      {/* ── Vista de hilo ── */}
      <div className="buzon-hilo">
        {!hiloActivo ? (
          <div className="buzon-hilo__vacio">
            <div className="buzon-hilo__vacio-icon"><IconBandeja /></div>
            <span>Selecciona un correo para leerlo</span>
          </div>
        ) : (
          <>
            <div className="buzon-hilo__header">
              <button className="buzon-hilo__volver" onClick={handleVolverALista} type="button"><IconAtras /> Volver</button>
              <div className="buzon-hilo__asunto">{hiloActivo.asunto}</div>
              <div className="buzon-hilo__meta">
                {hiloActivo.remitente} · {hiloActivo.mensajes?.length || 0} mensaje{hiloActivo.mensajes?.length !== 1 ? 's' : ''}
                {hiloActivo.cotizacion_consecutivo && <span className="buzon-hilo__cot-tag">{hiloActivo.cotizacion_consecutivo}</span>}
              </div>
            </div>
            <div className="buzon-hilo__mensajes">
              {loadingHilo ? (
                <div className="buzon-lista__empty">Cargando mensajes...</div>
              ) : (
                hiloActivo.mensajes?.map((msg) => <MensajeBurbuja key={msg.id} mensaje={msg} />)
              )}
              <div ref={mensajesEndRef} />
            </div>
            <BarraRespuesta
              onEnviar={handleResponder}
              loading={enviando || loadingEnvio}
              adjuntoPrevio={adjuntoReply}
              onQuitarAdjunto={() => setAdjuntoReply(null)}
              onNuevaCotizacion={() => setModalCotizacion(true)}
              onEnviarGuia={() => setModalGuia(true)}
              textoInicial={textoGuia}
              onTextoInicialUsado={() => setTextoGuia('')}
              onAdjuntarCotizacion={(adjuntos) => {
                const lista = Array.isArray(adjuntos) ? adjuntos : [adjuntos]
                setAdjuntoReply((prev) => ({ ...prev, archivosLocales: [...(prev?.archivosLocales || []), ...lista] }))
              }}
            />
          </>
        )}
      </div>

      {/* ── Modales ── */}
      {modalCotizacion && (
        <ModalCotizacionBuzon
          hilo={hiloActivo ? { hiloId: hiloActivo.id, remitente: hiloActivo.remitente, emailRemitente: hiloActivo.email_remitente, asunto: hiloActivo.asunto } : null}
          onClose={() => setModalCotizacion(false)}
          onCotizacionGenerada={handleCotizacionGenerada}
        />
      )}
      {modalRedactar && (
        <ModalRedactar onEnviar={async (p) => { const r = await redactar(p); if (r.success) setModalRedactar(false) }} onClose={() => setModalRedactar(false)} loading={loadingEnvio} />
      )}
      {modalGuia && (
        <ModalGuiaBuzon
          onClose={() => setModalGuia(false)}
          onSeleccionar={handleSeleccionarGuia}
        />
      )}
      {error && <div className="buzon-error">{error}</div>}
    </div>
  )
}