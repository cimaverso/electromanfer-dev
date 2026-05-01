import { useState, useCallback } from 'react'
import {
  listarHilos,
  getHilo,
  marcarLeido,
  responderHilo,
  redactarCorreo,
  sincronizarBuzon,
} from '../api/buzonApi'

export function useBuzon() {
  const [hilos, setHilos] = useState([])
  const [hiloActivo, setHiloActivo] = useState(null)
  const [loadingHilos, setLoadingHilos] = useState(false)
  const [loadingHilo, setLoadingHilo] = useState(false)
  const [loadingEnvio, setLoadingEnvio] = useState(false)
  const [loadingSync, setLoadingSync] = useState(false)
  const [error, setError] = useState(null)
  const [bandeja, setBandeja] = useState('inbox')

  // ─── Cargar lista de hilos ────────────────────────────────────────────────
  const cargarHilos = useCallback(async (bandejaTarget = 'inbox', filtros = {}) => {
    setLoadingHilos(true)
    setError(null)
    try {
      const data = await listarHilos(bandejaTarget, filtros)
      setHilos(Array.isArray(data) ? data : [])
      setBandeja(bandejaTarget)
    } catch {
      setError('Error al cargar los correos.')
      setHilos([])
    } finally {
      setLoadingHilos(false)
    }
  }, [])

  // ─── Abrir hilo ───────────────────────────────────────────────────────────
  const abrirHilo = useCallback(async (hiloId) => {
    setLoadingHilo(true)
    setError(null)
    try {
      const data = await getHilo(hiloId)
      setHiloActivo(data)
      // Marcar como leído sin bloquear UI
      if (!data.leido) {
        marcarLeido(hiloId).catch(() => {})
        setHilos((prev) =>
          prev.map((h) => (h.id === hiloId ? { ...h, leido: true } : h))
        )
      }
      return data
    } catch {
      setError('No se pudo cargar el hilo.')
      return null
    } finally {
      setLoadingHilo(false)
    }
  }, [])

  // ─── Responder hilo ───────────────────────────────────────────────────────
  const responder = useCallback(async (hiloId, payload) => {
    setLoadingEnvio(true)
    setError(null)
    try {
      const data = await responderHilo(hiloId, payload)
      // Agregar el mensaje nuevo al hilo activo optimistamente
      setHiloActivo((prev) =>
        prev
          ? { ...prev, mensajes: [...(prev.mensajes || []), data.mensaje] }
          : prev
      )
      return { success: true, data }
    } catch (err) {
      const detail = err.response?.data?.detail
      const msg = Array.isArray(detail)
        ? detail.map((e) => `${e.loc?.join('.')} — ${e.msg}`).join(' | ')
        : detail || 'Error al enviar la respuesta.'
      setError(msg)
      return { success: false, error: msg }
    } finally {
      setLoadingEnvio(false)
    }
  }, [])

  // ─── Redactar correo nuevo ────────────────────────────────────────────────
  const redactar = useCallback(async (payload) => {
    setLoadingEnvio(true)
    setError(null)
    try {
      const data = await redactarCorreo(payload)
      return { success: true, data }
    } catch (err) {
      const detail = err.response?.data?.detail
      const msg = Array.isArray(detail)
        ? detail.map((e) => `${e.loc?.join('.')} — ${e.msg}`).join(' | ')
        : detail || 'Error al enviar el correo.'
      setError(msg)
      return { success: false, error: msg }
    } finally {
      setLoadingEnvio(false)
    }
  }, [])

  // ─── Sincronizar con Gmail ────────────────────────────────────────────────
  const sincronizar = useCallback(async () => {
    setLoadingSync(true)
    setError(null)
    try {
      await sincronizarBuzon()
      await cargarHilos(bandeja)
      return { success: true }
    } catch {
      setError('Error al sincronizar el buzón.')
      return { success: false }
    } finally {
      setLoadingSync(false)
    }
  }, [bandeja, cargarHilos])

  // ─── Cerrar hilo activo ───────────────────────────────────────────────────
  const cerrarHilo = useCallback(() => {
    setHiloActivo(null)
    setError(null)
  }, [])

  // ─── Sin leer (derivado) ──────────────────────────────────────────────────
  const sinLeer = hilos.filter((h) => !h.leido).length

  return {
    hilos,
    hiloActivo,
    bandeja,
    sinLeer,
    loadingHilos,
    loadingHilo,
    loadingEnvio,
    loadingSync,
    error,
    cargarHilos,
    abrirHilo,
    responder,
    redactar,
    sincronizar,
    cerrarHilo,
  }
}