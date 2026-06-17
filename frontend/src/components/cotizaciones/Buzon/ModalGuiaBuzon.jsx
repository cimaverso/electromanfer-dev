import { useState, useEffect, useCallback, useRef } from 'react'
import { getGuias, crearGuia } from '../../../api/guiasApi'
import { useTransportadoras } from '../../../hooks/useTransportadoras'
import './ModalGuiaBuzon.css'

const ESTADO_CONFIG = {
  generada:    { label: 'Generada',    color: 'var(--color-info)' },
  despachada:  { label: 'Despachada',  color: 'var(--color-primary)' },
  en_transito: { label: 'En tránsito', color: 'var(--color-warning)' },
  entregada:   { label: 'Entregada',   color: 'var(--color-success)' },
  novedad:     { label: 'Novedad',     color: 'var(--color-danger)' },
}

const EMPTY_FORM = {
  cotizacion_consecutivo: '',
  transportadora:         '',
  numero_guia:            '',
  fecha_despacho:         '',
  destinatario:           '',
  direccion_destino:      '',
  ciudad_destino:         '',
  telefono_destinatario:  '',
  unidades:               '',
  peso_kg:                '',
  valor_declarado:        '',
  valor_recaudo:          '',
  costo_flete:            '',
  referencia_interna:     '',
  observaciones:          '',
}

