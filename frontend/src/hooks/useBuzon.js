import { useState, useCallback } from 'react'
import {
  listarHilos,
  getHilo,
  marcarLeido,
  responderHilo,
  redactarCorreo,
  sincronizarBuzon,
  responderConAdjuntos as responderConAdjuntosApi,
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

  // ─── Paginación ───────────────────────────────────────────────────────────
  // tokenStack[0] = undefined (página 1, sin token)
  // tokenStack[1] = nextPageToken de página 1 → página 2
  // tokenStack[n] = token para llegar a página n+1
  const [tokenStack, setTokenStack] = useState([undefined])
  const [paginaActual, setPaginaActual] = useState(1)
  const [hayPaginaSiguiente, setHayPaginaSiguiente] = useState(false)

  // ─── Cargar lista de hilos ────────────────────────────────────────────────
  // pageToken interno — se maneja desde irSiguiente/irAnterior
  const cargarHilos = useCallback(async (bandejaTarget = 'inbox', filtros = {}) => {
    setLoadingHilos(true)
    setError(null)
    try {
      const result = await listarHilos(bandejaTarget, filtros)
      setHilos(result.hilos)
      setBandeja(bandejaTarget)

      // Si se llama externamente (búsqueda, cambio bandeja) reinicia paginación
      if (!filtros.page_token) {
        setTokenStack([undefined])
        setPaginaActual(1)
        setHayPaginaSiguiente(!!result.nextPageToken)
        // Guardar el nextPageToken de página 1
        if (result.nextPageToken) {
          setTokenStack([undefined, result.nextPageToken])
        }
      } else {
        setHayPaginaSiguiente(!!result.nextPageToken)
        if (result.nextPageToken) {
          setTokenStack((prev) => {
            const next = [...prev]
            // Solo agregar si no lo tenemos ya
            if (next[next.length - 1] !== result.nextPageToken) {
              next.push(result.nextPageToken)
            }
            return next
          })
        }
      }
    } catch {
      setError('Error al cargar los correos.')
      setHilos([])
    } finally {
      setLoadingHilos(false)
    }
  }, [])

  // ─── Ir a página siguiente ────────────────────────────────────────────────
  const irPaginaSiguiente = useCallback(async () => {
    // El token para la siguiente página está en tokenStack[paginaActual]
    const token = tokenStack[paginaActual]
    if (!token) return
    setLoadingHilos(true)
    setError(null)
    try {
      const result = await listarHilos(bandeja, { page_token: token })
      setHilos(result.hilos)
      setPaginaActual((p) => p + 1)
      setHayPaginaSiguiente(!!result.nextPageToken)
      if (result.nextPageToken) {
        setTokenStack((prev) => {
          const next = [...prev]
          if (next[paginaActual + 1] === undefined) {
            next[paginaActual + 1] = result.nextPageToken
          }
          return next
        })
      }
    } catch {
      setError('Error al cargar la página siguiente.')
    } finally {
      setLoadingHilos(false)
    }
  }, [bandeja, tokenStack, paginaActual])

  // ─── Ir a página anterior ─────────────────────────────────────────────────
  const irPaginaAnterior = useCallback(async () => {
    if (paginaActual <= 1) return
    const nuevaPagina = paginaActual - 1
    // El token para página n está en tokenStack[n-1]
    const token = tokenStack[nuevaPagina - 1]
    setLoadingHilos(true)
    setError(null)
    try {
      const result = await listarHilos(bandeja, { page_token: token })
      setHilos(result.hilos)
      setPaginaActual(nuevaPagina)
      setHayPaginaSiguiente(true) // si hay anterior, siempre hay siguiente
    } catch {
      setError('Error al cargar la página anterior.')
    } finally {
      setLoadingHilos(false)
    }
  }, [bandeja, tokenStack, paginaActual])

  // ─── Abrir hilo ───────────────────────────────────────────────────────────
  const abrirHilo = useCallback(async (hiloId, bandeja = 'inbox') => {
    setLoadingHilo(true)
    setError(null)
    try {
      const data = await getHilo(hiloId, bandeja)
      setHiloActivo(data)
      marcarLeido(hiloId).catch(() => { })
      setHilos((prev) =>
        prev.map((h) => h.id === hiloId ? { ...h, leido: true } : h)
      )
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
      if (data?.mensaje) {
        setHiloActivo((prev) =>
          prev
            ? { ...prev, mensajes: [...(prev.mensajes || []), data.mensaje] }
            : prev
        )
      }
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
      // Reinicia a página 1 al sincronizar
      setTokenStack([undefined])
      setPaginaActual(1)
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

  // ─── Responder con adjuntos locales ──────────────────────────────────────
  const enviarConAdjuntos = useCallback(async (payload) => {
    setLoadingEnvio(true)
    setError(null)
    try {
      const data = await responderConAdjuntosApi(payload)
      return { success: true, data }
    } catch (err) {
      const detail = err.response?.data?.detail
      const msg = typeof detail === 'string' ? detail : 'Error al enviar.'
      setError(msg)
      return { success: false, error: msg }
    } finally {
      setLoadingEnvio(false)
    }
  }, [])

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
    // Paginación
    paginaActual,
    hayPaginaSiguiente,
    irPaginaSiguiente,
    irPaginaAnterior,
    // Acciones
    cargarHilos,
    abrirHilo,
    responder,
    redactar,
    sincronizar,
    cerrarHilo,
    enviarConAdjuntos,
  }
}