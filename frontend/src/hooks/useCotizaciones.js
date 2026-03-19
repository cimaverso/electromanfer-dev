import { useState, useCallback } from 'react'
import {
  crearCotizacion,
  listarCotizaciones,
  getCotizacion,
  enviarEmail,
  enviarWhatsapp,
} from '../api/cotizacionesApi'

export function useCotizaciones() {
  const [historial, setHistorial] = useState([])
  const [cotizacionActual, setCotizacionActual] = useState(null)
  const [loadingCrear, setLoadingCrear] = useState(false)
  const [loadingHistorial, setLoadingHistorial] = useState(false)
  const [loadingEnvio, setLoadingEnvio] = useState(false)
  const [error, setError] = useState(null)

  // ─── Crear cotización oficial ─────────────────────────────────────────────
  const crear = useCallback(async (payload) => {
    setLoadingCrear(true)
    setError(null)
    try {
      const data = await crearCotizacion(payload)
      setCotizacionActual(data)
      return { success: true, data }
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        'Error al generar la cotización. Intenta de nuevo.'
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

  // ─── Ver detalle de una cotización del historial ──────────────────────────
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
    cargarHistorial,
    verCotizacion,
    handleEnviarEmail,
    handleEnviarWhatsapp,
    limpiarCotizacionActual,
  }
}