import { useState, useEffect, useMemo, useCallback } from 'react'
import { listarPlantillas, crearPlantilla, sincronizarPlantillas } from '../../api/whatsappApi'
import './PlantillasModal.css'

const CATEGORIAS = [
  { value: 'UTILITY', label: 'Utilidad' },
  { value: 'MARKETING', label: 'Marketing' },
]
const IDIOMAS = [
  { value: 'es', label: 'Español' },
  { value: 'en_US', label: 'English (US)' },
]
const TIPOS_BOTON = [
  { value: 'QUICK_REPLY', label: 'Respuesta rápida' },
  { value: 'URL', label: 'Enlace (URL)' },
  { value: 'PHONE_NUMBER', label: 'Llamar (teléfono)' },
]
const ESTADOS = {
  APPROVED: { label: 'Aprobada', clase: 'ok' },
  PENDING: { label: 'En revisión', clase: 'pend' },
  REJECTED: { label: 'Rechazada', clase: 'rech' },
}
const FORMATOS_HEADER_NO_SOPORTADOS = ['IMAGE', 'VIDEO', 'DOCUMENT']

// ─── Helpers ──────────────────────────────────────────────────────────────────
const componente = (plantilla, tipo) => (plantilla?.components || []).find((c) => c.type === tipo)

function variables(texto) {
  if (!texto) return []
  const nums = [...texto.matchAll(/\{\{(\d+)\}\}/g)].map((m) => parseInt(m[1], 10))
  return [...new Set(nums)].sort((a, b) => a - b)
}

const rellenar = (texto, valores) =>
  (texto || '').replace(/\{\{(\d+)\}\}/g, (_, n) => valores[n]?.trim() || `{{${n}}}`)

function esEnviable(p) {
  if (p.status !== 'APPROVED') return false
  const header = componente(p, 'HEADER')
  if (header && FORMATOS_HEADER_NO_SOPORTADOS.includes(header.format)) return false
  return !(p.components || []).some((c) => c.type === 'CAROUSEL')
}

const botonVacio = () => ({ type: 'QUICK_REPLY', text: '', value: '' })

