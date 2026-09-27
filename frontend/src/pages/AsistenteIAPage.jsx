import { useState, useEffect, useCallback, useRef } from 'react'
import { obtenerConfigBot, actualizarConfigBot, cambiarOverrideLineaBot, obtenerUsoBot, recargarSaldoBot } from '../api/botIaApi'
import { useToast } from '../hooks/useToast'
import Toast from '../components/common/Toast'
import LoadingSpinner from '../components/common/LoadingSpinner'
import './AsistenteIAPage.css'

// Un día puede tener varios rangos horarios (ej: de noche Y en el horario
// de almuerzo). Se define directamente la hora en la que EL ASISTENTE
// responde (no el horario de atención invertido) -- si "desde" es más
// tarde que "hasta" en un rango, se entiende que cruza la medianoche (ej:
// desde 18:00 hasta 06:00). De ahí se calculan los tramos reales que se
// guardan en `horario_reglas`.
const GRUPOS_HORARIO = [
  { key: '0', dias: ['0'], label: 'Lunes' },
  { key: '1', dias: ['1'], label: 'Martes' },
  { key: '2', dias: ['2'], label: 'Miércoles' },
  { key: '3', dias: ['3'], label: 'Jueves' },
  { key: '4', dias: ['4'], label: 'Viernes' },
  { key: '5', dias: ['5'], label: 'Sábado' },
  { key: '6', dias: ['6'], label: 'Domingo' },
]

const RANGO_POR_DEFECTO = ['18:00', '06:00']

function tramosDeGrupo({ todoElDia, rangos }) {
  if (todoElDia) return [['00:00', '24:00']]
  const tramos = []
  for (const [desde, hasta] of rangos || []) {
    if (!desde || !hasta || desde === hasta) continue
    if (desde <= hasta) tramos.push([desde, hasta])
    else tramos.push(['00:00', hasta], [desde, '24:00']) // cruza medianoche
  }
  return tramos
}

// Inverso: a partir de los tramos guardados, reconstruye la lista de
// rangos "desde/hasta" para mostrarlos. Un par de tramos "00:00-X" y
// "Y-24:00" se junta de nuevo en un solo rango que cruza la medianoche;
// cualquier otro tramo se muestra como un rango independiente (ej. el de
// almuerzo). Si no calza con ningún patrón conocido, usa un default.
function grupoDesdeTramos(tramos) {
  if (!tramos || tramos.length === 0) {
    return { todoElDia: false, rangos: [RANGO_POR_DEFECTO] }
  }
  if (tramos.length === 1 && tramos[0][0] === '00:00' && tramos[0][1] === '24:00') {
    return { todoElDia: true, rangos: [RANGO_POR_DEFECTO] }
  }

  const iCola = tramos.findIndex((t) => t[0] === '00:00')
  const iCabeza = tramos.findIndex((t) => t[1] === '24:00')
  const rangos = []
  if (iCola !== -1 && iCabeza !== -1 && iCola !== iCabeza) {
    rangos.push([tramos[iCabeza][0], tramos[iCola][1]])
    tramos.forEach((t, i) => { if (i !== iCola && i !== iCabeza) rangos.push([t[0], t[1]]) })
  } else {
    tramos.forEach((t) => rangos.push([t[0], t[1]]))
  }
  return { todoElDia: false, rangos: rangos.length ? rangos : [RANGO_POR_DEFECTO] }
}

function horarioSimpleDesdeReglas(reglas) {
  const simple = {}
  GRUPOS_HORARIO.forEach((g) => { simple[g.key] = grupoDesdeTramos(reglas?.[g.dias[0]]) })
  return simple
}

function reglasDesdeHorarioSimple(simple) {
  const reglas = {}
  GRUPOS_HORARIO.forEach((g) => {
    const tramos = tramosDeGrupo(simple[g.key])
    g.dias.forEach((dia) => { reglas[dia] = tramos })
  })
  return reglas
}

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

function fmtFechaCorta(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
}

function etiquetaEstadoLineas(lineas) {
  if (!lineas?.length) return ''
  const activas = lineas.filter((l) => l.activo_ahora).length
  if (activas === lineas.length) return 'Activo ahora mismo'
  if (activas === 0) return 'Apagado ahora mismo'
  return `Activo en ${activas} de ${lineas.length} líneas`
}

