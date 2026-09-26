import { useState, useEffect, useCallback } from 'react'
import { obtenerConfigBot, actualizarConfigBot, obtenerUsoBot, recargarSaldoBot } from '../api/botIaApi'
import { useToast } from '../hooks/useToast'
import Toast from '../components/common/Toast'
import LoadingSpinner from '../components/common/LoadingSpinner'
import './AsistenteIAPage.css'

const DIAS = [
  { key: '0', label: 'Lunes' },
  { key: '1', label: 'Martes' },
  { key: '2', label: 'Miércoles' },
  { key: '3', label: 'Jueves' },
  { key: '4', label: 'Viernes' },
  { key: '5', label: 'Sábado' },
  { key: '6', label: 'Domingo' },
]

const MAX_INSTRUCCIONES = 1500

const RANGOS = [
  { key: 'hoy', label: 'Hoy', dias: 1 },
  { key: '7d', label: 'Últimos 7 días', dias: 7 },
  { key: '30d', label: 'Últimos 30 días', dias: 30 },
]

function fechaISO(fecha) {
  return fecha.toISOString().slice(0, 10)
}

function fmtUsd(valor) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(valor || 0)
}

function fmtTokens(valor) {
  return new Intl.NumberFormat('es-CO').format(valor || 0)
}

function horaAFraccion(hhmm) {
  const [h, m] = (hhmm || '0:0').split(':').map(Number)
  return h + (m || 0) / 60
}

function fmtFechaCorta(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
}