// ─── Vista previa (burbuja estilo WhatsApp) ──────────────────────────────────
function PlantillaPreview({ header, body, footer, botones }) {
  return (
    <div className="ptm-preview">
      <div className="ptm-preview__bubble">
        {header && <div className="ptm-preview__header">{header}</div>}
        {body
          ? <div className="ptm-preview__body">{body}</div>
          : <div className="ptm-preview__vacio">El texto del mensaje aparecerá aquí…</div>}
        {footer && <div className="ptm-preview__footer">{footer}</div>}
      </div>
      {botones?.length > 0 && (
        <div className="ptm-preview__botones">
          {botones.map((b, i) => (
            <div key={i} className="ptm-preview__boton">
              {b.type === 'URL' && '↗ '}
              {b.type === 'PHONE_NUMBER' && '☎ '}
              {b.text || `Botón ${i + 1}`}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────
// lineaId: línea elegida (GERENCIA/ADMIN); el backend la ignora para vendedores.
// onEnviar: async ({templateName, language, components, previewText}) => {success, error}
export default function PlantillasModal({ lineaId, lineaNombre, onEnviar, onClose }) {
  const [vista, setVista] = useState('lista') // 'lista' | 'detalle' | 'crear'
  const [plantillas, setPlantillas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [sincronizando, setSincronizando] = useState(false)

  const [sel, setSel] = useState(null)
  const [valHeader, setValHeader] = useState({})
  const [valBody, setValBody] = useState({})
  const [enviando, setEnviando] = useState(false)
  const [errorEnvio, setErrorEnvio] = useState(null)

  const [nombre, setNombre] = useState('')
  const [categoria, setCategoria] = useState('UTILITY')
  const [idioma, setIdioma] = useState('es')
  const [conHeader, setConHeader] = useState(false)
  const [textoHeader, setTextoHeader] = useState('')
  const [ejHeader, setEjHeader] = useState({})
  const [textoBody, setTextoBody] = useState('')
  const [ejBody, setEjBody] = useState({})
  const [conFooter, setConFooter] = useState(false)
  const [textoFooter, setTextoFooter] = useState('')
  const [botones, setBotones] = useState([])
  const [creando, setCreando] = useState(false)
  const [errorCrear, setErrorCrear] = useState(null)

  // El estado de carga inicial es `true`; quien recargue lo activa antes de llamar.
  const cargar = useCallback(async () => {
    try {
      setPlantillas(await listarPlantillas(lineaId))
      setError(null)
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudieron cargar las plantillas.')
    } finally {
      setCargando(false)
    }
  }, [lineaId])

  useEffect(() => {
    let activo = true
    listarPlantillas(lineaId)
      .then((data) => { if (activo) setPlantillas(data) })
      .catch((err) => { if (activo) setError(err.response?.data?.detail || 'No se pudieron cargar las plantillas.') })
      .finally(() => { if (activo) setCargando(false) })
    return () => { activo = false }
  }, [lineaId])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return q ? plantillas.filter((p) => p.name.toLowerCase().includes(q)) : plantillas
  }, [plantillas, busqueda])

  const handleSincronizar = async () => {
    setSincronizando(true)
    try {
      await sincronizarPlantillas(lineaId)
      setCargando(true)
      await cargar()
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudo sincronizar con Meta.')
    } finally {
      setSincronizando(false)
    }
  }

  // ── Detalle / envío ──
  const headerSel = componente(sel, 'HEADER')
  const bodySel = componente(sel, 'BODY')
  const footerSel = componente(sel, 'FOOTER')
  const botonesSel = componente(sel, 'BUTTONS')?.buttons || []
  const varsHeaderSel = useMemo(() => variables(headerSel?.text), [headerSel])
  const varsBodySel = useMemo(() => variables(bodySel?.text), [bodySel])
  const faltan = [...varsHeaderSel.filter((n) => !valHeader[n]?.trim()), ...varsBodySel.filter((n) => !valBody[n]?.trim())].length > 0

  const abrirDetalle = (p) => {
    setSel(p)
    setValHeader({})
    setValBody({})
    setErrorEnvio(null)
    setVista('detalle')
  }

  const handleEnviar = async () => {
    const components = []
    if (varsHeaderSel.length) {
      components.push({ type: 'header', parameters: varsHeaderSel.map((n) => ({ type: 'text', text: valHeader[n].trim() })) })
    }
    if (varsBodySel.length) {
      components.push({ type: 'body', parameters: varsBodySel.map((n) => ({ type: 'text', text: valBody[n].trim() })) })
    }
    const previewText = [
      headerSel?.text && rellenar(headerSel.text, valHeader),
      bodySel?.text && rellenar(bodySel.text, valBody),
    ].filter(Boolean).join('\n\n')

    setEnviando(true)
    setErrorEnvio(null)
    const res = await onEnviar({ templateName: sel.name, language: sel.language, components, previewText })
    setEnviando(false)
    if (res?.success) onClose()
    else setErrorEnvio(res?.error || 'No se pudo enviar la plantilla.')
  }

  // ── Creación ──
  const varsHeaderNueva = useMemo(() => variables(textoHeader), [textoHeader])
  const varsBodyNueva = useMemo(() => variables(textoBody), [textoBody])

  const abrirCrear = () => {
    setNombre(''); setCategoria('UTILITY'); setIdioma('es')
    setConHeader(false); setTextoHeader(''); setEjHeader({})
    setTextoBody(''); setEjBody({})
    setConFooter(false); setTextoFooter(''); setBotones([])
    setErrorCrear(null)
    setVista('crear')
  }

  const actualizarBoton = (i, patch) => setBotones((prev) => prev.map((b, j) => (j === i ? { ...b, ...patch } : b)))

  const handleCrear = async () => {
    setErrorCrear(null)
    const n = nombre.trim()
    if (!n) return setErrorCrear('El nombre es obligatorio.')
    if (!/^[a-z0-9_]+$/.test(n)) return setErrorCrear('El nombre solo admite minúsculas, números y guion bajo (ej: seguimiento_cotizacion).')
    if (!textoBody.trim()) return setErrorCrear('El texto del mensaje es obligatorio.')
    if (conHeader && varsHeaderNueva.length > 1) return setErrorCrear('El encabezado admite una sola variable ({{1}}).')
    if (conHeader && varsHeaderNueva.some((v) => !ejHeader[v]?.trim())) return setErrorCrear('Completa el ejemplo de la variable del encabezado.')
    if (varsBodyNueva.some((v) => !ejBody[v]?.trim())) return setErrorCrear('Completa el ejemplo de cada variable del mensaje.')
    for (const b of botones) {
      if (!b.text.trim()) return setErrorCrear('Todos los botones necesitan texto.')
      if (b.type !== 'QUICK_REPLY' && !b.value.trim()) return setErrorCrear(b.type === 'URL' ? 'Los botones de enlace necesitan una URL.' : 'Los botones de llamada necesitan un teléfono.')
    }

    const components = []
    if (conHeader && textoHeader.trim()) {
      const h = { type: 'HEADER', format: 'TEXT', text: textoHeader.trim() }
      if (varsHeaderNueva.length) h.example = { header_text: varsHeaderNueva.map((v) => ejHeader[v].trim()) }
      components.push(h)
    }
    const b = { type: 'BODY', text: textoBody.trim() }
    if (varsBodyNueva.length) b.example = { body_text: [varsBodyNueva.map((v) => ejBody[v].trim())] }
    components.push(b)
    if (conFooter && textoFooter.trim()) components.push({ type: 'FOOTER', text: textoFooter.trim() })
    if (botones.length) {
      components.push({
        type: 'BUTTONS',
        buttons: botones.map((x) => {
          if (x.type === 'URL') return { type: 'URL', text: x.text.trim(), url: x.value.trim() }
          if (x.type === 'PHONE_NUMBER') return { type: 'PHONE_NUMBER', text: x.text.trim(), phone_number: x.value.trim() }
          return { type: 'QUICK_REPLY', text: x.text.trim() }
        }),
      })
    }

    setCreando(true)
    try {
      await crearPlantilla(lineaId, { name: n, language: idioma, category: categoria, components })
      setCargando(true)
      await cargar()
      setVista('lista')
    } catch (err) {
      setErrorCrear(err.response?.data?.detail || 'Meta rechazó la plantilla. Revisa el contenido.')
    } finally {
      setCreando(false)
    }
  }

  const titulo = vista === 'lista' ? 'Plantillas de WhatsApp' : vista === 'crear' ? 'Nueva plantilla' : sel?.name

  return (
    <div className="ptm-overlay" onClick={onClose}>
      <div className={`ptm-modal${vista === 'crear' ? ' ptm-modal--ancho' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="ptm-header">
          <span className="ptm-header__titulo">{titulo}</span>
          <div className="ptm-header__acciones">
            {vista === 'lista' && (
              <>
                <button type="button" className="wap-btn wap-btn--ghost" onClick={handleSincronizar} disabled={sincronizando} title="Traer el estado actualizado desde Meta">
                  {sincronizando ? 'Sincronizando...' : 'Sincronizar'}
                </button>
                <button type="button" className="wap-btn wap-btn--primary" onClick={abrirCrear}>+ Crear</button>
              </>
            )}
            {vista !== 'lista' && (
              <button type="button" className="wap-btn wap-btn--ghost" onClick={() => setVista('lista')}>← Volver</button>
            )}
            <button type="button" className="wap-btn wap-btn--ghost" onClick={onClose} aria-label="Cerrar">✕</button>
          </div>
        </div>

        <div className="ptm-body">
          {vista === 'lista' && (
            <>
              {lineaNombre && <div className="ptm-linea">Línea: <strong>{lineaNombre}</strong></div>}
              <input className="ptm-input" placeholder="Buscar plantilla..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
              {cargando && <div className="ptm-vacio">Cargando plantillas...</div>}
              {error && <div className="ptm-error">{error}</div>}
              {!cargando && !error && filtradas.length === 0 && (
                <div className="ptm-vacio">
                  {plantillas.length === 0 ? 'Esta línea aún no tiene plantillas. Crea la primera con "+ Crear".' : 'Ninguna plantilla coincide.'}
                </div>
              )}
              {filtradas.map((p) => {
                const estado = ESTADOS[p.status] || { label: p.status, clase: 'pend' }
                const enviable = esEnviable(p)
                return (
                  <button key={p.id} type="button" className={`ptm-item${enviable ? '' : ' ptm-item--off'}`} onClick={() => enviable && abrirDetalle(p)}>
                    <div className="ptm-item__top">
                      <strong>{p.name}</strong>
                      <span className={`ptm-estado ptm-estado--${estado.clase}`}>{estado.label}</span>
                    </div>
                    <div className="ptm-item__texto">{componente(p, 'BODY')?.text || ''}</div>
                    {p.status === 'APPROVED' && !enviable && (
                      <div className="ptm-item__nota">No disponible aún (requiere imagen, video, documento o carrusel)</div>
                    )}
                  </button>
                )
              })}
            </>
          )}

          {vista === 'detalle' && sel && (
            <>
              <PlantillaPreview
                header={headerSel?.text && rellenar(headerSel.text, valHeader)}
                body={rellenar(bodySel?.text, valBody)}
                footer={footerSel?.text}
                botones={botonesSel}
              />
              {(varsHeaderSel.length > 0 || varsBodySel.length > 0) && (
                <div className="ptm-campos">
                  {varsHeaderSel.map((n) => (
                    <label key={`h${n}`} className="ptm-campo">
                      <span>Encabezado — variable {n}</span>
                      <input className="ptm-input" value={valHeader[n] || ''} onChange={(e) => setValHeader((p) => ({ ...p, [n]: e.target.value }))} />
                    </label>
                  ))}
                  {varsBodySel.map((n) => (
                    <label key={`b${n}`} className="ptm-campo">
                      <span>Variable {n}</span>
                      <input className="ptm-input" value={valBody[n] || ''} onChange={(e) => setValBody((p) => ({ ...p, [n]: e.target.value }))} />
                    </label>
                  ))}
                </div>
              )}
              {errorEnvio && <div className="ptm-error">{errorEnvio}</div>}
            </>
          )}

          {vista === 'crear' && (
            <div className="ptm-crear">
              <div className="ptm-crear__preview">
                <span className="ptm-etiqueta">Vista previa</span>
                <PlantillaPreview
                  header={conHeader && textoHeader ? rellenar(textoHeader, ejHeader) : null}
                  body={rellenar(textoBody, ejBody)}
                  footer={conFooter ? textoFooter : null}
                  botones={botones}
                />
              </div>

              <div className="ptm-crear__form">
                {errorCrear && <div className="ptm-error">{errorCrear}</div>}

                <label className="ptm-campo">
                  <span>Nombre (minúsculas, sin espacios)</span>
                  <input className="ptm-input" placeholder="ej: seguimiento_cotizacion" value={nombre}
                    onChange={(e) => setNombre(e.target.value.toLowerCase().replace(/\s+/g, '_'))} />
                </label>

                <div className="ptm-fila">
                  <label className="ptm-campo">
                    <span>Categoría</span>
                    <select className="ptm-input" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                      {CATEGORIAS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </label>
                  <label className="ptm-campo">
                    <span>Idioma</span>
                    <select className="ptm-input" value={idioma} onChange={(e) => setIdioma(e.target.value)}>
                      {IDIOMAS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                    </select>
                  </label>
                </div>

                <div className="ptm-campo">
                  <label className="ptm-check"><input type="checkbox" checked={conHeader} onChange={(e) => setConHeader(e.target.checked)} /> Encabezado (opcional)</label>
                  {conHeader && (
                    <>
                      <input className="ptm-input" maxLength={60} placeholder="ej: Tu cotización {{1}}" value={textoHeader} onChange={(e) => setTextoHeader(e.target.value)} />
                      {varsHeaderNueva.map((n) => (
                        <input key={n} className="ptm-input" placeholder={`Ejemplo para {{${n}}} — ej: COT-0012`} value={ejHeader[n] || ''}
                          onChange={(e) => setEjHeader((p) => ({ ...p, [n]: e.target.value }))} />
                      ))}
                    </>
                  )}
                </div>

                <div className="ptm-campo">
                  <span>Texto del mensaje (usa {'{{1}}'}, {'{{2}}'}… para variables)</span>
                  <textarea className="ptm-input" rows={4} placeholder="Hola {{1}}, te escribimos de Electromanfer…" value={textoBody} onChange={(e) => setTextoBody(e.target.value)} />
                  {varsBodyNueva.map((n) => (
                    <input key={n} className="ptm-input" placeholder={`Ejemplo para {{${n}}} — ej: Juan`} value={ejBody[n] || ''}
                      onChange={(e) => setEjBody((p) => ({ ...p, [n]: e.target.value }))} />
                  ))}
                </div>

                <div className="ptm-campo">
                  <label className="ptm-check"><input type="checkbox" checked={conFooter} onChange={(e) => setConFooter(e.target.checked)} /> Pie de página (opcional)</label>
                  {conFooter && <input className="ptm-input" maxLength={60} placeholder="ej: Electromanfer" value={textoFooter} onChange={(e) => setTextoFooter(e.target.value)} />}
                </div>

                <div className="ptm-campo">
                  <div className="ptm-fila ptm-fila--between">
                    <span>Botones (opcional, máx. 3)</span>
                    {botones.length < 3 && <button type="button" className="ptm-link" onClick={() => setBotones((p) => [...p, botonVacio()])}>+ Agregar botón</button>}
                  </div>
                  {botones.map((b, i) => (
                    <div key={i} className="ptm-boton">
                      <div className="ptm-fila">
                        <select className="ptm-input" value={b.type} onChange={(e) => actualizarBoton(i, { type: e.target.value, value: '' })}>
                          {TIPOS_BOTON.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                        <button type="button" className="ptm-link ptm-link--danger" onClick={() => setBotones((p) => p.filter((_, j) => j !== i))} aria-label="Quitar botón">Quitar</button>
                      </div>
                      <input className="ptm-input" maxLength={25} placeholder="Texto del botón" value={b.text} onChange={(e) => actualizarBoton(i, { text: e.target.value })} />
                      {b.type === 'URL' && <input className="ptm-input" placeholder="https://..." value={b.value} onChange={(e) => actualizarBoton(i, { value: e.target.value })} />}
                      {b.type === 'PHONE_NUMBER' && <input className="ptm-input" placeholder="+573001234567" value={b.value} onChange={(e) => actualizarBoton(i, { value: e.target.value })} />}
                    </div>
                  ))}
                </div>

                <p className="ptm-nota">Meta revisa cada plantilla antes de aprobarla; hasta entonces no se puede enviar. Usa "Sincronizar" para ver su estado.</p>
              </div>
            </div>
          )}
        </div>

        {vista === 'detalle' && (
          <div className="ptm-footer">
            <button type="button" className="wap-btn wap-btn--ghost" onClick={() => setVista('lista')}>Cancelar</button>
            <button type="button" className="wap-btn wap-btn--primary" onClick={handleEnviar} disabled={enviando || faltan}>
              {enviando ? 'Enviando...' : 'Enviar plantilla'}
            </button>
          </div>
        )}
        {vista === 'crear' && (
          <div className="ptm-footer">
            <button type="button" className="wap-btn wap-btn--ghost" onClick={() => setVista('lista')}>Cancelar</button>
            <button type="button" className="wap-btn wap-btn--primary" onClick={handleCrear} disabled={creando}>
              {creando ? 'Enviando a Meta...' : 'Crear plantilla'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
