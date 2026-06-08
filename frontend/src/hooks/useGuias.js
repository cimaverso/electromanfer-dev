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
  const [guias, setGuias]               = useState([])
  const [guiaActual, setGuiaActual]     = useState(null)
  const [metricas, setMetricas]         = useState(null)
  const [consolidado, setConsolidado]   = useState([])

  const [loadingLista, setLoadingLista]         = useState(false)
  const [loadingDetalle, setLoadingDetalle]     = useState(false)
  const [loadingGuardar, setLoadingGuardar]     = useState(false)
  const [loadingEstado, setLoadingEstado]       = useState(false)
  const [loadingMetricas, setLoadingMetricas]   = useState(false)
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
      const data = await getMetricasGuias(params)
      setMetricas(data)
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
      const data = await getConsolidado(filtros)
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