export default function AsistenteIAPage() {
  const { toast, showToast, hideToast } = useToast()

  const [config, setConfig] = useState(null)
  const [loadingConfig, setLoadingConfig] = useState(true)
  const [guardandoEstado, setGuardandoEstado] = useState(false)
  const [horarioBorrador, setHorarioBorrador] = useState(null)
  const [guardandoHorario, setGuardandoHorario] = useState(false)

  const [rango, setRango] = useState('7d')
  const [uso, setUso] = useState(null)
  const [loadingUso, setLoadingUso] = useState(true)

  const [montoRecarga, setMontoRecarga] = useState('')
  const [recargando, setRecargando] = useState(false)

  const [instruccionesBorrador, setInstruccionesBorrador] = useState('')
  const [guardandoInstrucciones, setGuardandoInstrucciones] = useState(false)

  const cargarConfig = useCallback(async () => {
    setLoadingConfig(true)
    try {
      const data = await obtenerConfigBot()
      setConfig(data)
      setHorarioBorrador(data.horario_reglas)
      setInstruccionesBorrador(data.instrucciones_extra || '')
    } catch (e) {
      showToast(e.response?.data?.detail || 'No se pudo cargar la configuración del asistente', 'error')
    } finally {
      setLoadingConfig(false)
    }
  }, [])

  const cargarUso = useCallback(async (rangoKey) => {
    setLoadingUso(true)
    try {
      const dias = RANGOS.find((r) => r.key === rangoKey)?.dias || 7
      const hasta = new Date()
      const desde = new Date()
      desde.setDate(desde.getDate() - (dias - 1))
      const data = await obtenerUsoBot(fechaISO(desde), fechaISO(hasta))
      setUso(data)
    } catch (e) {
      showToast(e.response?.data?.detail || 'No se pudo cargar el gasto en IA', 'error')
    } finally {
      setLoadingUso(false)
    }
  }, [])

  useEffect(() => { cargarConfig() }, [cargarConfig])
  useEffect(() => { cargarUso(rango) }, [rango, cargarUso])

  const cambiarEstado = async (overrideManual) => {
    setGuardandoEstado(true)
    try {
      const data = await actualizarConfigBot({ override_manual: overrideManual })
      setConfig(data)
      showToast('Estado del asistente actualizado', 'success')
    } catch (e) {
      showToast(e.response?.data?.detail || 'No se pudo actualizar el estado', 'error')
    } finally {
      setGuardandoEstado(false)
    }
  }

  const cambiarHorarioActivo = async (activo) => {
    setGuardandoEstado(true)
    try {
      const data = await actualizarConfigBot({ horario_activo: activo })
      setConfig(data)
    } catch (e) {
      showToast(e.response?.data?.detail || 'No se pudo actualizar el horario automático', 'error')
    } finally {
      setGuardandoEstado(false)
    }
  }

  const cambiarSaldoActivo = async (activo) => {
    setGuardandoEstado(true)
    try {
      const data = await actualizarConfigBot({ saldo_activo: activo })
      setConfig(data)
    } catch (e) {
      showToast(e.response?.data?.detail || 'No se pudo actualizar el control por saldo', 'error')
    } finally {
      setGuardandoEstado(false)
    }
  }

  const handleRecargar = async () => {
    const monto = Number(montoRecarga)
    if (!monto || monto <= 0) {
      showToast('Ingresá un monto válido para recargar', 'error')
      return
    }
    setRecargando(true)
    try {
      const data = await recargarSaldoBot(monto)
      setConfig(data)
      setMontoRecarga('')
      showToast(`Se recargaron ${fmtUsd(monto)} de saldo`, 'success')
    } catch (e) {
      showToast(e.response?.data?.detail || 'No se pudo recargar el saldo', 'error')
    } finally {
      setRecargando(false)
    }
  }

  const agregarTramo = (dia) => {
    setHorarioBorrador((prev) => ({
      ...prev,
      [dia]: [...(prev[dia] || []), ['08:00', '18:00']],
    }))
  }

  const quitarTramo = (dia, index) => {
    setHorarioBorrador((prev) => ({
      ...prev,
      [dia]: prev[dia].filter((_, i) => i !== index),
    }))
  }

  const cambiarTramo = (dia, index, posicion, valor) => {
    setHorarioBorrador((prev) => ({
      ...prev,
      [dia]: prev[dia].map((tramo, i) => (i === index ? (posicion === 0 ? [valor, tramo[1]] : [tramo[0], valor]) : tramo)),
    }))
  }

  const guardarHorario = async () => {
    setGuardandoHorario(true)
    try {
      const data = await actualizarConfigBot({ horario_reglas: horarioBorrador })
      setConfig(data)
      setHorarioBorrador(data.horario_reglas)
      showToast('Horario automático guardado', 'success')
    } catch (e) {
      showToast(e.response?.data?.detail || 'No se pudo guardar el horario', 'error')
    } finally {
      setGuardandoHorario(false)
    }
  }

  const guardarInstrucciones = async () => {
    setGuardandoInstrucciones(true)
    try {
      const data = await actualizarConfigBot({ instrucciones_extra: instruccionesBorrador })
      setConfig(data)
      setInstruccionesBorrador(data.instrucciones_extra || '')
      showToast('Instrucciones guardadas', 'success')
    } catch (e) {
      showToast(e.response?.data?.detail || 'No se pudieron guardar las instrucciones', 'error')
    } finally {
      setGuardandoInstrucciones(false)
    }
  }

  const horarioModificado = config && horarioBorrador && JSON.stringify(config.horario_reglas) !== JSON.stringify(horarioBorrador)
  const instruccionesModificadas = config && instruccionesBorrador !== (config.instrucciones_extra || '')

  const maxCosto = uso ? Math.max(1e-6, ...uso.por_dia.map((d) => d.costo_usd)) : 1

  return (
    <div className="asistente-ia-page">
      <div className="asistente-ia-page__header">
        <h1 className="asistente-ia-page__title">Asistente de IA</h1>
        <span className="asistente-ia-page__subtitle">WhatsApp fuera de horario</span>
      </div>

      {/* ── Control del asistente ── */}
      <section className="asistente-ia-page__card">
        <div className="asistente-ia-page__card-header">
          <h2>Control del asistente</h2>
          {config && (
            <span className={`asistente-ia-page__estado-badge ${config.activo_ahora ? 'asistente-ia-page__estado-badge--on' : 'asistente-ia-page__estado-badge--off'}`}>
              {config.activo_ahora ? 'Activo ahora mismo' : 'Apagado ahora mismo'}
            </span>
          )}
        </div>

        {loadingConfig ? (
          <LoadingSpinner text="Cargando configuración..." />
        ) : (
          <>
            <div className="asistente-ia-page__control-block">
              <div className="asistente-ia-page__saldo-row">
                <div>
                  <p className="asistente-ia-page__control-label">Saldo prepago</p>
                  <span className="asistente-ia-page__saldo-valor">{fmtUsd(config.saldo_usd)}</span>
                </div>
                <div className="asistente-ia-page__saldo-recarga">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Monto USD"
                    value={montoRecarga}
                    onChange={(e) => setMontoRecarga(e.target.value)}
                    className="asistente-ia-page__saldo-input"
                  />
                  <button
                    type="button"
                    className="asistente-ia-page__btn-guardar"
                    disabled={recargando}
                    onClick={handleRecargar}
                  >
                    {recargando ? 'Recargando...' : 'Recargar'}
                  </button>
                </div>
              </div>

              <label className="asistente-ia-page__toggle-row">
                <span className="asistente-ia-page__control-label">Controlar por saldo</span>
                <input
                  type="checkbox"
                  checked={config.saldo_activo}
                  disabled={guardandoEstado}
                  onChange={(e) => cambiarSaldoActivo(e.target.checked)}
                />
              </label>
              <p className="asistente-ia-page__hint">
                {config.saldo_activo
                  ? 'Si el saldo llega a $0, el asistente se apaga automáticamente sin importar el estado ni el horario, hasta que se recargue de nuevo.'
                  : 'El saldo es solo informativo por ahora (no apaga el asistente). Activá el control para que apague solo al llegar a $0.'}
              </p>
              {config.saldo_activo && Number(config.saldo_usd) <= 0 && (
                <p className="asistente-ia-page__alerta">⚠ El asistente está apagado por falta de saldo.</p>
              )}
            </div>

            <div className="asistente-ia-page__control-block">
              <p className="asistente-ia-page__control-label">Estado</p>
              <div className="asistente-ia-page__segmented">
                <button
                  type="button"
                  className={`asistente-ia-page__segmented-btn ${config.override_manual == null ? 'is-active' : ''}`}
                  disabled={guardandoEstado}
                  onClick={() => cambiarEstado(null)}
                >
                  Automático
                </button>
                <button
                  type="button"
                  className={`asistente-ia-page__segmented-btn ${config.override_manual === 'on' ? 'is-active' : ''}`}
                  disabled={guardandoEstado}
                  onClick={() => cambiarEstado('on')}
                >
                  Encendido siempre
                </button>
                <button
                  type="button"
                  className={`asistente-ia-page__segmented-btn ${config.override_manual === 'off' ? 'is-active' : ''}`}
                  disabled={guardandoEstado}
                  onClick={() => cambiarEstado('off')}
                >
                  Apagado siempre
                </button>
              </div>
              <p className="asistente-ia-page__hint">
                {config.override_manual == null
                  ? 'El asistente sigue el horario automático de abajo.'
                  : config.override_manual === 'on'
                    ? 'El asistente responde siempre, sin importar el horario.'
                    : 'El asistente no responde, sin importar el horario.'}
              </p>
            </div>

            <div className="asistente-ia-page__control-block">
              <label className="asistente-ia-page__toggle-row">
                <span className="asistente-ia-page__control-label">Horario automático</span>
                <input
                  type="checkbox"
                  checked={config.horario_activo}
                  disabled={guardandoEstado}
                  onChange={(e) => cambiarHorarioActivo(e.target.checked)}
                />
              </label>
              <p className="asistente-ia-page__hint">
                Solo aplica cuando el estado está en "Automático". Editá las horas por día abajo.
              </p>

              <div className="asistente-ia-page__info-box">
                <p className="asistente-ia-page__info-box-titulo">¿Cómo funcionan los tramos?</p>
                <p>
                  Cada día puede tener uno o varios rangos de hora ("tramos") en los que el asistente
                  responde solo. Fuera de esos rangos, no contesta nada — queda para que lo atienda una persona.
                </p>
                <p>
                  <strong>Ejemplo:</strong> si un día tiene los tramos <code>00:00–06:00</code> y{' '}
                  <code>18:00–24:00</code>, el asistente está prendido de 6pm a 6am (toda la noche) y apagado
                  durante el día.
                </p>
                <p>
                  Para que esté prendido <strong>todo el día</strong>, dejá un solo tramo de{' '}
                  <code>00:00</code> a <code>23:59</code>. Para que <strong>nunca</strong> responda solo ese
                  día, borrá todos sus tramos con la <code>×</code>.
                </p>
              </div>

              <div className="asistente-ia-page__horario">
                {DIAS.map((dia) => (
                  <div key={dia.key} className="asistente-ia-page__horario-dia">
                    <span className="asistente-ia-page__horario-dia-label">{dia.label}</span>
                    <div className="asistente-ia-page__horario-tramos">
                      {(horarioBorrador?.[dia.key] || []).map((tramo, i) => (
                        <div key={i} className="asistente-ia-page__tramo">
                          <input
                            type="time"
                            value={tramo[0]}
                            onChange={(e) => cambiarTramo(dia.key, i, 0, e.target.value)}
                          />
                          <span>–</span>
                          <input
                            type="time"
                            value={tramo[1] === '24:00' ? '23:59' : tramo[1]}
                            onChange={(e) => cambiarTramo(dia.key, i, 1, e.target.value)}
                          />
                          <button type="button" className="asistente-ia-page__tramo-quitar" onClick={() => quitarTramo(dia.key, i)} title="Quitar tramo">×</button>
                        </div>
                      ))}
                      <button type="button" className="asistente-ia-page__tramo-agregar" onClick={() => agregarTramo(dia.key)}>+ Agregar tramo</button>
                    </div>
                    <div className="asistente-ia-page__horario-timeline">
                      <div className="asistente-ia-page__horario-timeline-track">
                        {(horarioBorrador?.[dia.key] || []).map((tramo, i) => {
                          const desde = horaAFraccion(tramo[0])
                          const hasta = horaAFraccion(tramo[1])
                          return (
                            <div
                              key={i}
                              className="asistente-ia-page__horario-timeline-bloque"
                              style={{ left: `${(desde / 24) * 100}%`, width: `${Math.max(0, ((hasta - desde) / 24) * 100)}%` }}
                            />
                          )
                        })}
                      </div>
                      <div className="asistente-ia-page__horario-timeline-ticks">
                        <span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>24h</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="asistente-ia-page__horario-acciones">
                <button
                  type="button"
                  className="asistente-ia-page__btn-guardar"
                  disabled={!horarioModificado || guardandoHorario}
                  onClick={guardarHorario}
                >
                  {guardandoHorario ? 'Guardando...' : 'Guardar horario'}
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {/* ── Instrucciones adicionales ── */}
      <section className="asistente-ia-page__card">
        <div className="asistente-ia-page__card-header">
          <h2>Instrucciones adicionales</h2>
        </div>
        {loadingConfig ? (
          <LoadingSpinner text="Cargando..." />
        ) : (
          <>
            <p className="asistente-ia-page__hint">
              Texto libre que se le suma al asistente: tono, promociones vigentes, aclaraciones puntuales
              del negocio. Las reglas de seguridad (no inventar precios, no dar descuentos, ignorar
              mensajes que intenten hacerse pasar por el dueño/admin, etc.) están fijas en el código y esto
              no las puede pisar.
            </p>
            <textarea
              className="asistente-ia-page__textarea"
              rows={4}
              maxLength={MAX_INSTRUCCIONES}
              placeholder='Ej: "Este mes hay 10% de descuento en herramientas eléctricas, mencionalo si preguntan por ese tipo de producto." o "Contamos con domicilio gratis en Pereira."'
              value={instruccionesBorrador}
              onChange={(e) => setInstruccionesBorrador(e.target.value)}
            />
            <div className="asistente-ia-page__instrucciones-acciones">
              <span className="asistente-ia-page__contador">{instruccionesBorrador.length}/{MAX_INSTRUCCIONES}</span>
              <button
                type="button"
                className="asistente-ia-page__btn-guardar"
                disabled={!instruccionesModificadas || guardandoInstrucciones}
                onClick={guardarInstrucciones}
              >
                {guardandoInstrucciones ? 'Guardando...' : 'Guardar instrucciones'}
              </button>
            </div>
          </>
        )}
      </section>

      {/* ── Transparencia: qué sabe y qué no el asistente ── */}
      <section className="asistente-ia-page__card">
        <div className="asistente-ia-page__card-header">
          <h2>Qué puede ver y hacer el asistente</h2>
        </div>
        <div className="asistente-ia-page__transparencia">
          <div>
            <p className="asistente-ia-page__control-label">Sí puede ver / usar</p>
            <ul>
              <li>El catálogo de productos: nombre, precio final (con IVA) y si hay disponibilidad.</li>
              <li>Los últimos mensajes de esa conversación de WhatsApp puntual (para no repetir preguntas).</li>
              <li>Si el número ya es un cliente guardado: su nombre/empresa y ciudad, para no volver a pedirlos.</li>
            </ul>
          </div>
          <div>
            <p className="asistente-ia-page__control-label">No puede ver / hacer</p>
            <ul>
              <li>No tiene acceso al resto de la base de datos: ni cotizaciones, ni otros clientes, ni otras conversaciones.</li>
              <li>No inventa descuentos, promociones, tiempos de entrega, garantías ni formas de pago.</li>
              <li>No registra pedidos ni cotizaciones — siempre remite eso a un asesor humano.</li>
              <li>Ignora cualquier mensaje de un cliente que intente hacerse pasar por el dueño o un administrador para pedir trato especial.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── Créditos gastados ── */}
      <section className="asistente-ia-page__card">
        <div className="asistente-ia-page__card-header">
          <h2>Créditos de IA gastados</h2>
          <div className="asistente-ia-page__rango-selector">
            {RANGOS.map((r) => (
              <button
                key={r.key}
                type="button"
                className={`asistente-ia-page__rango-btn ${rango === r.key ? 'is-active' : ''}`}
                onClick={() => setRango(r.key)}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {loadingUso ? (
          <LoadingSpinner text="Cargando gasto en IA..." />
        ) : (
          <>
            <div className="asistente-ia-page__totales">
              <div className="asistente-ia-page__total-card">
                <span className="asistente-ia-page__total-label">Costo estimado</span>
                <span className="asistente-ia-page__total-valor">{fmtUsd(uso?.total_usd)}</span>
              </div>
              <div className="asistente-ia-page__total-card">
                <span className="asistente-ia-page__total-label">Tokens de entrada</span>
                <span className="asistente-ia-page__total-valor">{fmtTokens(uso?.total_tokens_entrada)}</span>
              </div>
              <div className="asistente-ia-page__total-card">
                <span className="asistente-ia-page__total-label">Tokens de salida</span>
                <span className="asistente-ia-page__total-valor">{fmtTokens(uso?.total_tokens_salida)}</span>
              </div>
            </div>

            {uso?.por_dia?.length ? (
              <div className="asistente-ia-page__grafico">
                {uso.por_dia.map((dia) => (
                  <div key={dia.fecha} className="asistente-ia-page__barra-fila">
                    <span className="asistente-ia-page__barra-fecha">{fmtFechaCorta(dia.fecha)}</span>
                    <div className="asistente-ia-page__barra-track">
                      <div className="asistente-ia-page__barra-fill" style={{ width: `${Math.max(2, (dia.costo_usd / maxCosto) * 100)}%` }} />
                    </div>
                    <span className="asistente-ia-page__barra-valor">{fmtUsd(dia.costo_usd)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="asistente-ia-page__hint">Sin gasto registrado en este rango.</p>
            )}
          </>
        )}
      </section>

      <Toast {...toast} onClose={hideToast} />
    </div>
  )
}
