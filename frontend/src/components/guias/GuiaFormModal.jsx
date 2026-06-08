import { useState, useEffect, useRef } from 'react'
import { useTransportadoras } from '../../hooks/useTransportadoras'
import './GuiaFormModal.css'

const CAMPOS_REQUERIDOS = ['transportadora', 'numero_guia', 'fecha_despacho']

const EMPTY_FORM = {
  cotizacion_id:           '',
  cotizacion_consecutivo:  '',
  transportadora:          '',
  numero_guia:             '',
  fecha_despacho:          '',
  destinatario:            '',
  direccion_destino:       '',
  ciudad_destino:          '',
  telefono_destinatario:   '',
  unidades:                '',
  peso_kg:                 '',
  valor_declarado:         '',
  valor_recaudo:           '',
  costo_flete:             '',
  referencia_interna:      '',
  observaciones:           '',
}

export default function GuiaFormModal({ guia = null, onGuardar, onClose, loading = false }) {
  const esEdicion = !!guia

  const { transportadoras, loading: loadingTrans, agregar: agregarTransportadora } = useTransportadoras()

  const [form, setForm]               = useState(EMPTY_FORM)
  const [errores, setErrores]         = useState({})
  const [fotoFile, setFotoFile]       = useState(null)
  const [fotoPreview, setFotoPreview] = useState(null)
  const [nuevaTrans, setNuevaTrans]   = useState('')
  const [mostrarNuevaTrans, setMostrarNuevaTrans] = useState(false)
  const [guardandoTrans, setGuardandoTrans]       = useState(false)

  const camaraInputRef  = useRef(null)
  const archivoInputRef = useRef(null)

  // Precarga al editar
  useEffect(() => {
    if (guia) {
      setForm({
        cotizacion_id:           guia.cotizacion_id          ?? '',
        cotizacion_consecutivo:  guia.cotizacion_consecutivo ?? '',
        transportadora:          guia.transportadora         ?? '',
        numero_guia:             guia.numero_guia            ?? '',
        fecha_despacho:          guia.fecha_despacho         ?? '',
        destinatario:            guia.destinatario           ?? '',
        direccion_destino:       guia.direccion_destino      ?? '',
        ciudad_destino:          guia.ciudad_destino         ?? '',
        telefono_destinatario:   guia.telefono_destinatario  ?? '',
        unidades:                guia.unidades               ?? '',
        peso_kg:                 guia.peso_kg                ?? '',
        valor_declarado:         guia.valor_declarado        ?? '',
        valor_recaudo:           guia.valor_recaudo          ?? '',
        costo_flete:             guia.costo_flete            ?? '',
        referencia_interna:      guia.referencia_interna     ?? '',
        observaciones:           guia.observaciones          ?? '',
      })
      if (guia.foto_guia_path) {
        setFotoPreview(guia.foto_guia_path)
      }
    }
  }, [guia])

  // Cierra con Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errores[name]) setErrores((prev) => ({ ...prev, [name]: null }))
  }

  // ── Foto ────────────────────────────────────────────────────────────────
  const handleFoto = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setFotoFile(file)
    const url = URL.createObjectURL(file)
    setFotoPreview(url)
  }

  const quitarFoto = () => {
    setFotoFile(null)
    setFotoPreview(null)
  }

  // ── Nueva transportadora ────────────────────────────────────────────────
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

  // ── Validación ──────────────────────────────────────────────────────────
  const validar = () => {
    const nuevos = {}
    if (!form.transportadora.trim()) nuevos.transportadora = 'Requerido'
    if (!form.numero_guia.trim())    nuevos.numero_guia    = 'Requerido'
    if (!form.fecha_despacho)        nuevos.fecha_despacho = 'Requerido'
    setErrores(nuevos)
    return Object.keys(nuevos).length === 0
  }

  // ── Submit ──────────────────────────────────────────────────────────────
  const handleSubmit = () => {
    if (!validar()) return

    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => {
      if (v !== '' && v !== null && v !== undefined) fd.append(k, v)
    })
    if (fotoFile) fd.append('foto_guia', fotoFile)

    onGuardar(fd)
  }

  return (
    <div className="guia-form-modal__overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="guia-form-modal">

        {/* ── Header ── */}
        <div className="guia-form-modal__header">
          <h2 className="guia-form-modal__title">
            {esEdicion ? 'Editar guía' : 'Nueva guía de envío'}
          </h2>
          <button className="guia-form-modal__close" onClick={onClose} aria-label="Cerrar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* ── Body ── */}
        <div className="guia-form-modal__body">

          {/* Sección: Envío */}
          <p className="guia-form-modal__section-title">Datos de envío</p>
          <div className="guia-form-modal__grid">

            {/* Transportadora */}
            <div className={`guia-form-modal__field ${errores.transportadora ? 'guia-form-modal__field--error' : ''}`}>
              <label className="guia-form-modal__label">Transportadora *</label>
              {loadingTrans ? (
                <div className="guia-form-modal__input guia-form-modal__input--loading">Cargando...</div>
              ) : (
                <select
                  name="transportadora"
                  className="guia-form-modal__input guia-form-modal__input--select"
                  value={form.transportadora}
                  onChange={handleChange}
                >
                  <option value="">Seleccionar...</option>
                  {transportadoras.map((t) => (
                    <option key={t.id} value={t.nombre}>{t.nombre}</option>
                  ))}
                </select>
              )}
              {!mostrarNuevaTrans ? (
                <button
                  type="button"
                  className="guia-form-modal__nueva-trans-btn"
                  onClick={() => setMostrarNuevaTrans(true)}
                >
                  + Agregar nueva transportadora
                </button>
              ) : (
                <div className="guia-form-modal__nueva-trans">
                  <input
                    type="text"
                    className="guia-form-modal__input"
                    placeholder="Nombre de la transportadora"
                    value={nuevaTrans}
                    onChange={(e) => setNuevaTrans(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAgregarTrans() }}
                    autoFocus
                  />
                  <button
                    type="button"
                    className="guia-form-modal__nueva-trans-save"
                    onClick={handleAgregarTrans}
                    disabled={guardandoTrans || !nuevaTrans.trim()}
                  >
                    {guardandoTrans ? '...' : 'Guardar'}
                  </button>
                  <button
                    type="button"
                    className="guia-form-modal__nueva-trans-cancel"
                    onClick={() => { setMostrarNuevaTrans(false); setNuevaTrans('') }}
                  >
                    Cancelar
                  </button>
                </div>
              )}
              {errores.transportadora && <span className="guia-form-modal__error-msg">{errores.transportadora}</span>}
            </div>

            {/* Número de guía */}
            <div className={`guia-form-modal__field ${errores.numero_guia ? 'guia-form-modal__field--error' : ''}`}>
              <label className="guia-form-modal__label">Número de guía *</label>
              <input
                type="text"
                name="numero_guia"
                className="guia-form-modal__input"
                placeholder="Ej: CRA-2024-881234"
                value={form.numero_guia}
                onChange={handleChange}
              />
              {errores.numero_guia && <span className="guia-form-modal__error-msg">{errores.numero_guia}</span>}
            </div>

            {/* Fecha despacho */}
            <div className={`guia-form-modal__field ${errores.fecha_despacho ? 'guia-form-modal__field--error' : ''}`}>
              <label className="guia-form-modal__label">Fecha de despacho *</label>
              <input
                type="date"
                name="fecha_despacho"
                className="guia-form-modal__input"
                value={form.fecha_despacho}
                onChange={handleChange}
              />
              {errores.fecha_despacho && <span className="guia-form-modal__error-msg">{errores.fecha_despacho}</span>}
            </div>

            {/* Cotización vinculada */}
            <div className="guia-form-modal__field">
              <label className="guia-form-modal__label">Cotización vinculada</label>
              <input
                type="text"
                name="cotizacion_consecutivo"
                className="guia-form-modal__input"
                placeholder="Ej: COT-2024-0041"
                value={form.cotizacion_consecutivo}
                onChange={handleChange}
              />
            </div>

          </div>

          {/* Sección: Destinatario */}
          <p className="guia-form-modal__section-title">Destinatario</p>
          <div className="guia-form-modal__grid">

            <div className="guia-form-modal__field">
              <label className="guia-form-modal__label">Nombre / Empresa</label>
              <input type="text" name="destinatario" className="guia-form-modal__input"
                placeholder="Nombre completo o razón social" value={form.destinatario} onChange={handleChange} />
            </div>

            <div className="guia-form-modal__field">
              <label className="guia-form-modal__label">Teléfono</label>
              <input type="tel" name="telefono_destinatario" className="guia-form-modal__input"
                placeholder="3XXXXXXXXX" value={form.telefono_destinatario} onChange={handleChange} />
            </div>

            <div className="guia-form-modal__field guia-form-modal__field--full">
              <label className="guia-form-modal__label">Dirección</label>
              <input type="text" name="direccion_destino" className="guia-form-modal__input"
                placeholder="Calle, carrera, número..." value={form.direccion_destino} onChange={handleChange} />
            </div>

            <div className="guia-form-modal__field">
              <label className="guia-form-modal__label">Ciudad</label>
              <input type="text" name="ciudad_destino" className="guia-form-modal__input"
                placeholder="Ciudad de destino" value={form.ciudad_destino} onChange={handleChange} />
            </div>

          </div>

          {/* Sección: Valores */}
          <p className="guia-form-modal__section-title">Valores y peso</p>
          <div className="guia-form-modal__grid guia-form-modal__grid--4">

            <div className="guia-form-modal__field">
              <label className="guia-form-modal__label">Unidades</label>
              <input type="number" name="unidades" className="guia-form-modal__input"
                placeholder="0" min="1" value={form.unidades} onChange={handleChange} />
            </div>

            <div className="guia-form-modal__field">
              <label className="guia-form-modal__label">Peso (kg)</label>
              <input type="number" name="peso_kg" className="guia-form-modal__input"
                placeholder="0.0" min="0" step="0.1" value={form.peso_kg} onChange={handleChange} />
            </div>

            <div className="guia-form-modal__field">
              <label className="guia-form-modal__label">Valor declarado ($)</label>
              <input type="number" name="valor_declarado" className="guia-form-modal__input"
                placeholder="0" min="0" value={form.valor_declarado} onChange={handleChange} />
            </div>

            <div className="guia-form-modal__field">
              <label className="guia-form-modal__label">Valor recaudo ($)</label>
              <input type="number" name="valor_recaudo" className="guia-form-modal__input"
                placeholder="0 si no es contraentrega" min="0" value={form.valor_recaudo} onChange={handleChange} />
            </div>

            <div className="guia-form-modal__field">
              <label className="guia-form-modal__label">Costo flete ($)</label>
              <input type="number" name="costo_flete" className="guia-form-modal__input"
                placeholder="Costo cobrado por la transportadora" min="0" value={form.costo_flete} onChange={handleChange} />
            </div>

            <div className="guia-form-modal__field">
              <label className="guia-form-modal__label">Referencia interna</label>
              <input type="text" name="referencia_interna" className="guia-form-modal__input"
                placeholder="Código interno opcional" value={form.referencia_interna} onChange={handleChange} />
            </div>

          </div>

          {/* Sección: Observaciones */}
          <div className="guia-form-modal__field guia-form-modal__field--full">
            <label className="guia-form-modal__label">Observaciones</label>
            <textarea
              name="observaciones"
              className="guia-form-modal__textarea"
              placeholder="Instrucciones de entrega, notas especiales..."
              rows={3}
              value={form.observaciones}
              onChange={handleChange}
            />
          </div>

          {/* Sección: Foto de guía */}
          <p className="guia-form-modal__section-title">Foto de la guía</p>
          <div className="guia-form-modal__foto-area">
            {fotoPreview ? (
              <div className="guia-form-modal__foto-preview">
                <img src={fotoPreview} alt="Foto de guía" className="guia-form-modal__foto-img" />
                <button type="button" className="guia-form-modal__foto-quitar" onClick={quitarFoto}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                  Quitar foto
                </button>
              </div>
            ) : (
              <div className="guia-form-modal__foto-btns">
                {/* Botón cámara */}
                <button
                  type="button"
                  className="guia-form-modal__foto-btn"
                  onClick={() => camaraInputRef.current?.click()}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  Tomar foto
                </button>
                {/* Botón archivo */}
                <button
                  type="button"
                  className="guia-form-modal__foto-btn guia-form-modal__foto-btn--secondary"
                  onClick={() => archivoInputRef.current?.click()}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                  </svg>
                  Subir archivo
                </button>
              </div>
            )}

            {/* Input cámara — capture="environment" abre cámara trasera en móvil */}
            <input
              ref={camaraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={handleFoto}
            />
            {/* Input archivo — sin capture, abre galería/explorador */}
            <input
              ref={archivoInputRef}
              type="file"
              accept="image/*,.pdf"
              style={{ display: 'none' }}
              onChange={handleFoto}
            />
          </div>

        </div>

        {/* ── Footer ── */}
        <div className="guia-form-modal__footer">
          <button type="button" className="guia-form-modal__cancel-btn" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button type="button" className="guia-form-modal__save-btn" onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <><span className="guia-form-modal__spinner" /> Guardando...</>
            ) : (
              esEdicion ? 'Guardar cambios' : 'Crear guía'
            )}
          </button>
        </div>

      </div>
    </div>
  )
}