function fmtFecha(str) {
  if (!str) return '—'
  return new Date(str + 'T00:00:00').toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

// ─── Pestaña: Enviar guía existente ──────────────────────────────────────────
function TabEnviar({ onSeleccionar }) {
  const [buscar, setBuscar]   = useState('')
  const [guias, setGuias]     = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { cargar('') }, [])

  const cargar = useCallback(async (q) => {
    setLoading(true)
    try {
      const lista = await getGuias(q ? { buscar: q } : {})
      setGuias(lista)
    } catch { setGuias([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => cargar(buscar), 300)
    return () => clearTimeout(t)
  }, [buscar, cargar])

  return (
    <>
      {/* Buscador */}
      <div className="mgb-search-wrap">
        <div className="mgb-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mgb-search__icon">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="mgb-search__input"
            placeholder="Número de guía, destinatario, ciudad..."
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            autoFocus
          />
          {buscar && (
            <button className="mgb-search__clear" onClick={() => setBuscar('')} type="button">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Lista */}
      <div className="mgb-lista">
        {loading ? (
          <div className="mgb-estado"><span className="mgb-spinner" /><span>Buscando...</span></div>
        ) : guias.length === 0 ? (
          <div className="mgb-estado"><span>No se encontraron guías</span></div>
        ) : (
          guias.map((g) => {
            const cfg = ESTADO_CONFIG[g.estado] || { label: g.estado, color: 'var(--color-text-muted)' }
            return (
              <button key={g.id} type="button" className="mgb-item" onClick={() => onSeleccionar(g)}>
                <div className="mgb-item__main">
                  <span className="mgb-item__num">{g.numero_guia}</span>
                  <span className="mgb-item__trans">{g.transportadora}</span>
                </div>
                <div className="mgb-item__sub">
                  <span className="mgb-item__dest">{g.destinatario || '—'}</span>
                  <span className="mgb-item__ciudad">{g.ciudad_destino || '—'}</span>
                  <span className="mgb-item__fecha">{fmtFecha(g.fecha_despacho)}</span>
                </div>
                <div className="mgb-item__right">
                  <span className="mgb-item__badge" style={{ color: cfg.color }}>{cfg.label}</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mgb-item__arrow">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </button>
            )
          })
        )}
      </div>
    </>
  )
}

// ─── Pestaña: Nueva guía ──────────────────────────────────────────────────────
function TabNueva({ onCreada }) {
  const { transportadoras, loading: loadingTrans, agregar: agregarTransportadora } = useTransportadoras()
  const [form, setForm]               = useState(EMPTY_FORM)
  const [errores, setErrores]         = useState({})
  const [fotoFile, setFotoFile]       = useState(null)
  const [fotoPreview, setFotoPreview] = useState(null)
  const [nuevaTrans, setNuevaTrans]   = useState('')
  const [mostrarNuevaTrans, setMostrarNuevaTrans] = useState(false)
  const [guardandoTrans, setGuardandoTrans]       = useState(false)
  const [loading, setLoading]         = useState(false)
  const [exitoso, setExitoso]         = useState(false)

  const camaraInputRef  = useRef(null)
  const archivoInputRef = useRef(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errores[name]) setErrores((prev) => ({ ...prev, [name]: null }))
  }

  const handleFoto = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setFotoFile(file)
    setFotoPreview(URL.createObjectURL(file))
  }

  const quitarFoto = () => { setFotoFile(null); setFotoPreview(null) }

  const handleAgregarTrans = async () => {
    const nombre = nuevaTrans.trim()
    if (!nombre) return
    setGuardandoTrans(true)
    const res = await agregarTransportadora(nombre)
    if (res.success) {
      setForm((prev) => ({ ...prev, transportadora: res.data.nombre }))
      setNuevaTrans('')
      setMostrarNuevaTrans(false)
    }
    setGuardandoTrans(false)
  }

  const validar = () => {
    const nuevos = {}
    if (!form.transportadora.trim()) nuevos.transportadora = 'Requerido'
    if (!form.numero_guia.trim())    nuevos.numero_guia    = 'Requerido'
    if (!form.fecha_despacho)        nuevos.fecha_despacho = 'Requerido'
    setErrores(nuevos)
    return Object.keys(nuevos).length === 0
  }

  const handleSubmit = async () => {
    if (!validar()) return
    setLoading(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => {
        if (v !== '' && v !== null && v !== undefined) fd.append(k, v)
      })
      if (fotoFile) fd.append('foto_guia', fotoFile)
      const nueva = await crearGuia(fd)
      setExitoso(true)
      setTimeout(() => onCreada(nueva), 800)
    } catch {
      setErrores({ _general: 'Error al crear la guía. Inténtalo de nuevo.' })
    } finally {
      setLoading(false)
    }
  }

  if (exitoso) {
    return (
      <div className="mgb-exito">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 32, height: 32, color: 'var(--color-success)' }}>
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span>Guía creada correctamente</span>
      </div>
    )
  }

  return (
    <>
      <div className="mgb-form-body">
        {errores._general && (
          <div className="mgb-form-error-general">{errores._general}</div>
        )}

        {/* Envío */}
        <p className="mgb-form-section">Datos de envío</p>
        <div className="mgb-form-grid">

          {/* Transportadora */}
          <div className={`mgb-form-field ${errores.transportadora ? 'mgb-form-field--error' : ''}`}>
            <label className="mgb-form-label">Transportadora *</label>
            {loadingTrans ? (
              <div className="mgb-form-input mgb-form-input--loading">Cargando...</div>
            ) : (
              <select name="transportadora" className="mgb-form-input mgb-form-input--select" value={form.transportadora} onChange={handleChange}>
                <option value="">Seleccionar...</option>
                {transportadoras.map((t) => <option key={t.id} value={t.nombre}>{t.nombre}</option>)}
              </select>
            )}
            {!mostrarNuevaTrans ? (
              <button type="button" className="mgb-form-nueva-trans-btn" onClick={() => setMostrarNuevaTrans(true)}>+ Agregar nueva transportadora</button>
            ) : (
              <div className="mgb-form-nueva-trans">
                <input type="text" className="mgb-form-input" placeholder="Nombre de la transportadora" value={nuevaTrans} onChange={(e) => setNuevaTrans(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleAgregarTrans() }} autoFocus />
                <button type="button" className="mgb-form-nueva-trans__save" onClick={handleAgregarTrans} disabled={guardandoTrans}>
                  {guardandoTrans ? '...' : 'Agregar'}
                </button>
                <button type="button" className="mgb-form-nueva-trans__cancel" onClick={() => { setMostrarNuevaTrans(false); setNuevaTrans('') }}>✕</button>
              </div>
            )}
            {errores.transportadora && <span className="mgb-form-error-msg">{errores.transportadora}</span>}
          </div>

          {/* Número de guía */}
          <div className={`mgb-form-field ${errores.numero_guia ? 'mgb-form-field--error' : ''}`}>
            <label className="mgb-form-label">Número de guía *</label>
            <input type="text" name="numero_guia" className="mgb-form-input" placeholder="Ej: CRA-2024-881234" value={form.numero_guia} onChange={handleChange} />
            {errores.numero_guia && <span className="mgb-form-error-msg">{errores.numero_guia}</span>}
          </div>

          {/* Fecha despacho */}
          <div className={`mgb-form-field ${errores.fecha_despacho ? 'mgb-form-field--error' : ''}`}>
            <label className="mgb-form-label">Fecha de despacho *</label>
            <input type="date" name="fecha_despacho" className="mgb-form-input" value={form.fecha_despacho} onChange={handleChange} />
            {errores.fecha_despacho && <span className="mgb-form-error-msg">{errores.fecha_despacho}</span>}
          </div>

          {/* Cotización vinculada */}
          <div className="mgb-form-field">
            <label className="mgb-form-label">Cotización vinculada</label>
            <input type="text" name="cotizacion_consecutivo" className="mgb-form-input" placeholder="Ej: COT-2024-0041" value={form.cotizacion_consecutivo} onChange={handleChange} />
          </div>
        </div>

        {/* Destinatario */}
        <p className="mgb-form-section">Destinatario</p>
        <div className="mgb-form-grid">
          <div className="mgb-form-field">
            <label className="mgb-form-label">Nombre / Empresa</label>
            <input type="text" name="destinatario" className="mgb-form-input" placeholder="Nombre completo o razón social" value={form.destinatario} onChange={handleChange} />
          </div>
          <div className="mgb-form-field">
            <label className="mgb-form-label">Teléfono</label>
            <input type="tel" name="telefono_destinatario" className="mgb-form-input" placeholder="3XXXXXXXXX" value={form.telefono_destinatario} onChange={handleChange} />
          </div>
          <div className="mgb-form-field mgb-form-field--full">
            <label className="mgb-form-label">Dirección</label>
            <input type="text" name="direccion_destino" className="mgb-form-input" placeholder="Calle, carrera, número..." value={form.direccion_destino} onChange={handleChange} />
          </div>
          <div className="mgb-form-field">
            <label className="mgb-form-label">Ciudad</label>
            <input type="text" name="ciudad_destino" className="mgb-form-input" placeholder="Ciudad de destino" value={form.ciudad_destino} onChange={handleChange} />
          </div>
        </div>

        {/* Valores */}
        <p className="mgb-form-section">Valores y peso</p>
        <div className="mgb-form-grid mgb-form-grid--4">
          <div className="mgb-form-field">
            <label className="mgb-form-label">Unidades</label>
            <input type="number" name="unidades" className="mgb-form-input" placeholder="0" min="1" value={form.unidades} onChange={handleChange} />
          </div>
          <div className="mgb-form-field">
            <label className="mgb-form-label">Peso (kg)</label>
            <input type="number" name="peso_kg" className="mgb-form-input" placeholder="0.0" min="0" step="0.1" value={form.peso_kg} onChange={handleChange} />
          </div>
          <div className="mgb-form-field">
            <label className="mgb-form-label">Valor declarado ($)</label>
            <input type="number" name="valor_declarado" className="mgb-form-input" placeholder="0" min="0" value={form.valor_declarado} onChange={handleChange} />
          </div>
          <div className="mgb-form-field">
            <label className="mgb-form-label">Valor recaudo ($)</label>
            <input type="number" name="valor_recaudo" className="mgb-form-input" placeholder="0 si no es contraentrega" min="0" value={form.valor_recaudo} onChange={handleChange} />
          </div>
          <div className="mgb-form-field">
            <label className="mgb-form-label">Costo flete ($)</label>
            <input type="number" name="costo_flete" className="mgb-form-input" placeholder="Costo cobrado" min="0" value={form.costo_flete} onChange={handleChange} />
          </div>
          <div className="mgb-form-field">
            <label className="mgb-form-label">Referencia interna</label>
            <input type="text" name="referencia_interna" className="mgb-form-input" placeholder="Código interno opcional" value={form.referencia_interna} onChange={handleChange} />
          </div>
        </div>

        {/* Observaciones */}
        <div className="mgb-form-field mgb-form-field--full">
          <label className="mgb-form-label">Observaciones</label>
          <textarea name="observaciones" className="mgb-form-textarea" placeholder="Instrucciones de entrega, notas especiales..." rows={2} value={form.observaciones} onChange={handleChange} />
        </div>

        {/* Foto */}
        <p className="mgb-form-section">Foto de la guía</p>
        <div className="mgb-form-foto-area">
          {fotoPreview ? (
            <div className="mgb-form-foto-preview">
              <img src={fotoPreview} alt="Foto" className="mgb-form-foto-img" />
              <button type="button" className="mgb-form-foto-quitar" onClick={quitarFoto}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}>
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                Quitar foto
              </button>
            </div>
          ) : (
            <div className="mgb-form-foto-btns">
              <button type="button" className="mgb-form-foto-btn" onClick={() => camaraInputRef.current?.click()}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                Tomar foto
              </button>
              <button type="button" className="mgb-form-foto-btn mgb-form-foto-btn--sec" onClick={() => archivoInputRef.current?.click()}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
                Subir archivo
              </button>
            </div>
          )}
          <input ref={camaraInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFoto} />
          <input ref={archivoInputRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={handleFoto} />
        </div>
      </div>

      {/* Footer del formulario */}
      <div className="mgb-form-footer">
        <button type="button" className="mgb-form-save-btn" onClick={handleSubmit} disabled={loading}>
          {loading ? <><span className="mgb-spinner" /> Creando...</> : 'Crear guía'}
        </button>
      </div>
    </>
  )
}