export default function AsistenteIAPage() {
  const { toast, showToast, hideToast } = useToast()

  const [config, setConfig] = useState(null)
  const [loadingConfig, setLoadingConfig] = useState(true)
  const [guardandoEstado, setGuardandoEstado] = useState(false)
  const [horarioSimple, setHorarioSimple] = useState(null)
  const [guardandoHorario, setGuardandoHorario] = useState(false)

  const [mostrarLineas, setMostrarLineas] = useState(false)
  const [guardandoLinea, setGuardandoLinea] = useState(null)
  const estadoRef = useRef(null)

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
      setHorarioSimple(horarioSimpleDesdeReglas(data.horario_reglas))
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

  useEffect(() => {
    if (!mostrarLineas) return
    const cerrarSiEsAfuera = (e) => {
      if (estadoRef.current && !estadoRef.current.contains(e.target)) setMostrarLineas(false)
    }
    document.addEventListener('mousedown', cerrarSiEsAfuera)
    return () => document.removeEventListener('mousedown', cerrarSiEsAfuera)
  }, [mostrarLineas])

  const cambiarLineaApagada = async (lineaId, apagada) => {
    setGuardandoLinea(lineaId)
    try {
      const data = await cambiarOverrideLineaBot(lineaId, apagada)
      setConfig(data)
    } catch (e) {
      showToast(e.response?.data?.detail || 'No se pudo actualizar la línea', 'error')
    } finally {
      setGuardandoLinea(null)
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

  const cambiarGrupoHorario = (grupo, campo, valor) => {
    setHorarioSimple((prev) => ({
      ...prev,
      [grupo]: { ...prev[grupo], [campo]: valor },
    }))
  }

  const cambiarRango = (grupo, index, posicion, valor) => {
    setHorarioSimple((prev) => ({
      ...prev,
      [grupo]: {
        ...prev[grupo],
        rangos: prev[grupo].rangos.map((r, i) => (i === index ? (posicion === 0 ? [valor, r[1]] : [r[0], valor]) : r)),
      },
    }))
  }

  const agregarRango = (grupo) => {
    setHorarioSimple((prev) => ({
      ...prev,
      [grupo]: { ...prev[grupo], rangos: [...prev[grupo].rangos, ['12:00', '14:00']] },
    }))
  }

  const quitarRango = (grupo, index) => {
    setHorarioSimple((prev) => ({
      ...prev,
      [grupo]: { ...prev[grupo], rangos: prev[grupo].rangos.filter((_, i) => i !== index) },
    }))
  }

  const guardarHorario = async () => {
    setGuardandoHorario(true)
    try {
      const data = await actualizarConfigBot({ horario_reglas: reglasDesdeHorarioSimple(horarioSimple) })
      setConfig(data)
      setHorarioSimple(horarioSimpleDesdeReglas(data.horario_reglas))
      showToast('Horario guardado', 'success')
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

  const horarioModificado = config && horarioSimple && JSON.stringify(config.horario_reglas) !== JSON.stringify(reglasDesdeHorarioSimple(horarioSimple))
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
            <div className="asistente-ia-page__estado-wrap" ref={estadoRef}>
              <button
                type="button"
                className={`asistente-ia-page__estado-badge asistente-ia-page__estado-badge--btn ${
                  config.lineas.every((l) => l.activo_ahora)
                    ? 'asistente-ia-page__estado-badge--on'
                    : config.lineas.every((l) => !l.activo_ahora)
                      ? 'asistente-ia-page__estado-badge--off'
                      : 'asistente-ia-page__estado-badge--mixto'
                }`}
                onClick={() => setMostrarLineas((v) => !v)}
              >
                {etiquetaEstadoLineas(config.lineas)}
              </button>
              {mostrarLineas && (
                <div className="asistente-ia-page__estado-popover">
                  <p className="asistente-ia-page__estado-popover-titulo">Apagar manualmente</p>
                  {config.lineas.map((linea) => (
                    <label key={linea.id} className="asistente-ia-page__estado-popover-linea">
                      <span>
                        {linea.nombre}
                        {!linea.apagada_manual && !linea.activo_ahora && (
                          <span className="asistente-ia-page__estado-popover-hint"> (fuera de horario)</span>
                        )}
                      </span>
                      <input
                        type="checkbox"
                        checked={linea.apagada_manual}
                        disabled={guardandoLinea === linea.id}
                        onChange={(e) => cambiarLineaApagada(linea.id, e.target.checked)}
                      />
                    </label>
                  ))}
                </div>
              )}
            </div>
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

              <p className="asistente-ia-page__hint">
                Si el saldo llega a $0, el asistente se apaga automáticamente en todas las líneas sin
                importar el horario, hasta que se recargue de nuevo.
              </p>
              {Number(config.saldo_usd) <= 0 && (
                <p className="asistente-ia-page__alerta">⚠ El asistente está apagado por falta de saldo.</p>
              )}
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
                Solo aplica cuando este interruptor está prendido. Definí desde y hasta qué hora responde
                el asistente solo, día por día -- podés agregar más de un rango (ej. la hora del almuerzo).
              </p>

              <div className="asistente-ia-page__horario">
                {horarioSimple && GRUPOS_HORARIO.map((grupo) => {
                  const valor = horarioSimple[grupo.key]
                  return (
                    <div key={grupo.key} className="asistente-ia-page__horario-dia">
                      <span className="asistente-ia-page__horario-dia-label">{grupo.label}</span>

                      {!valor.todoElDia ? (
                        <div className="asistente-ia-page__horario-horas">
                          {valor.rangos.map((rango, i) => (
                            <div key={i} className="asistente-ia-page__horario-rango">
                              <input
                                type="time"
                                value={rango[0]}
                                onChange={(e) => cambiarRango(grupo.key, i, 0, e.target.value)}
                              />
                              <span>–</span>
                              <input
                                type="time"
                                value={rango[1] === '24:00' ? '23:59' : rango[1]}
                                onChange={(e) => cambiarRango(grupo.key, i, 1, e.target.value)}
                              />
                              {valor.rangos.length > 1 && (
                                <button
                                  type="button"
                                  className="asistente-ia-page__horario-rango-quitar"
                                  onClick={() => quitarRango(grupo.key, i)}
                                  title="Quitar rango"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          ))}
                          <button
                            type="button"
                            className="asistente-ia-page__horario-rango-agregar"
                            onClick={() => agregarRango(grupo.key)}
                            title="Agregar otro rango"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <span className="asistente-ia-page__horario-todo-el-dia-texto">Todo el día</span>
                      )}

                      <label className="asistente-ia-page__horario-cerrado">
                        <input
                          type="checkbox"
                          checked={valor.todoElDia}
                          onChange={(e) => cambiarGrupoHorario(grupo.key, 'todoElDia', e.target.checked)}
                        />
                        Todo el día
                      </label>
                    </div>
                  )
                })}
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

            <div className="asistente-ia-page__control-block">
              <p className="asistente-ia-page__control-label">Instrucciones adicionales</p>
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
            </div>
          </>
        )}
      </section>

      {/* ── Reporte: cuánto se ha gastado en el asistente ── */}
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
