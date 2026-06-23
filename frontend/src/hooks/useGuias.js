import { useState, useCallback } from 'react'
import {
  getGuias,
  getGuia,
  crearGuia,
  editarGuia,
  cambiarEstadoGuia,
  getMetricasGuias,
  getConsolidado,
} from '../api/guiasApi'

export function useGuias() {
  const [guias, setGuias] = useState([])
  const [guiaActual, setGuiaActual] = useState(null)
  const [metricas, setMetricas] = useState(null)
  const [consolidado, setConsolidado] = useState([])

  const [loadingLista, setLoadingLista] = useState(false)
  const [loadingDetalle, setLoadingDetalle] = useState(false)
  const [loadingGuardar, setLoadingGuardar] = useState(false)
  const [loadingEstado, setLoadingEstado] = useState(false)
  const [loadingMetricas, setLoadingMetricas] = useState(false)
  const [loadingConsolidado, setLoadingConsolidado] = useState(false)

  const [error, setError] = useState(null)

  // ─── Limpiar error ──────────────────────────────────────────────────────
  const clearError = useCallback(() => setError(null), [])

  // ─── Cargar lista ───────────────────────────────────────────────────────
  const cargarGuias = useCallback(async (filtros = {}) => {
    setLoadingLista(true)
    setError(null)
    try {
      const data = await getGuias(filtros)
      setGuias(data)
    } catch (e) {
      setError(e?.response?.data?.detail || 'Error al cargar guías')
    } finally {
      setLoadingLista(false)
    }
  }, [])

  // ─── Cargar detalle ─────────────────────────────────────────────────────
  const cargarDetalle = useCallback(async (id) => {
    setLoadingDetalle(true)
    setError(null)
    try {
      const data = await getGuia(id)
      setGuiaActual(data)
      return data
    } catch (e) {
      setError(e?.response?.data?.detail || 'Error al cargar detalle de guía')
      return null
    } finally {
      setLoadingDetalle(false)
    }
  }, [])

  const limpiarDetalle = useCallback(() => setGuiaActual(null), [])

  // ─── Crear ──────────────────────────────────────────────────────────────
  const crear = useCallback(async (formData) => {
    setLoadingGuardar(true)
    setError(null)
    try {
      const data = await crearGuia(formData)
      setGuias((prev) => [data, ...prev])
      return { success: true, data }
    } catch (e) {
      const msg = e?.response?.data?.detail || 'Error al crear la guía'
      setError(msg)
      return { success: false, error: msg }
    } finally {
      setLoadingGuardar(false)
    }
  }, [])

  // ─── Editar ─────────────────────────────────────────────────────────────
  const editar = useCallback(async (id, formData) => {
    setLoadingGuardar(true)
    setError(null)
    try {
      const data = await editarGuia(id, formData)
      setGuias((prev) => prev.map((g) => (g.id === id ? data : g)))
      if (guiaActual?.id === id) setGuiaActual((prev) => ({ ...prev, ...data }))
      return { success: true, data }
    } catch (e) {
      const msg = e?.response?.data?.detail || 'Error al editar la guía'
      setError(msg)
      return { success: false, error: msg }
    } finally {
      setLoadingGuardar(false)
    }
  }, [guiaActual])

  // ─── Cambiar estado ─────────────────────────────────────────────────────
  const cambiarEstado = useCallback(async (id, estado, nota = '') => {
    setLoadingEstado(true)
    setError(null)
    try {
      const data = await cambiarEstadoGuia(id, estado, nota)
      setGuias((prev) => prev.map((g) => (g.id === id ? { ...g, estado: data.estado } : g)))
      if (guiaActual?.id === id) {
        // Recarga detalle completo para tener historial actualizado
        const detalle = await getGuia(id)
        setGuiaActual(detalle)
      }
      return { success: true, data }
    } catch (e) {
      const msg = e?.response?.data?.detail || 'Error al cambiar estado'
      setError(msg)
      return { success: false, error: msg }
    } finally {
      setLoadingEstado(false)
    }
  }, [guiaActual])

  // ─── Métricas ───────────────────────────────────────────────────────────
  const cargarMetricas = useCallback(async (params = {}) => {
    setLoadingMetricas(true)
    try {
      // Trae todas las guías sin filtro para calcular métricas
      const todasGuias = await getGuias({})

      const { mes, anio } = params
      const hoy = new Date()
      const mesActual = mes || hoy.getMonth() + 1
      const anioActual = anio || hoy.getFullYear()

      // Mes anterior
      const mesAnt = mesActual === 1 ? 12 : mesActual - 1
      const anioAnt = mesActual === 1 ? anioActual - 1 : anioActual

      const enMes = (g, m, a) => {
        const f = new Date(g.fecha_despacho + 'T00:00:00')
        return f.getMonth() + 1 === m && f.getFullYear() === a
      }

      const guiasMes = todasGuias.filter((g) => enMes(g, mesActual, anioActual))
      const guiasMesAnt = todasGuias.filter((g) => enMes(g, mesAnt, anioAnt))
      const guiasAnio = todasGuias.filter((g) => new Date(g.fecha_despacho + 'T00:00:00').getFullYear() === anioActual)

      const sumar = (lista) => lista.reduce((acc, g) => acc + (g.costo_flete || 0), 0)

      const por_estado = { generada: 0, despachada: 0, en_transito: 0, entregada: 0, novedad: 0 }
      guiasMes.forEach((g) => { if (por_estado[g.estado] !== undefined) por_estado[g.estado]++ })

      const porTransp = {}
      guiasMes.forEach((g) => {
        if (!porTransp[g.transportadora]) porTransp[g.transportadora] = { total: 0, cantidad: 0 }
        porTransp[g.transportadora].total += g.costo_flete || 0
        porTransp[g.transportadora].cantidad++
      })
      const top_transportadoras = Object.entries(porTransp)
        .map(([nombre, v]) => ({ nombre, ...v }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 3)

      setMetricas({
        total_mes: sumar(guiasMes),
        total_mes_anterior: sumar(guiasMesAnt),
        total_anio: sumar(guiasAnio),
        cantidad_mes: guiasMes.length,
        por_estado,
        top_transportadoras,
      })
    } catch {
      setMetricas(null)
    } finally {
      setLoadingMetricas(false)
    }
  }, [])

  // ─── Consolidado ────────────────────────────────────────────────────────
  const cargarConsolidado = useCallback(async (filtros = {}) => {
    setLoadingConsolidado(true)
    try {
      const todasGuias = await getGuias({})
      const { mes, anio, transportadora, estado } = filtros

      let resultado = todasGuias

      if (mes && anio) {
        resultado = resultado.filter((g) => {
          const f = new Date(g.fecha_despacho + 'T00:00:00')
          return f.getMonth() + 1 === Number(mes) && f.getFullYear() === Number(anio)
        })
      }
      if (transportadora) resultado = resultado.filter((g) => g.transportadora === transportadora)
      if (estado) resultado = resultado.filter((g) => g.estado === estado)

      // Mapear al formato que espera GuiasConsolidado
      const data = resultado.map((g) => ({
        numero_guia: g.numero_guia,
        fecha_despacho: g.fecha_despacho,
        cotizacion: g.cotizacion_consecutivo,
        transportadora: g.transportadora,
        destinatario: g.destinatario,
        ciudad_destino: g.ciudad_destino,
        unidades: g.unidades,
        peso_kg: g.peso_kg,
        valor_declarado: g.valor_declarado,
        valor_recaudo: g.valor_recaudo,
        costo_flete: g.costo_flete,
        estado: g.estado,
        referencia_interna: g.referencia_interna,
      }))

      setConsolidado(data)
      return data
    } catch {
      setConsolidado([])
      return []
    } finally {
      setLoadingConsolidado(false)
    }
  }, [])

  return {
    // data
    guias,
    guiaActual,
    metricas,
    consolidado,
    // loading flags
    loadingLista,
    loadingDetalle,
    loadingGuardar,
    loadingEstado,
    loadingMetricas,
    loadingConsolidado,
    // error
    error,
    clearError,
    // acciones
    cargarGuias,
    cargarDetalle,
    limpiarDetalle,
    crear,
    editar,
    cambiarEstado,
    cargarMetricas,
    cargarConsolidado,
  }
}