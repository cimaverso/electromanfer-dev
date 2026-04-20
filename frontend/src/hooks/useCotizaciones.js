import { useState, useCallback } from 'react'
import {
  crearCotizacion,
  actualizarCotizacion,
  cambiarEstadoCotizacion,
  listarCotizaciones,
  getCotizacion,
  enviarEmail,
} from '../api/cotizacionesApi'

export function useCotizaciones() {
  const [historial, setHistorial] = useState([])
  const [cotizacionActual, setCotizacionActual] = useState(null)
  const [loadingCrear, setLoadingCrear] = useState(false)
  const [loadingHistorial, setLoadingHistorial] = useState(false)
  const [loadingEnvio, setLoadingEnvio] = useState(false)
  const [error, setError] = useState(null)

  // ─── Crear cotización nueva ───────────────────────────────────────────────
  const crear = useCallback(async (payload) => {
    setLoadingCrear(true)
    setError(null)
    try {
      const data = await crearCotizacion(payload)
      setCotizacionActual(data)
      return { success: true, data }
    } catch (err) {
      const detail = err.response?.data?.detail
      const msg = Array.isArray(detail)
        ? detail.map((e) => `${e.loc?.join('.')} — ${e.msg}`).join(' | ')
        : detail || err.response?.data?.message || 'Error al generar la cotización.'
      setError(msg)
      return { success: false, error: msg }
    } finally {
      setLoadingCrear(false)
    }
  }, [])

  // ─── Editar cotización existente (PUT) ────────────────────────────────────
  const editar = useCallback(async (id, payload) => {
    setLoadingCrear(true)
    setError(null)
    try {
      const data = await actualizarCotizacion(id, payload)
      setCotizacionActual(data)
      return { success: true, data }
    } catch (err) {
      const detail = err.response?.data?.detail
      const msg = Array.isArray(detail)
        ? detail.map((e) => `${e.loc?.join('.')} — ${e.msg}`).join(' | ')
        : detail || err.response?.data?.message || 'Error al actualizar la cotización.'
      setError(msg)
      return { success: false, error: msg }
    } finally {
      setLoadingCrear(false)
    }
  }, [])

  // ─── Listar historial ─────────────────────────────────────────────────────
  const cargarHistorial = useCallback(async (filtros = {}) => {
    setLoadingHistorial(true)
    setError(null)
    try {
      const data = await listarCotizaciones(filtros)
      setHistorial(Array.isArray(data) ? data : [])
    } catch {
      setError('Error al cargar el historial de cotizaciones.')
      setHistorial([])
    } finally {
      setLoadingHistorial(false)
    }
  }, [])

  // ─── Ver detalle ──────────────────────────────────────────────────────────
  const verCotizacion = useCallback(async (id) => {
    try {
      const data = await getCotizacion(id)
      setCotizacionActual(data)
      return data
    } catch {
      setError('No se pudo cargar el detalle de la cotización.')
      return null
    }
  }, [])

  // ─── Marcar como efectiva ─────────────────────────────────────────────────
  const marcarEfectiva = useCallback(async (id) => {
    setError(null)
    try {
      await cambiarEstadoCotizacion(id, 'efectiva')
      return { success: true }
    } catch (err) {
      const detail = err.response?.data?.detail
      const msg = Array.isArray(detail)
        ? detail.map((e) => `${e.loc?.join('.')} — ${e.msg}`).join(' | ')
        : detail || 'Error al cambiar el estado.'
      setError(msg)
      return { success: false, error: msg }
    }
  }, [])

  // ─── Anular cotización ────────────────────────────────────────────────────
  const anularCotizacion = useCallback(async (id) => {
    setError(null)
    try {
      await cambiarEstadoCotizacion(id, 'anulada')
      return { success: true }
    } catch (err) {
      const detail = err.response?.data?.detail
      const msg = Array.isArray(detail)
        ? detail.map((e) => `${e.loc?.join('.')} — ${e.msg}`).join(' | ')
        : detail || 'Error al anular la cotización.'
      setError(msg)
      return { success: false, error: msg }
    }
  }, [])

  // ─── Enviar por email ─────────────────────────────────────────────────────
  const handleEnviarEmail = useCallback(async (id, payload) => {
    setLoadingEnvio(true)
    setError(null)
    try {
      await enviarEmail(id, payload)
      return { success: true }
    } catch {
      setError('Error al enviar el correo.')
      return { success: false }
    } finally {
      setLoadingEnvio(false)
    }
  }, [])

  // ─── Generar link WhatsApp ────────────────────────────────────────────────
  const handleEnviarWhatsapp = useCallback(async (id, payload) => {
    setLoadingEnvio(true)
    setError(null)
    try {
      const data = await enviarWhatsapp(id, payload)
      return { success: true, url: data.whatsapp_url }
    } catch {
      setError('Error al generar el enlace de WhatsApp.')
      return { success: false }
    } finally {
      setLoadingEnvio(false)
    }
  }, [])

  const limpiarCotizacionActual = useCallback(() => {
    setCotizacionActual(null)
    setError(null)
  }, [])

  return {
    historial,
    cotizacionActual,
    loadingCrear,
    loadingHistorial,
    loadingEnvio,
    error,
    crear,
    editar,
    marcarEfectiva,
    anularCotizacion,
    cargarHistorial,
    verCotizacion,
    handleEnviarEmail,
    handleEnviarWhatsapp,
    limpiarCotizacionActual,
  }
}

// módulo cotizaciones v2
// módulo cotizaciones v2
// módulo cotizaciones v2