// ─── Modal principal con pestañas ─────────────────────────────────────────────
export default function ModalGuiaBuzon({ onClose, onSeleccionar }) {
  const [pestaña, setPestaña] = useState('enviar')

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleCreada = (guia) => {
    // Después de crear, pre-selecciona la guía para adjuntarla al correo
    onSeleccionar(guia)
    onClose()
  }

  return (
    <div className="mgb-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="mgb-modal" role="dialog" aria-modal="true">

        {/* Header */}
        <div className="mgb-header">
          <div className="mgb-tabs">
            <button
              type="button"
              className={`mgb-tab ${pestaña === 'enviar' ? 'mgb-tab--active' : ''}`}
              onClick={() => setPestaña('enviar')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
              Enviar guía
            </button>
            <button
              type="button"
              className={`mgb-tab ${pestaña === 'nueva' ? 'mgb-tab--active' : ''}`}
              onClick={() => setPestaña('nueva')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Nueva guía
            </button>
          </div>
          <button className="mgb-close" onClick={onClose} aria-label="Cerrar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Contenido según pestaña */}
        {pestaña === 'enviar' ? (
          <TabEnviar onSeleccionar={(g) => { onSeleccionar(g); onClose() }} />
        ) : (
          <TabNueva onCreada={handleCreada} />
        )}
      </div>
    </div>
  )
}